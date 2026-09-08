"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireUser } from "@/lib/auth/session";
import { db } from "@/lib/db";
import { idSchema, teamSchema } from "./schemas";

const defaultSlots = { QB: 1, TQB: 0, RB: 2, RB_WR: 0, WR: 0, WR_TE: 2, TE: 0, FLEX: 1, OP: 0, DT: 0, DE: 0, LB: 0, DL: 0, CB: 0, S: 0, DB: 0, DP: 0, DST: 1, K: 1, P: 0, HC: 0, BENCH: 5, IR: 0 };

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
