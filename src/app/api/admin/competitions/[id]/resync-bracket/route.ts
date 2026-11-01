import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { prisma } from "@/db";
import { getAdminSession, checkAdminPermission } from "@/lib/auth-admin";
import { createAuditLog } from "@/lib/audit";
import { getNextBracketSlot, resolveTieWinner } from "@/lib/fixtures";

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
        matches: {
          where: { bracketSlot: { not: null } },
        },
      },
    });

    if (!competition) {
      return NextResponse.json({ error: "Competition not found." }, { status: 404 });
    }

    // 1. Remove any second leg for the FINAL match
    const finalLeg2Matches = competition.matches.filter(
      (m) => m.stage === "FINAL" && m.legNumber === 2
    );

    for (const fl2 of finalLeg2Matches) {
      await prisma.match.delete({ where: { id: fl2.id } });
    }

    // 2. Fetch all knockout matches
    const allMatches = await prisma.match.findMany({
      where: { competitionId, bracketSlot: { not: null } },
      orderBy: [{ bracketSlot: "asc" }, { legNumber: "asc" }],
    });

    if (allMatches.length === 0) {
      return NextResponse.json({ error: "No knockout matches found." }, { status: 400 });
    }

    const maxSlot = allMatches.reduce((max, m) => Math.max(max, m.bracketSlot || 0), 0);
    let bracketSize = 2;
    while (bracketSize - 1 < maxSlot) {
      bracketSize *= 2;
    }

    let advancedCount = 0;

    // 3. Evaluate each slot up to maxSlot - 1
    for (let slot = 1; slot < maxSlot; slot++) {
      const slotMatches = await prisma.match.findMany({
        where: { competitionId, bracketSlot: slot },
        orderBy: { legNumber: "asc" },
      });

      if (slotMatches.length === 0) continue;

      const resolution = resolveTieWinner(
        slotMatches.map((m) => ({
          id: m.id,
          homePlayerId: m.homePlayerId,
          awayPlayerId: m.awayPlayerId,
          homeScore: m.homeScore,
          awayScore: m.awayScore,
          homePenalty: m.homePenalty,
          awayPenalty: m.awayPenalty,
          legNumber: m.legNumber,
          bracketSlot: m.bracketSlot,
          isCompleted: m.isCompleted,
        }))
      );

      if (resolution.isDecided && resolution.winnerPlayerId) {
        const { targetSlot, position } = getNextBracketSlot(slot, bracketSize);

        if (targetSlot) {
          const targetMatches = await prisma.match.findMany({
            where: { competitionId, bracketSlot: targetSlot },
          });

          for (const tm of targetMatches) {
            const isLeg2 = tm.legNumber === 2;
            const assignAsHome = isLeg2 ? position === "away" : position === "home";

            await prisma.match.update({
              where: { id: tm.id },
              data: {
                ...(assignAsHome
                  ? { homePlayerId: resolution.winnerPlayerId }
                  : { awayPlayerId: resolution.winnerPlayerId }),
              },
            });
            advancedCount++;
          }
        }
      }
    }

    // 4. Check if final is completed
    const finalMatches = await prisma.match.findMany({
      where: { competitionId, bracketSlot: maxSlot },
    });
    const finalResolution = resolveTieWinner(
      finalMatches.map((m) => ({
        id: m.id,
        homePlayerId: m.homePlayerId,
        awayPlayerId: m.awayPlayerId,
        homeScore: m.homeScore,
        awayScore: m.awayScore,
        homePenalty: m.homePenalty,
        awayPenalty: m.awayPenalty,
        legNumber: m.legNumber,
        bracketSlot: m.bracketSlot,
        isCompleted: m.isCompleted,
      }))
    );

    if (finalResolution.isDecided && finalResolution.winnerPlayerId) {
      await prisma.competition.update({
        where: { id: competitionId },
        data: { status: "COMPLETED" },
      });
    }

    await createAuditLog({
      adminId: session.adminId,
      actionType: "RESYNC_BRACKET",
      targetTable: "Competition",
      targetId: competitionId,
      newValue: {
        competition: competition.name,
        advancedCount,
      },
    });

    revalidatePath(`/competition/${competitionId}`);
    revalidatePath("/admin/competitions");
    revalidatePath("/portal/competitions");

    return NextResponse.json({
      success: true,
      message: `Bracket successfully resynced. ${advancedCount} slots updated.`,
    });
  } catch (error: any) {
    console.error("POST /api/admin/competitions/[id]/resync-bracket error:", error);
    return NextResponse.json(
      { error: error?.message || "Failed to resync bracket." },
      { status: 500 }
    );
  }
}
