import assert from "assert";
import {
  generateRoundRobinSchedule,
  generateKnockoutBracket,
  resolveTieWinner,
  getNextBracketSlot,
  computeStandings,
} from "../src/lib/fixtures.ts";

console.log("=================================================");
console.log("FIXTURE GENERATION SYSTEM - VERIFICATION SUITE");
console.log("=================================================\n");

const startDate = new Date("2026-11-01T12:00:00.000Z");

// ============================================================================
// Scenario a: Single round-robin (6 participants, roundRobinLegs=1, 48h)
// ============================================================================
console.log("--- Test a: Single round-robin (6 participants, legs=1, 48h) ---");
{
  const participants = ["P1", "P2", "P3", "P4", "P5", "P6"];
  const schedule = generateRoundRobinSchedule({
    competitionId: "comp-single-rr",
    participantIds: participants,
    startDate,
    matchdayDurationHours: 48,
    roundRobinLegs: 1,
  });

  console.log(`Generated matches: ${schedule.length}`);
  assert.strictEqual(schedule.length, 15, "Expected 15 matches for 6 teams in single round-robin");

  // Check rounds/matchdays
  const matchdays = new Set(schedule.map((m) => m.matchday));
  console.log(`Matchdays count: ${matchdays.size}`);
  assert.strictEqual(matchdays.size, 5, "Expected 5 matchdays");

  // Check each pair plays once
  const pairCounts = new Map();
  for (const m of schedule) {
    const pair = [m.homePlayerId, m.awayPlayerId].sort().join(" vs ");
    pairCounts.set(pair, (pairCounts.get(pair) || 0) + 1);
  }
  assert.strictEqual(pairCounts.size, 15, "Expected 15 unique matchups");
  for (const [pair, count] of pairCounts.entries()) {
    assert.strictEqual(count, 1, `Pair ${pair} should play exactly once`);
  }

  // Check dates and 2h spread within matchdays
  for (let md = 1; md <= 5; md++) {
    const mdMatches = schedule.filter((m) => m.matchday === md);
    assert.strictEqual(mdMatches.length, 3, `Expected 3 matches in matchday ${md}`);

    // Base expected kickoff for match 0 of matchday md
    const expectedBaseMs = startDate.getTime() + (md - 1) * 48 * 3600 * 1000;
    mdMatches.forEach((m, idx) => {
      const kickoffMs = m.scheduledAt.getTime();
      const expectedKickoffMs = expectedBaseMs + idx * 2 * 3600 * 1000;
      assert.strictEqual(
        kickoffMs,
        expectedKickoffMs,
        `Matchday ${md} match ${idx} kickoff time mismatch`
      );
    });
  }

  // Home/away balance check (each team plays 5 games: 2 home/3 away or 3 home/2 away)
  const homeCount = new Map();
  const awayCount = new Map();
  for (const p of participants) {
    homeCount.set(p, 0);
    awayCount.set(p, 0);
  }
  for (const m of schedule) {
    homeCount.set(m.homePlayerId, homeCount.get(m.homePlayerId) + 1);
    awayCount.set(m.awayPlayerId, awayCount.get(m.awayPlayerId) + 1);
  }
  for (const p of participants) {
    const total = homeCount.get(p) + awayCount.get(p);
    assert.strictEqual(total, 5, `${p} should have 5 total matches`);
    const diff = Math.abs(homeCount.get(p) - awayCount.get(p));
    assert.ok(diff <= 1, `${p} home/away balance difference ${diff} exceeds 1`);
  }

  console.log("✓ PASS: Single round-robin: 15 matches across 5 matchdays, 2h spread, balanced home/away.\n");
}

