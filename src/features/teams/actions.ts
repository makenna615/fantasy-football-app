"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireUser } from "@/lib/auth/session";
import { db } from "@/lib/db";
import { idSchema, teamSchema } from "./schemas";

const defaultSlots = { QB: 1, RB: 2, WR: 2, TE: 1, FLEX: 1, SUPERFLEX: 0, K: 1, DST: 1, BENCH: 6 };

export async function createTeam(formData: FormData) {
  const user = await requireUser();
  const data = teamSchema.parse(Object.fromEntries(formData));
  const team = await db.team.create({ data: { name: data.name, userId: user.id, leagueSettings: { create: { rosterSlots: defaultSlots } } } });
  redirect(`/teams/${team.id}/roster`);
}

export async function deleteTeam(formData: FormData) {
  const user = await requireUser();
  const id = idSchema.parse(formData.get("teamId"));
  await db.team.deleteMany({ where: { id, userId: user.id } });
  revalidatePath("/teams");
}
