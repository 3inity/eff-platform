import { NextResponse } from "next/server";
import { getPlayerSession } from "@/lib/auth-player";
import { prisma } from "@/db";

export async function GET(req: Request) {
  const session = await getPlayerSession(req);
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const player = await prisma.player.findUnique({
    where: { id: session.playerId },
    select: {
      id: true,
      username: true,
      xHandle: true,
      teamName: true,
      nationality: true,
      avatarUrl: true,
      wins: true,
      draws: true,
      losses: true,
      goalsFor: true,
      goalsAgainst: true,
      coins: true,
      createdAt: true,
      credential: {
        select: {
          mustChangePassword: true,
          lastLoginAt: true,
        },
      },
    },
  });

  if (!player) {
    return NextResponse.json({ error: "Player not found" }, { status: 404 });
  }

  return NextResponse.json({
    player: {
      ...player,
      mustChangePassword: player.credential?.mustChangePassword ?? false,
    },
  });
}
