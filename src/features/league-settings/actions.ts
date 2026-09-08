"use server";

import { revalidatePath } from "next/cache";
import { requireUser } from "@/lib/auth/session";
import { db } from "@/lib/db";
import { settingsSchema } from "./schemas";
import { parseEspnScoring } from "./espn-scoring";
import { parseEspnRoster } from "./espn-roster";

export async function updateLeagueSettings(formData: FormData) {
  const user = await requireUser();
  const data = settingsSchema.parse(Object.fromEntries(formData));
  const espnScoring = parseEspnScoring(formData);
  const { starters: rosterSlots, maximums: rosterMaximums } = parseEspnRoster(formData);
  const team = await db.team.findFirst({ where: { id: data.teamId, userId: user.id }, select: { id: true } });
  if (!team) throw new Error("Team not found");
  const { teamId, ...scoring } = data;
  const coreScoring = {
    ...scoring,
    passingYardsPerPoint: espnScoring.passingYard > 0 ? 10 / espnScoring.passingYard : scoring.passingYardsPerPoint,
    pointsPerPassingTd: espnScoring.passingTd,
    pointsPerInterception: espnScoring.interceptionThrown,
    rushingYardsPerPoint: espnScoring.rushingYard > 0 ? 10 / espnScoring.rushingYard : scoring.rushingYardsPerPoint,
    pointsPerRushingTd: espnScoring.rushingTd,
    pointsPerReception: espnScoring.reception / 5,
    receivingYardsPerPoint: espnScoring.receivingYard > 0 ? 10 / espnScoring.receivingYard : scoring.receivingYardsPerPoint,
    pointsPerReceivingTd: espnScoring.receivingTd,
  };
  await db.leagueSettings.upsert({ where: { teamId }, update: { ...coreScoring, rosterSlots, rosterMaximums, espnScoring }, create: { teamId, ...coreScoring, rosterSlots, rosterMaximums, espnScoring } });
  revalidatePath(`/teams/${teamId}/settings`);
}
