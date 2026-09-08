import { adjustedProjection } from "./lineup-optimizer";
import type { CandidatePlayer, WaiverResult } from "./types";

const scarcity = { QB: .88, TQB: .88, RB: 1.12, WR: 1, TE: 1.08, DT: .8, DE: .85, LB: .9, CB: .75, S: .78, K: .65, P: .55, HC: .5, DST: .7 } as const;

export function rankWaivers(roster: CandidatePlayer[], available: CandidatePlayer[]): WaiverResult[] {
  return available.map((add) => {
    const dropPool = roster
      .filter((player) => player.position === add.position || ["RB", "WR", "TE"].includes(add.position))
      .sort((a, b) => adjustedProjection(a) - adjustedProjection(b));
    const drop = dropPool[0];
    const projectedGain = adjustedProjection(add) - (drop ? adjustedProjection(drop) : 0);
    const shortTermValue = adjustedProjection(add);
    const restOfSeasonValue = add.restOfSeasonPoints ?? add.projectedPoints * 6;
    const upside = Math.max(0, (add.ceilingPoints ?? add.projectedPoints) - add.projectedPoints);
    const priorityScore = shortTermValue * 2.2 + restOfSeasonValue * 0.25 + upside * 0.8 + projectedGain * 2.5;
    return { add, drop, projectedGain, shortTermValue, restOfSeasonValue, priorityScore: priorityScore * scarcity[add.position] };
  }).sort((a, b) => b.priorityScore - a.priorityScore).slice(0, 10).map((result) => ({
    ...result,
    projectedGain: Number(result.projectedGain.toFixed(2)),
    shortTermValue: Number(result.shortTermValue.toFixed(2)),
    restOfSeasonValue: Number(result.restOfSeasonValue.toFixed(2)),
    priorityScore: Number(result.priorityScore.toFixed(1)),
  }));
}
