import {describe,expect,it} from "vitest";
import {isFresh,projectionIdentity} from "./freshness";
describe("sync freshness",()=>{it("prevents duplicate refreshes inside the cache window",()=>{const now=Date.UTC(2026,8,8,12);expect(isFresh(new Date(now-59*60_000),60,now)).toBe(true);expect(isFresh(new Date(now-61*60_000),60,now)).toBe(false);});it("scopes projection upserts to player/provider/league/week",()=>expect(projectionIdentity("p","tank","l",2026,1)).toBe("p:tank:l:2026:1"));});
