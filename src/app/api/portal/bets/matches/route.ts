import { NextResponse } from "next/server";
import { prisma } from "@/db";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    // Query the Match table for ALL matches where isCompleted is false,
    // belonging to ANY competition with status === "IN_PROGRESS".
    const matches = await prisma.match.findMany({
      where: {
        isCompleted: false,
        competition: {
          status: "IN_PROGRESS",
        },
        homePlayerId: { not: null },
        awayPlayerId: { not: null },
      },
      include: {
        competition: {
          select: {
            id: true,
            name: true,
            season: true,
            format: true,
            status: true,
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
      orderBy: [
        { scheduledAt: "asc" },
        { matchday: "asc" },
      ],
    });

    // Fetch CompetitionParticipant records to map per-competition team names & crests
    const competitionIds = Array.from(new Set(matches.map((m) => m.competitionId)));
    const participants = await prisma.competitionParticipant.findMany({
      where: {
        competitionId: { in: competitionIds },
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

      const homeTeamName = homePart?.team?.name || homePart?.teamName || m.homePlayer?.teamName || "Home Team";
      const awayTeamName = awayPart?.team?.name || awayPart?.teamName || m.awayPlayer?.teamName || "Away Team";
      const homeLogoUrl = homePart?.team?.logoUrl || homePart?.teamLogoUrl || m.homePlayer?.avatarUrl || "/branding/default-crest.svg";
      const awayLogoUrl = awayPart?.team?.logoUrl || awayPart?.teamLogoUrl || m.awayPlayer?.avatarUrl || "/branding/default-crest.svg";

      const charCodeSum = m.id.split("").reduce((sum, c) => sum + c.charCodeAt(0), 0);
      const homeOdds = Number((1.65 + ((charCodeSum % 7) * 0.08)).toFixed(2));
      const drawOdds = Number((3.10 + ((charCodeSum % 5) * 0.10)).toFixed(2));
      const awayOdds = Number((1.95 + (((charCodeSum + 3) % 8) * 0.08)).toFixed(2));
      const over35Odds = Number((2.15 + ((charCodeSum % 6) * 0.08)).toFixed(2));
      const under25Odds = Number((1.60 + (((charCodeSum + 2) % 5) * 0.07)).toFixed(2));

      return {
        id: m.id,
        competitionId: m.competitionId,
        competitionName: m.competition.name,
        competitionSeason: m.competition.season,
        stage: m.stage,
        matchday: m.matchday,
        legNumber: m.legNumber,
        scheduledAt: m.scheduledAt,
        isCompleted: m.isCompleted,
        homePlayer: {
          id: m.homePlayer?.id || "",
          name: homeTeamName,
          username: m.homePlayer?.username || "",
          teamName: homeTeamName,
          logoUrl: homeLogoUrl,
        },
        awayPlayer: {
          id: m.awayPlayer?.id || "",
          name: awayTeamName,
          username: m.awayPlayer?.username || "",
          teamName: awayTeamName,
          logoUrl: awayLogoUrl,
        },
        homeOdds,
        drawOdds,
        awayOdds,
        over35Odds,
        under25Odds,
      };
    });

    return NextResponse.json({ matches: formattedMatches });
  } catch (error) {
    console.error("GET /api/portal/bets/matches error:", error);
    return NextResponse.json({ error: "Failed to fetch playable matches." }, { status: 500 });
  }
}
