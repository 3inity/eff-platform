export interface ParticipantSeed {
  id: string; // CompetitionParticipant id
  playerId: string;
  seed?: number | null;
  knockoutSeed?: number | null;
  groupName?: string | null;
  teamName?: string | null;
  username?: string;
}

export interface GeneratedMatch {
  competitionId: string;
  homePlayerId: string | null;
  awayPlayerId: string | null;
  matchday: number | null;
  scheduledAt: Date;
  stage: string | null;
  bracketSlot: number | null;
  legNumber: number | null;
  homeScore: number | null;
  awayScore: number | null;
  isCompleted: boolean;
}

export interface RoundRobinOptions {
  startDate?: Date | null;
  matchdayDurationHours?: number;
  roundRobinLegs?: number; // 1 or 2
  stage?: string | null;
  competitionId?: string;
  participantIds?: string[];
  participants?: (ParticipantSeed | string)[];
}

/**
 * Circle Method (Berger tables) for Round-Robin schedule generation.
 * Supports both:
 * 1. generateRoundRobinSchedule(participants, competitionId, options)
 * 2. generateRoundRobinSchedule({ competitionId, participantIds, ...options })
 */
export function generateRoundRobinSchedule(
  participantsOrOptions:
    | ParticipantSeed[]
    | (RoundRobinOptions & { participantIds?: string[]; competitionId?: string; participants?: (ParticipantSeed | string)[] }),
  competitionIdArg?: string,
  optionsArg?: RoundRobinOptions
): GeneratedMatch[] {
  let participants: ParticipantSeed[] = [];
  let competitionId = competitionIdArg || "";
  let options: RoundRobinOptions = optionsArg || {};

  if (Array.isArray(participantsOrOptions)) {
    participants = participantsOrOptions;
  } else if (typeof participantsOrOptions === "object" && participantsOrOptions !== null) {
    competitionId = participantsOrOptions.competitionId || competitionId;
    options = participantsOrOptions;
    const rawList = participantsOrOptions.participants || participantsOrOptions.participantIds || [];
    participants = rawList.map((p) =>
      typeof p === "string" ? { id: p, playerId: p, username: p } : p
    );
  }

  const {
    startDate = new Date(),
    matchdayDurationHours = 48,
    roundRobinLegs = 1,
    stage = null,
  } = options;

  const baseDate = startDate ? new Date(startDate) : new Date();

  // If odd count of participants, add a dummy player for "bye"
  const playerIds: (string | null)[] = participants.map((p) => p.playerId);
  const isOdd = playerIds.length % 2 !== 0;
  if (isOdd) {
    playerIds.push(null); // null represents a bye
  }

  const n = playerIds.length;
  const roundsCount = n - 1;
  const matchesPerRound = n / 2;

  // Single round-robin rounds
  const firstLegRounds: Array<Array<{ home: string; away: string }>> = [];

  // Circle method array initialization
  const circle = [...playerIds];

  for (let r = 0; r < roundsCount; r++) {
    const roundMatches: Array<{ home: string; away: string }> = [];

    for (let i = 0; i < matchesPerRound; i++) {
      const p1 = circle[i];
      const p2 = circle[n - 1 - i];

      // Skip byes (if either is null)
      if (!p1 || !p2) continue;

      // Alternate home/away for balance
      const isEvenRound = r % 2 === 0;
      const isFirstPair = i === 0;

      let home = p1;
      let away = p2;

      if (isFirstPair) {
        if (!isEvenRound) {
          home = p2;
          away = p1;
        }
      } else {
        if (i % 2 === 1) {
          home = p2;
          away = p1;
        }
      }

      roundMatches.push({ home, away });
    }

    firstLegRounds.push(roundMatches);

    // Rotate circle array keeping element 0 fixed
    const fixed = circle[0];
    const rest = circle.slice(1);
    const last = rest.pop()!;
    circle.splice(0, circle.length, fixed, last, ...rest);
  }

  // Determine all rounds (1 leg or 2 legs)
  const allRounds: Array<Array<{ home: string; away: string; leg: number }>> = [];

  // Leg 1
  for (const round of firstLegRounds) {
    allRounds.push(round.map((m) => ({ ...m, leg: 1 })));
  }

  // Leg 2 (reverse home and away)
  if (roundRobinLegs === 2) {
    for (const round of firstLegRounds) {
      allRounds.push(
        round.map((m) => ({
          home: m.away,
          away: m.home,
          leg: 2,
        }))
      );
    }
  }

  // Calculate scheduledAt for each match
  const matches: GeneratedMatch[] = [];

  allRounds.forEach((roundMatches, roundIdx) => {
    const matchday = roundIdx + 1;
    // matchdayStart = startDate + (matchday - 1) * matchdayDurationHours
    const matchdayStartMs =
      baseDate.getTime() + (matchday - 1) * matchdayDurationHours * 3600 * 1000;

    // Spread factor within the matchday (default 2 hours, proportional if shorter)
    const spreadHours = Math.max(1, Math.min(2, matchdayDurationHours / Math.max(1, roundMatches.length + 1)));

    roundMatches.forEach((m, matchIdx) => {
      const scheduledTimeMs = matchdayStartMs + matchIdx * spreadHours * 3600 * 1000;

      matches.push({
        competitionId,
        homePlayerId: m.home,
        awayPlayerId: m.away,
        matchday,
        scheduledAt: new Date(scheduledTimeMs),
        stage,
        bracketSlot: null,
        legNumber: m.leg,
        homeScore: null,
        awayScore: null,
        isCompleted: false,
      });
    });
  });

  return matches;
}

