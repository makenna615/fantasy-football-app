export type Position = "QB" | "TQB" | "RB" | "WR" | "TE" | "DT" | "DE" | "LB" | "CB" | "S" | "K" | "P" | "HC" | "DST";
export type LineupSlot = Position | "RB_WR" | "FLEX" | "WR_TE" | "OP" | "SUPERFLEX" | "DL" | "DB" | "DP" | "BENCH" | "IR";

export interface CandidatePlayer {
  id: string;
  name: string;
  team: string;
  position: Position;
  projectedPoints: number;
  floorPoints?: number;
  ceilingPoints?: number;
  consistency?: number;
  matchupRating?: number;
  injuryMultiplier?: number;
  restOfSeasonPoints?: number;
}

export interface SlotRequirement { slot: LineupSlot; count: number }
export interface LineupEntry { slot: LineupSlot; player: CandidatePlayer; adjustedPoints: number }
export interface LineupResult {
  starters: LineupEntry[];
  bench: CandidatePlayer[];
  projectedPoints: number;
  confidence: number;
  alternatives: Array<{ slot: LineupSlot; starter: CandidatePlayer; alternative: CandidatePlayer; pointDelta: number }>;
}

export interface WaiverResult {
  add: CandidatePlayer;
  drop?: CandidatePlayer;
  priorityScore: number;
  shortTermValue: number;
  restOfSeasonValue: number;
  projectedGain: number;
}
