import { describe, expect, it } from "vitest";
import { parseCsv } from "./csv";

describe("parseCsv", () => {
  it("parses quoted commas and escaped quotes", () => {
    expect(parseCsv('external_id,name\n1,"Smith, Jr."\n2,"A ""Nickname"" Jones"')).toEqual([
      { external_id:"1", name:"Smith, Jr." }, { external_id:"2", name:'A "Nickname" Jones' },
    ]);
  });
});
