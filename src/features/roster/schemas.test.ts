import { describe, expect, it } from "vitest";
import { rosterPlayerSchema } from "./schemas";

const base = { teamId: "clh1234567890123456789012", name: "Test Player", nflTeam: "NFL" };
describe("roster eligibility", () => {
  it.each([["WR","WR_TE"],["TE","WR_TE"],["QB","SUPERFLEX"],["DT","DL"],["S","DB"],["LB","DP"]])("allows %s in %s", (position,currentSlot) => {
    expect(rosterPlayerSchema.safeParse({ ...base, position, currentSlot }).success).toBe(true);
  });
  it("rejects a quarterback in WR/TE", () => expect(rosterPlayerSchema.safeParse({ ...base, position:"QB", currentSlot:"WR_TE" }).success).toBe(false));
});
