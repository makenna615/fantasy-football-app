"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireUser } from "@/lib/auth/session";
import { db } from "@/lib/db";

const addSchema = z.object({ teamId: z.string().cuid(), name: z.string().trim().min(2).max(80), nflTeam: z.string().trim().min(2).max(3).transform(v => v.toUpperCase()), position: z.enum(["QB","RB","WR","TE","K","DST"]), projectedPoints: z.coerce.number().min(0).max(100), floorPoints: z.coerce.number().min(0).max(100), ceilingPoints: z.coerce.number().min(0).max(100), restOfSeasonPoints: z.coerce.number().min(0).max(2000), consistency: z.coerce.number().min(0).max(1), matchupRating: z.coerce.number().min(-5).max(5), injuryMultiplier: z.coerce.number().min(0).max(1) });
const removeSchema = z.object({ teamId: z.string().cuid(), candidateId: z.string().cuid() });

export async function addWaiverCandidate(formData: FormData) { const user = await requireUser(); const data = addSchema.parse(Object.fromEntries(formData)); const team = await db.team.findFirst({ where: { id: data.teamId, userId: user.id }, select: { id: true } }); if (!team) throw new Error("Team not found"); await db.waiverCandidate.create({ data }); revalidatePath(`/teams/${data.teamId}/waivers`); }
export async function removeWaiverCandidate(formData: FormData) { const user = await requireUser(); const data = removeSchema.parse(Object.fromEntries(formData)); await db.waiverCandidate.deleteMany({ where: { id: data.candidateId, teamId: data.teamId, team: { userId: user.id } } }); revalidatePath(`/teams/${data.teamId}/waivers`); }
