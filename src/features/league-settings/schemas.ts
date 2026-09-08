import { z } from "zod";

const number = (min: number, max: number) => z.coerce.number().min(min).max(max);

export const settingsSchema = z.object({
  teamId: z.string().cuid(),
  scoringFormat: z.enum(["STANDARD", "HALF_PPR", "FULL_PPR", "CUSTOM"]),
  rosterFormat: z.enum(["STANDARD", "SUPERFLEX", "CUSTOM"]),
  passingYardsPerPoint: number(1, 100), pointsPerPassingTd: number(0, 12), pointsPerInterception: number(-10, 0),
  rushingYardsPerPoint: number(1, 50), pointsPerRushingTd: number(0, 12), pointsPerReception: number(0, 3),
  receivingYardsPerPoint: number(1, 50), pointsPerReceivingTd: number(0, 12),
});