/**
 * Returns round stage name based on participants remaining in the round.
 */
export function getKnockoutStageName(bracketSizeForRound: number): string {
  switch (bracketSizeForRound) {
    case 2:
      return "FINAL";
    case 4:
      return "SEMIFINAL";
    case 8:
      return "QUARTERFINAL";
    case 16:
      return "ROUND_OF_16";
    case 32:
      return "ROUND_OF_32";
    default:
      return `ROUND_OF_${bracketSizeForRound}`;
  }
}

export interface KnockoutOptions {
  startDate?: Date | null;
  matchdayDurationHours?: number;
  knockoutLegs?: number; // 1 or 2
  competitionId?: string;
  participantIds?: string[];
  participants?: (ParticipantSeed | string)[];
}

/**
 * Knockout Bracket Generation with placeholder matches for all subsequent rounds.
 * Supports both:
 * 1. generateKnockoutBracket(participants, competitionId, options)
 * 2. generateKnockoutBracket({ competitionId, participantIds, ...options })
 */
export function generateKnockoutBracket(
  participantsOrOptions:
    | ParticipantSeed[]
    | (KnockoutOptions & { participantIds?: string[]; competitionId?: string; participants?: (ParticipantSeed | string)[] }),
  competitionIdArg?: string,
  optionsArg?: KnockoutOptions
): GeneratedMatch[] {
  let participants: ParticipantSeed[] = [];
  let competitionId = competitionIdArg || "";
  let options: KnockoutOptions = optionsArg || {};

  if (Array.isArray(participantsOrOptions)) {
    participants = participantsOrOptions;
  } else if (typeof participantsOrOptions === "object" && participantsOrOptions !== null) {
    competitionId = participantsOrOptions.competitionId || competitionId;
    options = participantsOrOptions;
    const rawList = participantsOrOptions.participants || participantsOrOptions.participantIds || [];
    participants = rawList.map((p) =>
      typeof p === "string" ? { id: p, playerId: p, username: p } : p
    );
  }

  const {
    startDate = new Date(),
    matchdayDurationHours = 48,
    knockoutLegs = 1,
  } = options;

  const baseDate = startDate ? new Date(startDate) : new Date();
  const count = participants.length;

  if (count < 2) {
    throw new Error("Knockout tournament requires at least 2 participants.");
  }

  // Smallest power of 2 >= count
  let bracketSize = 2;
  while (bracketSize < count) {
    bracketSize *= 2;
  }

  // Sort participants by knockoutSeed or seed or index
  const seeded = [...participants].sort((a, b) => {
    const sA = a.knockoutSeed ?? a.seed ?? 9999;
    const sB = b.knockoutSeed ?? b.seed ?? 9999;
    return sA - sB;
  });

  // Standard tournament seeding matchup generator (1 vs 8, 4 vs 5, 2 vs 7, 3 vs 6)
  function getSeedPairs(size: number): number[] {
    let rounds = [1, 2];
    while (rounds.length < size) {
      const next: number[] = [];
      const currentSize = rounds.length * 2;
      for (const s of rounds) {
        next.push(s);
        next.push(currentSize + 1 - s);
      }
      rounds = next;
    }
    return rounds;
  }

  const seedOrder = getSeedPairs(bracketSize);
  const slots: (string | null)[] = seedOrder.map((seedNum) => {
    const p = seeded[seedNum - 1];
    return p ? p.playerId : null;
  });

  const matches: GeneratedMatch[] = [];
  let currentRoundSize = bracketSize;
  let roundIndex = 0;
  let globalSlot = 1;

  // Round 1 (First round with known seeds and possible byes)
  const round1PairsCount = currentRoundSize / 2;
  const round1Stage = getKnockoutStageName(currentRoundSize);
  const round1StartMs = baseDate.getTime() + roundIndex * matchdayDurationHours * 3600 * 1000;

  for (let i = 0; i < round1PairsCount; i++) {
    const p1 = slots[i * 2];
    const p2 = slots[i * 2 + 1];
    const slotNumber = globalSlot++;

    // Leg 1
    const matchTime1 = new Date(round1StartMs + i * 2 * 3600 * 1000);
    matches.push({
      competitionId,
      homePlayerId: p1,
      awayPlayerId: p2,
      matchday: roundIndex + 1,
      scheduledAt: matchTime1,
      stage: round1Stage,
      bracketSlot: slotNumber,
      legNumber: 1,
      homeScore: null,
      awayScore: null,
      isCompleted: false,
    });

    // Leg 2 (if two-leg tie)
    if (knockoutLegs === 2) {
      const matchTime2 = new Date(
        round1StartMs + (matchdayDurationHours / 2) * 3600 * 1000 + i * 2 * 3600 * 1000
      );
      matches.push({
        competitionId,
        homePlayerId: p2,
        awayPlayerId: p1,
        matchday: roundIndex + 1,
        scheduledAt: matchTime2,
        stage: round1Stage,
        bracketSlot: slotNumber,
        legNumber: 2,
        homeScore: null,
        awayScore: null,
        isCompleted: false,
      });
    }
  }

  // Subsequent placeholder rounds up to the FINAL
  currentRoundSize /= 2;
  roundIndex++;

  while (currentRoundSize >= 2) {
    const pairsCount = currentRoundSize / 2;
    const stage = getKnockoutStageName(currentRoundSize);
    const roundStartMs = baseDate.getTime() + roundIndex * matchdayDurationHours * 3600 * 1000;

    for (let i = 0; i < pairsCount; i++) {
      const slotNumber = globalSlot++;

      // Leg 1 placeholder
      const matchTime1 = new Date(roundStartMs + i * 2 * 3600 * 1000);
      matches.push({
        competitionId,
        homePlayerId: null, // Placeholder for advanced winner
        awayPlayerId: null,
        matchday: roundIndex + 1,
        scheduledAt: matchTime1,
        stage,
        bracketSlot: slotNumber,
        legNumber: 1,
        homeScore: null,
        awayScore: null,
        isCompleted: false,
      });

      // Leg 2 placeholder
      if (knockoutLegs === 2) {
        const matchTime2 = new Date(
          roundStartMs + (matchdayDurationHours / 2) * 3600 * 1000 + i * 2 * 3600 * 1000
        );
        matches.push({
          competitionId,
          homePlayerId: null,
          awayPlayerId: null,
          matchday: roundIndex + 1,
          scheduledAt: matchTime2,
          stage,
          bracketSlot: slotNumber,
          legNumber: 2,
          homeScore: null,
          awayScore: null,
          isCompleted: false,
        });
      }
    }

    currentRoundSize /= 2;
    roundIndex++;
  }

  // Auto-advance byes in round 1 if any
  for (const m of matches) {
    if (m.legNumber === 1 && m.bracketSlot !== null && m.homePlayerId && !m.awayPlayerId) {
      m.isCompleted = true;
      const { targetSlot, position } = getNextBracketSlot(m.bracketSlot, bracketSize);
      if (targetSlot) {
        const targetMatches = matches.filter((tm) => tm.bracketSlot === targetSlot);
        for (const tm of targetMatches) {
          if (position === "home") {
            tm.homePlayerId = m.homePlayerId;
          } else {
            tm.awayPlayerId = m.homePlayerId;
          }
        }
      }
    }
  }

  return matches;
}

