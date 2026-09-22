import { describe, expect, it } from "vitest";
import { ESPN_SCORING_DEFAULTS } from "@/features/league-settings/espn-scoring";
import { optimizeLineup } from "@/features/recommendations/lineup-optimizer";
import { rankWaivers } from "@/features/recommendations/waiver-advisor";
import { scoreEspnProjectedStats } from "./espn-projected-stats";
import { toCandidates } from "./repository";
import type { NormalizedProjection } from "./provider";

const projection = (
  id: string,
  name: string,
  position: "RB" | "WR",
  projectedPoints: number,
): NormalizedProjection => ({
  playerId: id,
  name,
  nflTeam: "NFL",
  position,
  projectedPoints,
  consistency: 0.5,
  matchupRating: 0,
  injuryMultiplier: 1,
  source: "tank01",
  updatedAt: new Date(),
});

describe("calculated projection recommendation boundaries", () => {
  it("passes Fourth Down's calculated points into the optimizer", () => {
    const points = scoreEspnProjectedStats(
      {
        rushingYards: 90.8,
        rushingTouchdowns: 0.8,
        receptions: 4.5,
        receivingYards: 34.9,
        receivingTouchdowns: 0.2,
      },
      ESPN_SCORING_DEFAULTS,
    );
    const candidates = toCandidates([
      projection("gibbs", "Jahmyr Gibbs", "RB", points),
    ]);
    expect(candidates[0].projectedPoints).toBe(20.82);
    expect(
      optimizeLineup(candidates, [{ slot: "RB", count: 1 }]).projectedPoints,
    ).toBe(20.82);
  });

  it("passes Fourth Down's calculated points into waiver ranking", () => {
    const availablePoints = scoreEspnProjectedStats(
      {
        receptions: 7.6,
        receivingYards: 94.7,
        receivingTouchdowns: 0.7,
        rushingYards: 1.1,
      },
      ESPN_SCORING_DEFAULTS,
    );
    const roster = toCandidates([
      projection("current", "Current WR", "WR", 10),
    ]);
    const available = toCandidates([
      projection("chase", "Ja'Marr Chase", "WR", availablePoints),
    ]);
    const result = rankWaivers(roster, available)[0];
    expect(result.add.projectedPoints).toBe(17.58);
    expect(result.projectedGain).toBe(7.58);
  });
});
