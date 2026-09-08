import Link from "next/link";

export function TeamNav({ teamId, active }: { teamId: string; active: "dashboard" | "roster" | "settings" | "recommendations" | "waivers" | "report" }) {
  const links = [["", "My Team", "dashboard"], ["roster", "Roster", "roster"], ["recommendations", "Lineup", "recommendations"], ["waivers", "Waiver Wire Sniper", "waivers"], ["report", "Report", "report"], ["settings", "Settings", "settings"]] as const;
  return <nav aria-label="Team navigation" className="mb-6 flex gap-1 overflow-x-auto border-b border-[#202a38]">{links.map(([route,label,key]) => <Link key={key} className={`tab whitespace-nowrap ${active === key ? "tab-active" : ""}`} href={`/teams/${teamId}${route ? `/${route}` : ""}`}>{label}</Link>)}</nav>;
}
