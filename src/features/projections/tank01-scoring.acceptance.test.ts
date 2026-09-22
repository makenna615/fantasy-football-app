import { describe, expect, it } from "vitest";
import { ESPN_SCORING_DEFAULTS } from "@/features/league-settings/espn-scoring";
import { scoreEspnProjectedStats } from "./espn-projected-stats";

// Sanitized from cached Tank01 2026 week 1 projections; provider fantasy totals are intentionally omitted.
const fixtures = {
  qb: {
    passingYards: 244,
    passingTouchdowns: 1.6,
    passingInterceptions: 0.6,
    rushingYards: 32.2,
    rushingTouchdowns: 0.4,
    passingAttempts: 32.3,
    passingCompletions: 20.9,
  },
  rb: {
    rushingYards: 90.8,
    rushingTouchdowns: 0.8,
    receptions: 4.5,
    receivingYards: 34.9,
    receivingTouchdowns: 0.2,
  },
  wr: {
    rushingYards: 1.1,
    receptions: 7.6,
    receivingYards: 94.7,
    receivingTouchdowns: 0.7,
  },
  te: { receptions: 5.8, receivingYards: 57, receivingTouchdowns: 0.4 },
  kicker: {
    extraPointsMade: 3,
    fieldGoalsMissed: 0.2,
    fieldGoalsMadeUnknownDistance: 1.5,
  },
  dst: {
    dstSacks: 3.2,
    dstBlockedKicks: 0.1,
    dstInterceptions: 0.7,
    dstFumbleRecoveries: 0.5,
    dstSafeties: 0,
    dstPointsAllowed: 22,
    dstReturnTouchdowns: 0,
    dstDefensiveTouchdowns: 0.2,
  },
} as const;

const standard = { ...ESPN_SCORING_DEFAULTS, reception: 0 };
const halfPpr = { ...ESPN_SCORING_DEFAULTS, reception: 2.5 };
const fullPpr = { ...ESPN_SCORING_DEFAULTS, reception: 5 };

describe("Tank01 to ESPN scoring acceptance", () => {
  it("scores Jaxson Dart at standard four-point passing TD settings", () =>
    expect(scoreEspnProjectedStats(fixtures.qb, standard)).toBe(20.58));
  it("scores Jaxson Dart differently with six-point passing TDs", () =>
    expect(
      scoreEspnProjectedStats(fixtures.qb, { ...standard, passingTd: 6 }),
    ).toBe(23.78));
  it("differentiates Jahmyr Gibbs across standard, half PPR, and full PPR", () => {
    expect(scoreEspnProjectedStats(fixtures.rb, standard)).toBe(18.57);
    expect(scoreEspnProjectedStats(fixtures.rb, halfPpr)).toBe(20.82);
    expect(scoreEspnProjectedStats(fixtures.rb, fullPpr)).toBe(23.07);
  });
  it("scores the cached Ja'Marr Chase WR projection", () =>
    expect(scoreEspnProjectedStats(fixtures.wr, halfPpr)).toBe(17.58));
  it("scores the cached Trey McBride TE projection", () =>
    expect(scoreEspnProjectedStats(fixtures.te, halfPpr)).toBe(11));
  it("scores only known-distance-independent kicker facts", () =>
    expect(scoreEspnProjectedStats(fixtures.kicker, halfPpr)).toBe(2.8));
  it("does not guess a field-goal distance bucket", () =>
    expect(
      scoreEspnProjectedStats(fixtures.kicker, {
        ...halfPpr,
        fieldGoalMade60Plus: 100,
      }),
    ).toBe(2.8));
  it("scores D/ST facts without guessing generic touchdown types", () =>
    expect(scoreEspnProjectedStats(fixtures.dst, halfPpr)).toBe(5.8));
  it("does not invent IDP points when Tank01 supplies no IDP projection", () =>
    expect(scoreEspnProjectedStats({}, halfPpr)).toBe(0));
  it("applies the live custom league settings independently", () => {
    const custom = {
      ...ESPN_SCORING_DEFAULTS,
      reception: 2,
      rushingYard: 2,
      receivingYard: 2,
      rushingTd: 8,
    };
    expect(scoreEspnProjectedStats(fixtures.wr, custom)).toBe(26.4);
  });
});
