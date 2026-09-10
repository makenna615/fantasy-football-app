import { z } from "zod";

const numeric = z.union([z.string(), z.number()]).transform((value) => {
  const parsed = Number(value);
  if (!Number.isFinite(parsed))
    throw new Error("Non-numeric Tank01 projection");
  return parsed;
});
const passing = z
  .object({
    passAttempts: numeric.default(0),
    passCompletions: numeric.default(0),
    passYds: numeric.default(0),
    passTD: numeric.default(0),
    int: numeric.default(0),
  })
  .default({});
const rushing = z
  .object({
    carries: numeric.default(0),
    rushYds: numeric.default(0),
    rushTD: numeric.default(0),
  })
  .default({});
const receiving = z
  .object({
    targets: numeric.default(0),
    receptions: numeric.default(0),
    recYds: numeric.default(0),
    recTD: numeric.default(0),
  })
  .default({});
const player = z.object({
  playerID: z.string(),
  longName: z.string(),
  pos: z.string(),
  team: z.string(),
  teamID: z.string().optional(),
  twoPointConversion: numeric.default(0),
  fumblesLost: numeric.default(0),
  Passing: passing,
  Rushing: rushing,
  Receiving: receiving,
  Kicking: z
    .object({
      fgMade: numeric,
      fgMissed: numeric,
      xpMade: numeric,
      xpMissed: numeric,
    })
    .optional(),
});
const defense = z.object({
  teamID: z.string(),
  teamAbv: z.string(),
  returnTD: numeric,
  defTD: numeric,
  safeties: numeric,
  fumbleRecoveries: numeric,
  ptsAgainst: numeric,
  interceptions: numeric,
  sacks: numeric,
  blockKick: numeric,
});
const responseSchema = z.object({
  body: z.object({
    playerProjections: z.record(z.string(), player),
    teamDefenseProjections: z.record(z.string(), defense),
  }),
  error: z.string().optional(),
});
export class Tank01HttpError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
  }
}
export type TankProjection = {
  externalId: string;
  name: string;
  team: string;
  position: string;
  stats: Record<string, number>;
  raw: unknown;
};
export function normalizeTank01Response(input: unknown): TankProjection[] {
  const parsed = responseSchema.parse(input);
  if (parsed.error) throw new Error(parsed.error);
  const players = Object.values(parsed.body.playerProjections).map((row) => ({
    externalId: row.playerID,
    name: row.longName,
    team: row.team,
    position: row.pos,
    stats: {
      passingAttempts: row.Passing.passAttempts,
      passingCompletions: row.Passing.passCompletions,
      passingYards: row.Passing.passYds,
      passingTouchdowns: row.Passing.passTD,
      passingInterceptions: row.Passing.int,
      rushingAttempts: row.Rushing.carries,
      rushingYards: row.Rushing.rushYds,
      rushingTouchdowns: row.Rushing.rushTD,
      receivingTargets: row.Receiving.targets,
      receptions: row.Receiving.receptions,
      receivingYards: row.Receiving.recYds,
      receivingTouchdowns: row.Receiving.recTD,
      twoPointConversions: row.twoPointConversion,
      fumblesLost: row.fumblesLost,
      ...(row.Kicking
        ? {
            fieldGoalsMadeUnknownDistance: row.Kicking.fgMade,
            fieldGoalsMissed: row.Kicking.fgMissed,
            extraPointsMade: row.Kicking.xpMade,
            extraPointsMissed: row.Kicking.xpMissed,
          }
        : {}),
    },
    raw: row,
  }));
  const defenses = Object.values(parsed.body.teamDefenseProjections).map(
    (row) => ({
      externalId: `DST-${row.teamID}`,
      name: `${row.teamAbv} D/ST`,
      team: row.teamAbv,
      position: "DST",
      stats: {
        dstReturnTouchdowns: row.returnTD,
        dstDefensiveTouchdowns: row.defTD,
        dstSafeties: row.safeties,
        dstFumbleRecoveries: row.fumbleRecoveries,
        dstPointsAllowed: row.ptsAgainst,
        dstInterceptions: row.interceptions,
        dstSacks: row.sacks,
        dstBlockedKicks: row.blockKick,
      },
      raw: row,
    }),
  );
  return [...players, ...defenses];
}

export class Tank01ProjectionProvider {
  readonly key = "tank01";
  constructor(private fetcher: typeof fetch = fetch) {}
  configured() {
    return Boolean(process.env.RAPIDAPI_KEY && process.env.TANK01_API_HOST);
  }
  async projections(week: number): Promise<TankProjection[]> {
    const key = process.env.RAPIDAPI_KEY,
      host = process.env.TANK01_API_HOST;
    if (!key || !host) throw new Error("Tank01 is not configured");
    if (!/^[a-z0-9.-]+\.rapidapi\.com$/i.test(host))
      throw new Error("Invalid Tank01 RapidAPI host");
    const url = new URL(`https://${host}/getNFLProjections`);
    url.searchParams.set("week", String(week));
    url.searchParams.set("itemFormat", "map");
    let last: Error | undefined;
    for (let attempt = 0; attempt < 3; attempt++) {
      try {
        const res = await this.fetcher(url, {
          headers: { "X-RapidAPI-Key": key, "X-RapidAPI-Host": host },
          signal: AbortSignal.timeout(15_000),
          cache: "no-store",
        });
        if ([401, 403, 400, 404, 422].includes(res.status))
          throw new Tank01HttpError(
            res.status,
            "Tank01 authentication or request validation failed",
          );
        if (res.status === 429)
          throw new Tank01HttpError(429, "Tank01 rate limit reached");
        if (res.status >= 500) {
          last = new Tank01HttpError(
            res.status,
            "Tank01 temporarily unavailable",
          );
          if (attempt < 2) {
            await new Promise((resolve) =>
              setTimeout(resolve, 250 * 2 ** attempt),
            );
            continue;
          }
          throw last;
        }
        if (!res.ok)
          throw new Tank01HttpError(
            res.status,
            `Tank01 request failed (${res.status})`,
          );
        return normalizeTank01Response(await res.json());
      } catch (error) {
        if (error instanceof Tank01HttpError || error instanceof z.ZodError)
          throw error;
        last =
          error instanceof Error ? error : new Error("Tank01 request failed");
        if (attempt < 2) {
          await new Promise((resolve) =>
            setTimeout(resolve, 250 * 2 ** attempt),
          );
          continue;
        }
      }
    }
    throw last ?? new Error("Tank01 request failed");
  }
}
