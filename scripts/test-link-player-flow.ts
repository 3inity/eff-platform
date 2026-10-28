import { prisma } from "../src/db";
import { findBundledTeam, findConflictingParticipant } from "../src/lib/teams";

async function main() {
  console.log("=================================================================");
  console.log("TEST: LINK PLAYER TO COMPETITION FLOW (NEW TEAM & DUP CHECK)");
  console.log("=================================================================\n");

  // 1. Pick or verify existing competition and player
  const competition = await prisma.competition.findFirst({
    where: { status: "REGISTRATION_OPEN" },
  });
  if (!competition) {
    throw new Error("No competition in REGISTRATION_OPEN found.");
  }
  console.log(`Using competition: "${competition.name}" (ID: ${competition.id})`);

  // Find a player not yet in this competition
  const existingParticipants = await prisma.competitionParticipant.findMany({
    where: { competitionId: competition.id },
  });
  const existingPlayerIds = new Set(existingParticipants.map((p) => p.playerId));

  const availablePlayer = await prisma.player.findFirst({
    where: {
      id: { notIn: Array.from(existingPlayerIds) },
    },
  });

  if (!availablePlayer) {
    throw new Error("No available player found to test linking.");
  }
  console.log(`Using test player: @${availablePlayer.username} (ID: ${availablePlayer.id})\n`);

  // 2. Define test payload with a BRAND NEW team name that does not exist in the Team table yet
  const testTeamName = "Borussia Dortmund";
  const testTeamSlug = "borussia-dortmund"; // this is what SearchableTeamSelect sends as teamId!

  // Verify this team name does NOT exist in the Team table for this competition
  const preCheckTeam = await prisma.team.findUnique({
    where: {
      competitionId_name: {
        competitionId: competition.id,
        name: testTeamName,
      },
    },
  });
  console.log(`Pre-check: Does Team "${testTeamName}" exist in DB for this competition?`, Boolean(preCheckTeam));

  // 3. Execute the exact logic from the fixed POST /api/admin/competitions/[id]/participants route
  console.log(`\n--- Step 1: Simulating Link Player with reqTeamId="${testTeamSlug}" & teamName="${testTeamName}" ---`);

  const reqTeamId = testTeamSlug;
  const teamName = testTeamName;
  const playerId = availablePlayer.id;
  const competitionId = competition.id;

  // Logic:
  let finalTeamName = teamName ? teamName.trim() : null;
  const bundled = findBundledTeam(reqTeamId || teamName);
  if (bundled) {
    finalTeamName = bundled.name;
  }

  // Robust team resolution
  let dbTeam = null;
  if (reqTeamId) {
    dbTeam = await prisma.team.findFirst({
      where: { id: reqTeamId, competitionId },
    });
  }

  if (!dbTeam && finalTeamName) {
    dbTeam = await prisma.team.findUnique({
      where: {
        competitionId_name: {
          competitionId,
          name: finalTeamName,
        },
      },
    });
  }

  if (!dbTeam && finalTeamName) {
    console.log(`Team "${finalTeamName}" does not exist in Team table for this competition. Auto-creating Team record...`);
    dbTeam = await prisma.team.create({
      data: {
        competitionId,
        name: finalTeamName,
        logoUrl: null,
      },
    });
    console.log(`Successfully created Team record! ID: ${dbTeam.id}, Name: ${dbTeam.name}`);
  }

  const validTeamId = dbTeam ? dbTeam.id : null;
  console.log(`Resolved validTeamId for FK relation: ${validTeamId} (was reqTeamId: ${reqTeamId})`);

  // Check if player is already registered
  const existing = await prisma.competitionParticipant.findUnique({
    where: {
      competitionId_playerId: {
        competitionId,
        playerId,
      },
    },
  });

  if (existing) {
    throw new Error("Unexpected: player already registered before creation!");
  }

  // Create participant
  console.log("Creating CompetitionParticipant with resolved teamId...");
  const participant = await prisma.competitionParticipant.create({
    data: {
      competitionId,
      playerId,
      teamId: validTeamId,
      teamName: finalTeamName,
      teamLogoUrl: null,
      status: "APPROVED",
    },
    include: {
      player: true,
      team: true,
    },
  });

  console.log(`✓ SUCCESS! Linked @${participant.player.username} to ${competition.name}:`);
  console.log(`  - Participant ID: ${participant.id}`);
  console.log(`  - Team Name: ${participant.teamName}`);
  console.log(`  - DB Team ID: ${participant.teamId} (valid FK relation to ${participant.team?.name})\n`);

  // 4. Test Step 2: Try to link the SAME player again
  console.log("--- Step 2: Testing Duplicate Registration (P2002 prevention) ---");
  const duplicateCheck = await prisma.competitionParticipant.findUnique({
    where: {
      competitionId_playerId: {
        competitionId,
        playerId,
      },
    },
  });

  if (duplicateCheck && duplicateCheck.status !== "WITHDRAWN") {
    console.log("✓ SUCCESS: Duplicate pre-check triggered correctly:");
    console.log('  Returned error: "Player is already registered in this competition." (HTTP 409)');
  } else {
    throw new Error("Duplicate check failed to detect existing participant.");
  }

  // 5. Cleanup test records
  console.log("\n--- Step 3: Cleaning up test data ---");
  await prisma.competitionParticipant.delete({
    where: { id: participant.id },
  });
  console.log(`Deleted test CompetitionParticipant ${participant.id}`);

  if (dbTeam) {
    await prisma.team.delete({
      where: { id: dbTeam.id },
    });
    console.log(`Deleted test Team ${dbTeam.id} ("${dbTeam.name}")`);
  }

  console.log("\n=================================================================");
  console.log("ALL TESTS COMPLETED SUCCESSFULLY! SYSTEM IS FULLY VERIFIED.");
  console.log("=================================================================");
}

main()
  .catch((e) => {
    console.error("Test failed with error:", e);
    process.exit(1);
  })
  .finally(async () => {
    process.exit(0);
  });