/**
 * Determines the next bracket slot and position for a completed knockout slot.
 */
export function getNextBracketSlot(
  bracketSlot: number,
  bracketSize: number
): { targetSlot: number | null; position: "home" | "away" } {
  // Build rounds array of tie counts
  const rounds: number[] = [];
  let s = bracketSize / 2;
  while (s >= 1) {
    rounds.push(s);
    s /= 2;
  }

  const startSlots: number[] = [];
  let currentStart = 1;
  for (const count of rounds) {
    startSlots.push(currentStart);
    currentStart += count;
  }

  // Find round index for this slot
  let roundIdx = -1;
  for (let i = 0; i < rounds.length; i++) {
    const start = startSlots[i];
    const end = start + rounds[i] - 1;
    if (bracketSlot >= start && bracketSlot <= end) {
      roundIdx = i;
      break;
    }
  }

  if (roundIdx === -1 || roundIdx === rounds.length - 1) {
    return { targetSlot: null, position: "home" }; // Already in Final
  }

  const idxInRound = bracketSlot - startSlots[roundIdx];
  const targetSlot = startSlots[roundIdx + 1] + Math.floor(idxInRound / 2);
  const position = idxInRound % 2 === 0 ? "home" : "away";

  return { targetSlot, position };
}

export interface TieMatchRecord {
  id: string;
  homePlayerId: string | null;
  awayPlayerId: string | null;
  homeScore: number | null;
  awayScore: number | null;
  homePenalty: number | null;
  awayPenalty: number | null;
  legNumber: number | null;
  bracketSlot: number | null;
  isCompleted: boolean;
}

