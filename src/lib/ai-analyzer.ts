import { prisma } from "@/db";

export interface AnalysisResult {
  homePlayer: {
    id: string;
    username: string;
    teamName: string;
    clubName: string;
    winRate: number;
    avgGoalsFor: number;
    avgGoalsAgainst: number;
    recentForm: ("W" | "D" | "L")[];
  };
  awayPlayer: {
    id: string;
    username: string;
    teamName: string;
    clubName: string;
    winRate: number;
    avgGoalsFor: number;
    avgGoalsAgainst: number;
    recentForm: ("W" | "D" | "L")[];
  };
  headToHead: {
    totalMatches: number;
    homeWins: number;
    awayWins: number;
    draws: number;
  };
  analysis: string[];
  summary: string;
  predictedWinner: "HOME" | "AWAY" | "DRAW";
  confidenceScore: number; // 0-100%
}

export async function analyzeMatch(homeId: string, awayId: string): Promise<AnalysisResult> {
  const [homePlayer, awayPlayer, h2hMatches, homeRecentMatches, awayRecentMatches] = await Promise.all([
    prisma.player.findUnique({ where: { id: homeId } }),
    prisma.player.findUnique({ where: { id: awayId } }),
    prisma.match.findMany({
      where: {
        OR: [
          { homePlayerId: homeId, awayPlayerId: awayId },
          { homePlayerId: awayId, awayPlayerId: homeId },
        ],
      },
      orderBy: { playedAt: "desc" },
    }),
    prisma.match.findMany({
      where: {
        OR: [{ homePlayerId: homeId }, { awayPlayerId: homeId }],
      },
      orderBy: { playedAt: "desc" },
      take: 5,
    }),
    prisma.match.findMany({
      where: {
        OR: [{ homePlayerId: awayId }, { awayPlayerId: awayId }],
      },
      orderBy: { playedAt: "desc" },
      take: 5,
    }),
  ]);

  if (!homePlayer || !awayPlayer) {
    throw new Error("One or both players not found.");
  }

  // Calculate form
  const getForm = (playerId: string, matches: typeof homeRecentMatches): ("W" | "D" | "L")[] => {
    return matches.map((m) => {
      const isHome = m.homePlayerId === playerId;
      const myScore = isHome ? m.homeScore : m.awayScore;
      const oppScore = isHome ? m.awayScore : m.homeScore;
      if (myScore > oppScore) return "W";
      if (myScore < oppScore) return "L";
      return "D";
    });
  };

  const homeForm = getForm(homeId, homeRecentMatches);
  const awayForm = getForm(awayId, awayRecentMatches);

  const homeTotalGames = homePlayer.wins + homePlayer.draws + homePlayer.losses;
  const awayTotalGames = awayPlayer.wins + awayPlayer.draws + awayPlayer.losses;

  const homeWinRate = homeTotalGames > 0 ? (homePlayer.wins / homeTotalGames) * 100 : 0;
  const awayWinRate = awayTotalGames > 0 ? (awayPlayer.wins / awayTotalGames) * 100 : 0;

  const homeAvgGoalsFor = homeTotalGames > 0 ? +(homePlayer.goalsFor / homeTotalGames).toFixed(1) : 0;
  const homeAvgGoalsAgainst = homeTotalGames > 0 ? +(homePlayer.goalsAgainst / homeTotalGames).toFixed(1) : 0;
  const awayAvgGoalsFor = awayTotalGames > 0 ? +(awayPlayer.goalsFor / awayTotalGames).toFixed(1) : 0;
  const awayAvgGoalsAgainst = awayTotalGames > 0 ? +(awayPlayer.goalsAgainst / awayTotalGames).toFixed(1) : 0;

  // H2H stats
  let h2hHomeWins = 0;
  let h2hAwayWins = 0;
  let h2hDraws = 0;

  for (const m of h2hMatches) {
    if (m.homeScore === m.awayScore) {
      h2hDraws++;
    } else if (
      (m.homePlayerId === homeId && m.homeScore > m.awayScore) ||
      (m.awayPlayerId === homeId && m.awayScore > m.homeScore)
    ) {
      h2hHomeWins++;
    } else {
      h2hAwayWins++;
    }
  }

  // Build rule-based sentences
  const sentences: string[] = [];
  const homeWinsIn5 = homeForm.filter((f) => f === "W").length;
  const awayWinsIn5 = awayForm.filter((f) => f === "W").length;
  const awayLossesIn5 = awayForm.filter((f) => f === "L").length;
  const homeLossesIn5 = homeForm.filter((f) => f === "L").length;

  // Sentence 1: Form comparison
  if (homeWinsIn5 >= 3 && awayLossesIn5 >= 3) {
    sentences.push(
      `${homePlayer.username} enters in commanding rhythm, winning ${homeWinsIn5} of the last 5 outings, whereas ${awayPlayer.username} has suffered ${awayLossesIn5} defeats across their previous 5 games.`
    );
  } else if (homeWinsIn5 >= 3) {
    sentences.push(
      `${homePlayer.username} has built serious momentum with ${homeWinsIn5} victories in their last 5 fixtures, maintaining a sharp competitive edge.`
    );
  } else if (awayWinsIn5 >= 3) {
    sentences.push(
      `${awayPlayer.username} arrives with impressive sharpness, taking ${awayWinsIn5} wins from their last 5 fixtures and looking dangerous on the counter.`
    );
  } else if (homeWinsIn5 === 0 && awayWinsIn5 === 0) {
    sentences.push(
      `Both sides are searching for form after going winless across their last 5 outings, making resilience and early composure critical in this encounter.`
    );
  } else {
    sentences.push(
      `Both sides display fluctuating form over recent matches, with ${homePlayer.username} taking ${homeWinsIn5} wins and ${awayPlayer.username} securing ${awayWinsIn5} wins in their last 5 games.`
    );
  }

  // Sentence 2: Scoring and defensive profile
  sentences.push(
    `${homePlayer.username} averages ${homeAvgGoalsFor} goals scored and ${homeAvgGoalsAgainst} conceded per contest, compared to ${awayPlayer.username}'s tally of ${awayAvgGoalsFor} scored and ${awayAvgGoalsAgainst} conceded.`
  );

  // Sentence 3: Head to Head
  if (h2hMatches.length > 0) {
    if (h2hHomeWins > h2hAwayWins) {
      sentences.push(
        `Head-to-head history tips in favor of ${homePlayer.username}, who holds ${h2hHomeWins} victories to ${h2hAwayWins} over ${h2hMatches.length} recorded meetings.`
      );
    } else if (h2hAwayWins > h2hHomeWins) {
      sentences.push(
        `${awayPlayer.username} enjoys the psychological edge in historical duels, leading the head-to-head record with ${h2hAwayWins} wins to ${h2hHomeWins}.`
      );
    } else {
      sentences.push(
        `Direct encounters between these two have been intensely contested, standing completely level at ${h2hHomeWins}-${h2hAwayWins} across ${h2hMatches.length} previous clashes.`
      );
    }
  } else {
    sentences.push(
      `This fixture marks their inaugural competitive clash in the EFF database, removing prior head-to-head tendencies and placing all weight on current execution.`
    );
  }

  // Sentence 4: Tactical summary & verdict
  let predictedWinner: "HOME" | "AWAY" | "DRAW" = "DRAW";
  let confidence = 50;

  const homeScoreRank = homeWinRate * 0.4 + (homeWinsIn5 * 20) * 0.4 + (homeAvgGoalsFor - homeAvgGoalsAgainst) * 10;
  const awayScoreRank = awayWinRate * 0.4 + (awayWinsIn5 * 20) * 0.4 + (awayAvgGoalsFor - awayAvgGoalsAgainst) * 10;

  if (homeScoreRank > awayScoreRank + 15) {
    predictedWinner = "HOME";
    confidence = Math.min(88, Math.round(55 + (homeScoreRank - awayScoreRank)));
    sentences.push(
      `Expect ${homePlayer.username} to dictate possession and capitalize on defensive lapses to secure a decisive victory.`
    );
  } else if (awayScoreRank > homeScoreRank + 15) {
    predictedWinner = "AWAY";
    confidence = Math.min(88, Math.round(55 + (awayScoreRank - homeScoreRank)));
    sentences.push(
      `Expect ${awayPlayer.username} to exploit spaces behind the backline and produce an assertive road victory.`
    );
  } else {
    predictedWinner = "DRAW";
    confidence = 62;
    sentences.push(
      `With both managers matched closely in efficiency and defensive vulnerabilities, expect a tightly contested stalemate.`
    );
  }

  return {
    homePlayer: {
      id: homePlayer.id,
      username: homePlayer.username,
      teamName: homePlayer.teamName,
      clubName: homePlayer.teamName,
      winRate: Math.round(homeWinRate),
      avgGoalsFor: homeAvgGoalsFor,
      avgGoalsAgainst: homeAvgGoalsAgainst,
      recentForm: homeForm,
    },
    awayPlayer: {
      id: awayPlayer.id,
      username: awayPlayer.username,
      teamName: awayPlayer.teamName,
      clubName: awayPlayer.teamName,
      winRate: Math.round(awayWinRate),
      avgGoalsFor: awayAvgGoalsFor,
      avgGoalsAgainst: awayAvgGoalsAgainst,
      recentForm: awayForm,
    },
    headToHead: {
      totalMatches: h2hMatches.length,
      homeWins: h2hHomeWins,
      awayWins: h2hAwayWins,
      draws: h2hDraws,
    },
    analysis: sentences,
    summary: sentences.join(" "),
    predictedWinner,
    confidenceScore: confidence,
  };
}
