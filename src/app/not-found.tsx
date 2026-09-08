import Link from "next/link";
export default function NotFound(){return <main className="grid min-h-screen place-items-center p-5"><section className="text-center"><h1 className="text-4xl font-bold">Team not found</h1><p className="my-4 muted">It may not exist or belong to another account.</p><Link className="text-emerald-300" href="/teams">Back to teams</Link></section></main>}
