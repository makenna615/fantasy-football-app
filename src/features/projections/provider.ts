import type { Position } from "@prisma/client";

export type ProjectionContext = { season: number; week: number; leagueId?: string };

export type NormalizedProjection = {
  playerId: string;
  name: string;
  nflTeam: string;
  position: Position;
  projectedPoints: number;
  floorPoints?: number;
  ceilingPoints?: number;
  restOfSeasonPoints?: number;
  consistency: number;
  matchupRating: number;
  injuryMultiplier: number;
  source: string;
};

/** Boundary implemented by future API adapters and the current CSV/manual sources. */
export interface ProjectionProvider {
  readonly key: string;
  getProjections(context: ProjectionContext): Promise<NormalizedProjection[]>;
}
