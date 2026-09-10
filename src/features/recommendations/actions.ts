"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireUser } from "@/lib/auth/session";
import { db } from "@/lib/db";
import { explainFacts } from "@/lib/ai/explanations";
import { optimizeLineup } from "./lineup-optimizer";
import { rankWaivers } from "./waiver-advisor";
import type { CandidatePlayer, LineupSlot, SlotRequirement } from "./types";
import { loadTeamProjections, toCandidates } from "@/features/projections/repository";

const contextSchema = z.object({ teamId: z.string().cuid(), season: z.coerce.number().int().min(2020).max(2100), week: z.coerce.number().int().min(1).max(18) });
const json = (value: unknown) => JSON.parse(JSON.stringify(value));

async function ownedTeam(teamId: string, userId: string) {
  const team = await db.team.findFirst({ where: { id: teamId, userId }, include: { league: { include: { settings: true } }, waiverCandidates: true } });
  if (!team) throw new Error("Team not found"); return team;
}

export async function generateLineup(formData: FormData) {
  const user = await requireUser(); const context = contextSchema.parse(Object.fromEntries(formData)); const team = await ownedTeam(context.teamId, user.id);
  if (!team.league.settings) throw new Error("Configure league settings first");
  const players = toCandidates(await loadTeamProjections(team.id, context.season, context.week));
  const slotCounts = team.league.settings.rosterSlots as Record<string, number>;
  const requirements = Object.entries(slotCounts).filter(([slot, count]) => slot !== "BENCH" && count > 0).map(([slot, count]) => ({ slot: slot as LineupSlot, count })) satisfies SlotRequirement[];
  const result = optimizeLineup(players, requirements);
  const fallback = `This lineup projects for ${result.projectedPoints} points with ${Math.round(result.confidence * 100)}% confidence.`;
  const explanation = await explainFacts({ type: "lineup", result }, fallback);
  await db.lineupRecommendation.create({ data: { teamId: team.id, season: context.season, week: context.week, lineup: json(result.starters), alternatives: json(result.alternatives), projectedPoints: result.projectedPoints, confidence: result.confidence, explanation, algorithmVersion: "lineup-v1" } });
  revalidatePath(`/teams/${team.id}/recommendations`);
}

export async function generateWaivers(formData: FormData) {
  const user = await requireUser(); const context = contextSchema.parse(Object.fromEntries(formData)); const team = await ownedTeam(context.teamId, user.id);
  const roster = toCandidates(await loadTeamProjections(team.id, context.season, context.week));
  const linkedIds=team.waiverCandidates.flatMap(row=>row.playerId?[row.playerId]:[]);
  const current=await db.playerProjection.findMany({where:{playerId:{in:linkedIds},season:context.season,week:context.week,OR:[{leagueId:team.leagueId},{leagueId:null}]},orderBy:{fetchedAt:"desc"}});
  const available: CandidatePlayer[] = team.waiverCandidates.map(row => {const live=row.playerId?current.find(item=>item.playerId===row.playerId):undefined;return { id: row.id, name: row.name, team: row.nflTeam, position: row.position, projectedPoints: live?.projectedPoints??row.projectedPoints, floorPoints: live?.floorPoints??row.floorPoints??undefined, ceilingPoints: live?.ceilingPoints??row.ceilingPoints??undefined, consistency: live?.consistency??row.consistency, matchupRating: live?.matchupRating??row.matchupRating, injuryMultiplier: row.injuryMultiplier, restOfSeasonPoints: live?.restOfSeason??row.restOfSeasonPoints??undefined }});
  const results = rankWaivers(roster, available);
  await db.$transaction([db.waiverRecommendation.deleteMany({ where: { teamId: team.id, season: context.season, week: context.week } }), ...results.map(result => db.waiverRecommendation.create({ data: { teamId: team.id, season: context.season, week: context.week, addPlayer: json(result.add), dropPlayer: result.drop ? json(result.drop) : undefined, priorityScore: result.priorityScore, shortTermValue: result.shortTermValue, restOfSeasonValue: result.restOfSeasonValue, projectedGain: result.projectedGain, explanation: `Add ${result.add.name}${result.drop ? ` and drop ${result.drop.name}` : ""}; projected weekly gain: ${result.projectedGain.toFixed(1)} points.`, algorithmVersion: "waiver-v1" } }))]);
  revalidatePath(`/teams/${team.id}/waivers`);
}
