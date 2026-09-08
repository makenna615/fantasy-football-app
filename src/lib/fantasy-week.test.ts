import { describe, expect, it } from "vitest";
import { getFantasyWeek } from "./fantasy-week";
describe("getFantasyWeek",()=>{it("tracks the active week",()=>{expect(getFantasyWeek(new Date("2026-09-08T12:00:00Z"))).toEqual({season:2026,week:1})});it("uses the prior season in January",()=>{expect(getFantasyWeek(new Date("2027-01-10T12:00:00Z")).season).toBe(2026)})});
