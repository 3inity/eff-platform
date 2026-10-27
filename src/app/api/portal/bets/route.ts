import { NextResponse } from "next/server";
import { prisma } from "@/db";
import { getPlayerSession } from "@/lib/auth-player";

export async function GET(req: Request) {
  const session = await getPlayerSession(req);
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const bets = await prisma.bet.findMany({
    where: { playerId: session.playerId },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json({ bets });
}

export async function POST(req: Request) {
  try {
    const session = await getPlayerSession(req);
    if (!session) {
      return NextResponse.json({ error: "Unauthorized. Please log in." }, { status: 401 });
    }

    const body = await req.json();
    const { stake: rawStake, odds: rawOdds, selections } = body;

    const stake = parseInt(rawStake, 10);
    const odds = parseFloat(rawOdds);

    // Rule 1: Stake must be between 300 and 500
    if (isNaN(stake) || stake < 300 || stake > 500) {
      return NextResponse.json(
        { error: "Stake must be between 300 and 500 coins." },
        { status: 400 }
      );
    }

    // Rule 2: Minimum 4 match selections
    if (!Array.isArray(selections) || selections.length < 4) {
      return NextResponse.json(
        { error: "A betting ticket must contain a minimum of 4 match selections." },
        { status: 400 }
      );
    }

    if (isNaN(odds) || odds <= 1.0) {
      return NextResponse.json(
        { error: "Invalid cumulative odds calculation." },
        { status: 400 }
      );
    }

    // Check player coin balance and deduct in a transaction
    const result = await prisma.$transaction(async (tx) => {
      const player = await tx.player.findUnique({
        where: { id: session.playerId },
      });

      if (!player) {
        throw new Error("Player not found.");
      }

      if (player.coins < stake) {
        throw new Error(`Insufficient coins. Your balance is ${player.coins} coins.`);
      }

      // 1. Deduct stake
      const updatedPlayer = await tx.player.update({
        where: { id: session.playerId },
        data: {
          coins: { decrement: stake },
        },
      });

      // 2. Create Bet
      const bet = await tx.bet.create({
        data: {
          playerId: session.playerId,
          stake,
          odds,
          selections,
          status: "PENDING",
        },
      });

      return { bet, remainingCoins: updatedPlayer.coins };
    }, { timeout: 15000, maxWait: 10000 });

    return NextResponse.json({
      success: true,
      message: "Bet ticket placed successfully!",
      bet: result.bet,
      remainingCoins: result.remainingCoins,
    });
  } catch (error: unknown) {
    console.error("POST /api/portal/bets error:", error);
    const msg = error instanceof Error ? error.message : "Failed to place bet.";
    return NextResponse.json({ error: msg }, { status: 400 });
  }
}
