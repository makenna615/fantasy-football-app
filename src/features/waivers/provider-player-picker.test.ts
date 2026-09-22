import { describe, expect, it } from "vitest";
import {
  filterProviderPlayers,
  type ProviderPlayerOption,
} from "./provider-player-picker";

const players: ProviderPlayerOption[] = [
  {
    playerId: "1",
    name: "Ja'Marr Chase",
    team: "CIN",
    position: "WR",
    projectedPoints: 17.6,
    provider: "Tank01",
  },
  {
    playerId: "2",
    name: "Jahmyr Gibbs",
    team: "DET",
    position: "RB",
    projectedPoints: 20.8,
    provider: "Tank01",
  },
];
describe("provider player autocomplete", () => {
  it("finds players by partial normalized name", () =>
    expect(filterProviderPlayers(players, "marr cha")[0]?.playerId).toBe("1"));
  it("can narrow by team or position", () =>
    expect(filterProviderPlayers(players, "gibbs DET RB")[0]?.playerId).toBe(
      "2",
    ));
  it("returns no suggestions for an empty query", () =>
    expect(filterProviderPlayers(players, "")).toEqual([]));
});
