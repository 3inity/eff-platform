import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { prisma } from "@/db";
import { verifyPlayerToken } from "@/lib/auth-player";
import { AUTH_COOKIES } from "@/lib/constants";

export async function GET() {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get(AUTH_COOKIES.PLAYER)?.value;

    if (!token) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const payload = await verifyPlayerToken(token);
    if (!payload || !payload.playerId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const fixtures = await prisma.match.findMany({
      where: {
        OR: [
          { homePlayerId: payload.playerId },
          { awayPlayerId: payload.playerId },
        ],
      },
      include: {
        competition: {
          select: {
            id: true,
            name: true,
            season: true,
            format: true,
            badgeKey: true,
            status: true,
          },
        },
        homePlayer: {
          select: {
            id: true,
            username: true,
            teamName: true,
            avatarUrl: true,
            nationality: true,
          },
        },
        awayPlayer: {
          select: {
            id: true,
            username: true,
            teamName: true,
            avatarUrl: true,
            nationality: true,
          },
        },
      },
      orderBy: [
        { isCompleted: "asc" },
        { scheduledAt: "asc" },
        { matchday: "asc" },
      ],
    });

    return NextResponse.json({ fixtures, playerId: payload.playerId });
  } catch (error) {
    console.error("GET /api/portal/fixtures error:", error);
    return NextResponse.json(
      { error: "Failed to fetch fixtures." },
      { status: 500 }
    );
  }
}
