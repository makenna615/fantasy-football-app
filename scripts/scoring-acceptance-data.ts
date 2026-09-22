import { loadEnvConfig } from "@next/env";

loadEnvConfig(process.cwd());

async function main() {
  const { db } = await import("../src/lib/db");
  const { season, week } = (
    await import("../src/lib/fantasy-week")
  ).getFantasyWeek();
  try {
    const tank = await db.dataProvider.findUniqueOrThrow({
      where: { key: "tank01" },
    });
    const leagues = await db.league.findMany({ include: { settings: true } });
    const positions = ["QB", "RB", "WR", "TE", "K", "DST", "LB"] as const;
    const samples = [];
    for (const position of positions) {
      const rows = await db.playerProjection.findMany({
        where: { providerId: tank.id, season, week, player: { position } },
        include: { player: true },
        orderBy: { projectedPoints: "desc" },
        take: 20,
      });
      const row =
        rows.find((item) => {
          const stats = item.projectedStats as Record<string, number> | null;
          return stats && Object.values(stats).some((value) => value !== 0);
        }) ?? rows[0];
      samples.push(
        row
          ? {
              position,
              player: row.player.fullName,
              team: row.player.nflTeam,
              projectedPoints: row.projectedPoints,
              stats: row.projectedStats,
            }
          : { position, unavailable: true },
      );
    }
    console.log(
      JSON.stringify(
        {
          season,
          week,
          leagueSettings: leagues.map((league) => ({
            name: league.name,
            scoringFormat: league.settings?.scoringFormat,
            espnScoring: league.settings?.espnScoring,
          })),
          samples,
        },
        null,
        2,
      ),
    );
  } finally {
    await db.$disconnect();
  }
}

void main();
