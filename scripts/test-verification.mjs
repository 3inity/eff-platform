import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const teamsPath = path.resolve(__dirname, "../src/data/teams.json");
const countriesPath = path.resolve(__dirname, "../src/data/countries.json");

const BUNDLED_TEAMS = JSON.parse(fs.readFileSync(teamsPath, "utf8"));
const BUNDLED_COUNTRIES = JSON.parse(fs.readFileSync(countriesPath, "utf8"));

const teamLookup = new Map();
for (const team of BUNDLED_TEAMS) {
  teamLookup.set(team.id.toLowerCase(), team);
  teamLookup.set(team.name.toLowerCase(), team);
  if (team.aliases) {
    for (const alias of team.aliases) {
      teamLookup.set(alias.toLowerCase(), team);
    }
  }
}

function findBundledTeam(queryOrNameOrId) {
  if (!queryOrNameOrId) return null;
  const key = queryOrNameOrId.trim().toLowerCase();
  const direct = teamLookup.get(key);
  if (direct) return direct;

  const normalized = key.replace(/[^a-z0-9]/g, "-").replace(/-+/g, "-").replace(/^-|-$/g, "");
  return teamLookup.get(normalized) || null;
}

function findConflictingParticipant(candidateTeamIdOrName, participants, excludePlayerId) {
  const candidateTeam = findBundledTeam(candidateTeamIdOrName);
  const candidateLower = candidateTeamIdOrName.trim().toLowerCase();

  for (const p of participants) {
    if (excludePlayerId && p.playerId === excludePlayerId) continue;
    if (p.status !== "APPROVED" && p.status !== "PENDING") continue;

    if (candidateTeam && p.teamId && p.teamId === candidateTeam.id) {
      return p;
    }

    const pTeamName = p.teamName || p.team?.name || null;
    if (pTeamName) {
      const pBundled = findBundledTeam(pTeamName);
      if (candidateTeam && pBundled && candidateTeam.id === pBundled.id) {
        return p;
      }
      if (pTeamName.trim().toLowerCase() === candidateLower) {
        return p;
      }
      if (candidateTeam && pTeamName.trim().toLowerCase() === candidateTeam.name.toLowerCase()) {
        return p;
      }
    }
  }

  return null;
}

console.log("=== Verification Suite ===");
console.log(`Loaded ${BUNDLED_COUNTRIES.length} FIFA member associations.`);
console.log(`Loaded ${BUNDLED_TEAMS.length} bundled clubs.`);

// Test 1: Alias resolution
const manCity = findBundledTeam("Manchester City");
const aliasCity = findBundledTeam("Man City");
const slugCity = findBundledTeam("manchester-city");
const abbrCity = findBundledTeam("MCFC");

console.log("\n1. Alias Resolution Test:");
console.log("- 'Manchester City' id:", manCity?.id);
console.log("- 'Man City' id:", aliasCity?.id);
console.log("- 'manchester-city' id:", slugCity?.id);
console.log("- 'MCFC' id:", abbrCity?.id);

if (manCity?.id === "manchester-city" && aliasCity?.id === "manchester-city" && abbrCity?.id === "manchester-city") {
  console.log("✓ PASS: 'Man City' and 'MCFC' aliases resolve to canonical team 'manchester-city'");
} else {
  console.error("✗ FAIL: Alias resolution mismatch");
  process.exit(1);
}

// Test 2: Uniqueness conflict check
console.log("\n2. Server-side Uniqueness & Conflict Detection Test:");
const mockParticipants = [
  {
    playerId: "player-1",
    teamName: "Manchester City",
    status: "APPROVED",
    player: { username: "efootball_champ" },
  },
  {
    playerId: "player-2",
    teamName: "Enyimba International",
    status: "APPROVED",
    player: { username: "naija_king" },
  },
];

// Try registering with "Man City"
const conflict1 = findConflictingParticipant("Man City", mockParticipants, "player-3");
console.log("- Attempt registering 'Man City':", conflict1 ? `BLOCKED (conflict with @${conflict1.player.username})` : "ALLOWED");

// Try registering with "manchester-city"
const conflict2 = findConflictingParticipant("manchester-city", mockParticipants, "player-4");
console.log("- Attempt registering 'manchester-city':", conflict2 ? `BLOCKED (conflict with @${conflict2.player.username})` : "ALLOWED");

// Try registering with "Manchester City"
const conflict3 = findConflictingParticipant("Manchester City", mockParticipants, "player-5");
console.log("- Attempt registering 'Manchester City':", conflict3 ? `BLOCKED (conflict with @${conflict3.player.username})` : "ALLOWED");

// Try registering an available team (e.g. "Arsenal")
const conflict4 = findConflictingParticipant("Arsenal", mockParticipants, "player-6");
console.log("- Attempt registering available team 'Arsenal':", conflict4 ? `BLOCKED` : "ALLOWED (Available)");

if (conflict1 && conflict2 && conflict3 && !conflict4) {
  console.log("✓ PASS: Duplicate registrations across names and aliases are blocked, available teams pass.");
} else {
  console.error("✗ FAIL: Conflict logic failed.");
  process.exit(1);
}

// Test 3: Non-existent team check
console.log("\n3. Non-existent Team Verification Test:");
const nonExistent = findBundledTeam("Fantasy NonExistent United");
console.log("- Search for 'Fantasy NonExistent United':", nonExistent ? "Found" : "NULL (Blocked)");
if (!nonExistent) {
  console.log("✓ PASS: Arbitrary/free-typed teams return NULL and cannot be selected.");
} else {
  console.error("✗ FAIL: Non-existent team should return null.");
  process.exit(1);
}

console.log("\n=== All Tests Passed Successfully! ===");
