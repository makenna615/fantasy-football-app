import type { Position } from "@prisma/client";

export type ProviderPlayer = {
  externalId: string;
  fullName: string;
  firstName?: string;
  lastName?: string;
  nflTeam: string;
  position: Position;
  active: boolean;
  ids: Record<string, string>;
};
export type ProviderInjury = {
  externalId: string;
  team: string;
  season: number;
  week: number;
  status: string;
  bodyPart?: string;
  practiceStatus?: string;
  reportDate?: Date;
  multiplier: number;
  raw: Record<string, unknown>;
};
export type ProviderRoster = {
  externalId: string;
  team: string;
  season: number;
  week: number;
  status: string;
  depthPosition?: string;
  jerseyNumber?: string;
  ids: Record<string, string>;
  raw: Record<string, unknown>;
};
export type ProviderWeeklyStats = {
  externalId: string;
  team?: string;
  opponent?: string;
  season: number;
  week: number;
  stats: Record<string, number>;
  raw: Record<string, unknown>;
};
export type ProviderProjectedStats = ProviderWeeklyStats & {
  sourceUpdatedAt?: Date;
};

export interface PlayerDataProvider {
  readonly key: string;
  players(): Promise<ProviderPlayer[]>;
  rosters(season: number): Promise<ProviderRoster[]>;
}
export interface InjuryProvider {
  readonly key: string;
  injuries(season: number): Promise<ProviderInjury[]>;
}
export interface StatsProvider {
  readonly key: string;
  weeklyStats(season: number): Promise<ProviderWeeklyStats[]>;
}
export interface MatchupProvider {
  readonly key: string;
  schedule(
    season: number,
    week: number,
  ): Promise<Array<{ team: string; opponent: string; home: boolean }>>;
}

export type SyncStats = {
  received: number;
  imported: number;
  updated: number;
  skipped: number;
  unmatched: number;
  stableIdMatches: number;
  fallbackMatches: number;
  ambiguousMatches: number;
  errors: number;
  source: string;
  timestamp: Date;
  errorMessages: string[];
};
export const emptySyncStats = (source: string): SyncStats => ({
  received: 0,
  imported: 0,
  updated: 0,
  skipped: 0,
  unmatched: 0,
  stableIdMatches: 0,
  fallbackMatches: 0,
  ambiguousMatches: 0,
  errors: 0,
  source,
  timestamp: new Date(),
  errorMessages: [],
});
