import { z } from "zod";

export const rosterPlayerSchema = z.object({
  teamId: z.string().cuid(),
  name: z.string().trim().min(2).max(80),
  nflTeam: z.string().trim().min(2).max(3).transform((value) => value.toUpperCase()),
  position: z.enum(["QB", "RB", "WR", "TE", "K", "DST"]),
  currentSlot: z.enum(["QB", "RB", "WR", "TE", "FLEX", "SUPERFLEX", "K", "DST", "BENCH"]).default("BENCH"),
}).superRefine((player, context) => {
  const eligibility: Record<typeof player.position, string[]> = {
    QB: ["QB", "SUPERFLEX", "BENCH"], RB: ["RB", "FLEX", "SUPERFLEX", "BENCH"],
    WR: ["WR", "FLEX", "SUPERFLEX", "BENCH"], TE: ["TE", "FLEX", "SUPERFLEX", "BENCH"],
    K: ["K", "BENCH"], DST: ["DST", "BENCH"],
  };
  if (!eligibility[player.position].includes(player.currentSlot)) context.addIssue({ code: "custom", path: ["currentSlot"], message: `${player.position} is not eligible for ${player.currentSlot}` });
});

export const removePlayerSchema = z.object({ teamId: z.string().cuid(), playerId: z.string().cuid() });
