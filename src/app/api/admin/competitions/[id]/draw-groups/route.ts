import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { prisma } from "@/db";
import { getAdminSession, checkAdminPermission } from "@/lib/auth-admin";
import { createAuditLog } from "@/lib/audit";
import { generateRoundRobinSchedule, GeneratedMatch } from "@/lib/fixtures";

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getAdminSession(req);
    if (!session || !checkAdminPermission(session.role, ["SUPER_ADMIN", "MATCH_ADMIN"])) {
      return NextResponse.json({ error: "Unauthorized permission." }, { status: 403 });
    }

    const { id: competitionId } = await params;
    const body = await req.json().catch(() => ({}));
    const { groupCount: reqGroups, teamsPerGroup: reqTeamsPerGroup } = body;

    const competition = await prisma.competition.findUnique({
      where: { id: competitionId },
      include: {
        participants: {
          where: { status: "APPROVED" },
          include: { player: true },
        },
        matches: true,
      },
    });

    if (!competition) {
      return NextResponse.json({ error: "Competition not found." }, { status: 404 });
    }

    if (competition.format !== "GROUP_STAGE") {
      return NextResponse.json(
        { error: "This endpoint is only for GROUP_STAGE competitions." },
        { status: 400 }
      );
    }

    if (competition.status !== "IN_PROGRESS") {
      return NextResponse.json(
        { error: "Competition must be IN_PROGRESS to draw groups." },
        { status: 400 }
      );
    }

    if (competition.matches.length > 0) {
      return NextResponse.json(
        { error: "Fixtures already exist for this competition. Delete fixtures first." },
        { status: 409 }
      );
    }

    const participants = competition.participants;
    const totalCount = participants.length;

    const groupCount = reqGroups || competition.groupCount || 2;
    const teamsPerGroup = reqTeamsPerGroup || competition.teamsPerGroup || Math.ceil(totalCount / groupCount);

    if (groupCount < 2) {
      return NextResponse.json({ error: "At least 2 groups are required." }, { status: 400 });
    }

    if (totalCount < groupCount * 2) {
      return NextResponse.json(
        { error: `At least ${groupCount * 2} approved participants are required to form ${groupCount} groups.` },
        { status: 400 }
      );
    }

    // Shuffle participants Fisher-Yates
    const shuffled = [...participants];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }

    const groupLetters = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
    const groupAssignments: Array<{ participantId: string; groupName: string }> = [];
    const groupParticipantsMap: Record<string, typeof participants> = {};

    for (let g = 0; g < groupCount; g++) {
      const gName = groupLetters[g];
      groupParticipantsMap[gName] = [];
    }

    // Deal participants into groups
    shuffled.forEach((p, idx) => {
      const gIndex = idx % groupCount;
      const gName = groupLetters[gIndex];
      groupAssignments.push({ participantId: p.id, groupName: gName });
      groupParticipantsMap[gName].push(p);
    });

    // Generate round robin schedule for each group
    const allMatches: GeneratedMatch[] = [];

    for (let g = 0; g < groupCount; g++) {
      const gName = groupLetters[g];
      const gParts = groupParticipantsMap[gName];

      const gSchedule = generateRoundRobinSchedule(
        gParts.map((p) => ({
          id: p.id,
          playerId: p.playerId,
          seed: p.seed,
          knockoutSeed: p.knockoutSeed,
          groupName: gName,
          username: p.player.username,
        })),
        competitionId,
        {
          startDate: competition.startDate || new Date(),
          matchdayDurationHours: competition.matchdayDurationHours || 48,
          roundRobinLegs: competition.roundRobinLegs || 1,
          stage: `GROUP_${gName}`,
        }
      );

      allMatches.push(...gSchedule);
    }

    // Run updates in a transaction
    await prisma.$transaction([
      ...groupAssignments.map((a) =>
        prisma.competitionParticipant.update({
          where: { id: a.participantId },
          data: { groupName: a.groupName },
        })
      ),
      prisma.competition.update({
        where: { id: competitionId },
        data: {
          groupCount,
          teamsPerGroup,
          currentMatchday: 1,
        },
      }),
      prisma.match.createMany({
        data: allMatches,
      }),
    ]);

    await createAuditLog({
      adminId: session.adminId,
      actionType: "DRAW_GROUPS",
      targetTable: "Competition",
      targetId: competitionId,
      newValue: {
        competition: competition.name,
        groupCount,
        teamsPerGroup,
        totalParticipants: totalCount,
        fixtureCount: allMatches.length,
      },
    });

    revalidatePath(`/competition/${competitionId}`);
    revalidatePath("/admin/competitions");
    revalidatePath("/portal");

    return NextResponse.json({
      success: true,
      groupCount,
      fixtureCount: allMatches.length,
      message: `Formed ${groupCount} groups and generated ${allMatches.length} group stage fixtures.`,
    });
  } catch (error) {
    console.error("POST /api/admin/competitions/[id]/draw-groups error:", error);
    return NextResponse.json({ error: "Failed to draw groups." }, { status: 500 });
  }
}
