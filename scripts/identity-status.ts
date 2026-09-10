import { loadEnvConfig } from "@next/env";

loadEnvConfig(process.cwd());

async function main() {
  const { db } = await import("../src/lib/db");
  const { normalizePlayerName } =
    await import("../src/features/player-identity/resolver");
  try {
    const providers = await db.dataProvider.findMany({
      where: {
        key: {
          in: ["nflverse", "espn", "yahoo", "sleeper", "fantasydata", "tank01"],
        },
      },
      select: { key: true, _count: { select: { externalIds: true } } },
    });
    const tank = providers.find((provider) => provider.key === "tank01");
    const crosswalk = tank
      ? await db.playerExternalId.groupBy({
          by: ["matchMethod"],
          where: {
            providerId: (
              await db.dataProvider.findUniqueOrThrow({
                where: { key: "tank01" },
              })
            ).id,
          },
          _count: true,
        })
      : [];
    const latest = tank
      ? await db.providerSyncRun.findFirst({
          where: {
            providerId: (
              await db.dataProvider.findUniqueOrThrow({
                where: { key: "tank01" },
              })
            ).id,
            dataset: "projections",
            status: "SUCCESS",
          },
          orderBy: { completedAt: "desc" },
        })
      : null;
    const unresolved = tank
      ? await db.unmatchedProviderRecord.findMany({
          where: {
            providerId: (
              await db.dataProvider.findUniqueOrThrow({
                where: { key: "tank01" },
              })
            ).id,
            dataset: "projections",
            resolvedAt: null,
          },
          orderBy: { createdAt: "desc" },
          take: 10,
        })
      : [];
    const players = await db.player.findMany({
      select: { id: true, fullName: true, nflTeam: true, position: true },
    });
    const samples = unresolved.map((row) => ({
      externalId: row.externalId,
      name: row.displayName,
      team: row.nflTeam,
      position: row.position,
      comparableCandidates: players
        .filter(
          (player) =>
            row.displayName &&
            normalizePlayerName(player.fullName) ===
              normalizePlayerName(row.displayName) &&
            player.position === row.position,
        )
        .slice(0, 3),
    }));
    console.log(
      JSON.stringify({ providers, crosswalk, latest, samples }, null, 2),
    );
  } finally {
    await db.$disconnect();
  }
}

void main();
