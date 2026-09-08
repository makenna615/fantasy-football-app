import { db } from "@/lib/db";
import type { CandidatePlayer } from "@/features/recommendations/types";
import type { NormalizedProjection } from "./provider";

export async function loadTeamProjections(teamId: string, season: number, week: number): Promise<NormalizedProjection[]> {
  const team = await db.team.findUniqueOrThrow({
    where: { id: teamId },
    include: { rosterPlayers: { include: { player: true, projections: { where: { season, week }, orderBy: { updatedAt: "desc" } } } } },
  });
  const playerIds = team.rosterPlayers.map(entry => entry.playerId);
  const [provided, injuries, matchups] = await Promise.all([
    db.playerProjection.findMany({ where: { playerId: { in: playerIds }, season, week, OR: [{ leagueId: team.leagueId }, { leagueId: null }] }, include: { provider: true }, orderBy: [{ importedAt: "desc" }, { provider: { key: "asc" } }] }),
    db.playerInjury.findMany({ where: { playerId: { in: playerIds }, season, week }, orderBy: { importedAt: "desc" } }),
    db.playerMatchup.findMany({ where: { playerId: { in: playerIds }, season, week }, orderBy: { importedAt: "desc" } }),
  ]);
  return team.rosterPlayers.flatMap(entry => {
    const manual = entry.projections[0];
    const external = provided.find(row => row.playerId === entry.playerId);
    const projection = manual ?? external;
    if (!projection) return [];
    const injury = injuries.find(row => row.playerId === entry.playerId);
    const matchup = matchups.find(row => row.playerId === entry.playerId);
    return [{
      playerId: entry.id, name: entry.player.fullName, nflTeam: entry.player.nflTeam, position: entry.player.position,
      projectedPoints: projection.projectedPoints, floorPoints: projection.floorPoints ?? undefined,
      ceilingPoints: projection.ceilingPoints ?? undefined,
      restOfSeasonPoints: external?.restOfSeason ?? undefined,
      consistency: projection.consistency, matchupRating: matchup?.matchupRating ?? projection.matchupRating,
      injuryMultiplier: injury?.multiplier ?? (manual?.injuryMultiplier ?? 1),
      source: manual?.source ?? external?.provider.key ?? "unknown",
    }];
  });
}

export function toCandidates(rows: NormalizedProjection[]): CandidatePlayer[] {
  return rows.map(row => ({ id: row.playerId, name: row.name, team: row.nflTeam, position: row.position, projectedPoints: row.projectedPoints, floorPoints: row.floorPoints, ceilingPoints: row.ceilingPoints, consistency: row.consistency, matchupRating: row.matchupRating, injuryMultiplier: row.injuryMultiplier, restOfSeasonPoints: row.restOfSeasonPoints }));
}
