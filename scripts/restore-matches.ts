import { prisma } from "../src/db";

async function main() {
  const targetCompId = "cmvs7fqlp000007le6waojow9";

  const P = {
    Zekesama: "cmvr32vhg000108jsfd8em6ch",
    BigSammy: "cmvs7keng000007jxm65ns44l",
    Elvis: "cmvr3bhzi000308lax4u1xlbj",
    Gus: "cmvrwonqd000108l6mrxcwq15",
    GRACE999: "cmvs7m7zk000307jx1k2ee4m4",
    meeday: "cmvs9ejky000208jsyz5247ji",
    Trusty: "cmvrwhoxh000007l2i2asgh71",
    MAYOR_OF_ONDO: "cmvs93hqb000308jq62krws1h",
  };

  const leg2MatchesToRestore = [
    // Slot 1 Leg 2
    {
      id: "cmvs9qckh000c08js3rpf7dtr",
      competitionId: targetCompId,
      stage: "QUARTERFINAL",
      bracketSlot: 1,
      legNumber: 2,
      homeScore: 3,
      awayScore: 0,
      homePenalty: null,
      awayPenalty: null,
      isCompleted: true,
      homePlayerId: P.BigSammy,
      awayPlayerId: P.Zekesama,
      matchday: 2,
      scheduledAt: new Date("2026-11-03T12:00:00Z"),
    },
    // Slot 2 Leg 2
    {
      id: "cmvs9qcki000e08js070zuqba",
      competitionId: targetCompId,
      stage: "QUARTERFINAL",
      bracketSlot: 2,
      legNumber: 2,
      homeScore: 2,
      awayScore: 5,
      homePenalty: null,
      awayPenalty: null,
      isCompleted: true,
      homePlayerId: P.Gus,
      awayPlayerId: P.Elvis,
      matchday: 2,
      scheduledAt: new Date("2026-11-03T14:00:00Z"),
    },
    // Slot 3 Leg 2
    {
      id: "cmvs9qcki000g08jsflbuzhax",
      competitionId: targetCompId,
      stage: "QUARTERFINAL",
      bracketSlot: 3,
      legNumber: 2,
      homeScore: 2,
      awayScore: 4,
      homePenalty: null,
      awayPenalty: null,
      isCompleted: true,
      homePlayerId: P.meeday,
      awayPlayerId: P.GRACE999,
      matchday: 2,
      scheduledAt: new Date("2026-11-03T16:00:00Z"),
    },
    // Slot 4 Leg 2
    {
      id: "cmvs9qcki000i08js7g51owyi",
      competitionId: targetCompId,
      stage: "QUARTERFINAL",
      bracketSlot: 4,
      legNumber: 2,
      homeScore: 2,
      awayScore: 2,
      homePenalty: null,
      awayPenalty: null,
      isCompleted: true,
      homePlayerId: P.MAYOR_OF_ONDO,
      awayPlayerId: P.Trusty,
      matchday: 2,
      scheduledAt: new Date("2026-11-03T18:00:00Z"),
    },
    // Slot 5 Leg 2 (SF1 Leg 2)
    {
      id: "cmvs9qcki000k08jsg1rubbpi",
      competitionId: targetCompId,
      stage: "SEMIFINAL",
      bracketSlot: 5,
      legNumber: 2,
      homeScore: 5,
      awayScore: 6,
      homePenalty: null,
      awayPenalty: null,
      isCompleted: true,
      homePlayerId: P.BigSammy,
      awayPlayerId: P.Elvis,
      matchday: 3,
      scheduledAt: new Date("2026-11-05T14:00:00Z"),
    },
    // Slot 6 Leg 2 (SF2 Leg 2)
    {
      id: "cmvs9qcki000m08jssesz3hnm",
      competitionId: targetCompId,
      stage: "SEMIFINAL",
      bracketSlot: 6,
      legNumber: 2,
      homeScore: 3,
      awayScore: 0,
      homePenalty: null,
      awayPenalty: null,
      isCompleted: true,
      homePlayerId: P.GRACE999,
      awayPlayerId: P.Trusty,
      matchday: 3,
      scheduledAt: new Date("2026-11-05T16:00:00Z"),
    },
  ];

  console.log("Restoring Leg 2 matches for QF and SF...");
  for (const m of leg2MatchesToRestore) {
    await prisma.match.upsert({
      where: { id: m.id },
      create: m,
      update: m,
    });
    console.log(`Restored match ${m.id} (${m.stage} Slot ${m.bracketSlot} Leg ${m.legNumber})`);
  }

  // Also reset SF Leg 1 participants properly
  // Slot 5 Leg 1: BigSammy vs Elvis
  await prisma.match.update({
    where: { id: "cmvs9qcki000j08js149ogjn4" },
    data: {
      homePlayerId: "cmvs7keng000007jxm65ns44l", // BigSammy
      awayPlayerId: "cmvr3bhzi000308lax4u1xlbj", // Elvis
    },
  });

  // Slot 6 Leg 1: GRACE999 vs Trusty
  await prisma.match.update({
    where: { id: "cmvs9qcki000l08jsef20i494" },
    data: {
      homePlayerId: "cmvrwpx5y000208l6d79s7i56", // GRACE999
      awayPlayerId: "cmvrwhoxh000007l2i2asgh71", // Trusty
    },
  });

  console.log("Restoration complete!");
}

main().catch(console.error);