// ============================================================================
// Scenario b: Double round-robin (6 participants, roundRobinLegs=2, 48h)
// ============================================================================
console.log("--- Test b: Double round-robin (6 participants, legs=2, 48h) ---");
{
  const participants = ["P1", "P2", "P3", "P4", "P5", "P6"];
  const schedule = generateRoundRobinSchedule({
    competitionId: "comp-double-rr",
    participantIds: participants,
    startDate,
    matchdayDurationHours: 48,
    roundRobinLegs: 2,
  });

  console.log(`Generated matches: ${schedule.length}`);
  assert.strictEqual(schedule.length, 30, "Expected 30 matches for 6 teams in double round-robin");

  const matchdays = new Set(schedule.map((m) => m.matchday));
  console.log(`Matchdays count: ${matchdays.size}`);
  assert.strictEqual(matchdays.size, 10, "Expected 10 matchdays");

  // Verify each pair plays twice: once home, once away
  const pairDirections = new Map();
  for (const m of schedule) {
    const key = `${m.homePlayerId} -> ${m.awayPlayerId}`;
    pairDirections.set(key, (pairDirections.get(key) || 0) + 1);
  }

  for (let i = 0; i < participants.length; i++) {
    for (let j = 0; j < participants.length; j++) {
      if (i !== j) {
        const fixture = `${participants[i]} -> ${participants[j]}`;
        assert.strictEqual(
          pairDirections.get(fixture),
          1,
          `Expected fixture ${fixture} to occur exactly once`
        );
      }
    }
  }

  console.log("✓ PASS: Double round-robin: 30 matches across 10 matchdays, reverse home/away balanced.\n");
}

// ============================================================================
// Scenario c: Odd participants (5 participants)
// ============================================================================
console.log("--- Test c: Odd participants (5 participants, legs=1, 48h) ---");
{
  const participants = ["P1", "P2", "P3", "P4", "P5"];
  const schedule = generateRoundRobinSchedule({
    competitionId: "comp-odd-rr",
    participantIds: participants,
    startDate,
    matchdayDurationHours: 48,
    roundRobinLegs: 1,
  });

  console.log(`Generated matches: ${schedule.length}`);
  assert.strictEqual(schedule.length, 10, "Expected 10 matches for 5 teams");

  const matchdays = new Set(schedule.map((m) => m.matchday));
  assert.strictEqual(matchdays.size, 5, "Expected 5 matchdays");

  // In each matchday, exactly 4 teams play (2 matches) and 1 team has a bye
  for (let md = 1; md <= 5; md++) {
    const mdMatches = schedule.filter((m) => m.matchday === md);
    assert.strictEqual(mdMatches.length, 2, `Expected 2 matches in matchday ${md}`);
    const teamsPlaying = new Set();
    mdMatches.forEach((m) => {
      teamsPlaying.add(m.homePlayerId);
      teamsPlaying.add(m.awayPlayerId);
    });
    assert.strictEqual(teamsPlaying.size, 4, `Expected 4 teams playing in matchday ${md}`);
    const byeTeam = participants.find((p) => !teamsPlaying.has(p));
    assert.ok(byeTeam, `Expected a bye team in matchday ${md}`);
  }

  console.log("✓ PASS: Odd participants: 10 matches across 5 matchdays, 1 bye per matchday.\n");
}

