import { importCsv } from "@/features/admin/actions";
import { requireAdmin } from "@/lib/auth/session";
import { FormSubmit } from "@/components/form-submit";

const formats = {
  players: "external_id,name,nfl_team,position,active",
  projections: "external_id,season,week,projected_points,floor_points,ceiling_points,ros_points,consistency,matchup_rating",
  rankings: "external_id,season,week,rank,tier,value",
  injuries: "external_id,season,week,status,details,multiplier",
  matchups: "external_id,season,week,opponent,home,matchup_rating",
};

export default async function AdminImportPage() { await requireAdmin(); return <main className="mx-auto max-w-4xl p-4 md:p-8"><p className="text-sm text-violet-300">Administrator</p><h1 className="text-3xl font-bold">Provider CSV imports</h1><p className="mb-6 mt-2 muted">Import players first. All other files resolve players through the same provider’s stable external_id.</p><section className="card p-5"><form action={importCsv} className="space-y-4"><label className="field">Import type<select name="kind">{Object.keys(formats).map(kind=><option key={kind}>{kind}</option>)}</select></label><label className="field">Provider key<input name="providerKey" defaultValue="admin-csv" pattern="[a-z0-9-]+"/></label><label className="field">CSV file<input name="file" type="file" accept=".csv,text/csv" required/></label><FormSubmit className="button-primary">Import CSV</FormSubmit></form></section><section className="mt-5 card p-5"><h2 className="font-bold">Required headers</h2>{Object.entries(formats).map(([kind,headers])=><div className="mt-4" key={kind}><p className="text-sm font-bold capitalize">{kind}</p><code className="mt-1 block overflow-x-auto text-xs text-emerald-300">{headers}</code></div>)}</section></main>; }
