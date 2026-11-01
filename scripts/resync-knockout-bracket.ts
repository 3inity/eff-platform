import { prisma } from "../src/db";
import { getNextBracketSlot, resolveTieWinner } from "../src/lib/fixtures";

async function main() {
  const targetCompId = process.argv[2] || "cmvs7fqlp000007le6waojow9";

  console.log("=================================================================");
  console.log(`KNOCKOUT BRACKET RESYNC & RECALCULATION TOOL`);
  console.log(`Target Competition ID: ${targetCompId}`);
  console.log("=================================================================\n");

  const comp = await prisma.competition.findUnique({
    where: { id: targetCompId },
    include: {
      matches: {
        where: { bracketSlot: { not: null } },
        include: {
          homePlayer: true,
          awayPlayer: true,
        },
        orderBy: [{ bracketSlot: "asc" }, { legNumber: "asc" }],
      },
    },
  });

  if (!comp) {
    throw new Error(`Competition with ID "${targetCompId}" not found.`);
  }

  console.log(`Competition: "${comp.name}" | Format: ${comp.format} | KnockoutLegs: ${comp.knockoutLegs}\n`);

  // Step 1: Remove any second leg for the FINAL match
  const finalLeg2Matches = comp.matches.filter(
    (m) => m.stage === "FINAL" && m.legNumber === 2
  );

  if (finalLeg2Matches.length > 0) {
    console.log(`Found ${finalLeg2Matches.length} extra Leg 2 match(es) for the FINAL. Deleting...`);
    for (const fl2 of finalLeg2Matches) {
      await prisma.match.delete({ where: { id: fl2.id } });
      console.log(`Deleted extra Final Leg 2 match ID: ${fl2.id}`);
    }
  } else {
    console.log("No extra Leg 2 Final match found (or already single-leg).");
  }

  // Step 2: Reload knockout matches after deletion
  const allCompMatches = await prisma.match.findMany({
    where: { competitionId: targetCompId, bracketSlot: { not: null } },
    include: { homePlayer: true, awayPlayer: true },
    orderBy: [{ bracketSlot: "asc" }, { legNumber: "asc" }],
  });

  const maxSlot = allCompMatches.reduce((max, m) => Math.max(max, m.bracketSlot || 0), 0);
  let bracketSize = 2;
  while (bracketSize - 1 < maxSlot) {
    bracketSize *= 2;
  }

  console.log(`Bracket slots: 1 to ${maxSlot} (Bracket Size: ${bracketSize})\n`);

  // Step 3: Iterate through slots in topological order (1 to maxSlot - 1) and recalculate
  for (let slot = 1; slot < maxSlot; slot++) {
    const slotMatches = await prisma.match.findMany({
      where: { competitionId: targetCompId, bracketSlot: slot },
      include: { homePlayer: true, awayPlayer: true },
      orderBy: { legNumber: "asc" },
    });

    if (slotMatches.length === 0) continue;

    const stageName = slotMatches[0].stage || `Slot ${slot}`;
    console.log(`--- Evaluating Slot ${slot} (${stageName}) [${slotMatches.length} leg(s)] ---`);

    for (const m of slotMatches) {
      console.log(
        `  Leg ${m.legNumber || 1}: @${m.homePlayer?.username || "TBD"} (${m.homeScore ?? "-"}) vs @${
          m.awayPlayer?.username || "TBD"
        } (${m.awayScore ?? "-"}) [completed: ${m.isCompleted}]`
      );
    }

    const resolution = resolveTieWinner(
      slotMatches.map((m) => ({
        id: m.id,
        homePlayerId: m.homePlayerId,
        awayPlayerId: m.awayPlayerId,
        homeScore: m.homeScore,
        awayScore: m.awayScore,
        homePenalty: m.homePenalty,
        awayPenalty: m.awayPenalty,
        legNumber: m.legNumber,
        bracketSlot: m.bracketSlot,
        isCompleted: m.isCompleted,
      }))
    );

    console.log(`  -> Resolution: isDecided=${resolution.isDecided}, winnerPlayerId=${resolution.winnerPlayerId}, requiresShootout=${resolution.requiresShootout}`);

    if (resolution.isDecided && resolution.winnerPlayerId) {
      const winnerPlayer = await prisma.player.findUnique({
        where: { id: resolution.winnerPlayerId },
      });
      console.log(`  -> Winner: @${winnerPlayer?.username} (${winnerPlayer?.id})`);

      const { targetSlot, position } = getNextBracketSlot(slot, bracketSize);

      if (targetSlot) {
        console.log(`  -> Advancing to Target Slot ${targetSlot} as position "${position}"...`);

        const targetMatches = await prisma.match.findMany({
          where: { competitionId: targetCompId, bracketSlot: targetSlot },
          orderBy: { legNumber: "asc" },
        });

        for (const tm of targetMatches) {
          const isLeg2 = tm.legNumber === 2;
          const assignAsHome = isLeg2 ? position === "away" : position === "home";

          await prisma.match.update({
            where: { id: tm.id },
            data: {
              ...(assignAsHome
                ? { homePlayerId: resolution.winnerPlayerId }
                : { awayPlayerId: resolution.winnerPlayerId }),
            },
          });

          console.log(
            `     Updated Match ${tm.id} (Slot ${targetSlot}, Leg ${tm.legNumber}): set ${
              assignAsHome ? "homePlayerId" : "awayPlayerId"
            } = @${winnerPlayer?.username}`
          );
        }
      }
    } else {
      console.log(`  -> Slot ${slot} is not yet decided. No advancement performed.`);
    }
    console.log("");
  }

  // Step 4: Final verification of the bracket state
  console.log("=================================================================");
  console.log("FINAL VERIFIED BRACKET STATE:");
  console.log("=================================================================");

  const finalSummaryMatches = await prisma.match.findMany({
    where: { competitionId: targetCompId, bracketSlot: { not: null } },
    include: { homePlayer: true, awayPlayer: true },
    orderBy: [{ bracketSlot: "asc" }, { legNumber: "asc" }],
  });

  for (const m of finalSummaryMatches) {
    console.log(
      `Slot ${m.bracketSlot} | ${m.stage} | Leg ${m.legNumber || 1}: @${
        m.homePlayer?.username || "TBD"
      } vs @${m.awayPlayer?.username || "TBD"} (${m.homeScore ?? "-"} : ${m.awayScore ?? "-"})`
    );
  }

  console.log("\n✓ Resync completed successfully!");
}

main()
  .catch((err) => {
    console.error("Fatal error during resync:", err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
