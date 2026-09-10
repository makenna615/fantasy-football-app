import type { Prisma, Position } from "@prisma/client";
import { db } from "@/lib/db";
import { getFantasyWeek } from "@/lib/fantasy-week";
import {
  NflverseInjuryProvider,
  NflverseMatchupProvider,
  NflversePlayerProvider,
  NflverseStatsProvider,
} from "@/features/providers/nflverse/client";
import { Tank01ProjectionProvider } from "@/features/providers/tank01/client";
import { emptySyncStats, type SyncStats } from "@/features/providers/contracts";
import { scoreEspnProjectedStats } from "@/features/projections/espn-projected-stats";
import { mapNflPosition } from "@/features/providers/nflverse/normalize";
import { isFresh } from "./freshness";
import {
  loadPlayerIdentityResolver,
  persistProviderCrosswalk,
} from "@/features/player-identity/resolver";

export type SyncDataset =
  "players" | "rosters" | "injuries" | "stats" | "matchups" | "projections";
const json = (value: unknown) =>
  JSON.parse(JSON.stringify(value)) as Prisma.InputJsonValue;
const nflverseEnabled = () => process.env.NFLVERSE_ENABLED !== "false";
const provider = async (key: string, name: string) =>
  db.dataProvider.upsert({
    where: { key },
    update: { active: true },
    create: { key, name, type: "API" },
  });
const stale = async (providerId: string, dataset: string, minutes: number) => {
  const run = await db.providerSyncRun.findFirst({
    where: { providerId, dataset, status: "SUCCESS" },
    orderBy: { completedAt: "desc" },
  });
  return !isFresh(run?.completedAt, minutes);
};

async function inParallel<T>(
  rows: T[],
  concurrency: number,
  work: (row: T) => Promise<void>,
) {
  let next = 0;
  await Promise.all(
    Array.from({ length: Math.min(concurrency, rows.length) }, async () => {
      while (next < rows.length) {
        const row = rows[next++];
        await work(row);
      }
    }),
  );
}

async function withRun(
  providerId: string,
  dataset: string,
  season: number,
  week: number,
  work: (result: SyncStats) => Promise<void>,
) {
  const result = emptySyncStats(
    dataset === "projections" ? "Tank01" : "NFLverse",
  );
  const run = await db.providerSyncRun.create({
    data: { providerId, dataset, status: "RUNNING", season, week },
  });
  try {
    await work(result);
    await db.providerSyncRun.update({
      where: { id: run.id },
      data: { status: "SUCCESS", completedAt: new Date(), ...counts(result) },
    });
  } catch (error) {
    result.errors++;
    result.errorMessages.push(
      error instanceof Error ? error.message : "Unknown sync error",
    );
    await db.providerSyncRun.update({
      where: { id: run.id },
      data: {
        status: "FAILED",
        completedAt: new Date(),
        errorMessage: result.errorMessages.join("; ").slice(0, 2000),
        ...counts(result),
      },
    });
  }
  return result;
}
const counts = (r: SyncStats) => ({
  received: r.received,
  imported: r.imported,
  updated: r.updated,
  skipped: r.skipped,
  unmatched: r.unmatched,
  stableIdMatches: r.stableIdMatches,
  fallbackMatches: r.fallbackMatches,
  ambiguousMatches: r.ambiguousMatches,
  errors: r.errors,
});
async function canonicalByExternal(providerId: string, externalId: string) {
  return (
    await db.playerExternalId.findUnique({
      where: { providerId_externalId: { providerId, externalId } },
      select: { playerId: true },
    })
  )?.playerId;
}
async function recordUnmatched(
  providerId: string,
  dataset: string,
  row: {
    externalId?: string;
    name?: string;
    team?: string;
    position?: string;
    raw: unknown;
  },
  reason: string,
) {
  const existing = await db.unmatchedProviderRecord.findFirst({
    where: {
      providerId,
      dataset,
      externalId: row.externalId,
      resolvedAt: null,
    },
  });
  const data = {
    providerId,
    dataset,
    externalId: row.externalId,
    displayName: row.name,
    nflTeam: row.team,
    position: row.position,
    reason,
    payload: json(row.raw),
  };
  if (existing)
    await db.unmatchedProviderRecord.update({
      where: { id: existing.id },
      data,
    });
  else await db.unmatchedProviderRecord.create({ data });
}

