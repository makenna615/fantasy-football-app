import { describe, expect, it } from "vitest";
import { optimizeLineup } from "./lineup-optimizer";
import type { CandidatePlayer } from "./types";

const player = (id: string, position: CandidatePlayer["position"], points: number): CandidatePlayer =>
  ({ id, name: id, team: "NFL", position, projectedPoints: points });

describe("optimizeLineup", () => {
  it("uses global slot optimization instead of consuming the best flex player early", () => {
    const result = optimizeLineup([
      player("rb1", "RB", 20), player("rb2", "RB", 18), player("rb3", "RB", 17),
      player("wr1", "WR", 16), player("wr2", "WR", 15), player("te1", "TE", 10),
    ], [{ slot: "RB", count: 2 }, { slot: "WR", count: 2 }, { slot: "FLEX", count: 1 }]);
    expect(result.projectedPoints).toBe(86);
    expect(result.starters.map((entry) => entry.player.id)).toContain("rb3");
  });

  it("fills WR/TE with only an eligible wide receiver or tight end", () => {
    const result = optimizeLineup([player("qb", "QB", 30), player("wr", "WR", 14), player("te", "TE", 12)], [{ slot: "WR_TE", count: 1 }]);
    expect(result.starters[0].player.id).toBe("wr");
  });

  it("reserves the only quarterback for SUPERFLEX while filling FLEX with a skill player", () => {
    const result = optimizeLineup([player("qb", "QB", 25), player("rb", "RB", 18)], [{ slot: "FLEX", count: 1 }, { slot: "SUPERFLEX", count: 1 }]);
    expect(result.starters.find(entry => entry.slot === "SUPERFLEX")?.player.id).toBe("qb");
  });

  it("supports defensive-line, defensive-back, and defensive-player utility eligibility", () => {
    const result = optimizeLineup([player("dt", "DT", 9), player("de", "DE", 8), player("cb", "CB", 7), player("s", "S", 6), player("lb", "LB", 10)], [{ slot: "DL", count: 1 }, { slot: "DB", count: 1 }, { slot: "DP", count: 1 }]);
    expect(new Set(result.starters.map(entry => entry.player.id)).size).toBe(3);
    expect(result.starters.find(entry => entry.slot === "DP")?.player.id).toBe("lb");
  });

  it("fails instead of returning an illegal incomplete lineup", () => {
    expect(() => optimizeLineup([player("rb", "RB", 10)], [{ slot: "QB", count: 1 }])).toThrow(/cannot fill/i);
  });
});
