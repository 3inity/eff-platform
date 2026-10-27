import { NextResponse } from "next/server";
import { prisma } from "@/db";
import { getPlayerSession } from "@/lib/auth-player";

export async function GET(req: Request) {
  const session = await getPlayerSession(req);
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const withdrawals = await prisma.withdrawal.findMany({
    where: { playerId: session.playerId },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json({ withdrawals });
}

export async function POST(req: Request) {
  try {
    const session = await getPlayerSession(req);
    if (!session) {
      return NextResponse.json({ error: "Unauthorized. Please log in." }, { status: 401 });
    }

    const body = await req.json();
    const amount = parseInt(body.amount, 10);

    if (isNaN(amount) || amount <= 0) {
      return NextResponse.json({ error: "Please enter a valid withdrawal amount." }, { status: 400 });
    }

    const result = await prisma.$transaction(async (tx) => {
      const player = await tx.player.findUnique({
        where: { id: session.playerId },
      });

      if (!player) {
        throw new Error("Player not found.");
      }

      if (player.coins < amount) {
        throw new Error(`Insufficient coins for withdrawal. Your balance is ${player.coins} coins.`);
      }

      // 1. Escrow coins from player's balance
      const updatedPlayer = await tx.player.update({
        where: { id: session.playerId },
        data: {
          coins: { decrement: amount },
        },
      });

      // 2. Create Withdrawal record
      const withdrawal = await tx.withdrawal.create({
        data: {
          playerId: session.playerId,
          amount,
          status: "PENDING",
        },
      });

      return { withdrawal, remainingCoins: updatedPlayer.coins };
    }, { timeout: 15000, maxWait: 10000 });

    return NextResponse.json({
      success: true,
      message: `Withdrawal request for ${amount} coins submitted and awaiting admin approval.`,
      withdrawal: result.withdrawal,
      remainingCoins: result.remainingCoins,
    });
  } catch (error: unknown) {
    console.error("POST /api/portal/withdrawals error:", error);
    const msg = error instanceof Error ? error.message : "Failed to request withdrawal.";
    return NextResponse.json({ error: msg }, { status: 400 });
  }
}
