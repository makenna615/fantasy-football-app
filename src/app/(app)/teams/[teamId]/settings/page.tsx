import { notFound } from "next/navigation";
import type { LeagueSettings } from "@prisma/client";
import { requireUser } from "@/lib/auth/session";
import { db } from "@/lib/db";
import { updateLeagueSettings } from "@/features/league-settings/actions";
import { FormSubmit } from "@/components/form-submit";
import { TeamNav } from "@/components/team-nav";

const defaultSlots = { QB: 1, RB: 2, WR: 2, TE: 1, FLEX: 1, SUPERFLEX: 0, K: 1, DST: 1, BENCH: 6 };

export default async function SettingsPage({ params }: { params: Promise<{ teamId: string }> }) {
  const user = await requireUser(); const { teamId } = await params;
  const team = await db.team.findFirst({ where: { id: teamId, userId: user.id }, include: { leagueSettings: true } });
  if (!team) notFound();
  const settings = team.leagueSettings; const slots = { ...defaultSlots, ...((settings?.rosterSlots ?? {}) as typeof defaultSlots) };
  return <main className="mx-auto max-w-4xl p-5 md:p-8"><p className="text-sm text-emerald-300">{team.name}</p><h1 className="mb-5 text-3xl font-bold">League settings</h1><TeamNav teamId={team.id} active="settings"/><form action={updateLeagueSettings} className="space-y-5"><input type="hidden" name="teamId" value={team.id}/><section className="card grid gap-4 p-5 sm:grid-cols-2"><Select label="Scoring format" name="scoringFormat" value={settings?.scoringFormat ?? "HALF_PPR"} options={["STANDARD","HALF_PPR","FULL_PPR","CUSTOM"]}/><Select label="Roster format" name="rosterFormat" value={settings?.rosterFormat ?? "STANDARD"} options={["STANDARD","SUPERFLEX","CUSTOM"]}/></section><SettingsGroup title="Passing" fields={[['Yards per point','passingYardsPerPoint',settings?.passingYardsPerPoint ?? 25],['Passing TD','pointsPerPassingTd',settings?.pointsPerPassingTd ?? 4],['Interception','pointsPerInterception',settings?.pointsPerInterception ?? -2]]}/><SettingsGroup title="Rushing & receiving" fields={[['Rush yards per point','rushingYardsPerPoint',settings?.rushingYardsPerPoint ?? 10],['Rushing TD','pointsPerRushingTd',settings?.pointsPerRushingTd ?? 6],['Points per reception','pointsPerReception',settings?.pointsPerReception ?? .5],['Rec. yards per point','receivingYardsPerPoint',settings?.receivingYardsPerPoint ?? 10],['Receiving TD','pointsPerReceivingTd',settings?.pointsPerReceivingTd ?? 6]]}/><section className="card p-5"><h2 className="mb-4 font-bold">Roster slots</h2><div className="grid grid-cols-3 gap-3 sm:grid-cols-5">{Object.entries(slots).map(([name,value])=><label className="field" key={name}>{name}<input name={name} type="number" min="0" max="20" defaultValue={value}/></label>)}</div></section><FormSubmit>Save settings</FormSubmit></form></main>;
}

function Select({label,name,value,options}:{label:string;name:string;value:string;options:string[]}) { return <label className="field">{label}<select name={name} defaultValue={value}>{options.map(option=><option key={option} value={option}>{option.replaceAll('_',' ')}</option>)}</select></label> }
function SettingsGroup({title,fields}:{title:string;fields:Array<[string, keyof LeagueSettings, number]>}) { return <section className="card p-5"><h2 className="mb-4 font-bold">{title}</h2><div className="grid gap-3 sm:grid-cols-3">{fields.map(([label,name,value])=><label className="field" key={name}>{label}<input name={name} type="number" step="0.1" defaultValue={value}/></label>)}</div></section> }
