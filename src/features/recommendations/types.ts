export type Position = "QB" | "RB" | "WR" | "TE" | "K" | "DST";
export type LineupSlot = Position | "FLEX" | "SUPERFLEX" | "BENCH";

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
