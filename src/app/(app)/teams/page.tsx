import Link from "next/link";
import { Trash2 } from "lucide-react";
import { requireUser } from "@/lib/auth/session";
import { db } from "@/lib/db";
import { createTeam, deleteTeam } from "@/features/teams/actions";
import { FormSubmit } from "@/components/form-submit";

export default async function TeamsPage() {
  const user = await requireUser();
  const teams = await db.team.findMany({ where: { userId: user.id }, include: { leagueSettings: true, _count: { select: { rosterPlayers: true } } }, orderBy: { updatedAt: "desc" } });
  return <main className="mx-auto max-w-5xl p-5 md:p-8"><div className="mb-7"><p className="text-sm text-emerald-300">Team command center</p><h1 className="text-3xl font-bold">Your teams</h1></div><div className="grid gap-4 md:grid-cols-[1fr_320px]"><section className="space-y-3">{teams.length === 0 && <div className="card p-8 text-center muted">Create your first team to start building a roster.</div>}{teams.map(team => <article className="card flex items-center justify-between gap-4 p-5" key={team.id}><Link className="min-w-0 flex-1" href={`/teams/${team.id}/roster`}><h2 className="truncate font-bold">{team.name}</h2><p className="mt-1 text-sm muted">{team.leagueSettings?.scoringFormat.replaceAll("_", " ")} · {team._count.rosterPlayers} players</p></Link><form action={deleteTeam}><input type="hidden" name="teamId" value={team.id}/><button aria-label={`Delete ${team.name}`} className="text-red-300"><Trash2 size={17}/></button></form></article>)}</section><aside className="card h-fit p-5"><h2 className="mb-4 font-bold">Add a team</h2><form action={createTeam} className="space-y-4"><label className="field">Team name<input name="name" required minLength={2} maxLength={60} placeholder="Gridiron Kings"/></label><FormSubmit className="button-primary w-full">Create team</FormSubmit></form></aside></div></main>;
}
