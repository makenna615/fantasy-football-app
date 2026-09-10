import { importCsv, syncProviderData } from "@/features/admin/actions";
import { requireAdmin } from "@/lib/auth/session";
import { FormSubmit } from "@/components/form-submit";
import { db } from "@/lib/db";
import { getFantasyWeek } from "@/lib/fantasy-week";
import { NFLVERSE_ATTRIBUTION } from "@/features/providers/nflverse/urls";

const formats = {
  players: "external_id,name,nfl_team,position,active",
  projections:
    "external_id,season,week,projected_points,floor_points,ceiling_points,ros_points,consistency,matchup_rating",
  rankings: "external_id,season,week,rank,tier,value",
  injuries: "external_id,season,week,status,details,multiplier",
  matchups: "external_id,season,week,opponent,home,matchup_rating",
};
export default async function AdminImportPage() {
  await requireAdmin();
  const { season, week } = getFantasyWeek();
  const sources = await db.dataProvider.findMany({
    where: { key: { in: ["nflverse", "tank01"] } },
    include: {
      syncRuns: { orderBy: { startedAt: "desc" }, take: 8 },
      _count: {
        select: { projections: true, injuries: true, unmatched: true },
      },
    },
  });
  const players = await db.player.count({ where: { active: true } });
  const tankSource = sources.find((source) => source.key === "tank01");
  const tankCrosswalk = tankSource
    ? await db.playerExternalId.groupBy({
        by: ["matchMethod"],
        where: { providerId: tankSource.id },
        _count: true,
      })
    : [];
  const stableCrosswalks =
    tankCrosswalk.find((row) => row.matchMethod === "STABLE_ID")?._count ?? 0;
  const fallbackCrosswalks =
    tankCrosswalk.find((row) => row.matchMethod === "CONTROLLED_FALLBACK")
      ?._count ?? 0;
  const latestTankRun = tankSource?.syncRuns.find(
    (run) => run.dataset === "projections",
  );
  return (
    <main className="mx-auto max-w-6xl p-4 md:p-8">
      <p className="text-sm text-violet-300">Administrator</p>
      <h1 className="text-3xl font-bold">Data sources</h1>
      <p className="mb-6 mt-2 muted">
        Current NFL season {season}, week {week}. Dashboard requests only read
        PostgreSQL.
      </p>
      <section className="mb-5 grid gap-4 md:grid-cols-2">
        {["nflverse", "tank01"].map((key) => {
          const source = sources.find((item) => item.key === key);
          const success = source?.syncRuns.find(
            (run) => run.status === "SUCCESS",
          );
          const failure = source?.syncRuns.find(
            (run) => run.status === "FAILED",
          );
          const configured =
            key === "nflverse" ||
            Boolean(process.env.RAPIDAPI_KEY && process.env.TANK01_API_HOST);
          return (
            <article className="card p-5" key={key}>
              <div className="flex justify-between">
                <h2 className="text-xl font-bold">
                  {key === "nflverse" ? "NFLverse" : "Tank01"}
                </h2>
                <span
                  className={configured ? "text-emerald-300" : "text-amber-300"}
                >
                  {configured ? "Configured" : "Not configured"}
                </span>
              </div>
              <dl className="mt-4 grid grid-cols-2 gap-3 text-sm">
                <Fact
                  label="Last success"
                  value={success?.completedAt?.toLocaleString() ?? "Never"}
                />
                <Fact
                  label="Players"
                  value={key === "nflverse" ? String(players) : "—"}
                />
                <Fact
                  label="Projections"
                  value={String(source?._count.projections ?? 0)}
                />
                <Fact
                  label="Injuries"
                  value={String(source?._count.injuries ?? 0)}
                />
                <Fact
                  label="Unmatched"
                  value={String(source?._count.unmatched ?? 0)}
                />
                <Fact
                  label="Last error"
                  value={failure?.errorMessage ?? "None"}
                />
              </dl>
              {key === "nflverse" && (
                <p className="mt-4 text-xs muted">{NFLVERSE_ATTRIBUTION}</p>
              )}
            </article>
          );
        })}
      </section>
      <section className="card mb-5 p-5">
        <h2 className="font-bold">Tank01 identity crosswalk</h2>
        <dl className="mt-4 grid grid-cols-2 gap-3 text-sm md:grid-cols-4">
          <Fact label="Matched by stable ID" value={String(stableCrosswalks)} />
          <Fact
            label="Controlled fallback"
            value={String(fallbackCrosswalks)}
          />
          <Fact
            label="Latest unmatched"
            value={String(latestTankRun?.unmatched ?? 0)}
          />
          <Fact
            label="Latest ambiguous"
            value={String(latestTankRun?.ambiguousMatches ?? 0)}
          />
        </dl>
        <p className="mt-3 text-xs muted">
          Fallback mappings use normalized name plus position, with team as
          supporting evidence. Ambiguous records are never selected
          automatically.
        </p>
      </section>
      <section className="card mb-5 p-5">
        <h2 className="font-bold">Synchronize</h2>
        <div className="mt-4 flex flex-wrap gap-2">
          {[
            ["players", "Sync Players"],
            ["injuries", "Sync Injuries"],
            ["rosters", "Sync Rosters"],
            ["stats", "Sync Stats"],
            ["projections", "Sync Projections"],
            ["all", "Sync All"],
          ].map(([dataset, label]) => (
            <form action={syncProviderData} key={dataset}>
              <input type="hidden" name="dataset" value={dataset} />
              <FormSubmit
                className={
                  dataset === "all" ? "button-primary" : "button-secondary"
                }
                pending="Syncing…"
              >
                {label}
              </FormSubmit>
            </form>
          ))}
        </div>
      </section>
      <section className="card p-5">
        <h2 className="font-bold">CSV fallback</h2>
        <p className="mb-4 mt-1 text-sm muted">
          Manual imports remain independent from automatic providers.
        </p>
        <form action={importCsv} className="grid gap-4 md:grid-cols-4">
          <label className="field">
            Import type
            <select name="kind">
              {Object.keys(formats).map((kind) => (
                <option key={kind}>{kind}</option>
              ))}
            </select>
          </label>
          <label className="field">
            Provider key
            <input
              name="providerKey"
              defaultValue="admin-csv"
              pattern="[a-z0-9-]+"
            />
          </label>
          <label className="field md:col-span-2">
            CSV file
            <input name="file" type="file" accept=".csv,text/csv" required />
          </label>
          <FormSubmit className="button-primary">Import CSV</FormSubmit>
        </form>
        <details className="mt-5">
          <summary className="cursor-pointer text-sm font-bold">
            CSV headers
          </summary>
          {Object.entries(formats).map(([kind, headers]) => (
            <code
              className="mt-2 block overflow-x-auto text-xs text-emerald-300"
              key={kind}
            >
              {kind}: {headers}
            </code>
          ))}
        </details>
      </section>
      <section className="mt-5 card p-5">
        <h2 className="font-bold">Unmatched player records</h2>
        {await unmatched()}
      </section>
    </main>
  );
}
function Fact({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="muted">{label}</dt>
      <dd className="mt-1 break-words font-bold">{value}</dd>
    </div>
  );
}
async function unmatched() {
  const rows = await db.unmatchedProviderRecord.findMany({
    where: { resolvedAt: null },
    include: { provider: true },
    orderBy: { createdAt: "desc" },
    take: 50,
  });
  return rows.length ? (
    <div className="mt-3 divide-y divide-[#202a38]">
      {rows.map((row) => (
        <div className="grid gap-1 py-3 text-sm sm:grid-cols-4" key={row.id}>
          <b>{row.displayName ?? row.externalId ?? "Unknown"}</b>
          <span>
            {row.provider.name} · {row.dataset}
          </span>
          <span className="muted">
            {row.nflTeam} {row.position}
          </span>
          <span className="text-amber-300">{row.reason}</span>
        </div>
      ))}
    </div>
  ) : (
    <p className="mt-2 muted">No unresolved records.</p>
  );
}
