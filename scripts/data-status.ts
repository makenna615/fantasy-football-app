import { loadEnvConfig } from "@next/env";

loadEnvConfig(process.cwd());

async function main() {
  const { db } = await import("../src/lib/db");
  try {
    await db.providerSyncRun.updateMany({
      where: {
        status: "RUNNING",
        startedAt: { lt: new Date(Date.now() - 60_000) },
      },
      data: {
        status: "FAILED",
        completedAt: new Date(),
        errorMessage: "Sync process was interrupted",
      },
    });
    const [players, rosters, injuries, stats, projections, unmatched, runs] =
      await Promise.all([
        db.player.count(),
        db.nflRosterStatus.count(),
        db.playerInjury.count(),
        db.playerWeeklyStat.count(),
        db.playerProjection.count(),
        db.unmatchedProviderRecord.count(),
        db.providerSyncRun.findMany({
          orderBy: { startedAt: "desc" },
          take: 10,
          select: {
            dataset: true,
            status: true,
            received: true,
            imported: true,
            updated: true,
            unmatched: true,
            errors: true,
          },
        }),
      ]);
    console.log(
      JSON.stringify(
        { players, rosters, injuries, stats, projections, unmatched, runs },
        null,
        2,
      ),
    );
  } finally {
    await db.$disconnect();
  }
}

void main();
