import { parseCsv } from "@/features/admin/csv";
import { NFLVERSE_URLS } from "./urls";
import { normalizeNflverseInjury,normalizeNflversePlayer,normalizeNflverseRoster,normalizeNflverseStats } from "./normalize";
import type { InjuryProvider,MatchupProvider,PlayerDataProvider,StatsProvider } from "../contracts";

async function csv(url:string){const response=await fetch(url,{headers:{"User-Agent":"Fourth-Down/1.0"},signal:AbortSignal.timeout(30_000),cache:"no-store"});if(!response.ok)throw new Error(`NFLverse ${response.status} for ${new URL(url).pathname}`);return parseCsv(await response.text());}
export class NflversePlayerProvider implements PlayerDataProvider { readonly key="nflverse"; constructor(private season:number){} async players(){return (await csv(NFLVERSE_URLS.players)).map(row=>normalizeNflversePlayer(row,this.season)).filter(x=>x!==null);} async rosters(season:number){return (await csv(NFLVERSE_URLS.weeklyRosters(season))).map(normalizeNflverseRoster).filter(x=>x!==null);} }
export class NflverseInjuryProvider implements InjuryProvider { readonly key="nflverse"; async injuries(season:number){return (await csv(NFLVERSE_URLS.injuries(season))).map(normalizeNflverseInjury).filter(x=>x!==null);} }
export class NflverseStatsProvider implements StatsProvider { readonly key="nflverse"; async weeklyStats(season:number){return (await csv(NFLVERSE_URLS.weeklyStats(season))).map(normalizeNflverseStats).filter(x=>x!==null);} }
export class NflverseMatchupProvider implements MatchupProvider {readonly key="nflverse";async schedule(season:number,week:number){const rows=(await csv(NFLVERSE_URLS.schedules)).filter(row=>Number(row.season)===season&&Number(row.week)===week&&row.game_type==="REG");return rows.flatMap(row=>[{team:row.home_team,opponent:row.away_team,home:true},{team:row.away_team,opponent:row.home_team,home:false}]);}}
