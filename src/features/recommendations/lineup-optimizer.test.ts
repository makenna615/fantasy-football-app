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
});
