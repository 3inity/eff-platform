import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { prisma } from "@/db";
import { getAdminSession, checkAdminPermission } from "@/lib/auth-admin";
import { createAuditLog } from "@/lib/audit";
import { generateRoundRobinSchedule } from "@/lib/fixtures";

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

    if (competition.status !== "IN_PROGRESS") {
      return NextResponse.json(
        { error: "Competition must be IN_PROGRESS to generate fixtures." },
        { status: 400 }
      );
    }

    if (competition.participants.length < 2) {
      return NextResponse.json(
        { error: "At least 2 approved participants are required to generate fixtures." },
        { status: 400 }
      );
    }

    if (competition.matches.length > 0) {
      return NextResponse.json(
        { error: "Fixtures already generated. Delete existing fixtures first." },
        { status: 409 }
      );
    }

    const generated = generateRoundRobinSchedule(
      competition.participants.map((p) => ({
        id: p.id,
        playerId: p.playerId,
        seed: p.seed,
        knockoutSeed: p.knockoutSeed,
        username: p.player.username,
      })),
      competitionId,
      {
        startDate: competition.startDate || new Date(),
        matchdayDurationHours: competition.matchdayDurationHours || 48,
        roundRobinLegs: competition.roundRobinLegs || 1,
      }
    );

    const maxMatchday = Math.max(...generated.map((m) => m.matchday || 1));

    // Save all matches and update competition currentMatchday in a transaction
    await prisma.$transaction([
      prisma.match.createMany({
        data: generated,
      }),
      prisma.competition.update({
        where: { id: competitionId },
        data: { currentMatchday: 1 },
      }),
    ]);

    await createAuditLog({
      adminId: session.adminId,
      actionType: "GENERATE_FIXTURES",
      targetTable: "Match",
      targetId: competitionId,
      newValue: {
        competition: competition.name,
        matchCount: generated.length,
        rounds: maxMatchday,
        roundRobinLegs: competition.roundRobinLegs,
      },
    });

    revalidatePath(`/competition/${competitionId}`);
    revalidatePath("/admin/competitions");
    revalidatePath("/portal");

    return NextResponse.json({
      success: true,
      count: generated.length,
      rounds: maxMatchday,
      message: `Generated ${generated.length} fixtures across ${maxMatchday} matchdays.`,
    });
  } catch (error) {
    console.error("POST /api/admin/competitions/[id]/generate-fixtures error:", error);
    return NextResponse.json(
      { error: "Failed to generate fixtures." },
      { status: 500 }
    );
  }
}
