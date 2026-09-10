import { loadEnvConfig } from "@next/env";

loadEnvConfig(process.cwd());

async function main() {
  const { db } = await import("../src/lib/db");
  try {
    const tank = await db.dataProvider.findUniqueOrThrow({
      where: { key: "tank01" },
    });
    const mappings = await db.playerExternalId.findMany({
      where: { providerId: tank.id },
    });
    let resolved = 0;
    for (const mapping of mappings) {
      const result = await db.unmatchedProviderRecord.updateMany({
        where: {
          providerId: tank.id,
          dataset: "projections",
          externalId: mapping.externalId,
          resolvedAt: null,
        },
        data: { resolvedAt: new Date(), playerId: mapping.playerId },
      });
      resolved += result.count;
    }
    console.log(JSON.stringify({ resolvedHistoricalRecords: resolved }));
  } finally {
    await db.$disconnect();
  }
}

void main();
