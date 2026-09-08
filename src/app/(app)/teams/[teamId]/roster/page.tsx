import { notFound } from "next/navigation";
import { Trash2 } from "lucide-react";
import { requireUser } from "@/lib/auth/session";
import { db } from "@/lib/db";
import { addRosterPlayer, removeRosterPlayer } from "@/features/roster/actions";
import { FormSubmit } from "@/components/form-submit";
import { TeamNav } from "@/components/team-nav";

const positions = ["QB","TQB","RB","WR","TE","DT","DE","LB","CB","S","K","P","HC","DST"] as const;
const rosterSlots = ["QB","TQB","RB","RB_WR","WR","WR_TE","TE","FLEX","OP","DT","DE","LB","DL","CB","S","DB","DP","DST","K","P","HC","BENCH","IR"] as const;
const slotLabel = (slot: string) => slot === "BENCH" ? "BE" : slot.replaceAll("_", "/");

export default async function RosterPage({ params }: { params: Promise<{ teamId: string }> }) {
  const user = await requireUser(); const { teamId } = await params;
  const team = await db.team.findFirst({ where: { id: teamId, userId: user.id }, include: { rosterPlayers: { orderBy: [{ currentSlot: "asc" }, { name: "asc" }] } } });
  if (!team) notFound();
  return <main className="mx-auto max-w-6xl p-5 md:p-8">
    <p className="text-sm text-emerald-300">{team.name}</p><h1 className="mb-5 text-3xl font-bold">Roster management</h1><TeamNav teamId={team.id} active="roster"/>
    <div className="grid gap-5 lg:grid-cols-[1fr_330px]">
      <section className="card overflow-hidden">
        <div className="grid grid-cols-[65px_1fr_65px_40px] border-b border-[#202a38] px-4 py-3 text-xs font-bold uppercase muted"><span>Slot</span><span>Player</span><span>Pos</span><span/></div>
        {team.rosterPlayers.length === 0 && <p className="p-8 text-center muted">No players yet. Add your roster manually.</p>}
        {team.rosterPlayers.map(player => <div key={player.id} className="grid grid-cols-[65px_1fr_65px_40px] items-center border-b border-[#202a38] px-4 py-3 text-sm last:border-0"><span className="text-xs font-bold text-emerald-300">{slotLabel(player.currentSlot)}</span><span><b>{player.name}</b><small className="ml-2 muted">{player.nflTeam}</small></span><span className="muted">{player.position}</span><form action={removeRosterPlayer}><input type="hidden" name="teamId" value={team.id}/><input type="hidden" name="playerId" value={player.id}/><button aria-label={`Remove ${player.name}`} className="text-red-300"><Trash2 size={16}/></button></form></div>)}
      </section>
      <aside className="card h-fit p-5"><h2 className="mb-4 font-bold">Add player</h2><form action={addRosterPlayer} className="space-y-4">
        <input type="hidden" name="teamId" value={team.id}/><label className="field">Player name<input name="name" required maxLength={80}/></label>
        <div className="grid grid-cols-2 gap-3"><label className="field">NFL team<input name="nflTeam" required minLength={2} maxLength={3} placeholder="BUF"/></label><label className="field">Position<select name="position">{positions.map(value=><option key={value}>{value}</option>)}</select></label></div>
        <label className="field">Roster slot<select name="currentSlot" defaultValue="BENCH">{rosterSlots.map(value=><option key={value} value={value}>{slotLabel(value)}</option>)}</select></label><FormSubmit className="button-primary w-full">Add player</FormSubmit>
      </form></aside>
    </div>
  </main>;
}
