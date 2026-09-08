import { notFound } from "next/navigation";
import { requireUser } from "@/lib/auth/session";
import { db } from "@/lib/db";
import { updateLeagueSettings } from "@/features/league-settings/actions";
import { ESPN_SCORING_CATEGORIES, ESPN_SCORING_DEFAULTS } from "@/features/league-settings/espn-scoring";
import { ESPN_ROSTER_OPTIONS } from "@/features/league-settings/espn-roster";
import { FormSubmit } from "@/components/form-submit";
import { TeamNav } from "@/components/team-nav";

export default async function SettingsPage({ params }: { params: Promise<{ teamId: string }> }) {
  const user = await requireUser(); const { teamId } = await params;
  const team = await db.team.findFirst({ where: { id: teamId, userId: user.id }, include: { league: { include: { settings: true } } } });
  if (!team) notFound();
  const settings = team.league.settings;
  const storedSlots = (settings?.rosterSlots ?? {}) as Record<string, number>;
  const storedMaximums = (settings?.rosterMaximums ?? {}) as Record<string, number | null>;
  const storedEspn = (settings?.espnScoring ?? {}) as Record<string, number>;
  const legacyCore: Record<string, number> = settings && Object.keys(storedEspn).length === 0 ? {
    passingYard: 10 / settings.passingYardsPerPoint, passingTd: settings.pointsPerPassingTd, interceptionThrown: settings.pointsPerInterception,
    rushingYard: 10 / settings.rushingYardsPerPoint, rushingTd: settings.pointsPerRushingTd, reception: settings.pointsPerReception * 5,
    receivingYard: 10 / settings.receivingYardsPerPoint, receivingTd: settings.pointsPerReceivingTd,
  } : {};
  const espnScoring: Record<string, number> = { ...ESPN_SCORING_DEFAULTS, ...legacyCore, ...storedEspn };
  return <main className="mx-auto max-w-5xl p-5 md:p-8">
    <p className="text-sm text-emerald-300">{team.name}</p><h1 className="mb-5 text-3xl font-bold">League settings</h1>
    <TeamNav teamId={team.id} active="settings"/>
    <form action={updateLeagueSettings} className="space-y-5">
      <input type="hidden" name="teamId" value={team.id}/>
      <input type="hidden" name="passingYardsPerPoint" value={settings?.passingYardsPerPoint ?? 25}/><input type="hidden" name="pointsPerPassingTd" value={settings?.pointsPerPassingTd ?? 4}/><input type="hidden" name="pointsPerInterception" value={settings?.pointsPerInterception ?? -2}/>
      <input type="hidden" name="rushingYardsPerPoint" value={settings?.rushingYardsPerPoint ?? 10}/><input type="hidden" name="pointsPerRushingTd" value={settings?.pointsPerRushingTd ?? 6}/><input type="hidden" name="pointsPerReception" value={settings?.pointsPerReception ?? .5}/>
      <input type="hidden" name="receivingYardsPerPoint" value={settings?.receivingYardsPerPoint ?? 10}/><input type="hidden" name="pointsPerReceivingTd" value={settings?.pointsPerReceivingTd ?? 6}/>
      <section className="card grid gap-4 p-5 sm:grid-cols-2"><Select label="Scoring format" name="scoringFormat" value={settings?.scoringFormat ?? "HALF_PPR"} options={["STANDARD","HALF_PPR","FULL_PPR","CUSTOM"]}/><Select label="Roster format" name="rosterFormat" value={settings?.rosterFormat ?? "STANDARD"} options={["STANDARD","SUPERFLEX","CUSTOM"]}/></section>
      <section className="card overflow-hidden"><div className="p-5"><h2 className="font-bold">Roster</h2><p className="mt-1 text-sm muted">Set starters and positional roster maximums. Composite slots use N/A maximums.</p></div><div className="grid grid-cols-[1fr_90px_100px] border-y border-[#202a38] px-5 py-2 text-xs font-bold uppercase muted"><span>Position</span><span>Starters</span><span>Maximums</span></div>{ESPN_ROSTER_OPTIONS.map(option=><div className="grid grid-cols-[1fr_90px_100px] items-center border-b border-[#202a38] px-5 py-2.5 last:border-0" key={option.key}><span className="text-sm">{option.label} <b className="text-emerald-300">({option.code})</b></span><input className="settings-number" aria-label={`${option.label} starters`} name={`starter__${option.key}`} type="number" min="0" max="20" defaultValue={storedSlots[option.key] ?? option.defaultStarters}/>{option.maximumKind === "number" ? <input className="settings-number" aria-label={`${option.label} maximum`} name={`maximum__${option.key}`} type="number" min="0" max="50" defaultValue={storedMaximums[option.key] ?? option.maximum ?? 0}/> : <span className="text-sm muted">{option.maximumKind === "unlimited" ? "No Limit" : "N/A"}</span>}</div>)}</section>
      <section className="card p-5"><h2 className="font-bold">Scoring</h2><p className="mb-4 mt-1 text-sm muted">Enter points for each ESPN scoring bucket. Negative values are supported; zero disables a category.</p><div className="space-y-3">{ESPN_SCORING_CATEGORIES.map((category, index)=><details className="rounded-xl border border-[#202a38] p-4" key={category.name} open={index < 3}><summary className="cursor-pointer font-bold">{category.name}</summary><div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">{category.fields.map(field=><label className="field" key={field.key}>{field.label} <span className="text-emerald-300">({field.code})</span><input name={`espn__${field.key}`} type="number" min="-100" max="100" step="0.01" defaultValue={espnScoring[field.key]}/></label>)}</div></details>)}</div></section>
      <FormSubmit>Save settings</FormSubmit>
    </form>
  </main>;
}

function Select({label,name,value,options}:{label:string;name:string;value:string;options:string[]}) { return <label className="field">{label}<select name={name} defaultValue={value}>{options.map(option=><option key={option} value={option}>{option.replaceAll('_',' ')}</option>)}</select></label> }
