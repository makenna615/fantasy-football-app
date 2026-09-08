import { describe, expect, it } from "vitest";
import { ESPN_SCORING_CATEGORIES, ESPN_SCORING_FIELDS } from "./espn-scoring";

describe("ESPN scoring catalog", () => {
  it("covers every documented scoring group without duplicate keys", () => {
    expect(ESPN_SCORING_CATEGORIES.map((category) => category.name)).toEqual(["Passing", "Rushing", "Receiving", "Kicking", "Team Defense / Special Teams"]);
    expect(new Set(ESPN_SCORING_FIELDS.map((field) => field.key)).size).toBe(ESPN_SCORING_FIELDS.length);
    expect(ESPN_SCORING_FIELDS.length).toBe(53);
  });
});
