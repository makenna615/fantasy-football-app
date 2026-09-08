import { describe, expect, it } from "vitest";
import { rankWaivers } from "./waiver-advisor";
import type { CandidatePlayer } from "./types";

const player = (id: string, position: CandidatePlayer["position"], points: number): CandidatePlayer => ({ id, name: id, team: "NFL", position, projectedPoints: points, ceilingPoints: points + 5, restOfSeasonPoints: points * 6 });

describe("rankWaivers", () => {
  it("ranks deterministic upgrades above smaller gains", () => {
    const results = rankWaivers([player("rb-old", "RB", 8), player("wr-old", "WR", 9)], [player("rb-new", "RB", 15), player("wr-new", "WR", 10)]);
    expect(results[0].add.id).toBe("rb-new");
    expect(results[0].drop?.id).toBe("rb-old");
    expect(results[0].projectedGain).toBeGreaterThan(0);
  });

  it("never suggests dropping a quarterback for a flex-position pickup", () => {
    const results = rankWaivers([player("qb", "QB", 2), player("rb", "RB", 8)], [player("wr", "WR", 14)]);
    expect(results[0].drop?.id).toBe("rb");
  });
});
