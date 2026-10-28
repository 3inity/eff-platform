import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { prisma } from "@/db";
import { getAdminSession, checkAdminPermission } from "@/lib/auth-admin";
import { createAuditLog } from "@/lib/audit";
import { computeStandings, generateKnockoutBracket } from "@/lib/fixtures";

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getAdminSession(req);
    if (!session || !checkAdminPermission(session.role, ["SUPER_ADMIN"])) {
      return NextResponse.json({ error: "Only SUPER_ADMIN can trigger knockout qualification." }, { status: 403 });
    }

    const { id: competitionId } = await params;
    const body = await req.json().catch(() => ({}));
    const { qualifiersPerGroup: reqQualifiers } = body;

    const competition = await prisma.competition.findUnique({
      where: { id: competitionId },
      include: {
        participants: {
          where: { status: "APPROVED" },
          include: { player: true, team: true },
        },
        matches: true,
      },
    });

    if (!competition) {
      return NextResponse.json({ error: "Competition not found." }, { status: 404 });
    }

    if (competition.format !== "GROUP_STAGE") {
      return NextResponse.json(
        { error: "This endpoint is only for GROUP_STAGE tournaments." },
        { status: 400 }
      );
    }

    const qualifiersPerGroup = reqQualifiers || competition.qualifiersPerGroup || 2;

    // Check if knockout matches already exist
    const existingKnockoutMatches = competition.matches.filter(
      (m) => m.bracketSlot !== null || (m.stage && !m.stage.startsWith("GROUP_"))
    );
    if (existingKnockoutMatches.length > 0) {
      return NextResponse.json(
        { error: "Knockout stage already generated for this competition." },
        { status: 409 }
      );
    }

    // Find distinct groups
    const distinctGroups = Array.from(
      new Set(
        competition.participants
          .map((p) => p.groupName)
          .filter((g): g is string => Boolean(g))
      )
    ).sort();

    if (distinctGroups.length < 2) {
      return NextResponse.json(
        { error: "Groups must be drawn before qualifying to knockout." },
        { status: 400 }
      );
    }

    // Compute standings for each group
    const qualifiedParticipants: Array<{
      id: string;
      playerId: string;
      username: string;
      groupName: string;
      groupPosition: number;
      knockoutSeed: number;
    }> = [];

    // Gather top N from each group
    const groupRankings: Record<string, Array<{ playerId: string; position: number }>> = {};

    for (const g of distinctGroups) {
      const standings = computeStandings(competition.participants, competition.matches, g);
      groupRankings[g] = standings;
    }

    // Classical cross-seeding: (1A vs 2B, 1B vs 2A, etc.)
    let currentSeed = 1;
    for (let pos = 1; pos <= qualifiersPerGroup; pos++) {
      for (const g of distinctGroups) {
        const row = groupRankings[g]?.find((r) => r.position === pos);
        if (row) {
          const part = competition.participants.find((p) => p.playerId === row.playerId);
          if (part) {
            qualifiedParticipants.push({
              id: part.id,
              playerId: part.playerId,
              username: part.player.username,
              groupName: g,
              groupPosition: pos,
              knockoutSeed: currentSeed++,
            });
          }
        }
      }
    }

    if (qualifiedParticipants.length < 2) {
      return NextResponse.json(
        { error: "Insufficient qualified participants to form a knockout bracket." },
        { status: 400 }
      );
    }

    // Find current max matchday from group stage to schedule knockout after it
    const currentMaxMatchday = competition.matches.reduce(
      (max, m) => Math.max(max, m.matchday || 0),
      0
    );

    const knockoutStartDate = new Date(
      (competition.startDate ? new Date(competition.startDate) : new Date()).getTime() +
        currentMaxMatchday * (competition.matchdayDurationHours || 48) * 3600 * 1000
    );

    const knockoutMatches = generateKnockoutBracket(
      qualifiedParticipants.map((q) => ({
        id: q.id,
        playerId: q.playerId,
        knockoutSeed: q.knockoutSeed,
        username: q.username,
      })),
      competitionId,
      {
        startDate: knockoutStartDate,
        matchdayDurationHours: competition.matchdayDurationHours || 48,
        knockoutLegs: competition.knockoutLegs || 1,
      }
    );

    // Offset matchday so it continues sequentially after group stage
    knockoutMatches.forEach((m) => {
      if (m.matchday) {
        m.matchday += currentMaxMatchday;
      }
    });

    const newCurrentMatchday = currentMaxMatchday + 1;

    await prisma.$transaction([
      ...qualifiedParticipants.map((q) =>
        prisma.competitionParticipant.update({
          where: { id: q.id },
          data: { knockoutSeed: q.knockoutSeed },
        })
      ),
      prisma.competition.update({
        where: { id: competitionId },
        data: {
          qualifiersPerGroup,
          currentMatchday: newCurrentMatchday,
        },
      }),
      prisma.match.createMany({
        data: knockoutMatches,
      }),
    ]);

    await createAuditLog({
      adminId: session.adminId,
      actionType: "QUALIFY_KNOCKOUT",
      targetTable: "Competition",
      targetId: competitionId,
      newValue: {
        competition: competition.name,
        qualifiedCount: qualifiedParticipants.length,
        knockoutMatchesCount: knockoutMatches.length,
        qualifiersPerGroup,
      },
    });

    revalidatePath(`/competition/${competitionId}`);
    revalidatePath("/admin/competitions");
    revalidatePath("/portal");

    return NextResponse.json({
      success: true,
      qualifiedCount: qualifiedParticipants.length,
      knockoutMatchesCount: knockoutMatches.length,
      message: `Successfully qualified ${qualifiedParticipants.length} teams and generated knockout bracket (${knockoutMatches.length} matches).`,
    });
  } catch (error) {
    console.error("POST /api/admin/competitions/[id]/qualify-knockout error:", error);
    return NextResponse.json({ error: "Failed to qualify teams to knockout." }, { status: 500 });
  }
}
