import { NextResponse } from "next/server";
import { prisma } from "@/db";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const statusParam = searchParams.get("status");

    const where: Record<string, unknown> = {};
    if (statusParam) {
      where.status = statusParam;
    }

    const competitions = await prisma.competition.findMany({
      where,
      orderBy: { createdAt: "desc" },
      include: {
        teams: true,
        participants: {
          include: {
            team: true,
            player: {
              select: {
                id: true,
                username: true,
              },
            },
          },
        },
        matches: {
          where: { isCompleted: false },
          include: {
            homePlayer: true,
            awayPlayer: true,
          },
          orderBy: [
            { scheduledAt: "asc" },
            { matchday: "asc" },
          ],
        },
        _count: {
          select: {
            participants: {
              where: { status: "APPROVED" },
            },
            matches: true,
          },
        },
      },
    });

    const formatted = competitions.map((comp) => {
      const participantMap = new Map(comp.participants.map((p) => [p.playerId, p]));
      const formattedMatches = comp.matches.map((m) => {
        const homePart = m.homePlayerId ? participantMap.get(m.homePlayerId) : null;
        const awayPart = m.awayPlayerId ? participantMap.get(m.awayPlayerId) : null;
        const homeTeamName = homePart?.team?.name || homePart?.teamName || m.homePlayer?.teamName || "Home Team";
        const awayTeamName = awayPart?.team?.name || awayPart?.teamName || m.awayPlayer?.teamName || "Away Team";
        const homeTeamLogoUrl = homePart?.team?.logoUrl || homePart?.teamLogoUrl || m.homePlayer?.avatarUrl || "/branding/default-crest.svg";
        const awayTeamLogoUrl = awayPart?.team?.logoUrl || awayPart?.teamLogoUrl || m.awayPlayer?.avatarUrl || "/branding/default-crest.svg";

        return {
          ...m,
          homeTeamName,
          awayTeamName,
          homeTeamLogoUrl,
          awayTeamLogoUrl,
          homePlayer: m.homePlayer
            ? {
                ...m.homePlayer,
                name: homeTeamName,
                teamName: homeTeamName,
                clubLogoUrl: homeTeamLogoUrl,
              }
            : null,
          awayPlayer: m.awayPlayer
            ? {
                ...m.awayPlayer,
                name: awayTeamName,
                teamName: awayTeamName,
                clubLogoUrl: awayTeamLogoUrl,
              }
            : null,
        };
      });

      return {
        ...comp,
        matches: formattedMatches,
        registeredCount: comp._count.participants,
        matchCount: comp._count.matches,
      };
    });

    return NextResponse.json({ competitions: formatted });
  } catch (error) {
    console.error("GET /api/competitions error:", error);
    return NextResponse.json(
      { error: "Failed to fetch competitions." },
      { status: 500 }
    );
  }
}
