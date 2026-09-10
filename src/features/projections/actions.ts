"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireUser } from "@/lib/auth/session";
import { db } from "@/lib/db";
import { scoreProjection } from "./scoring";

const schema = z.object({
  teamId: z.string().cuid(), rosterPlayerId: z.string().cuid(), season: z.coerce.number().int().min(2020).max(2100), week: z.coerce.number().int().min(1).max(18),
  projectedPoints: z.coerce.number().min(0).max(100), floorPoints: z.coerce.number().min(0).max(100), ceilingPoints: z.coerce.number().min(0).max(100),
  consistency: z.coerce.number().min(0).max(1), matchupRating: z.coerce.number().min(-5).max(5), injuryMultiplier: z.coerce.number().min(0).max(1),
}).refine(value => value.floorPoints <= value.projectedPoints && value.projectedPoints <= value.ceilingPoints, { message: "Floor must be at or below projection, and ceiling at or above it" });

export async function saveProjection(formData: FormData) {
  const user = await requireUser(); const data = schema.parse(Object.fromEntries(formData));
  const player = await db.rosterPlayer.findFirst({ where: { id: data.rosterPlayerId, teamId: data.teamId, team: { userId: user.id } }, select: { id: true } });
  if (!player) throw new Error("Player not found");
  const { teamId: _teamId, ...projection } = data;
  await db.weeklyProjection.upsert({ where: { rosterPlayerId_season_week_source: { rosterPlayerId: data.rosterPlayerId, season: data.season, week: data.week, source: "MANUAL" } }, update: projection, create: { ...projection, source: "MANUAL" } });
  revalidatePath(`/teams/${data.teamId}/recommendations`);
}

export async function removeManualProjection(formData: FormData) {
  const user=await requireUser();
  const data=z.object({teamId:z.string().cuid(),rosterPlayerId:z.string().cuid(),season:z.coerce.number().int(),week:z.coerce.number().int().min(1).max(18)}).parse(Object.fromEntries(formData));
  const owned=await db.rosterPlayer.findFirst({where:{id:data.rosterPlayerId,teamId:data.teamId,team:{userId:user.id}},select:{id:true}});
  if(!owned)throw new Error("Player not found");
  await db.weeklyProjection.deleteMany({where:{rosterPlayerId:data.rosterPlayerId,season:data.season,week:data.week,source:"MANUAL"}});
  revalidatePath(`/teams/${data.teamId}`); revalidatePath(`/teams/${data.teamId}/recommendations`);
}

const statSchema = z.object({
  teamId: z.string().cuid(), rosterPlayerId: z.string().cuid(), season: z.coerce.number().int(), week: z.coerce.number().int().min(1).max(18),
  passingYards: z.coerce.number().min(0), passingTouchdowns: z.coerce.number().min(0), interceptions: z.coerce.number().min(0),
  rushingYards: z.coerce.number().min(0), rushingTouchdowns: z.coerce.number().min(0), receptions: z.coerce.number().min(0), receivingYards: z.coerce.number().min(0), receivingTouchdowns: z.coerce.number().min(0),
});

export async function saveStatProjection(formData: FormData) {
  const user = await requireUser(); const data = statSchema.parse(Object.fromEntries(formData));
  const player = await db.rosterPlayer.findFirst({ where: { id: data.rosterPlayerId, teamId: data.teamId, team: { userId: user.id } }, include: { team: { include: { league: { include: { settings: true } } } } } });
  if (!player?.team.league.settings) throw new Error("Configure league settings first");
  const { teamId, rosterPlayerId, season, week, ...stats } = data;
  const projectedPoints = scoreProjection(stats, player.team.league.settings);
  await db.weeklyProjection.upsert({ where: { rosterPlayerId_season_week_source: { rosterPlayerId, season, week, source: "SCORING_CALCULATOR" } }, update: { projectedPoints, floorPoints: projectedPoints * .65, ceilingPoints: projectedPoints * 1.4, sourcePayload: stats }, create: { rosterPlayerId, season, week, source: "SCORING_CALCULATOR", projectedPoints, floorPoints: projectedPoints * .65, ceilingPoints: projectedPoints * 1.4, sourcePayload: stats } });
  revalidatePath(`/teams/${teamId}/recommendations`);
}
