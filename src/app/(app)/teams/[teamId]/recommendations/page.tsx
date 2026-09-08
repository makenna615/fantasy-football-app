import { notFound } from "next/navigation";
import { requireUser } from "@/lib/auth/session";
import { db } from "@/lib/db";
import { saveProjection, saveStatProjection } from "@/features/projections/actions";
import { generateLineup } from "@/features/recommendations/actions";
import { FormSubmit } from "@/components/form-submit";
import { TeamNav } from "@/components/team-nav";
import { getFantasyWeek } from "@/lib/fantasy-week";

export default async function RecommendationsPage({ params }: { params: Promise<{ teamId: string }> }) {
  const user = await requireUser();
  const { teamId } = await params;
  const { season, week } = getFantasyWeek();
  const team = await db.team.findFirst({
    where: { id: teamId, userId: user.id },
    include: {
      rosterPlayers: { include: { player: true, projections: { where: { season, week }, orderBy: { updatedAt: "desc" }, take: 1 } }, orderBy: { player: { position: "asc" } } },
      lineupRecommendations: { where: { season, week }, orderBy: { createdAt: "desc" }, take: 1 },
    },
  });
  if (!team) notFound();
  const recommendation = team.lineupRecommendations[0];
  const lineup = (recommendation?.lineup ?? []) as Array<{ slot: string; player: { id: string; name: string }; adjustedPoints: number }>;
  return <main className="mx-auto max-w-6xl p-4 md:p-8">
    <p className="text-sm text-emerald-300">{team.name} · Week {week}</p><h1 className="mb-5 text-3xl font-bold">Lineup optimizer</h1><TeamNav teamId={team.id} active="recommendations"/>
    <div className="grid gap-5 lg:grid-cols-[1fr_360px]">
      <section className="card p-4 md:p-5"><h2 className="font-bold">Weekly projections</h2><p className="mb-5 mt-1 text-sm muted">Manual entries override imported provider data.</p>
        <div className="space-y-3">{team.rosterPlayers.map(entry => { const p = entry.projections[0]; return <form action={saveProjection} className="grid items-end gap-2 rounded-xl border border-[#202a38] p-3 sm:grid-cols-[1fr_repeat(4,75px)_auto]" key={entry.id}>
          <input type="hidden" name="teamId" value={team.id}/><input type="hidden" name="rosterPlayerId" value={entry.id}/><input type="hidden" name="season" value={season}/><input type="hidden" name="week" value={week}/>
          <div className="text-sm"><b>{entry.player.fullName}</b><small className="block muted">{entry.player.position} · {entry.player.nflTeam}</small></div>
          <MiniField name="projectedPoints" label="Proj" value={p?.projectedPoints ?? 10}/><MiniField name="floorPoints" label="Floor" value={p?.floorPoints ?? 5}/><MiniField name="ceilingPoints" label="Ceil" value={p?.ceilingPoints ?? 18}/><MiniField name="consistency" label="Cons." value={p?.consistency ?? .5}/>
          <input type="hidden" name="matchupRating" value={p?.matchupRating ?? 0}/><input type="hidden" name="injuryMultiplier" value={p?.injuryMultiplier ?? 1}/><FormSubmit className="rounded-lg border border-[#344154] px-3 py-2 text-xs">Save</FormSubmit>
        </form>})}{team.rosterPlayers.length === 0 && <p className="muted">Add roster players first.</p>}</div>
      </section>
      <aside className="space-y-4">
        <details className="card p-5"><summary className="cursor-pointer font-bold">Scoring calculator</summary><p className="my-3 text-sm muted">Convert a stat line using league scoring.</p><form action={saveStatProjection} className="space-y-2"><input type="hidden" name="teamId" value={team.id}/><input type="hidden" name="season" value={season}/><input type="hidden" name="week" value={week}/><label className="field">Player<select name="rosterPlayerId">{team.rosterPlayers.map(entry => <option key={entry.id} value={entry.id}>{entry.player.fullName}</option>)}</select></label><div className="grid grid-cols-2 gap-2">{[["passingYards","Pass yds"],["passingTouchdowns","Pass TD"],["interceptions","INT"],["rushingYards","Rush yds"],["rushingTouchdowns","Rush TD"],["receptions","Rec"],["receivingYards","Rec yds"],["receivingTouchdowns","Rec TD"]].map(([name,label]) => <label className="field" key={name}>{label}<input name={name} type="number" min="0" step="0.1" defaultValue="0"/></label>)}</div><FormSubmit className="button-primary w-full">Calculate & save</FormSubmit></form></details>
        <div className="card p-5"><form action={generateLineup}><input type="hidden" name="teamId" value={team.id}/><input type="hidden" name="season" value={season}/><input type="hidden" name="week" value={week}/><FormSubmit className="button-primary w-full" pending="Optimizing…">Generate optimal lineup</FormSubmit></form></div>
        {recommendation && <div className="card overflow-hidden"><div className="border-b border-[#202a38] p-5"><p className="text-xs font-bold uppercase text-emerald-300">Recommended lineup</p><p className="mt-2 text-3xl font-bold">{recommendation.projectedPoints.toFixed(1)} <small className="text-sm muted">points</small></p><p className="mt-2 text-sm muted">{recommendation.explanation}</p></div>{lineup.map(entry => <div key={entry.slot + entry.player.id} className="flex justify-between border-b border-[#202a38] px-4 py-3 text-sm"><span><b className="mr-2 text-emerald-300">{entry.slot}</b>{entry.player.name}</span><b>{entry.adjustedPoints.toFixed(1)}</b></div>)}</div>}
      </aside>
    </div>
  </main>;
}

function MiniField({ name, label, value }: { name: string; label: string; value: number }) { return <label className="field">{label}<input className="!p-2" name={name} type="number" min="0" max="100" step="0.1" defaultValue={value}/></label>; }
