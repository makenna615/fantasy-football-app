import type { Position } from "@prisma/client";
import type { CsvRow } from "@/features/admin/csv";
import type {
  ProviderInjury,
  ProviderPlayer,
  ProviderRoster,
  ProviderWeeklyStats,
} from "../contracts";

const positionMap: Record<string, Position> = {
  QB: "QB",
  RB: "RB",
  FB: "RB",
  WR: "WR",
  TE: "TE",
  K: "K",
  PK: "K",
  P: "P",
  DT: "DT",
  NT: "DT",
  DE: "DE",
  EDGE: "DE",
  LB: "LB",
  ILB: "LB",
  OLB: "LB",
  MLB: "LB",
  CB: "CB",
  DB: "CB",
  S: "S",
  FS: "S",
  SS: "S",
  DST: "DST",
  DEF: "DST",
};
const number = (row: CsvRow, key: string) => {
  const value = Number(row[key]);
  return Number.isFinite(value) ? value : 0;
};
export const mapNflPosition = (value: string) =>
  positionMap[value?.toUpperCase()];

export function normalizeNflversePlayer(
  row: CsvRow,
  season: number,
): ProviderPlayer | null {
  const externalId = row.gsis_id?.trim();
  const position = mapNflPosition(row.position);
  const fullName = (
    row.display_name || `${row.first_name ?? ""} ${row.last_name ?? ""}`
  ).trim();
  if (!externalId || !position || !fullName) return null;
  const ids: Record<string, string> = { nflverse: externalId };
  for (const [key, column] of Object.entries({
    espn: "espn_id",
    pfr: "pfr_id",
    pff: "pff_id",
    otc: "otc_id",
    esb: "esb_id",
    nfl: "nfl_id",
  }))
    if (row[column]?.trim()) ids[key] = row[column].trim();
  return {
    externalId,
    fullName,
    firstName: row.first_name || undefined,
    lastName: row.last_name || undefined,
    nflTeam: (row.latest_team || "FA").toUpperCase(),
    position,
    active: row.status === "ACT" || number(row, "last_season") >= season,
    ids,
  };
}

export function normalizeNflverseRoster(row: CsvRow): ProviderRoster | null {
  if (!row.gsis_id || !row.team || !row.season) return null;
  const ids: Record<string, string> = {};
  for (const [key, column] of Object.entries({
    espn: "espn_id",
    yahoo: "yahoo_id",
    sleeper: "sleeper_id",
    fantasydata: "fantasy_data_id",
    pfr: "pfr_id",
    pff: "pff_id",
  }))
    if (row[column]?.trim()) ids[key] = row[column].trim();
  return {
    externalId: row.gsis_id,
    team: row.team.toUpperCase(),
    season: number(row, "season"),
    week: number(row, "week") || 1,
    status: row.status || "UNKNOWN",
    depthPosition: row.depth_chart_position || undefined,
    jerseyNumber: row.jersey_number || undefined,
    ids,
    raw: row,
  };
}

export const INJURY_MULTIPLIERS: Readonly<Record<string, number>> = {
  HEALTHY: 1,
  FULL: 1,
  QUESTIONABLE: 0.85,
  LIMITED: 0.85,
  DOUBTFUL: 0.25,
  OUT: 0,
  IR: 0,
  DNP: 0.5,
};
export function injuryMultiplier(status: string, practice = "") {
  const combined = `${status} ${practice}`.toUpperCase();
  for (const [key, value] of Object.entries(INJURY_MULTIPLIERS))
    if (combined.includes(key)) return value;
  return 1;
}
export function normalizeNflverseInjury(row: CsvRow): ProviderInjury | null {
  if (!row.gsis_id || !row.season || !row.week) return null;
  const status = row.report_status || row.practice_status || "UNSPECIFIED";
  return {
    externalId: row.gsis_id,
    team: (row.team || "FA").toUpperCase(),
    season: number(row, "season"),
    week: number(row, "week"),
    status,
    bodyPart: row.practice_primary_injury || undefined,
    practiceStatus: row.practice_status || undefined,
    multiplier: injuryMultiplier(row.report_status, row.practice_status),
    raw: row,
  };
}

const statColumns = {
  completions: "passingCompletions",
  attempts: "passingAttempts",
  passing_yards: "passingYards",
  passing_tds: "passingTouchdowns",
  passing_interceptions: "passingInterceptions",
  sacks_suffered: "passingSacks",
  passing_2pt_conversions: "passingTwoPointConversions",
  carries: "rushingAttempts",
  rushing_yards: "rushingYards",
  rushing_tds: "rushingTouchdowns",
  rushing_2pt_conversions: "rushingTwoPointConversions",
  targets: "receivingTargets",
  receptions: "receptions",
  receiving_yards: "receivingYards",
  receiving_tds: "receivingTouchdowns",
  receiving_2pt_conversions: "receivingTwoPointConversions",
  fumbles_total: "fumbles",
  fumbles_lost_total: "fumblesLost",
  def_tackles_solo: "soloTackles",
  def_tackle_assists: "assistedTackles",
  def_tackles_for_loss: "stuffs",
  def_sacks: "defensiveSacks",
  def_interceptions: "defensiveInterceptions",
  def_pass_defended: "passesDefended",
  def_fumbles_forced: "forcedFumbles",
  fumble_recovery_opp: "fumbleRecoveries",
  def_tds: "defensiveTouchdowns",
  fg_att: "fieldGoalAttempts",
  fg_made: "fieldGoalsMade",
  fg_missed: "fieldGoalsMissed",
  fg_made_0_19: "fieldGoalsMade0To19",
  fg_made_20_29: "fieldGoalsMade20To29",
  fg_made_30_39: "fieldGoalsMade30To39",
  fg_made_40_49: "fieldGoalsMade40To49",
  fg_made_50_59: "fieldGoalsMade50To59",
  fg_made_60_: "fieldGoalsMade60Plus",
  pat_att: "extraPointAttempts",
  pat_made: "extraPointsMade",
  pt_att: "punts",
  pt_yards: "puntYards",
  punt_returns: "puntReturns",
  punt_return_yards: "puntReturnYards",
  kickoff_returns: "kickoffReturns",
  kickoff_return_yards: "kickoffReturnYards",
  special_teams_tds: "returnTouchdowns",
} as const;
export function normalizeNflverseStats(
  row: CsvRow,
): ProviderWeeklyStats | null {
  if (!row.player_id || !row.season || !row.week) return null;
  const stats: Record<string, number> = {};
  for (const [source, target] of Object.entries(statColumns))
    if (row[source] !== "" && row[source] !== undefined)
      stats[target] = number(row, source);
  return {
    externalId: row.player_id,
    team: row.team || undefined,
    opponent: row.opponent_team || undefined,
    season: number(row, "season"),
    week: number(row, "week"),
    stats,
    raw: row,
  };
}