export async function syncPlayers(force = false) {
  const { season, week } = getFantasyWeek();
  const source = await provider("nflverse", "NFLverse");
  if (!force && !(await stale(source.id, "players", 24 * 60)))
    return { ...emptySyncStats("NFLverse"), skipped: 1 };
  return withRun(source.id, "players", season, week, async (result) => {
    const rows = await new NflversePlayerProvider(season).players();
    result.received = rows.length;
    const namespaces = new Map<string, string>();
    for (const key of ["espn", "pfr", "pff", "otc", "esb", "nfl"]) {
      const item = await provider(key, key.toUpperCase());
      namespaces.set(key, item.id);
    }
    await inParallel(rows, 24, async (row) => {
      if (!row.active) {
        result.skipped++;
        return;
      }
      const mapping = await db.playerExternalId.findUnique({
        where: {
          providerId_externalId: {
            providerId: source.id,
            externalId: row.externalId,
          },
        },
      });
      let playerId = mapping?.playerId;
      if (playerId) {
        await db.player.update({
          where: { id: playerId },
          data: {
            fullName: row.fullName,
            firstName: row.firstName,
            lastName: row.lastName,
            nflTeam: row.nflTeam,
            position: row.position,
            active: row.active,
          },
        });
        result.updated++;
      } else {
        const candidates = await db.player.findMany({
          where: {
            fullName: { equals: row.fullName, mode: "insensitive" },
            nflTeam: row.nflTeam,
            position: row.position,
            externalIds: { none: { providerId: source.id } },
          },
          select: { id: true },
          take: 2,
        });
        if (candidates.length === 1) playerId = candidates[0].id;
        else {
          playerId = (
            await db.player.create({
              data: {
                fullName: row.fullName,
                firstName: row.firstName,
                lastName: row.lastName,
                nflTeam: row.nflTeam,
                position: row.position,
                active: row.active,
              },
            })
          ).id;
          result.imported++;
        }
        await db.playerExternalId.create({
          data: { playerId, providerId: source.id, externalId: row.externalId },
        });
      }
      for (const [key, externalId] of Object.entries(row.ids)) {
        if (key === "nflverse" || !externalId) continue;
        const providerId = namespaces.get(key);
        if (!providerId) continue;
        const conflict = await db.playerExternalId.findUnique({
          where: { providerId_externalId: { providerId, externalId } },
        });
        if (!conflict)
          await db.playerExternalId.upsert({
            where: { playerId_providerId: { playerId, providerId } },
            update: { externalId },
            create: { playerId, providerId, externalId },
          });
        else if (conflict.playerId !== playerId) {
          result.unmatched++;
          await recordUnmatched(
            source.id,
            "players",
            {
              externalId: row.externalId,
              name: row.fullName,
              team: row.nflTeam,
              position: row.position,
              raw: row,
            },
            `${key} ID already maps to another player`,
          );
        }
      }
    });
  });
}

export async function syncRosters(force = false) {
  const { season, week } = getFantasyWeek();
  const source = await provider("nflverse", "NFLverse");
  if (!force && !(await stale(source.id, "rosters", 24 * 60)))
    return { ...emptySyncStats("NFLverse"), skipped: 1 };
  return withRun(source.id, "rosters", season, week, async (result) => {
    const rows = await new NflversePlayerProvider(season).rosters(season);
    const current = rows.filter(
      (row) =>
        row.week === week ||
        Math.max(...rows.map((item) => item.week)) === row.week,
    );
    result.received = current.length;
    for (const row of current) {
      const playerId = await canonicalByExternal(source.id, row.externalId);
      if (!playerId) {
        result.unmatched++;
        await recordUnmatched(
          source.id,
          "rosters",
          { externalId: row.externalId, team: row.team, raw: row.raw },
          "No canonical NFLverse player mapping",
        );
        continue;
      }
      await db.nflRosterStatus.upsert({
        where: {
          playerId_providerId_season_week: {
            playerId,
            providerId: source.id,
            season: row.season,
            week: row.week,
          },
        },
        update: {
          nflTeam: row.team,
          status: row.status,
          depthPosition: row.depthPosition,
          jerseyNumber: row.jerseyNumber,
          sourcePayload: json(row.raw),
          fetchedAt: new Date(),
        },
        create: {
          playerId,
          providerId: source.id,
          season: row.season,
          week: row.week,
          nflTeam: row.team,
          status: row.status,
          depthPosition: row.depthPosition,
          jerseyNumber: row.jerseyNumber,
          sourcePayload: json(row.raw),
        },
      });
      await db.player.update({
        where: { id: playerId },
        data: {
          nflTeam: row.team,
          active: ["ACT", "RES", "DEV"].includes(row.status),
        },
      });
      result.updated++;
    }
  });
}

