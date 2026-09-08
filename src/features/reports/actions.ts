"use server";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireUser } from "@/lib/auth/session";
import { db } from "@/lib/db";
import { explainFacts } from "@/lib/ai/explanations";

const schema = z.object({ teamId: z.string().cuid(), season: z.coerce.number().int().min(2020).max(2100), week: z.coerce.number().int().min(1).max(18) });

export async function generateReport(formData: FormData) {
  const user = await requireUser(); const data = schema.parse(Object.fromEntries(formData));
  const team = await db.team.findFirst({ where: { id: data.teamId, userId: user.id }, include: { rosterPlayers: { include: { player: true, projections: { where: { season: data.season, week: data.week }, orderBy: { updatedAt: "desc" }, take: 1 } } }, waiverRecommendations: { where: { season: data.season, week: data.week }, orderBy: { priorityScore: "desc" }, take: 3 } } });
  if (!team) throw new Error("Team not found");
  const projected = team.rosterPlayers.filter((player) => player.projections[0]);
  if (!projected.length) throw new Error("Add weekly projections before generating a report");
  const positions = ["QB", "RB", "WR", "TE", "K", "DST"] as const;
  const ratings = positions.map((position) => { const rows = projected.filter((entry) => entry.player.position === position); return { position, value: rows.length ? rows.reduce((sum, entry) => sum + entry.projections[0].projectedPoints, 0) / rows.length : 0 }; }).sort((a, b) => b.value - a.value);
  const total = projected.reduce((sum, player) => sum + player.projections[0].projectedPoints, 0);
  const grade = total >= 180 ? "A" : total >= 150 ? "B+" : total >= 120 ? "B" : total >= 90 ? "C" : "D";
  const riskiest = [...projected].sort((a, b) => (b.projections[0].projectedPoints - (b.projections[0].floorPoints ?? 0)) - (a.projections[0].projectedPoints - (a.projections[0].floorPoints ?? 0)))[0];
  const bench = [...projected].filter((player) => player.currentSlot === "BENCH").sort((a, b) => b.projections[0].projectedPoints - a.projections[0].projectedPoints)[0];
  const reportData = { grade, strongestPosition: ratings[0].position, weakestPosition: ratings.at(-1)!.position, riskiestStarter: riskiest?.player.fullName, bestBenchOption: bench?.player.fullName };
  const facts = { team: team.name, ...reportData, waivers: team.waiverRecommendations.map((item) => (item.addPlayer as { name: string }).name) };
  const fallback = `${team.name} earns a ${grade}. ${ratings[0].position} is the strongest position, while ${ratings.at(-1)!.position} needs the most attention.${bench ? ` ${bench.player.fullName} is the best bench option.` : ""}`;
  const summary = await explainFacts({ type: "weekly_team_report", ...facts }, fallback);
  await db.weeklyTeamReport.upsert({ where: { teamId_season_week: { teamId: team.id, season: data.season, week: data.week } }, update: { ...reportData, summary, algorithmVersion: "report-v1" }, create: { teamId: team.id, season: data.season, week: data.week, ...reportData, summary, algorithmVersion: "report-v1" } });
  revalidatePath(`/teams/${team.id}/report`);
}
