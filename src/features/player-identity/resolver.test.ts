import { describe, expect, it } from "vitest";
import {
  normalizePlayerName,
  PlayerIdentityResolver,
  type IdentityCandidate,
} from "./resolver";

const player = (
  overrides: Partial<IdentityCandidate> = {},
): IdentityCandidate => ({
  id: "p1",
  fullName: "Marvin Harrison Jr.",
  nflTeam: "ARI",
  position: "WR",
  externalIds: [{ provider: { key: "espn" }, externalId: "123" }],
  ...overrides,
});

describe("player identity resolver", () => {
  it("matches an exact stable provider ID regardless of team", () => {
    const result = new PlayerIdentityResolver([player()]).resolve({
      providerKey: "tank01",
      externalId: "123",
      stableIds: { espn: "123" },
      name: "Different Name",
      team: "NE",
      position: "WR",
    });
    expect(result).toMatchObject({
      status: "MATCHED",
      method: "STABLE_ID",
      confidence: 1,
    });
  });
  it.each([
    ["D.J. Moore", "djmoore"],
    ["Marvin Harrison Jr.", "marvinharrison"],
    ["Odell Beckham III", "odellbeckham"],
    ["José Núñez", "josenunez"],
  ])("normalizes %s", (input, expected) =>
    expect(normalizePlayerName(input)).toBe(expected),
  );
  it("handles a team change only when name and position are unique", () => {
    const result = new PlayerIdentityResolver([player()]).resolve({
      providerKey: "tank01",
      externalId: "new",
      name: "Marvin Harrison",
      team: "NE",
      position: "WR",
    });
    expect(result).toMatchObject({
      status: "MATCHED",
      method: "CONTROLLED_FALLBACK",
      confidence: 0.75,
    });
  });
  it("handles defenses separately by team", () => {
    const result = new PlayerIdentityResolver([
      player({ id: "dst", fullName: "Arizona D/ST", position: "DST" }),
    ]).resolve({
      providerKey: "tank01",
      externalId: "DST-1",
      name: "ARI D/ST",
      team: "ARI",
      position: "DST",
    });
    expect(result).toMatchObject({ status: "MATCHED", confidence: 0.95 });
  });
  it("never chooses an ambiguous player", () => {
    const resolver = new PlayerIdentityResolver([
      player(),
      player({ id: "p2", nflTeam: "NE", externalIds: [] }),
    ]);
    expect(
      resolver.resolve({
        providerKey: "tank01",
        externalId: "new",
        name: "Marvin Harrison",
        team: "DAL",
        position: "WR",
      }),
    ).toMatchObject({ status: "AMBIGUOUS" });
  });
  it("keeps unknown players unmatched", () => {
    expect(
      new PlayerIdentityResolver([player()]).resolve({
        providerKey: "tank01",
        externalId: "new",
        name: "Unknown Player",
        team: "DAL",
        position: "WR",
      }),
    ).toMatchObject({ status: "UNMATCHED" });
  });
});