async function syncRosterExternalIds() {
  const { season } = getFantasyWeek();
  const nflverse = await provider("nflverse", "NFLverse");
  const rows = await new NflversePlayerProvider(season).rosters(season);
  const namespaceIds = new Map<string, string>();
  for (const key of ["espn", "yahoo", "sleeper", "fantasydata", "pfr", "pff"]) {
    const item = await provider(key, key.toUpperCase());
    namespaceIds.set(key, item.id);
  }
  for (const row of rows) {
    const playerId = await canonicalByExternal(nflverse.id, row.externalId);
    if (!playerId) continue;
    for (const [key, externalId] of Object.entries(row.ids)) {
      const providerId = namespaceIds.get(key);
      if (!providerId || !externalId) continue;
      const conflict = await db.playerExternalId.findUnique({
        where: { providerId_externalId: { providerId, externalId } },
      });
      if (!conflict)
        await db.playerExternalId.upsert({
          where: { playerId_providerId: { playerId, providerId } },
          update: { externalId },
          create: { playerId, providerId, externalId },
        });
    }
  }
}

export async function syncInjuries(force = false) {
  const { season, week } = getFantasyWeek();
  const source = await provider("nflverse", "NFLverse");
  if (!force && !(await stale(source.id, "injuries", 6 * 60)))
    return { ...emptySyncStats("NFLverse"), skipped: 1 };
  return withRun(source.id, "injuries", season, week, async (result) => {
    const rows = (await new NflverseInjuryProvider().injuries(season)).filter(
      (row) => row.week === week,
    );
    result.received = rows.length;
    for (const row of rows) {
      const playerId = await canonicalByExternal(source.id, row.externalId);
      if (!playerId) {
        result.unmatched++;
        await recordUnmatched(
          source.id,
          "injuries",
          { externalId: row.externalId, team: row.team, raw: row.raw },
          "No canonical NFLverse player mapping",
        );
        continue;
      }
      await db.playerInjury.upsert({
        where: {
          playerId_providerId_season_week: {
            playerId,
            providerId: source.id,
            season,
            week,
          },
        },
        update: {
          status: row.status,
          team: row.team,
          bodyPart: row.bodyPart,
          practiceStatus: row.practiceStatus,
          multiplier: row.multiplier,
          fetchedAt: new Date(),
          details: row.bodyPart,
        },
        create: {
          playerId,
          providerId: source.id,
          season,
          week,
          status: row.status,
          team: row.team,
          bodyPart: row.bodyPart,
          practiceStatus: row.practiceStatus,
          multiplier: row.multiplier,
          details: row.bodyPart,
        },
      });
      result.updated++;
    }
  });
}

export async function syncStats(force = false) {
  const { season, week } = getFantasyWeek();
  const source = await provider("nflverse", "NFLverse");
  if (!force && !(await stale(source.id, "stats", 24 * 60)))
    return { ...emptySyncStats("NFLverse"), skipped: 1 };
  return withRun(source.id, "stats", season, week, async (result) => {
    const rows = await new NflverseStatsProvider().weeklyStats(season);
    result.received = rows.length;
    for (const row of rows) {
      const playerId = await canonicalByExternal(source.id, row.externalId);
      if (!playerId) {
        result.unmatched++;
        continue;
      }
      await db.playerWeeklyStat.upsert({
        where: {
          playerId_providerId_season_week: {
            playerId,
            providerId: source.id,
            season: row.season,
            week: row.week,
          },
        },
        update: {
          nflTeam: row.team,
          opponent: row.opponent,
          stats: json(row.stats),
          sourcePayload: json(row.raw),
          fetchedAt: new Date(),
        },
        create: {
          playerId,
          providerId: source.id,
          season: row.season,
          week: row.week,
          nflTeam: row.team,
          opponent: row.opponent,
          stats: json(row.stats),
          sourcePayload: json(row.raw),
        },
      });
      result.updated++;
    }
  });
}

export async function syncMatchups(force = false) {
  const { season, week } = getFantasyWeek();
  const source = await provider("nflverse", "NFLverse");
  if (!force && !(await stale(source.id, "matchups", 24 * 60)))
    return { ...emptySyncStats("NFLverse"), skipped: 1 };
  return withRun(source.id, "matchups", season, week, async (result) => {
    const games = await new NflverseMatchupProvider().schedule(season, week);
    result.received = games.length;
    for (const game of games) {
      const players = await db.player.findMany({
        where: { nflTeam: game.team, active: true },
        select: { id: true },
      });
      for (const player of players) {
        await db.playerMatchup.upsert({
          where: {
            playerId_providerId_season_week: {
              playerId: player.id,
              providerId: source.id,
              season,
              week,
            },
          },
          update: {
            opponent: game.opponent,
            home: game.home,
            matchupRating: 0,
            details: json({ source: "nflverse schedule" }),
            importedAt: new Date(),
          },
          create: {
            playerId: player.id,
            providerId: source.id,
            season,
            week,
            opponent: game.opponent,
            home: game.home,
            matchupRating: 0,
            details: json({ source: "nflverse schedule" }),
          },
        });
        result.updated++;
      }
    }
  });
}

