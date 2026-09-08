import type { CandidatePlayer, LineupEntry, LineupResult, LineupSlot, SlotRequirement } from "./types";

const eligible: Record<LineupSlot, CandidatePlayer["position"][]> = {
  QB: ["QB"], RB: ["RB"], WR: ["WR"], TE: ["TE"], K: ["K"], DST: ["DST"],
  FLEX: ["RB", "WR", "TE"], SUPERFLEX: ["QB", "RB", "WR", "TE"], BENCH: [],
};

export function adjustedProjection(player: CandidatePlayer): number {
  const consistency = player.consistency ?? 0.5;
  const matchup = player.matchupRating ?? 0;
  const health = player.injuryMultiplier ?? 1;
  return Math.max(0, player.projectedPoints * health + matchup * 0.3 + (consistency - 0.5) * 0.5);
}

export function optimizeLineup(players: CandidatePlayer[], requirements: SlotRequirement[]): LineupResult {
  const slots = requirements.flatMap(({ slot, count }) => Array.from({ length: count }, () => slot));
  let best: LineupEntry[] = [];
  let bestScore = -1;

  function search(index: number, used: Set<string>, lineup: LineupEntry[], score: number) {
    if (index === slots.length) {
      if (score > bestScore) { bestScore = score; best = [...lineup]; }
      return;
    }
    const slot = slots[index];
    const candidates = players
      .filter((player) => !used.has(player.id) && eligible[slot].includes(player.position))
      .sort((a, b) => adjustedProjection(b) - adjustedProjection(a));
    for (const player of candidates) {
      used.add(player.id);
      const points = adjustedProjection(player);
      lineup.push({ slot, player, adjustedPoints: points });
      search(index + 1, used, lineup, score + points);
      lineup.pop();
      used.delete(player.id);
    }
  }

  search(0, new Set(), [], 0);
  if (best.length !== slots.length) throw new Error("Roster cannot fill every required lineup slot");
  const used = new Set(best.map((entry) => entry.player.id));
  const bench = players.filter((player) => !used.has(player.id)).sort((a, b) => adjustedProjection(b) - adjustedProjection(a));
  const alternatives = best.flatMap((entry) => {
    const alternative = bench.find((player) => eligible[entry.slot].includes(player.position));
    return alternative ? [{ slot: entry.slot, starter: entry.player, alternative, pointDelta: entry.adjustedPoints - adjustedProjection(alternative) }] : [];
  }).sort((a, b) => a.pointDelta - b.pointDelta).slice(0, 3);
  const averageMargin = alternatives.length ? alternatives.reduce((sum, item) => sum + item.pointDelta, 0) / alternatives.length : 5;
  return {
    starters: best,
    bench,
    projectedPoints: Number(bestScore.toFixed(2)),
    confidence: Number(Math.min(0.99, Math.max(0.5, 0.55 + averageMargin / 20)).toFixed(2)),
    alternatives,
  };
}
