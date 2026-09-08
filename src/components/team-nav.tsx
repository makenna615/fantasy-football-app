import Link from "next/link";

export function TeamNav({ teamId, active }: { teamId: string; active: "roster" | "settings" | "recommendations" | "waivers" | "report" }) {
  const links = [["roster", "Roster"], ["settings", "League settings"], ["recommendations", "Lineup"], ["waivers", "Waivers"], ["report", "Report"]] as const;
  return <nav className="mb-6 flex gap-1 overflow-x-auto border-b border-[#202a38]">{links.map(([route,label]) => <Link key={route} className={`tab whitespace-nowrap ${active === route ? "tab-active" : ""}`} href={`/teams/${teamId}/${route}`}>{label}</Link>)}</nav>;
}