export async function syncProjections(force = false) {
  const { season, week } = getFantasyWeek();
  const source = await provider("tank01", "Tank01 via RapidAPI");
  const cache = Math.max(
    15,
    Number(process.env.PROJECTION_CACHE_MINUTES) || 60,
  );
  if (!force && !(await stale(source.id, "projections", cache)))
    return { ...emptySyncStats("Tank01"), skipped: 1 };
  return withRun(source.id, "projections", season, week, async (result) => {
    const rows = await new Tank01ProjectionProvider().projections(week);
    result.received = rows.length;
    const identityResolver = await loadPlayerIdentityResolver();
    const leagues = await db.league.findMany({
      where: { settings: { isNot: null } },
      include: { settings: true },
    });
    for (const row of rows) {
      const pos = row.position === "DST" ? "DST" : mapNflPosition(row.position);
      if (!pos) {
        result.unmatched++;
        await recordUnmatched(
          source.id,
          "projections",
          {
            externalId: row.externalId,
            name: row.name,
            team: row.team,
            position: row.position,
            raw: row.raw,
          },
          "Unsupported player position",
        );
        continue;
      }
      let resolution = identityResolver.resolve({
        providerKey: "tank01",
        externalId: row.externalId,
        stableIds: pos === "DST" ? undefined : { espn: row.externalId },
        name: row.name,
        team: row.team,
        position: pos,
      });
      if (resolution.status === "UNMATCHED" && pos === "DST") {
        const defense = await db.player.create({
          data: {
            fullName: row.name,
            nflTeam: row.team,
            position: "DST",
            active: true,
          },
        });
        resolution = {
          status: "MATCHED",
          player: { ...defense, externalIds: [] },
          method: "STABLE_ID",
          confidence: 1,
          evidence: "Tank01 stable team ID",
        };
      }
      if (resolution.status !== "MATCHED") {
        if (resolution.status === "AMBIGUOUS") result.ambiguousMatches++;
        else result.unmatched++;
        await recordUnmatched(
          source.id,
          "projections",
          {
            externalId: row.externalId,
            name: row.name,
            team: row.team,
            position: row.position,
            raw: row.raw,
          },
          resolution.evidence,
        );
        continue;
      }
      const playerId = resolution.player.id;
      await persistProviderCrosswalk({
        playerId,
        providerId: source.id,
        externalId: row.externalId,
        method: resolution.method,
        confidence: resolution.confidence,
      });
      await db.unmatchedProviderRecord.updateMany({
        where: {
          providerId: source.id,
          dataset: "projections",
          externalId: row.externalId,
          resolvedAt: null,
        },
        data: { resolvedAt: new Date(), playerId },
      });
      if (resolution.method === "STABLE_ID") result.stableIdMatches++;
      else result.fallbackMatches++;
      for (const league of leagues) {
        if (!league.settings) continue;
        const points = scoreEspnProjectedStats(
          row.stats,
          league.settings.espnScoring as Record<string, number>,
        );
        const existing = await db.playerProjection.findFirst({
          where: {
            playerId,
            providerId: source.id,
            leagueId: league.id,
            season,
            week,
          },
        });
        const data = {
          projectedPoints: points,
          projectedStats: json(row.stats),
          sourcePayload: json(row.raw),
          fetchedAt: new Date(),
          importedAt: new Date(),
        };
        if (existing)
          await db.playerProjection.update({
            where: { id: existing.id },
            data,
          });
        else
          await db.playerProjection.create({
            data: {
              playerId,
              providerId: source.id,
              leagueId: league.id,
              season,
              week,
              ...data,
            },
          });
      }
      result.updated++;
    }
  });
}

export async function syncCurrentData(
  datasets: SyncDataset[] = [
    "players",
    "rosters",
    "injuries",
    "stats",
    "matchups",
    "projections",
  ],
  force = false,
) {
  const results: SyncStats[] = [];
  if (nflverseEnabled() && datasets.includes("players"))
    results.push(await syncPlayers(force));
  if (nflverseEnabled() && datasets.includes("rosters")) {
    const rosterResult = await syncRosters(force);
    results.push(rosterResult);
    if (force || rosterResult.received > 0) await syncRosterExternalIds();
  }
  if (nflverseEnabled() && datasets.includes("injuries"))
    results.push(await syncInjuries(force));
  if (nflverseEnabled() && datasets.includes("stats"))
    results.push(await syncStats(force));
  if (nflverseEnabled() && datasets.includes("matchups"))
    results.push(await syncMatchups(force));
  if (datasets.includes("projections"))
    results.push(await syncProjections(force));
  return results;
}
