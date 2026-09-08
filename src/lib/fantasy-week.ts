export function getFantasyWeek(now = new Date()): { season: number; week: number } {
  const year = now.getUTCFullYear();
  const month = now.getUTCMonth();
  const season = month < 2 ? year - 1 : year;
  const septemberFirst = new Date(Date.UTC(season, 8, 1));
  const firstMondayOffset = (8 - septemberFirst.getUTCDay()) % 7;
  const kickoff = new Date(Date.UTC(season, 8, 1 + firstMondayOffset + 3));
  const elapsedWeeks = Math.floor((now.getTime() - kickoff.getTime()) / (7 * 86_400_000));
  return { season, week: Math.min(18, Math.max(1, elapsedWeeks + 1)) };
}
