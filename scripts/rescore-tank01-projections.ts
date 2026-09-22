import { loadEnvConfig } from "@next/env";

loadEnvConfig(process.cwd());

async function main() {
  const { db } = await import("../src/lib/db");
  const { scoreEspnProjectedStats } =
    await import("../src/features/projections/espn-projected-stats");
  try {
    const tank = await db.dataProvider.findUniqueOrThrow({
      where: { key: "tank01" },
    });
    const rows = await db.playerProjection.findMany({
      where: { providerId: tank.id },
      include: { league: { include: { settings: true } } },
    });
    let updated = 0;
    for (const row of rows) {
      if (!row.league?.settings || !row.projectedStats) continue;
      const projectedPoints = scoreEspnProjectedStats(
        row.projectedStats as Record<string, number>,
        row.league.settings.espnScoring as Record<string, number>,
      );
      await db.playerProjection.update({
        where: { id: row.id },
        data: { projectedPoints },
      });
      updated++;
    }
    console.log(JSON.stringify({ rescored: updated }));
  } finally {
    await db.$disconnect();
  }
}

void main();
