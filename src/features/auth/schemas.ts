import { z } from "zod";

export const credentialsSchema = z.object({
  email: z.string().trim().email().transform((value) => value.toLowerCase()),
  password: z.string().min(8).max(128),
});

export const registerSchema = credentialsSchema.extend({ name: z.string().trim().min(2).max(60) });
