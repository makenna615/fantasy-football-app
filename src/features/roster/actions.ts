"use server";

import { revalidatePath } from "next/cache";
import { requireUser } from "@/lib/auth/session";
import { db } from "@/lib/db";
import { removePlayerSchema, rosterPlayerSchema } from "./schemas";

export async function addRosterPlayer(formData: FormData) {
  const user = await requireUser();
  const data = rosterPlayerSchema.parse(Object.fromEntries(formData));
  const ownsTeam = await db.team.findFirst({ where: { id: data.teamId, userId: user.id }, select: { id: true } });
  if (!ownsTeam) throw new Error("Team not found");
  const { name, nflTeam, position, teamId, currentSlot } = data;
  const player = await db.player.findFirst({ where: { fullName: { equals: name, mode: "insensitive" }, nflTeam, position } })
    ?? await db.player.create({ data: { fullName: name, nflTeam, position } });
  await db.rosterPlayer.create({ data: { teamId, currentSlot, playerId: player.id } });
  revalidatePath(`/teams/${data.teamId}/roster`);
}

export async function removeRosterPlayer(formData: FormData) {
  const user = await requireUser();
  const data = removePlayerSchema.parse(Object.fromEntries(formData));
  await db.rosterPlayer.deleteMany({ where: { id: data.playerId, teamId: data.teamId, team: { userId: user.id } } });
  revalidatePath(`/teams/${data.teamId}/roster`);
}
