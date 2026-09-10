export function isFresh(lastSuccess:Date|null|undefined,minutes:number,now=Date.now()){return Boolean(lastSuccess&&now-lastSuccess.getTime()<=minutes*60_000);}
export function projectionIdentity(playerId:string,providerId:string,leagueId:string,season:number,week:number){return `${playerId}:${providerId}:${leagueId}:${season}:${week}`;}
