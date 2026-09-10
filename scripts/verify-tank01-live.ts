import { loadEnvConfig } from "@next/env";

loadEnvConfig(process.cwd());

const objectKeys = (value: unknown) =>
  value && typeof value === "object" && !Array.isArray(value)
    ? Object.keys(value as Record<string, unknown>)
    : [];

async function main() {
  const key = process.env.RAPIDAPI_KEY;
  const host = process.env.TANK01_API_HOST;
  if (!key || !host) throw new Error("Tank01 credentials are not configured");
  if (!/^[a-z0-9.-]+\.rapidapi\.com$/i.test(host))
    throw new Error("TANK01_API_HOST is not a RapidAPI host");

  const { getFantasyWeek } = await import("../src/lib/fantasy-week");
  const { normalizeTank01Response } =
    await import("../src/features/providers/tank01/client");
  const { mapNflPosition } =
    await import("../src/features/providers/nflverse/normalize");
  const { db } = await import("../src/lib/db");
  const { week } = getFantasyWeek();
  const url = new URL(`https://${host}/getNFLProjections`);
  url.searchParams.set("week", String(week));
  url.searchParams.set("itemFormat", "map");

  try {
    const response = await fetch(url, {
      headers: { "X-RapidAPI-Key": key, "X-RapidAPI-Host": host },
      cache: "no-store",
      signal: AbortSignal.timeout(30_000),
    });
    const text = await response.text();
    let payload: unknown;
    try {
      payload = JSON.parse(text);
    } catch {
      payload = null;
    }

    const root = payload as Record<string, unknown> | null;
    const body = root?.body as Record<string, unknown> | undefined;
    const playerContainer = body?.playerProjections;
    const rawPlayers = Array.isArray(playerContainer)
      ? playerContainer
      : playerContainer && typeof playerContainer === "object"
        ? Object.values(playerContainer as Record<string, unknown>)
        : [];
    const sample = rawPlayers[0] as Record<string, unknown> | undefined;

    const report: Record<string, unknown> = {
      endpoint: url.toString(),
      httpStatus: response.status,
      responseContentType: response.headers.get("content-type"),
      rateLimit: {
        limit: response.headers.get("x-ratelimit-requests-limit"),
        remaining: response.headers.get("x-ratelimit-requests-remaining"),
        resetSeconds: response.headers.get("x-ratelimit-requests-reset"),
      },
      rootKeys: objectKeys(payload),
      bodyKeys: objectKeys(body),
      playerContainerType: Array.isArray(playerContainer)
        ? "array"
        : typeof playerContainer,
      rawPlayerCount: rawPlayers.length,
      samplePlayerKeys: objectKeys(sample),
      samplePassingKeys: objectKeys(sample?.Passing),
      sampleRushingKeys: objectKeys(sample?.Rushing),
      sampleReceivingKeys: objectKeys(sample?.Receiving),
      responseWeek: body?.week,
      responseSeason: body?.season,
    };

    if (!response.ok || !payload) {
      report.apiMessage =
        typeof root?.message === "string"
          ? root.message
          : typeof root?.error === "string"
            ? root.error
            : "No structured API error message";
      console.log(JSON.stringify(report, null, 2));
      process.exitCode = 1;
      return;
    }

    try {
      const normalized = normalizeTank01Response(payload);
      const tankProvider = await db.dataProvider.findUnique({
        where: { key: "tank01" },
      });
      const [canonicalPlayers, tankMappings] = await Promise.all([
        db.player.findMany({ where: { active: true } }),
        tankProvider
          ? db.playerExternalId.findMany({
              where: { providerId: tankProvider.id },
              include: { player: true },
            })
          : [],
      ]);
      const byTankId = new Map(
        tankMappings.map((mapping) => [mapping.externalId, mapping.player]),
      );
      const matchedRows = normalized.flatMap((projection) => {
        const externalMatch = byTankId.get(projection.externalId);
        const position = mapNflPosition(projection.position);
        const fallback =
          !externalMatch && position
            ? canonicalPlayers.filter(
                (player) =>
                  player.fullName.toLocaleLowerCase() ===
                    projection.name.toLocaleLowerCase() &&
                  player.nflTeam === projection.team &&
                  player.position === position,
              )
            : [];
        const player =
          externalMatch ?? (fallback.length === 1 ? fallback[0] : null);
        return player
          ? [
              {
                canonicalPlayerId: player.id,
                canonicalName: player.fullName,
                canonicalTeam: player.nflTeam,
                canonicalPosition: player.position,
                matchMethod: externalMatch ? "TANK01_ID" : "NAME_TEAM_POSITION",
                tank01PlayerId: projection.externalId,
                normalizedStatKeys: Object.keys(projection.stats),
              },
            ]
          : [];
      });
      report.normalizedCount = normalized.length;
      report.playerProjectionCount = normalized.filter(
        (row) => row.position !== "DST",
      ).length;
      report.defenseProjectionCount = normalized.filter(
        (row) => row.position === "DST",
      ).length;
      report.statLineProjectionCount = normalized.filter((row) =>
        Object.values(row.stats).some((value) => value !== 0),
      ).length;
      report.canonicalMatchedCount = matchedRows.length;
      report.canonicalMatch = matchedRows[0] ?? null;
    } catch (error) {
      report.normalizationError =
        error instanceof Error ? error.message : "Unknown normalization error";
      process.exitCode = 1;
    }
    console.log(JSON.stringify(report, null, 2));
  } finally {
    await db.$disconnect();
  }
}

void main();
