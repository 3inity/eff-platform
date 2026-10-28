import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { prisma } from "@/db";
import { getAdminSession, checkAdminPermission } from "@/lib/auth-admin";
import { createAuditLog } from "@/lib/audit";
import { generateKnockoutBracket } from "@/lib/fixtures";

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

    if (competition.format !== "KNOCKOUT") {
      return NextResponse.json(
        { error: "This endpoint is only for competitions with KNOCKOUT format." },
        { status: 400 }
      );
    }

    if (competition.status !== "IN_PROGRESS") {
      return NextResponse.json(
        { error: "Competition must be IN_PROGRESS to generate a knockout bracket." },
        { status: 400 }
      );
    }

    if (competition.participants.length < 2) {
      return NextResponse.json(
        { error: "At least 2 approved participants are required." },
        { status: 400 }
      );
    }

    if (competition.matches.length > 0) {
      return NextResponse.json(
        { error: "Knockout bracket already generated. Delete existing fixtures first." },
        { status: 409 }
      );
    }

    const generated = generateKnockoutBracket(
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
        knockoutLegs: competition.knockoutLegs || 1,
      }
    );

    const rounds = Math.max(...generated.map((m) => m.matchday || 1));

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
      actionType: "GENERATE_KNOCKOUT",
      targetTable: "Match",
      targetId: competitionId,
      newValue: {
        competition: competition.name,
        matchCount: generated.length,
        rounds,
        knockoutLegs: competition.knockoutLegs,
        participantCount: competition.participants.length,
      },
    });

    revalidatePath(`/competition/${competitionId}`);
    revalidatePath("/admin/competitions");
    revalidatePath("/portal");

    return NextResponse.json({
      success: true,
      count: generated.length,
      rounds,
      message: `Generated knockout bracket with ${generated.length} matches.`,
    });
  } catch (error) {
    console.error("POST /api/admin/competitions/[id]/generate-knockout error:", error);
    return NextResponse.json(
      { error: "Failed to generate knockout bracket." },
      { status: 500 }
    );
  }
}
