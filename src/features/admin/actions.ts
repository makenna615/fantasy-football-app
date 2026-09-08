"use server";

import { revalidatePath } from "next/cache";
import { Position } from "@prisma/client";
import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/auth/session";
import { numberValue, parseCsv, required, type CsvRow } from "./csv";

const positions = new Set(Object.values(Position));
const text = async (data: FormData) => { const file = data.get("file"); if (!(file instanceof File) || !file.size || file.size > 2_000_000) throw new Error("Choose a CSV file smaller than 2 MB"); return file.text(); };

export async function importCsv(formData: FormData) {
  await requireAdmin();
  const kind = String(formData.get("kind")); const providerKey = String(formData.get("providerKey") || "admin-csv").trim().toLowerCase();
  const rows = parseCsv(await text(formData)); if (!rows.length) throw new Error("CSV contains no data rows");
  const provider = await db.dataProvider.upsert({ where: { key: providerKey }, update: { active: true }, create: { key: providerKey, name: providerKey, type: "CSV" } });
  for (const [index,row] of rows.entries()) { try { await importRow(kind, provider.id, row); } catch (error) { throw new Error(`Row ${index + 2}: ${error instanceof Error ? error.message : "invalid data"}`); } }
  revalidatePath("/admin/import");
}

async function playerFor(providerId: string, row: CsvRow) {
  const externalId = required(row,"external_id");
  const existing = await db.playerExternalId.findUnique({ where: { providerId_externalId: { providerId, externalId } }, include: { player: true } });
  if (!existing) throw new Error(`Unknown external_id ${externalId}; import players first`);
  return existing.player;
}

async function importRow(kind: string, providerId: string, row: CsvRow) {
  if (kind === "players") {
    const externalId = required(row,"external_id"); const position = required(row,"position").toUpperCase() as Position;
    if (!positions.has(position)) throw new Error(`Unsupported position ${position}`);
    const found = await db.playerExternalId.findUnique({ where: { providerId_externalId: { providerId, externalId } } });
    if (found) { await db.player.update({ where: { id: found.playerId }, data: { fullName: required(row,"name"), nflTeam: required(row,"nfl_team").toUpperCase(), position, active: row.active !== "false" } }); }
    else { await db.player.create({ data: { fullName: required(row,"name"), nflTeam: required(row,"nfl_team").toUpperCase(), position, active: row.active !== "false", externalIds: { create: { providerId, externalId } } } }); }
    return;
  }
  const player = await playerFor(providerId,row); const season = numberValue(row,"season"); const week = numberValue(row,"week");
  if (kind === "projections") {
    const existing = await db.playerProjection.findFirst({ where: { playerId: player.id, providerId, leagueId: null, season, week } });
    if (existing) await db.playerProjection.update({ where: { id: existing.id }, data: projectionData(row) });
    else await db.playerProjection.create({ data: { playerId: player.id, providerId, season, week, ...projectionData(row) } });
  }
  else if (kind === "rankings") await db.playerRanking.upsert({ where: { playerId_providerId_season_week: { playerId: player.id, providerId, season, week } }, update: rankingData(row), create: { playerId: player.id, providerId, season, week, ...rankingData(row) } });
  else if (kind === "injuries") await db.playerInjury.upsert({ where: { playerId_providerId_season_week: { playerId: player.id, providerId, season, week } }, update: injuryData(row), create: { playerId: player.id, providerId, season, week, ...injuryData(row) } });
  else if (kind === "matchups") await db.playerMatchup.upsert({ where: { playerId_providerId_season_week: { playerId: player.id, providerId, season, week } }, update: matchupData(row), create: { playerId: player.id, providerId, season, week, ...matchupData(row) } });
  else throw new Error("Unsupported import type");
}

const projectionData = (row: CsvRow) => ({ projectedPoints:numberValue(row,"projected_points"), floorPoints:numberValue(row,"floor_points",0), ceilingPoints:numberValue(row,"ceiling_points",0), restOfSeason:numberValue(row,"ros_points",0), consistency:numberValue(row,"consistency",.5), matchupRating:numberValue(row,"matchup_rating",0) });
const rankingData = (row: CsvRow) => ({ rank:numberValue(row,"rank"), tier:numberValue(row,"tier",0), value:numberValue(row,"value",0) });
const injuryData = (row: CsvRow) => ({ status:required(row,"status"), details:row.details || null, multiplier:numberValue(row,"multiplier",1) });
const matchupData = (row: CsvRow) => ({ opponent:required(row,"opponent").toUpperCase(), home:["true","1","yes"].includes(row.home?.toLowerCase()), matchupRating:numberValue(row,"matchup_rating",0) });
