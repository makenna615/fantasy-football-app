export type EspnRosterOption = { key: string; label: string; code: string; defaultStarters: number; maximum: number | null; maximumKind: "number" | "unlimited" | "na" };

export const ESPN_ROSTER_OPTIONS: EspnRosterOption[] = [
  { key: "QB", label: "Quarterback", code: "QB", defaultStarters: 1, maximum: 4, maximumKind: "number" },
  { key: "TQB", label: "Team Quarterback", code: "TQB", defaultStarters: 0, maximum: null, maximumKind: "unlimited" },
  { key: "RB", label: "Running Back", code: "RB", defaultStarters: 2, maximum: 8, maximumKind: "number" },
  { key: "RB_WR", label: "Running Back/Wide Receiver", code: "RB/WR", defaultStarters: 0, maximum: null, maximumKind: "na" },
  { key: "WR", label: "Wide Receiver", code: "WR", defaultStarters: 0, maximum: 8, maximumKind: "number" },
  { key: "WR_TE", label: "Wide Receiver/Tight End", code: "WR/TE", defaultStarters: 2, maximum: null, maximumKind: "na" },
  { key: "TE", label: "Tight End", code: "TE", defaultStarters: 0, maximum: 8, maximumKind: "number" },
  { key: "FLEX", label: "Flex", code: "FLEX", defaultStarters: 1, maximum: null, maximumKind: "na" },
  { key: "OP", label: "Offensive Player Utility", code: "OP", defaultStarters: 0, maximum: null, maximumKind: "na" },
  { key: "DT", label: "Defensive Tackle", code: "DT", defaultStarters: 0, maximum: null, maximumKind: "unlimited" },
  { key: "DE", label: "Defensive End", code: "DE", defaultStarters: 0, maximum: null, maximumKind: "unlimited" },
  { key: "LB", label: "Linebacker", code: "LB", defaultStarters: 0, maximum: null, maximumKind: "unlimited" },
  { key: "DL", label: "Defensive Line", code: "DL", defaultStarters: 0, maximum: null, maximumKind: "na" },
  { key: "CB", label: "Cornerback", code: "CB", defaultStarters: 0, maximum: null, maximumKind: "unlimited" },
  { key: "S", label: "Safety", code: "S", defaultStarters: 0, maximum: null, maximumKind: "unlimited" },
  { key: "DB", label: "Defensive Back", code: "DB", defaultStarters: 0, maximum: null, maximumKind: "na" },
  { key: "DP", label: "Defensive Player Utility", code: "DP", defaultStarters: 0, maximum: null, maximumKind: "na" },
  { key: "DST", label: "Team Defense/Special Teams", code: "D/ST", defaultStarters: 1, maximum: 3, maximumKind: "number" },
  { key: "K", label: "Place Kicker", code: "K", defaultStarters: 1, maximum: 3, maximumKind: "number" },
  { key: "P", label: "Punter", code: "P", defaultStarters: 0, maximum: null, maximumKind: "unlimited" },
  { key: "HC", label: "Head Coach", code: "HC", defaultStarters: 0, maximum: null, maximumKind: "unlimited" },
  { key: "BENCH", label: "Bench", code: "BE", defaultStarters: 5, maximum: null, maximumKind: "na" },
  { key: "IR", label: "Injured Reserve", code: "IR", defaultStarters: 0, maximum: null, maximumKind: "na" },
];

export function parseEspnRoster(formData: FormData) {
  const starters: Record<string, number> = {};
  const maximums: Record<string, number | null> = {};
  for (const option of ESPN_ROSTER_OPTIONS) {
    const starter = Number(formData.get(`starter__${option.key}`) ?? option.defaultStarters);
    if (!Number.isInteger(starter) || starter < 0 || starter > 20) throw new Error(`Invalid starter count for ${option.code}`);
    starters[option.key] = starter;
    if (option.maximumKind === "number") {
      const maximum = Number(formData.get(`maximum__${option.key}`) ?? option.maximum);
      if (!Number.isInteger(maximum) || maximum < starter || maximum > 50) throw new Error(`Invalid maximum for ${option.code}`);
      maximums[option.key] = maximum;
    } else maximums[option.key] = null;
  }
  return { starters, maximums };
}
