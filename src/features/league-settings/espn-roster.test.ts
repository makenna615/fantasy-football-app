import { describe, expect, it } from "vitest";
import { ESPN_ROSTER_OPTIONS } from "./espn-roster";

describe("ESPN roster catalog", () => {
  it("contains the requested ESPN position and composite slots", () => {
    expect(ESPN_ROSTER_OPTIONS).toHaveLength(23);
    expect(ESPN_ROSTER_OPTIONS.map((option) => option.code)).toEqual(["QB","TQB","RB","RB/WR","WR","WR/TE","TE","FLEX","OP","DT","DE","LB","DL","CB","S","DB","DP","D/ST","K","P","HC","BE","IR"]);
  });
});
