import rawTeams from "@/data/teams.json";
import rawCountries from "@/data/countries.json";

export interface BundledTeam {
  id: string; // unique slug e.g. "manchester-city"
  name: string; // display name e.g. "Manchester City"
  country: string; // 2-letter ISO code e.g. "GB"
  aliases?: string[]; // e.g. ["Man City", "City", "MCFC"]
}

export interface BundledCountry {
  name: string;
  code: string;
  fifa: string;
}

export const BUNDLED_TEAMS: BundledTeam[] = rawTeams as BundledTeam[];
export const BUNDLED_COUNTRIES: BundledCountry[] = rawCountries as BundledCountry[];

const teamLookup = new Map<string, BundledTeam>();

for (const team of BUNDLED_TEAMS) {
  teamLookup.set(team.id.toLowerCase(), team);
  teamLookup.set(team.name.toLowerCase(), team);
  if (team.aliases) {
    for (const alias of team.aliases) {
      teamLookup.set(alias.toLowerCase(), team);
    }
  }
}

/**
 * Finds a bundled team by exact ID, exact name, or alias (case-insensitive).
 */
export function findBundledTeam(queryOrNameOrId?: string | null): BundledTeam | null {
  if (!queryOrNameOrId) return null;
  const key = queryOrNameOrId.trim().toLowerCase();
  const direct = teamLookup.get(key);
  if (direct) return direct;

  const normalized = key.replace(/[^a-z0-9]/g, "-").replace(/-+/g, "-").replace(/^-|-$/g, "");
  return teamLookup.get(normalized) || null;
}

/**
 * Returns the canonical team ID (slug) for any team identifier or name.
 */
export function getCanonicalTeamId(teamIdentifierOrName?: string | null): string | null {
  const team = findBundledTeam(teamIdentifierOrName);
  return team ? team.id : null;
}

/**
 * Checks if a candidate team (by id or name) is taken by any active participant in the competition.
 */
export function findConflictingParticipant(
  candidateTeamIdOrName: string,
  participants: Array<{
    playerId: string;
    teamId?: string | null;
    teamName?: string | null;
    status: string;
    player?: { username: string } | null;
    team?: { name?: string | null } | null;
  }>,
  excludePlayerId?: string
) {
  const candidateTeam = findBundledTeam(candidateTeamIdOrName);
  const candidateLower = candidateTeamIdOrName.trim().toLowerCase();

  for (const p of participants) {
    if (excludePlayerId && p.playerId === excludePlayerId) continue;
    if (p.status !== "APPROVED" && p.status !== "PENDING") continue;

    // 1. Direct match on competition teamId or slug
    if (candidateTeam && p.teamId && p.teamId === candidateTeam.id) {
      return p;
    }

    // 2. Canonical match against participant's teamName or team.name
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
