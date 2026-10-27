import { NextResponse } from "next/server";
import { prisma } from "@/db";
import { getAdminSession, checkAdminPermission } from "@/lib/auth-admin";
import { createAuditLog } from "@/lib/audit";

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getAdminSession(req);
    if (!session || !checkAdminPermission(session.role, ["SUPER_ADMIN", "BET_ADMIN"])) {
      return NextResponse.json({ error: "Unauthorized permission." }, { status: 403 });
    }

    const { id } = await params;
    const body = await req.json();
    const { status } = body;

    if (status !== "WON" && status !== "LOST") {
      return NextResponse.json({ error: "Status must be either WON or LOST." }, { status: 400 });
    }

    const bet = await prisma.bet.findUnique({
      where: { id },
      include: { player: true },
    });

    if (!bet) {
      return NextResponse.json({ error: "Bet ticket not found." }, { status: 404 });
    }

    if (bet.status !== "PENDING") {
      return NextResponse.json(
        { error: `Bet is already settled as ${bet.status}.` },
        { status: 400 }
      );
    }

    const payout = status === "WON" ? Math.round(bet.stake * bet.odds) : 0;

    const result = await prisma.$transaction(async (tx) => {
      // 1. Update Bet
      const updatedBet = await tx.bet.update({
        where: { id },
        data: {
          status,
          payout,
        },
      });

      // 2. If WON, credit player coins
      let updatedPlayerCoins = bet.player.coins;
      if (status === "WON" && payout > 0) {
        const player = await tx.player.update({
          where: { id: bet.playerId },
          data: {
            coins: { increment: payout },
          },
        });
        updatedPlayerCoins = player.coins;
      }

      return { updatedBet, updatedPlayerCoins };
    }, { timeout: 15000, maxWait: 10000 });

    // Write AuditLog
    await createAuditLog({
      adminId: session.adminId,
      actionType: "SETTLE_BET",
      targetTable: "Bet",
      targetId: id,
      oldValue: { status: bet.status, payout: bet.payout },
      newValue: {
        status,
        payout,
        player: bet.player.username,
        stake: bet.stake,
        odds: bet.odds,
        playerCoinsAfter: result.updatedPlayerCoins,
      },
    });

    return NextResponse.json({ success: true, bet: result.updatedBet });
  } catch (error) {
    console.error("POST /api/admin/bets/[id]/settle error:", error);
    return NextResponse.json(
      { error: "Failed to settle bet." },
      { status: 500 }
    );
  }
}
