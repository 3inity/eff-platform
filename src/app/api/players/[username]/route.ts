import { NextResponse } from "next/server";
import { prisma } from "@/db";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ username: string }> }
) {
  try {
    const { username } = await params;

    const player = await prisma.player.findUnique({
      where: { username },
      include: {
        competitionParticipants: {
          include: {
            competition: {
              select: {
                id: true,
                name: true,
                season: true,
                status: true,
                type: true,
              },
            },
          },
        },
      },
    });

    if (!player) {
      return NextResponse.json({ error: "Player not found." }, { status: 404 });
    }

    // Fetch recent 20 matches for the player
    const matches = await prisma.match.findMany({
      where: {
        OR: [{ homePlayerId: player.id }, { awayPlayerId: player.id }],
      },
      include: {
        competition: {
          select: { id: true, name: true, season: true },
        },
        homePlayer: {
          select: { id: true, username: true, teamName: true, avatarUrl: true },
        },
        awayPlayer: {
          select: { id: true, username: true, teamName: true, avatarUrl: true },
        },
      },
      orderBy: { playedAt: "desc" },
      take: 20,
    });

    const totalMatches = player.wins + player.draws + player.losses;
    const winRate = totalMatches > 0 ? +((player.wins / totalMatches) * 100).toFixed(1) : 0;
    const goalDifference = player.goalsFor - player.goalsAgainst;

    // Map match outcomes from player's perspective
    const recentMatchesWithOutcome = matches.map((m) => {
      const isHome = m.homePlayerId === player.id;
      const myScore = isHome ? m.homeScore : m.awayScore;
      const oppScore = isHome ? m.awayScore : m.homeScore;
      const opponent = isHome ? m.awayPlayer : m.homePlayer;

      let result: "W" | "D" | "L" = "D";
      if (myScore > oppScore) result = "W";
      else if (myScore < oppScore) result = "L";

      return {
        id: m.id,
        playedAt: m.playedAt,
        competition: m.competition,
        isHome,
        myScore,
        oppScore,
        result,
        opponent,
      };
    });

    // Form: last 5 matches
    const form = recentMatchesWithOutcome.slice(0, 5).map((m) => m.result);

    return NextResponse.json({
      player: {
        ...player,
        totalMatches,
        winRate,
        goalDifference,
        form,
      },
      recentMatches: recentMatchesWithOutcome,
    });
  } catch (error) {
    console.error("GET /api/players/[username] error:", error);
    return NextResponse.json(
      { error: "Failed to fetch player profile." },
      { status: 500 }
    );
  }
}
