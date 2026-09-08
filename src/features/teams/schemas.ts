import { z } from "zod";

export const teamSchema = z.object({ name: z.string().trim().min(2).max(60) });
export const idSchema = z.string().cuid();
