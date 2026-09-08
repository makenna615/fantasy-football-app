"use server";

import { revalidatePath } from "next/cache";
import { requireUser } from "@/lib/auth/session";
import { db } from "@/lib/db";
import { settingsSchema } from "./schemas";

export async function updateLeagueSettings(formData: FormData) {
  const user = await requireUser();
  const data = settingsSchema.parse(Object.fromEntries(formData));
  const team = await db.team.findFirst({ where: { id: data.teamId, userId: user.id }, select: { id: true } });
  if (!team) throw new Error("Team not found");
  const { teamId, QB, RB, WR, TE, FLEX, SUPERFLEX, K, DST, BENCH, ...scoring } = data;
  const rosterSlots = { QB, RB, WR, TE, FLEX, SUPERFLEX, K, DST, BENCH };
  await db.leagueSettings.upsert({ where: { teamId }, update: { ...scoring, rosterSlots }, create: { teamId, ...scoring, rosterSlots } });
  revalidatePath(`/teams/${teamId}/settings`);
}