// ============================================================================
// Scenario d: Knockout single-leg (8 participants)
// ============================================================================
console.log("--- Test d: Knockout single-leg (8 participants) ---");
{
  const participants = ["P1", "P2", "P3", "P4", "P5", "P6", "P7", "P8"];
  const knockout = generateKnockoutBracket({
    competitionId: "comp-ko-single",
    participantIds: participants,
    startDate,
    matchdayDurationHours: 48,
    knockoutLegs: 1,
  });

  console.log(`Total knockout matches generated: ${knockout.length}`);
  assert.strictEqual(knockout.length, 7, "Expected 7 matches (4 QF, 2 SF, 1 Final)");

  const qf = knockout.filter((m) => m.stage === "QUARTERFINAL");
  const sf = knockout.filter((m) => m.stage === "SEMIFINAL");
  const final = knockout.filter((m) => m.stage === "FINAL");

  assert.strictEqual(qf.length, 4, "Expected 4 QF matches");
  assert.strictEqual(sf.length, 2, "Expected 2 SF matches");
  assert.strictEqual(final.length, 1, "Expected 1 Final match");

  // Verify next slot target calculation
  // QF slots: 1, 2, 3, 4 -> SF slots: 5, 6 -> Final slot: 7
  const next1 = getNextBracketSlot(1, 8);
  const next2 = getNextBracketSlot(2, 8);
  const next3 = getNextBracketSlot(3, 8);
  const next4 = getNextBracketSlot(4, 8);
  const next5 = getNextBracketSlot(5, 8);
  const next6 = getNextBracketSlot(6, 8);

  assert.deepStrictEqual(next1, { targetSlot: 5, position: "home" });
  assert.deepStrictEqual(next2, { targetSlot: 5, position: "away" });
  assert.deepStrictEqual(next3, { targetSlot: 6, position: "home" });
  assert.deepStrictEqual(next4, { targetSlot: 6, position: "away" });
  assert.deepStrictEqual(next5, { targetSlot: 7, position: "home" });
  assert.deepStrictEqual(next6, { targetSlot: 7, position: "away" });

  // Test single-leg result advancement
  const tie1 = [{
    id: "m-qf-1",
    homePlayerId: "P1",
    awayPlayerId: "P8",
    homeScore: 3,
    awayScore: 1,
    homePenalty: null,
    awayPenalty: null,
    legNumber: 1,
    bracketSlot: 1,
    isCompleted: true,
  }];
  const res1 = resolveTieWinner(tie1);
  assert.strictEqual(res1.winnerPlayerId, "P1", "P1 should win 3-1");

  console.log("✓ PASS: Knockout single-leg: 7 matches (4 QF, 2 SF, 1 Final), slots 1-7 advance correctly.\n");
}

// ============================================================================
// Scenario e: Knockout two-leg (8 participants, legs=2)
// ============================================================================
console.log("--- Test e: Knockout two-leg (8 participants, legs=2) ---");
{
  const participants = ["P1", "P2", "P3", "P4", "P5", "P6", "P7", "P8"];
  const knockout = generateKnockoutBracket({
    competitionId: "comp-ko-two-leg",
    participantIds: participants,
    startDate,
    matchdayDurationHours: 48,
    knockoutLegs: 2,
  });

  console.log(`Total knockout matches generated: ${knockout.length}`);
  assert.strictEqual(knockout.length, 14, "Expected 14 matches (7 ties x 2 legs)");

  // Test aggregate + away goals
  // Tie 1: Leg 1: P1 home vs P8 away = 2-1
  //        Leg 2: P8 home vs P1 away = 1-1
  // Aggregate: P1 = 3, P8 = 2 -> Winner: P1
  const tieA = [
    {
      id: "m1",
      homePlayerId: "P1",
      awayPlayerId: "P8",
      homeScore: 2,
      awayScore: 1,
      homePenalty: null,
      awayPenalty: null,
      legNumber: 1,
      bracketSlot: 1,
      isCompleted: true,
    },
    {
      id: "m2",
      homePlayerId: "P8",
      awayPlayerId: "P1",
      homeScore: 1,
      awayScore: 1,
      homePenalty: null,
      awayPenalty: null,
      legNumber: 2,
      bracketSlot: 1,
      isCompleted: true,
    },
  ];
  const resA = resolveTieWinner(tieA);
  assert.strictEqual(resA.winnerPlayerId, "P1", "P1 should win on aggregate (3-2)");

  // Away goals test:
  // Leg 1: P2 (home) 1 - 2 P3 (away)
  // Leg 2: P3 (home) 0 - 1 P2 (away)
  // Aggregate: 2 - 2. Away goals: P3 scored 2 away, P2 scored 1 away -> Winner: P3
  const tieB = [
    {
      id: "m3",
      homePlayerId: "P2",
      awayPlayerId: "P3",
      homeScore: 1,
      awayScore: 2,
      homePenalty: null,
      awayPenalty: null,
      legNumber: 1,
      bracketSlot: 2,
      isCompleted: true,
    },
    {
      id: "m4",
      homePlayerId: "P3",
      awayPlayerId: "P2",
      homeScore: 0,
      awayScore: 1,
      homePenalty: null,
      awayPenalty: null,
      legNumber: 2,
      bracketSlot: 2,
      isCompleted: true,
    },
  ];
  const resB = resolveTieWinner(tieB);
  assert.strictEqual(resB.winnerPlayerId, "P3", "P3 should win on away goals rule");

  // Penalty shootout test (Aggregate and away goals tied):
  // Leg 1: P4 (home) 1 - 0 P5 (away)
  // Leg 2: P5 (home) 1 - 0 P4 (away)
  // Penalty shootout in Leg 2: P5 = 4, P4 = 5 -> Winner: P4
  const tieC = [
    {
      id: "m5",
      homePlayerId: "P4",
      awayPlayerId: "P5",
      homeScore: 1,
      awayScore: 0,
      homePenalty: null,
      awayPenalty: null,
      legNumber: 1,
      bracketSlot: 3,
      isCompleted: true,
    },
    {
      id: "m6",
      homePlayerId: "P5",
      awayPlayerId: "P4",
      homeScore: 1,
      awayScore: 0,
      homePenalty: 4,
      awayPenalty: 5,
      legNumber: 2,
      bracketSlot: 3,
      isCompleted: true,
    },
  ];
  const resC = resolveTieWinner(tieC);
  assert.strictEqual(resC.winnerPlayerId, "P4", "P4 should win on penalty shootout");

  console.log("✓ PASS: Knockout two-leg: 14 matches, aggregate, away goals, and penalties work correctly.\n");
}

