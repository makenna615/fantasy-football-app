import { describe, expect, it } from "vitest";
import {
  injuryMultiplier,
  mapNflPosition,
  normalizeNflverseInjury,
  normalizeNflversePlayer,
  normalizeNflverseRoster,
  normalizeNflverseStats,
} from "./normalize";
describe("NFLverse normalization", () => {
  it("maps Tank01 kicker aliases", () =>
    expect(mapNflPosition("PK")).toBe("K"));
  it("normalizes a player and stable IDs", () => {
    const row = {
      gsis_id: "00-1",
      display_name: "Test Player",
      first_name: "Test",
      last_name: "Player",
      latest_team: "GB",
      position: "WR",
      status: "ACT",
      last_season: "2026",
      espn_id: "123",
      yahoo_id: "456",
    };
    expect(normalizeNflversePlayer(row, 2026)).toMatchObject({
      externalId: "00-1",
      fullName: "Test Player",
      position: "WR",
      ids: { nflverse: "00-1", espn: "123" },
    });
  });
  it("rejects records without a stable GSIS ID", () =>
    expect(
      normalizeNflversePlayer({ display_name: "Unsafe", position: "RB" }, 2026),
    ).toBeNull());
  it("normalizes weekly roster data without changing fantasy membership", () =>
    expect(
      normalizeNflverseRoster({
        gsis_id: "00-1",
        team: "PIT",
        season: "2026",
        week: "2",
        status: "ACT",
        depth_chart_position: "RB",
      }),
    ).toMatchObject({ externalId: "00-1", team: "PIT", week: 2 }));
  it("normalizes injury facts with deterministic health", () =>
    expect(
      normalizeNflverseInjury({
        gsis_id: "00-1",
        team: "PIT",
        season: "2026",
        week: "2",
        report_status: "Doubtful",
        practice_primary_injury: "Knee",
      }),
    ).toMatchObject({
      status: "Doubtful",
      bodyPart: "Knee",
      multiplier: 0.25,
    }));
  it("keeps unknown injury wording neutral", () =>
    expect(injuryMultiplier("Unspecified")).toBe(1));
  it("normalizes offense, IDP, kicking, and return stats", () =>
    expect(
      normalizeNflverseStats({
        player_id: "00-1",
        season: "2025",
        week: "1",
        passing_yards: "250",
        def_tackles_solo: "4",
        fg_made: "2",
        kickoff_return_yards: "30",
      })?.stats,
    ).toMatchObject({
      passingYards: 250,
      soloTackles: 4,
      fieldGoalsMade: 2,
      kickoffReturnYards: 30,
    }));
});
