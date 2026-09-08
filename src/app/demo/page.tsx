import Link from "next/link";
import { Crosshair, Shield } from "lucide-react";
import { optimizeLineup } from "@/features/recommendations/lineup-optimizer";
import { rankWaivers } from "@/features/recommendations/waiver-advisor";
import type { CandidatePlayer, SlotRequirement } from "@/features/recommendations/types";

const roster: CandidatePlayer[] = [
  ["qb1","Jalen Hurts","PHI","QB",22.8], ["rb1","Bijan Robinson","ATL","RB",19.4], ["rb2","Breece Hall","NYJ","RB",15.8],
  ["wr1","Amon-Ra St. Brown","DET","WR",18.7], ["wr2","Puka Nacua","LAR","WR",17.9], ["te1","Trey McBride","ARI","TE",14.1],
  ["flex1","Malik Nabers","NYG","WR",16.2], ["bench1","Jordan Addison","MIN","WR",12.4], ["bench2","David Montgomery","DET","RB",13.1],
].map(([id,name,team,position,projectedPoints]) => ({ id, name, team, position, projectedPoints, consistency: .7, injuryMultiplier: 1 } as CandidatePlayer));
const slots: SlotRequirement[] = [{slot:"QB",count:1},{slot:"RB",count:2},{slot:"WR",count:2},{slot:"TE",count:1},{slot:"FLEX",count:1}];
const available: CandidatePlayer[] = [{ id:"w1",name:"Breakout Running Back",team:"SEA",position:"RB",projectedPoints:15.2,ceilingPoints:22,restOfSeasonPoints:118 },{ id:"w2",name:"High-Upside Receiver",team:"GB",position:"WR",projectedPoints:14.5,ceilingPoints:23,restOfSeasonPoints:112 }];

export default function DemoPage() {
  const lineup = optimizeLineup(roster, slots); const waivers = rankWaivers(roster, available);
  return <main className="mx-auto min-h-screen max-w-6xl p-4 md:p-8"><header className="mb-8 flex items-center justify-between"><div className="flex items-center gap-2 font-bold"><span className="grid size-8 place-items-center rounded-lg bg-emerald-400 text-slate-950"><Shield size={17}/></span>Fourth Down Demo</div><Link className="button-primary" href="/register">Save your team</Link></header>
    <p className="text-sm text-emerald-300">No account required · Sample Week 1</p><h1 className="mt-1 text-3xl font-bold">See your best lineup and next move</h1><p className="mb-6 mt-2 muted">This sample uses the same deterministic engines as the real application.</p>
    <section className="mb-4 grid gap-3 sm:grid-cols-2"><div className="card p-5"><p className="text-xs font-bold uppercase muted">Optimal projection</p><p className="mt-2 text-3xl font-bold">{lineup.projectedPoints.toFixed(1)} points</p></div><div className="card p-5"><p className="text-xs font-bold uppercase muted">Lineup confidence</p><p className="mt-2 text-3xl font-bold">{Math.round(lineup.confidence*100)}%</p></div></section>
    <div className="grid gap-4 lg:grid-cols-2"><section className="card overflow-hidden"><h2 className="p-5 font-bold">Optimal starters</h2>{lineup.starters.map(entry=><div className="flex justify-between border-t border-[#202a38] px-4 py-3 text-sm" key={entry.slot+entry.player.id}><span><b className="mr-3 text-emerald-300">{entry.slot}</b>{entry.player.name}</span><b>{entry.adjustedPoints.toFixed(1)}</b></div>)}</section><section className="card p-5"><h2 className="flex items-center gap-2 font-bold"><Crosshair className="text-emerald-300"/> Waiver Wire Sniper</h2>{waivers.map((result,index)=><div className="mt-4 border-t border-[#202a38] pt-4 text-sm" key={result.add.id}><p><b>{index+1}. Add {result.add.name}</b></p><p className="muted">Drop {result.drop?.name ?? "open slot"} · {result.projectedGain.toFixed(1)} projected-point gain</p></div>)}</section></div>
  </main>;
}
