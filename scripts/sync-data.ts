import { loadEnvConfig } from "@next/env";

loadEnvConfig(process.cwd());

async function main() {
  const { syncCurrentData } = await import("../src/features/sync/service");
  const { db } = await import("../src/lib/db");

  try {
    const only = process.argv
      .find((argument) => argument.startsWith("--only="))
      ?.slice(7);
    const datasets = only
      ? (only.split(",") as Parameters<typeof syncCurrentData>[0])
      : undefined;
    const results = await syncCurrentData(
      datasets,
      process.argv.includes("--force"),
    );
    for (const result of results) {
      console.log(JSON.stringify(result));
    }
    if (results.some((result) => result.errors > 0)) process.exitCode = 1;
  } finally {
    await db.$disconnect();
  }
}

void main();