/**
 * Resolves the winner for a completed tie (single-leg or two-leg).
 */
export function resolveTieWinner(
  matchesInSlot: TieMatchRecord[]
): { winnerPlayerId: string | null; isDecided: boolean; requiresShootout: boolean } {
  if (matchesInSlot.length === 0) {
    return { winnerPlayerId: null, isDecided: false, requiresShootout: false };
  }

  // Single-leg tie
  if (matchesInSlot.length === 1) {
    const m = matchesInSlot[0];
    if (m.homeScore === null || m.awayScore === null) {
      // Bye check
      if (m.homePlayerId && !m.awayPlayerId) {
        return { winnerPlayerId: m.homePlayerId, isDecided: true, requiresShootout: false };
      }
      if (!m.homePlayerId && m.awayPlayerId) {
        return { winnerPlayerId: m.awayPlayerId, isDecided: true, requiresShootout: false };
      }
      return { winnerPlayerId: null, isDecided: false, requiresShootout: false };
    }

    if (m.homeScore > m.awayScore) {
      return { winnerPlayerId: m.homePlayerId, isDecided: true, requiresShootout: false };
    }
    if (m.awayScore > m.homeScore) {
      return { winnerPlayerId: m.awayPlayerId, isDecided: true, requiresShootout: false };
    }

    // Tied - check penalties
    if (m.homePenalty !== null && m.awayPenalty !== null) {
      if (m.homePenalty > m.awayPenalty) {
        return { winnerPlayerId: m.homePlayerId, isDecided: true, requiresShootout: false };
      }
      if (m.awayPenalty > m.homePenalty) {
        return { winnerPlayerId: m.awayPlayerId, isDecided: true, requiresShootout: false };
      }
    }

    return { winnerPlayerId: null, isDecided: false, requiresShootout: true };
  }

  // Two-leg tie
  const leg1 = matchesInSlot.find((m) => m.legNumber === 1);
  const leg2 = matchesInSlot.find((m) => m.legNumber === 2);

  if (
    !leg1 ||
    !leg2 ||
    leg1.homeScore === null ||
    leg1.awayScore === null ||
    leg2.homeScore === null ||
    leg2.awayScore === null
  ) {
    return { winnerPlayerId: null, isDecided: false, requiresShootout: false };
  }

  // In leg 1: Team A is home, Team B is away
  // In leg 2: Team B is home, Team A is away
  const teamA = leg1.homePlayerId;
  const teamB = leg1.awayPlayerId;

  const scoreA = leg1.homeScore + leg2.awayScore;
  const scoreB = leg1.awayScore + leg2.homeScore;

  if (scoreA > scoreB) {
    return { winnerPlayerId: teamA, isDecided: true, requiresShootout: false };
  }
  if (scoreB > scoreA) {
    return { winnerPlayerId: teamB, isDecided: true, requiresShootout: false };
  }

  // Away goals rule
  const awayGoalsA = leg2.awayScore;
  const awayGoalsB = leg1.awayScore;

  if (awayGoalsA > awayGoalsB) {
    return { winnerPlayerId: teamA, isDecided: true, requiresShootout: false };
  }
  if (awayGoalsB > awayGoalsA) {
    return { winnerPlayerId: teamB, isDecided: true, requiresShootout: false };
  }

  // Aggregate and away goals tied -> shootout in Leg 2
  const penHome = leg2.homePenalty;
  const penAway = leg2.awayPenalty;

  if (penHome !== null && penAway !== null) {
    // In leg 2: home is Team B, away is Team A
    if (penHome > penAway) {
      return { winnerPlayerId: teamB, isDecided: true, requiresShootout: false };
    }
    if (penAway > penHome) {
      return { winnerPlayerId: teamA, isDecided: true, requiresShootout: false };
    }
  }

  return { winnerPlayerId: null, isDecided: false, requiresShootout: true };
}

