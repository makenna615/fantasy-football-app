import Link from "next/link";
import { notFound } from "next/navigation";
import { AlertTriangle, Crosshair, ShieldCheck } from "lucide-react";
import { TeamNav } from "@/components/team-nav";
import { requireUser } from "@/lib/auth/session";
import { db } from "@/lib/db";
import { getFantasyWeek } from "@/lib/fantasy-week";
import { loadTeamProjections, toCandidates } from "@/features/projections/repository";
import { optimizeLineup } from "@/features/recommendations/lineup-optimizer";
import type { LineupSlot } from "@/features/recommendations/types";

export default async function MyTeamPage({ params }: { params: Promise<{ teamId: string }> }) {
  const user = await requireUser(); const { teamId } = await params; const { season, week } = getFantasyWeek();
  const team = await db.team.findFirst({ where: { id: teamId, userId: user.id }, include: { league: { include: { settings: true } }, matchups: { where: { season, week }, include: { opponentTeam: true }, take: 1 } } });
  if (!team) notFound();
  const rows = await loadTeamProjections(team.id, season, week);
  const counts = (team.league.settings?.rosterSlots ?? {}) as Record<string, number>;
  const requirements = Object.entries(counts).filter(([slot,count]) => !["BENCH","IR"].includes(slot) && count > 0).map(([slot,count]) => ({ slot: slot as LineupSlot, count }));
  let result: ReturnType<typeof optimizeLineup> | null = null; let issue: string | null = null;
  try { if (rows.length && requirements.length) result = optimizeLineup(toCandidates(rows), requirements); } catch (error) { issue = error instanceof Error ? error.message : "The lineup is incomplete."; }
  const matchup = team.matchups[0];
  const newest = rows.reduce<Date | null>((latest,row)=>!latest||row.updatedAt>latest?row.updatedAt:latest,null);
  const staleMinutes = Math.max(15,Number(process.env.PROJECTION_CACHE_MINUTES)||60);
  const dataIsStale = newest ? Date.now()-newest.getTime()>staleMinutes*60_000 : false;
  return <main className="mx-auto max-w-6xl p-4 md:p-8">
    <div className="mb-4 flex flex-wrap items-end justify-between gap-3"><div><p className="text-sm text-emerald-300">Week {week} · {team.league.name}</p><h1 className="text-3xl font-bold">My Team</h1></div><Link className="button-primary" href={`/teams/${team.id}/waivers`}><Crosshair size={17}/> Waiver Wire Sniper</Link></div>
    <TeamNav teamId={team.id} active="dashboard"/>
    {dataIsStale && <p className="mb-4 rounded-xl border border-amber-400/30 bg-amber-400/10 p-3 text-sm text-amber-200">Projection data may be outdated. Last update: {newest?.toLocaleString()}.</p>}
    {!result && <section className="card p-6"><h2 className="font-bold">Your weekly recommendation is not ready</h2><p className="mt-2 muted">{issue ?? "Add your roster and weekly projections to calculate it."}</p><div className="mt-4 flex gap-3"><Link className="button-primary" href={`/teams/${team.id}/roster`}>Add roster</Link><Link className="button-secondary" href={`/teams/${team.id}/recommendations`}>Add projections</Link></div></section>}
    {result && <><section className="mb-4 grid gap-3 sm:grid-cols-3"><Metric label="Optimal projection" value={`${result.projectedPoints.toFixed(1)} pts`}/><Metric label="Confidence" value={`${Math.round(result.confidence * 100)}%`}/><Metric label="Projected matchup" value={matchup ? `${matchup.teamProjectedPoints ?? result.projectedPoints}–${matchup.opponentProjectedPoints ?? "—"}` : "Not entered"}/></section>
      <div className="grid gap-4 lg:grid-cols-[1.25fr_.75fr]"><section className="card overflow-hidden"><div className="p-5"><h2 className="flex items-center gap-2 font-bold"><ShieldCheck className="text-emerald-300"/> Optimal lineup</h2></div>{result.starters.map(entry => {const projection=rows.find(row=>row.playerId===entry.player.id);return <div className="flex items-center justify-between border-t border-[#202a38] px-4 py-3 text-sm" key={entry.slot + entry.player.id}><span><b className="mr-3 inline-block w-16 text-emerald-300">{entry.slot.replaceAll("_","/")}</b>{entry.player.name}<small className="ml-2 muted">{entry.player.team}</small><small className="block pl-20 muted">{projection?.source==="MANUAL"?`Manual override${projection.providerProjectedPoints!==undefined?` · Provider: ${projection.providerProjectedPoints.toFixed(1)}`:""}`:`${projection?.source??"Unavailable"} · ${projection?.updatedAt.toLocaleString()??"not updated"}`}</small></span><b>{entry.adjustedPoints.toFixed(1)}</b></div>})}</section>
      <aside className="space-y-4"><section className="card p-5"><h2 className="flex items-center gap-2 font-bold"><AlertTriangle className="text-amber-300"/> Start/sit watch</h2>{result.alternatives.length ? result.alternatives.map(item => <div className="mt-4 border-t border-[#202a38] pt-4 text-sm" key={item.slot + item.starter.id}><p><b>Start {item.starter.name}</b></p><p className="muted">over {item.alternative.name} by {item.pointDelta.toFixed(1)} points</p></div>) : <p className="mt-3 muted">No close bench alternatives.</p>}</section><section className="card p-5"><h2 className="font-bold">Opponent comparison</h2><p className="mt-2 text-sm muted">{matchup ? `vs. ${matchup.opponentTeam?.name ?? matchup.opponentName ?? "Opponent"}. The matchup record is ready for future provider analysis.` : "No opponent entered yet. The league matchup model is ready for future schedule data."}</p></section></aside></div></>}
  </main>;
}

function Metric({ label, value }: { label: string; value: string }) { return <div className="card p-5"><p className="text-xs font-bold uppercase muted">{label}</p><p className="mt-2 text-2xl font-bold">{value}</p></div>; }
