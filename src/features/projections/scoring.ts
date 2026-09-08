export interface StatProjection {
  passingYards?: number; passingTouchdowns?: number; interceptions?: number;
  rushingYards?: number; rushingTouchdowns?: number; receptions?: number;
  receivingYards?: number; receivingTouchdowns?: number; kickingPoints?: number; defensePoints?: number;
}

export interface ScoringRules {
  passingYardsPerPoint: number; pointsPerPassingTd: number; pointsPerInterception: number;
  rushingYardsPerPoint: number; pointsPerRushingTd: number; pointsPerReception: number;
  receivingYardsPerPoint: number; pointsPerReceivingTd: number;
}

export function scoreProjection(stats: StatProjection, rules: ScoringRules): number {
  const points = (stats.passingYards ?? 0) / rules.passingYardsPerPoint
    + (stats.passingTouchdowns ?? 0) * rules.pointsPerPassingTd
    + (stats.interceptions ?? 0) * rules.pointsPerInterception
    + (stats.rushingYards ?? 0) / rules.rushingYardsPerPoint
    + (stats.rushingTouchdowns ?? 0) * rules.pointsPerRushingTd
    + (stats.receptions ?? 0) * rules.pointsPerReception
    + (stats.receivingYards ?? 0) / rules.receivingYardsPerPoint
    + (stats.receivingTouchdowns ?? 0) * rules.pointsPerReceivingTd
    + (stats.kickingPoints ?? 0) + (stats.defensePoints ?? 0);
  return Number(points.toFixed(2));
}