export interface StandingsRow {
  position: number;
  playerId: string;
  username: string;
  teamName: string;
  groupName?: string | null;
  played: number;
  wins: number;
  draws: number;
  losses: number;
  goalsFor: number;
  goalsAgainst: number;
  goalDifference: number;
  points: number;
}

export function computeStandings(
  participants: Array<{
    playerId: string;
    teamName?: string | null;
    groupName?: string | null;
    player?: { username: string; teamName?: string | null } | null;
    team?: { name?: string | null } | null;
  }>,
  matches: Array<{
    homePlayerId: string | null;
    awayPlayerId: string | null;
    homeScore: number | null;
    awayScore: number | null;
    stage?: string | null;
    isCompleted?: boolean;
  }>,
  filterGroupName?: string | null
): StandingsRow[] {
  const filteredParts = filterGroupName
    ? participants.filter((p) => p.groupName === filterGroupName)
    : participants;

  const playerIds = new Set(filteredParts.map((p) => p.playerId));

  const completedMatches = matches.filter(
    (m) =>
      (m.isCompleted || (m.homeScore !== null && m.awayScore !== null)) &&
      m.homeScore !== null &&
      m.awayScore !== null &&
      m.homePlayerId &&
      m.awayPlayerId &&
      playerIds.has(m.homePlayerId) &&
      playerIds.has(m.awayPlayerId) &&
      (!filterGroupName || m.stage === `GROUP_${filterGroupName}`)
  );

  const rows: StandingsRow[] = filteredParts.map((p) => {
    let played = 0;
    let wins = 0;
    let draws = 0;
    let losses = 0;
    let goalsFor = 0;
    let goalsAgainst = 0;

    for (const m of completedMatches) {
      if (m.homePlayerId === p.playerId) {
        played++;
        goalsFor += m.homeScore!;
        goalsAgainst += m.awayScore!;
        if (m.homeScore! > m.awayScore!) wins++;
        else if (m.homeScore! === m.awayScore!) draws++;
        else losses++;
      } else if (m.awayPlayerId === p.playerId) {
        played++;
        goalsFor += m.awayScore!;
        goalsAgainst += m.homeScore!;
        if (m.awayScore! > m.homeScore!) wins++;
        else if (m.awayScore! === m.homeScore!) draws++;
        else losses++;
      }
    }

    const goalDifference = goalsFor - goalsAgainst;
    const points = wins * 3 + draws * 1;

    return {
      position: 0,
      playerId: p.playerId,
      username: p.player?.username || "Unknown",
      teamName: p.teamName || p.team?.name || p.player?.teamName || "EFF Club",
      groupName: p.groupName,
      played,
      wins,
      draws,
      losses,
      goalsFor,
      goalsAgainst,
      goalDifference,
      points,
    };
  });

  rows.sort((a, b) => {
    if (b.points !== a.points) return b.points - a.points;
    if (b.goalDifference !== a.goalDifference) return b.goalDifference - a.goalDifference;
    if (b.goalsFor !== a.goalsFor) return b.goalsFor - a.goalsFor;
    return b.wins - a.wins;
  });

  rows.forEach((r, idx) => {
    r.position = idx + 1;
  });

  return rows;
}

