export type EspnScoringField = { key: string; code: string; label: string; defaultValue: number };
const field = (key: string, code: string, label: string, defaultValue = 0): EspnScoringField => ({ key, code, label, defaultValue });

export const ESPN_SCORING_CATEGORIES: ReadonlyArray<{ name: string; fields: EspnScoringField[] }> = [
  { name: "Passing", fields: [
    field("passingYard", "PY10", "Every 10 passing yards", .4), field("passingTd", "PTD", "TD Pass", 4), field("passing40TdBonus", "PTD40", "40+ yard TD pass bonus"),
    field("passing50TdBonus", "PTD50", "50+ yard TD pass bonus"), field("interceptionThrown", "INT", "Interceptions Thrown", -2), field("passingTwoPoint", "2PC", "2pt Passing Conversion", 2),
    field("passing300To399", "P300", "300–399 yard passing game"), field("passing400Plus", "P400", "400+ yard passing game"),
  ]},
  { name: "Rushing", fields: [
    field("rushingYard", "RY10", "Every 10 rushing yards", 1), field("rushingTd", "RTD", "TD Rush", 6), field("rushing40TdBonus", "RTD40", "40+ yard TD rush bonus"),
    field("rushing50TdBonus", "RTD50", "50+ yard TD rush bonus"), field("rushingTwoPoint", "2PR", "2pt Rushing Conversion", 2), field("rushing100To199", "RY100", "100–199 yard rushing game"),
    field("rushing200Plus", "RY200", "200+ yard rushing game"),
  ]},
  { name: "Receiving", fields: [
    field("receivingYard", "REY10", "Every 10 receiving yards", 1), field("reception", "REC5", "Every 5 receptions", 2.5), field("receivingTd", "RETD", "TD Reception", 6),
    field("receiving40TdBonus", "RETD40", "40+ yard TD rec bonus"), field("receiving50TdBonus", "RETD50", "50+ yard TD rec bonus"), field("receivingTwoPoint", "2PRE", "2pt Receiving Conversion", 2),
    field("receiving100To199", "REY100", "100–199 yard receiving game"), field("receiving200Plus", "REY200", "200+ yard receiving game"),
  ]},
  { name: "Kicking", fields: [
    field("patMade", "PAT", "Each PAT Made", 1), field("fieldGoalMissed", "FGM", "Total FG Missed", -1), field("fieldGoalMade0To39", "FG0", "FG Made (0–39 yards)", 3),
    field("fieldGoalMade40To49", "FG40", "FG Made (40–49 yards)", 4), field("fieldGoalMade50To59", "FG50", "FG Made (50–59 yards)", 5), field("fieldGoalMade60Plus", "FG60", "FG Made (60+ yards)", 6),
  ]},
  { name: "Team Defense / Special Teams", fields: [
    field("dstKickoffReturnTd", "KRTD", "Kickoff Return TD", 6), field("dstPuntReturnTd", "PRTD", "Punt Return TD", 6), field("dstInterceptionReturnTd", "INTTD", "Interception Return TD", 6),
    field("dstFumbleReturnTd", "FRTD", "Fumble Return TD", 6), field("dstBlockedReturnTd", "BLKKRTD", "Blocked Punt or FG return for TD", 6), field("dstTwoPointReturn", "2PTRET", "2pt Return", 2),
    field("dstOnePointSafety", "1PSF", "1pt Safety", 1), field("dstSack", "SK", "Each Sack", 1), field("dstBlock", "BLKK", "Blocked Punt, PAT or FG", 2),
    field("dstInterception", "INT", "Each Interception", 2), field("dstFumbleRecovery", "FR", "Each Fumble Recovered", 2), field("dstSafety", "SF", "Each Safety", 2),
    field("dstPa0", "PA0", "0 points allowed", 5), field("dstPa1To6", "PA1", "1–6 points allowed", 4), field("dstPa7To13", "PA7", "7–13 points allowed", 3),
    field("dstPa14To17", "PA14", "14–17 points allowed", 1), field("dstPa28To34", "PA28", "28–34 points allowed", -1), field("dstPa35To45", "PA35", "35–45 points allowed", -3),
    field("dstPa46Plus", "PA46", "46+ points allowed", -5), field("dstYaUnder100", "YA100", "Less than 100 total yards allowed"), field("dstYa100To199", "YA199", "100–199 total yards allowed"),
    field("dstYa350To399", "YA399", "350–399 total yards allowed"), field("dstYa400To449", "YA449", "400–449 total yards allowed"), field("dstYa450To499", "YA499", "450–499 total yards allowed"),
  ]},
];

export const ESPN_SCORING_FIELDS = ESPN_SCORING_CATEGORIES.flatMap((category) => category.fields);
export const ESPN_SCORING_DEFAULTS: Record<string, number> = Object.fromEntries(ESPN_SCORING_FIELDS.map(({ key, defaultValue }) => [key, defaultValue]));

export function parseEspnScoring(formData: FormData): Record<string, number> {
  return Object.fromEntries(ESPN_SCORING_FIELDS.map(({ key, defaultValue }) => {
    const value = Number(formData.get(`espn__${key}`) ?? defaultValue);
    if (!Number.isFinite(value) || value < -100 || value > 100) throw new Error(`Invalid scoring value for ${key}`);
    return [key, value];
  }));
}
