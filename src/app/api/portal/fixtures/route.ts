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

    // Fetch CompetitionParticipant records to map per-competition team names & crests
    const compIds = Array.from(new Set(fixtures.map((f) => f.competitionId)));
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

    const formattedFixtures = fixtures.map((m) => {
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

    return NextResponse.json({ fixtures: formattedFixtures, playerId: payload.playerId });
  } catch (error) {
    console.error("GET /api/portal/fixtures error:", error);
    return NextResponse.json(
      { error: "Failed to fetch fixtures." },
      { status: 500 }
    );
  }
}
