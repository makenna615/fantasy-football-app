import { describe, expect, it } from "vitest";
import { scoreProjection } from "./scoring";

describe("scoreProjection", () => {
  it("adapts raw stats to the league rules", () => {
    expect(scoreProjection({ passingYards: 250, passingTouchdowns: 2, interceptions: 1, rushingYards: 20 }, {
      passingYardsPerPoint: 25, pointsPerPassingTd: 4, pointsPerInterception: -2,
      rushingYardsPerPoint: 10, pointsPerRushingTd: 6, pointsPerReception: .5,
      receivingYardsPerPoint: 10, pointsPerReceivingTd: 6,
    })).toBe(18);
  });
  it("applies negative scoring without clamping", () => {
    expect(scoreProjection({ interceptions: 3 }, { passingYardsPerPoint:25, pointsPerPassingTd:4, pointsPerInterception:-3, rushingYardsPerPoint:10, pointsPerRushingTd:6, pointsPerReception:0, receivingYardsPerPoint:10, pointsPerReceivingTd:6 })).toBe(-9);
  });
});
