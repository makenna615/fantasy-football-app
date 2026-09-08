import { z } from "zod";

const number = (min: number, max: number) => z.coerce.number().min(min).max(max);

export const settingsSchema = z.object({
  teamId: z.string().cuid(),
  scoringFormat: z.enum(["STANDARD", "HALF_PPR", "FULL_PPR", "CUSTOM"]),
  rosterFormat: z.enum(["STANDARD", "SUPERFLEX", "CUSTOM"]),
  passingYardsPerPoint: number(1, 100), pointsPerPassingTd: number(0, 12), pointsPerInterception: number(-10, 0),
  rushingYardsPerPoint: number(1, 50), pointsPerRushingTd: number(0, 12), pointsPerReception: number(0, 3),
  receivingYardsPerPoint: number(1, 50), pointsPerReceivingTd: number(0, 12),
  QB: number(0, 4), RB: number(0, 8), WR: number(0, 8), TE: number(0, 4), FLEX: number(0, 6), SUPERFLEX: number(0, 4), K: number(0, 3), DST: number(0, 3), BENCH: number(0, 20),
});
