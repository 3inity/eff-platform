import { NextResponse } from "next/server";
import { prisma } from "@/db";

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const limit = Math.min(50, parseInt(searchParams.get("limit") || "15", 10));

    const matches = await prisma.match.findMany({
      include: {
        competition: {
          select: {
            id: true,
            name: true,
            season: true,
            badgeKey: true,
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
      orderBy: { playedAt: "desc" },
      take: limit,
    });

    return NextResponse.json({ matches });
  } catch (error) {
    console.error("GET /api/matches/recent error:", error);
    return NextResponse.json(
      { error: "Failed to fetch recent matches." },
      { status: 500 }
    );
  }
}
