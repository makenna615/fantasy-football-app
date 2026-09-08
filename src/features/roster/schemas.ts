import { z } from "zod";

export const rosterPlayerSchema = z.object({
  teamId: z.string().cuid(),
  name: z.string().trim().min(2).max(80),
  nflTeam: z.string().trim().min(2).max(3).transform((value) => value.toUpperCase()),
  position: z.enum(["QB", "TQB", "RB", "WR", "TE", "DT", "DE", "LB", "CB", "S", "K", "P", "HC", "DST"]),
  currentSlot: z.enum(["QB", "TQB", "RB", "RB_WR", "WR", "TE", "FLEX", "WR_TE", "OP", "SUPERFLEX", "DT", "DE", "LB", "DL", "CB", "S", "DB", "DP", "K", "P", "HC", "DST", "BENCH", "IR"]).default("BENCH"),
}).superRefine((player, context) => {
  const eligibility: Record<typeof player.position, string[]> = {
    QB: ["QB", "TQB", "OP", "SUPERFLEX", "BENCH", "IR"], TQB: ["TQB", "OP", "BENCH", "IR"], RB: ["RB", "RB_WR", "FLEX", "OP", "SUPERFLEX", "BENCH", "IR"],
    WR: ["WR", "RB_WR", "FLEX", "WR_TE", "OP", "SUPERFLEX", "BENCH", "IR"], TE: ["TE", "FLEX", "WR_TE", "OP", "SUPERFLEX", "BENCH", "IR"],
    DT: ["DT", "DL", "DP", "BENCH", "IR"], DE: ["DE", "DL", "DP", "BENCH", "IR"], LB: ["LB", "DP", "BENCH", "IR"], CB: ["CB", "DB", "DP", "BENCH", "IR"], S: ["S", "DB", "DP", "BENCH", "IR"],
    K: ["K", "BENCH", "IR"], P: ["P", "BENCH", "IR"], HC: ["HC", "BENCH"], DST: ["DST", "BENCH", "IR"],
  };
  if (!eligibility[player.position].includes(player.currentSlot)) context.addIssue({ code: "custom", path: ["currentSlot"], message: `${player.position} is not eligible for ${player.currentSlot}` });
});

export const removePlayerSchema = z.object({ teamId: z.string().cuid(), playerId: z.string().cuid() });
