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

    // Fetch CompetitionParticipant records to map per-competition team names & crests
    const compIds = Array.from(new Set(matches.map((m) => m.competitionId)));
    const participants = await prisma.competitionParticipant.findMany({
      where: {
        competitionId: { in: compIds },
      },
      include: {
        team: true,
      },
    });

    const participantMap = new Map<string, typeof participants[0]>();
    for (const p of participants) {
      participantMap.set(`${p.competitionId}:${p.playerId}`, p);
    }

    const formattedMatches = matches.map((m) => {
      const homePart = m.homePlayerId ? participantMap.get(`${m.competitionId}:${m.homePlayerId}`) : null;
      const awayPart = m.awayPlayerId ? participantMap.get(`${m.competitionId}:${m.awayPlayerId}`) : null;

      const homeTeamName = homePart?.team?.name || homePart?.teamName || m.homePlayer?.teamName || "Club TBD";
      const awayTeamName = awayPart?.team?.name || awayPart?.teamName || m.awayPlayer?.teamName || "Club TBD";
      const homeTeamLogoUrl = homePart?.team?.logoUrl || homePart?.teamLogoUrl || m.homePlayer?.avatarUrl || "/branding/default-crest.svg";
      const awayTeamLogoUrl = awayPart?.team?.logoUrl || awayPart?.teamLogoUrl || m.awayPlayer?.avatarUrl || "/branding/default-crest.svg";

      return {
        ...m,
        homeTeamName,
        awayTeamName,
        homeTeamLogoUrl,
        awayTeamLogoUrl,
        homeParticipant: homePart,
        awayParticipant: awayPart,
        homePlayer: m.homePlayer
          ? {
              ...m.homePlayer,
              teamName: homeTeamName,
              clubLogoUrl: homeTeamLogoUrl,
            }
          : null,
        awayPlayer: m.awayPlayer
          ? {
              ...m.awayPlayer,
              teamName: awayTeamName,
              clubLogoUrl: awayTeamLogoUrl,
            }
          : null,
      };
    });

    return NextResponse.json({ matches: formattedMatches });
  } catch (error) {
    console.error("GET /api/matches/recent error:", error);
    return NextResponse.json(
      { error: "Failed to fetch recent matches." },
      { status: 500 }
    );
  }
}
