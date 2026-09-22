import { notFound } from "next/navigation";
import { Trash2 } from "lucide-react";
import { requireUser } from "@/lib/auth/session";
import { db } from "@/lib/db";
import {
  addWaiverCandidate,
  removeWaiverCandidate,
} from "@/features/waivers/actions";
import { generateWaivers } from "@/features/recommendations/actions";
import { FormSubmit } from "@/components/form-submit";
import { TeamNav } from "@/components/team-nav";
import { getFantasyWeek } from "@/lib/fantasy-week";
import { ProviderPlayerPicker } from "@/features/waivers/provider-player-picker";

export default async function WaiversPage({
  params,
}: {
  params: Promise<{ teamId: string }>;
}) {
  const { season, week } = getFantasyWeek();
  const user = await requireUser();
  const { teamId } = await params;
  const team = await db.team.findFirst({
    where: { id: teamId, userId: user.id },
    include: {
      rosterPlayers: true,
      waiverCandidates: { orderBy: { projectedPoints: "desc" } },
      waiverRecommendations: {
        where: { season, week },
        orderBy: { priorityScore: "desc" },
        take: 10,
      },
    },
  });
  if (!team) notFound();
  const excluded = [
    ...team.rosterPlayers.map((row) => row.playerId),
    ...team.waiverCandidates.flatMap((row) =>
      row.playerId ? [row.playerId] : [],
    ),
  ];
  const providerPlayers = await db.playerProjection.findMany({
    where: {
      season,
      week,
      provider: { key: "tank01" },
      playerId: { notIn: excluded },
      OR: [{ leagueId: team.leagueId }, { leagueId: null }],
    },
    include: { player: true, provider: true },
    orderBy: { projectedPoints: "desc" },
    take: 1000,
  });
  const uniqueProviderPlayers = [
    ...new Map(providerPlayers.map((row) => [row.playerId, row])).values(),
  ];
  return (
    <main className="mx-auto max-w-6xl p-4 md:p-8">
      <p className="text-sm text-emerald-300">
        {team.name} · Week {week}
      </p>
      <h1 className="mb-5 text-3xl font-bold">Waiver Wire Sniper</h1>
      <TeamNav teamId={team.id} active="waivers" />
      <div className="grid gap-5 lg:grid-cols-[1fr_360px]">
        <section className="space-y-4">
          <div className="card p-5">
            <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
              <div>
                <h2 className="font-bold">Your league’s available pool</h2>
                <p className="text-sm muted">
                  Provider-linked players use the newest stored projection
                  automatically.
                </p>
              </div>
              <form action={generateWaivers}>
                <input type="hidden" name="teamId" value={team.id} />
                <input type="hidden" name="season" value={season} />
                <input type="hidden" name="week" value={week} />
                <FormSubmit pending="Ranking…">Rank waivers</FormSubmit>
              </form>
            </div>
            {team.waiverCandidates.map((player) => (
              <div
                key={player.id}
                className="grid grid-cols-[1fr_70px_35px] border-t border-[#202a38] py-3 text-sm"
              >
                <span>
                  <b>{player.name}</b>
                  <small className="ml-2 muted">
                    {player.position} · {player.nflTeam}
                    {player.playerId ? " · automatic" : " · manual"}
                  </small>
                </span>
                <b>{player.projectedPoints.toFixed(1)}</b>
                <form action={removeWaiverCandidate}>
                  <input type="hidden" name="teamId" value={team.id} />
                  <input type="hidden" name="candidateId" value={player.id} />
                  <button
                    aria-label={`Remove ${player.name}`}
                    className="text-red-300"
                  >
                    <Trash2 size={15} />
                  </button>
                </form>
              </div>
            ))}
          </div>
          {team.waiverRecommendations.length > 0 && (
            <div className="card p-5">
              <h2 className="mb-3 font-bold">Recommended claims</h2>
              {team.waiverRecommendations.map((result, index) => (
                <div
                  className="border-t border-[#202a38] py-3 text-sm"
                  key={result.id}
                >
                  <div className="flex justify-between">
                    <b>
                      {index + 1}. {(result.addPlayer as { name: string }).name}
                    </b>
                    <span className="text-emerald-300">
                      Priority {result.priorityScore.toFixed(0)}
                    </span>
                  </div>
                  <p className="mt-1 muted">{result.explanation}</p>
                </div>
              ))}
            </div>
          )}
        </section>
        <aside className="space-y-4">
          <section className="card p-5">
            <h2 className="mb-1 font-bold">Add from current projections</h2>
            <p className="mb-4 text-sm muted">No projection entry required.</p>
            {uniqueProviderPlayers.length ? (
              <ProviderPlayerPicker
                teamId={team.id}
                players={uniqueProviderPlayers.map((row) => ({
                  playerId: row.playerId,
                  name: row.player.fullName,
                  team: row.player.nflTeam,
                  position: row.player.position,
                  projectedPoints: row.projectedPoints,
                  provider: row.provider.name,
                }))}
              />
            ) : (
              <p className="text-sm text-amber-200">
                No provider projections are loaded for this week.
              </p>
            )}
          </section>
          <details className="card p-5">
            <summary className="cursor-pointer font-bold">
              Manual fallback
            </summary>
            <form action={addWaiverCandidate} className="mt-4 space-y-3">
              <input type="hidden" name="teamId" value={team.id} />
              <label className="field">
                Name
                <input name="name" required />
              </label>
              <div className="grid grid-cols-2 gap-2">
                <label className="field">
                  Team
                  <input name="nflTeam" maxLength={3} required />
                </label>
                <label className="field">
                  Position
                  <select name="position">
                    {["QB", "RB", "WR", "TE", "K", "DST"].map((x) => (
                      <option key={x}>{x}</option>
                    ))}
                  </select>
                </label>
              </div>
              {[
                ["projectedPoints", "Projection", 10],
                ["floorPoints", "Floor", 5],
                ["ceilingPoints", "Ceiling", 18],
                ["restOfSeasonPoints", "ROS points", 80],
                ["consistency", "Consistency", 0.5],
                ["matchupRating", "Matchup", 0],
                ["injuryMultiplier", "Health", 1],
              ].map(([name, label, value]) => (
                <label className="field" key={String(name)}>
                  {label}
                  <input
                    name={String(name)}
                    type="number"
                    step="0.1"
                    defaultValue={value}
                  />
                </label>
              ))}
              <FormSubmit className="button-primary w-full">
                Add manual candidate
              </FormSubmit>
            </form>
          </details>
        </aside>
      </div>
    </main>
  );
}
