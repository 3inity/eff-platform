import { NextResponse } from "next/server";
import { prisma } from "@/db";
import { getAdminSession, checkAdminPermission } from "@/lib/auth-admin";
import { createAuditLog } from "@/lib/audit";

export async function POST(req: Request) {
  try {
    const session = await getAdminSession(req);
    if (!session || !checkAdminPermission(session.role, ["MATCH_ADMIN"])) {
      return NextResponse.json({ error: "Unauthorized permission." }, { status: 403 });
    }

    const body = await req.json();
    const {
      competitionId,
      homePlayerId,
      awayPlayerId,
      homeScore: rawHomeScore,
      awayScore: rawAwayScore,
      playedAt,
    } = body;

    const homeScore = parseInt(rawHomeScore, 10);
    const awayScore = parseInt(rawAwayScore, 10);

    if (
      !competitionId ||
      !homePlayerId ||
      !awayPlayerId ||
      isNaN(homeScore) ||
      isNaN(awayScore)
    ) {
      return NextResponse.json(
        { error: "Competition, Home Player, Away Player, and valid scores are required." },
        { status: 400 }
      );
    }

    if (homePlayerId === awayPlayerId) {
      return NextResponse.json(
        { error: "Home and Away players cannot be the same." },
        { status: 400 }
      );
    }

    // Run in a transaction: create match, update both players' stats
    const result = await prisma.$transaction(async (tx) => {
      // 1. Create Match
      const match = await tx.match.create({
        data: {
          competitionId,
          homePlayerId,
          awayPlayerId,
          homeScore,
          awayScore,
          playedAt: playedAt ? new Date(playedAt) : new Date(),
          resultEnteredBy: session.adminId,
        },
        include: {
          competition: true,
          homePlayer: true,
          awayPlayer: true,
        },
      });

      // 2. Compute stat deltas
      const isHomeWin = homeScore > awayScore;
      const isAwayWin = awayScore > homeScore;
      const isDraw = homeScore === awayScore;

      // Update Home Player
      await tx.player.update({
        where: { id: homePlayerId },
        data: {
          wins: { increment: isHomeWin ? 1 : 0 },
          draws: { increment: isDraw ? 1 : 0 },
          losses: { increment: isAwayWin ? 1 : 0 },
          goalsFor: { increment: homeScore },
          goalsAgainst: { increment: awayScore },
        },
      });

      // Update Away Player
      await tx.player.update({
        where: { id: awayPlayerId },
        data: {
          wins: { increment: isAwayWin ? 1 : 0 },
          draws: { increment: isDraw ? 1 : 0 },
          losses: { increment: isHomeWin ? 1 : 0 },
          goalsFor: { increment: awayScore },
          goalsAgainst: { increment: homeScore },
        },
      });

      return match;
    });

    // Write AuditLog
    await createAuditLog({
      adminId: session.adminId,
      actionType: "ENTER_MATCH_RESULT",
      targetTable: "Match",
      targetId: result.id,
      newValue: {
        competition: result.competition.name,
        home: result.homePlayer.username,
        away: result.awayPlayer.username,
        score: `${result.homeScore} - ${result.awayScore}`,
      },
    });

    return NextResponse.json({ success: true, match: result });
  } catch (error) {
    console.error("POST /api/admin/matches error:", error);
    return NextResponse.json(
      { error: "Failed to enter match result." },
      { status: 500 }
    );
  }
}