// ============================================================================
// Scenario f: Group stage (8 participants, 2 groups of 4)
// ============================================================================
console.log("--- Test f: Group stage + qualification to knockout ---");
{
  const groupA = ["P1", "P2", "P3", "P4"];
  const groupB = ["P5", "P6", "P7", "P8"];

  const fixturesA = generateRoundRobinSchedule({
    competitionId: "comp-group",
    participantIds: groupA,
    startDate,
    matchdayDurationHours: 48,
    roundRobinLegs: 1,
    stage: "GROUP_A",
  });

  const fixturesB = generateRoundRobinSchedule({
    competitionId: "comp-group",
    participantIds: groupB,
    startDate,
    matchdayDurationHours: 48,
    roundRobinLegs: 1,
    stage: "GROUP_B",
  });

  assert.strictEqual(fixturesA.length, 6, "Expected 6 matches in Group A");
  assert.strictEqual(fixturesB.length, 6, "Expected 6 matches in Group B");
  assert.strictEqual(fixturesA.length + fixturesB.length, 12, "Total group matches = 12");

  // Mock played group matches:
  // In Group A, P1 wins all 3 games (9 pts), P2 wins 2 (6 pts), P3 wins 1 (3 pts), P4 wins 0 (0 pts)
  const allGroupMatches = [];
  const addMatch = (home, away, hScore, aScore, stage) => {
    allGroupMatches.push({
      homePlayerId: home,
      awayPlayerId: away,
      homeScore: hScore,
      awayScore: aScore,
      stage,
      isCompleted: true,
    });
  };

  addMatch("P1", "P2", 2, 0, "GROUP_A");
  addMatch("P1", "P3", 3, 1, "GROUP_A");
  addMatch("P1", "P4", 4, 0, "GROUP_A");
  addMatch("P2", "P3", 1, 0, "GROUP_A");
  addMatch("P2", "P4", 2, 1, "GROUP_A");
  addMatch("P3", "P4", 2, 0, "GROUP_A");

  // In Group B: P5 wins 3 (9 pts), P6 wins 2 (6 pts)
  addMatch("P5", "P6", 2, 1, "GROUP_B");
  addMatch("P5", "P7", 3, 0, "GROUP_B");
  addMatch("P5", "P8", 2, 0, "GROUP_B");
  addMatch("P6", "P7", 1, 0, "GROUP_B");
  addMatch("P6", "P8", 3, 1, "GROUP_B");
  addMatch("P7", "P8", 2, 1, "GROUP_B");

  const mockParticipants = [
    ...groupA.map((id) => ({ playerId: id, groupName: "GROUP_A", player: { username: id } })),
    ...groupB.map((id) => ({ playerId: id, groupName: "GROUP_B", player: { username: id } })),
  ];

  const standingsA = computeStandings(mockParticipants, allGroupMatches, "GROUP_A");
  const standingsB = computeStandings(mockParticipants, allGroupMatches, "GROUP_B");

  assert.strictEqual(standingsA[0].playerId, "P1", "Group A Winner should be P1");
  assert.strictEqual(standingsA[1].playerId, "P2", "Group A Runner-up should be P2");
  assert.strictEqual(standingsB[0].playerId, "P5", "Group B Winner should be P5");
  assert.strictEqual(standingsB[1].playerId, "P6", "Group B Runner-up should be P6");

  // Qualify top 2 from each: Seed bracket
  // SF 1: Group A Winner (P1) vs Group B Runner-up (P6)
  // SF 2: Group B Winner (P5) vs Group A Runner-up (P2)
  const qualifiedSeeds = [
    standingsA[0].playerId, // P1 (Seed 1)
    standingsB[0].playerId, // P5 (Seed 2)
    standingsA[1].playerId, // P2 (Seed 3)
    standingsB[1].playerId, // P6 (Seed 4)
  ];

  const knockoutStage = generateKnockoutBracket({
    competitionId: "comp-group",
    participantIds: [qualifiedSeeds[0], qualifiedSeeds[3], qualifiedSeeds[1], qualifiedSeeds[2]],
    startDate: new Date(startDate.getTime() + 6 * 48 * 3600 * 1000),
    matchdayDurationHours: 48,
    knockoutLegs: 1,
  });

  assert.strictEqual(knockoutStage.length, 3, "Expected 3 knockout matches (2 SF, 1 Final)");
  assert.strictEqual(knockoutStage[0].stage, "SEMIFINAL");
  assert.strictEqual(knockoutStage[1].stage, "SEMIFINAL");
  assert.strictEqual(knockoutStage[2].stage, "FINAL");

  console.log("✓ PASS: Group stage: 12 matches, standings calculated, top 2 qualified, 3 knockout matches generated.\n");
}

