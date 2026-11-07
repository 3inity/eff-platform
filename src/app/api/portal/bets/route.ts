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

  // Query playable matches for any IN_PROGRESS competition
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

  return NextResponse.json({ bets, matches: formattedMatches });
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
