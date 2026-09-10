const release = "https://github.com/nflverse/nflverse-data/releases/download";
export const NFLVERSE_URLS = {
  players: `${release}/players/players.csv`,
  rosters: (season:number) => `${release}/rosters/roster_${season}.csv`,
  weeklyRosters: (season:number) => `${release}/weekly_rosters/roster_weekly_${season}.csv`,
  injuries: (season:number) => `${release}/injuries/injuries_${season}.csv`,
  weeklyStats: (season:number) => `${release}/stats_player/stats_player_week_${season}.csv`,
  snapCounts: (season:number) => `${release}/snap_counts/snap_counts_${season}.csv`,
  advancedStats: (season:number, type:"pass"|"rush"|"rec"|"def") => `${release}/pfr_advstats/advstats_week_${type}_${season}.csv`,
  schedules: "https://raw.githubusercontent.com/nflverse/nfldata/master/data/games.csv",
} as const;
export const NFLVERSE_ATTRIBUTION = "Data: nflverse (CC BY 4.0 where applicable) — github.com/nflverse/nflverse-data";
