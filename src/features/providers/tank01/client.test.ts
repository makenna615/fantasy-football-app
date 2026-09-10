import { afterEach, describe, expect, it, vi } from "vitest";
import {
  Tank01HttpError,
  Tank01ProjectionProvider,
  normalizeTank01Response,
} from "./client";
const valid = {
  body: {
    playerProjections: {
      "1": {
        playerID: "1",
        longName: "Test QB",
        pos: "QB",
        team: "GB",
        teamID: "1",
        twoPointConversion: "0",
        fumblesLost: "1",
        Passing: {
          passAttempts: "30",
          passCompletions: "20",
          passYds: "250",
          passTD: "2",
          int: "1",
        },
        Rushing: { carries: "3", rushYds: "15", rushTD: "0" },
        Receiving: { targets: "0", receptions: "0", recYds: "0", recTD: "0" },
      },
    },
    teamDefenseProjections: {},
  },
};
afterEach(() => {
  delete process.env.RAPIDAPI_KEY;
  delete process.env.TANK01_API_HOST;
  vi.restoreAllMocks();
});
describe("Tank01 provider", () => {
  it("normalizes projected stats and ignores provider fantasy totals", () =>
    expect(normalizeTank01Response(valid)[0].stats).toMatchObject({
      passingYards: 250,
      passingTouchdowns: 2,
      passingInterceptions: 1,
    }));
  it("rejects malformed responses", () =>
    expect(() => normalizeTank01Response({ body: {} })).toThrow());
  it("normalizes live-shaped players with omitted stat categories as zero", () => {
    const sparse = {
      body: {
        playerProjections: {
          "2": {
            playerID: "2",
            longName: "Test Kicker",
            pos: "K",
            team: "GB",
            Kicking: { fgMade: "2", fgMissed: "0", xpMade: "3", xpMissed: "0" },
          },
        },
        teamDefenseProjections: {},
      },
    };
    expect(normalizeTank01Response(sparse)[0].stats).toMatchObject({
      passingYards: 0,
      rushingYards: 0,
      receivingYards: 0,
      fieldGoalsMadeUnknownDistance: 2,
    });
  });
  it.each([401, 429])("stops on HTTP %s", async (status) => {
    process.env.RAPIDAPI_KEY = "test";
    process.env.TANK01_API_HOST = "example.rapidapi.com";
    const fetcher = vi.fn().mockResolvedValue(new Response("{}", { status }));
    await expect(
      new Tank01ProjectionProvider(fetcher).projections(1),
    ).rejects.toBeInstanceOf(Tank01HttpError);
    expect(fetcher).toHaveBeenCalledTimes(1);
  });
  it("retries transient failures and retains responsibility with the caller", async () => {
    process.env.RAPIDAPI_KEY = "test";
    process.env.TANK01_API_HOST = "example.rapidapi.com";
    const fetcher = vi
      .fn()
      .mockResolvedValueOnce(new Response("", { status: 503 }))
      .mockResolvedValueOnce(Response.json(valid));
    await expect(
      new Tank01ProjectionProvider(fetcher).projections(1),
    ).resolves.toHaveLength(1);
    expect(fetcher).toHaveBeenCalledTimes(2);
  });
});