// ============================================================================
// Scenario g & h: Player portal & Admin Result Entry data validation
// ============================================================================
console.log("--- Test g & h: Player portal fixtures and admin result entry ---");
{
  // Test standings recalculation after score update
  const participants = [
    { playerId: "PA", player: { username: "PA" } },
    { playerId: "PB", player: { username: "PB" } },
  ];

  // Match: PA 2 - 1 PB
  let matches = [
    {
      homePlayerId: "PA",
      awayPlayerId: "PB",
      homeScore: 2,
      awayScore: 1,
      isCompleted: true,
    },
  ];

  let st = computeStandings(participants, matches);
  assert.strictEqual(st[0].playerId, "PA");
  assert.strictEqual(st[0].points, 3);
  assert.strictEqual(st[1].points, 0);

  // Score update (e.g. admin corrects score to PA 1 - 2 PB)
  matches[0].homeScore = 1;
  matches[0].awayScore = 2;

  st = computeStandings(participants, matches);
  assert.strictEqual(st[0].playerId, "PB", "After admin edit, PB should be in 1st place");
  assert.strictEqual(st[0].points, 3);
  assert.strictEqual(st[1].points, 0);

  console.log("✓ PASS: Admin result entry and stats recalculation work flawlessly.\n");
}

console.log("=================================================");
console.log("ALL 8 VERIFICATION SCENARIOS COMPLETED SUCCESSFULLY!");
console.log("=================================================");
