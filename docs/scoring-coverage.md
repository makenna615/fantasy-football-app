# Tank01 → ESPN scoring coverage

Validated against cached Tank01 2026 week 1 projections. Provider fantasy-point totals are ignored. Fourth Down scores normalized statistics with each league's `LeagueSettings.espnScoring` values.

## Tank01 projected fields

| Group     | Normalized fields                                                                                                               | Scoring use                                                                                                                |
| --------- | ------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------- |
| Passing   | attempts, completions, yards, TDs, interceptions                                                                                | Yards, TDs, and interceptions score. Attempts/completions are retained facts. Passing sacks were not present.              |
| Rushing   | attempts, yards, TDs                                                                                                            | Yards and TDs score. Attempts are retained.                                                                                |
| Receiving | targets, receptions, yards, TDs                                                                                                 | Receptions, yards, and TDs score. Targets are retained.                                                                    |
| Misc.     | fumbles lost, generic two-point conversions                                                                                     | Retained but not scored because the configured 53 fields have no player-fumble category and the two-point type is unknown. |
| Kicking   | FG made/missed, XP made/missed                                                                                                  | XP made and FG missed score. FG makes are retained but lack distance; XP misses have no configured category.               |
| D/ST      | sacks, interceptions, fumble recoveries, safeties, blocked kicks, points allowed, aggregate return TDs, aggregate defensive TDs | The first six facts score. Aggregate touchdowns are retained but not assigned to a specific return category.               |
| IDP       | none                                                                                                                            | Tank01 returned no forward-looking IDP stat lines in the validated cache.                                                  |

Tank01 has 26 fields normalized into Fourth Down. Passing sacks were requested but absent in the live response. Of the normalized fields, 16 directly support scoring, while 10 are retained but cannot safely affect one of the configured ESPN categories.

## ESPN category coverage

There are 53 configured ESPN-style categories.

### Fully supported (28)

- Passing: PY10, PTD, INT, P300, P400.
- Rushing: RY10, RTD, RY100, RY200.
- Receiving: REY10, REC5, RETD, REY100, REY200.
- Kicking: PAT, FGM.
- D/ST: SK, BLKK, INT, FR, SF, PA0, PA1, PA7, PA14, PA28, PA35, PA46.

### Partially supported (12)

- Two-point conversions: 2PC, 2PR, 2PRE. Tank01 supplies an aggregate without play type.
- Field goals made: FG0, FG40, FG50, FG60. Tank01 supplies total makes without distance.
- Return touchdowns: KRTD, PRTD, INTTD, FRTD, BLKKRTD. Tank01 supplies aggregate return/defensive TD counts without the required subtype.

These facts are retained but score zero until a provider supplies the missing subtype or distance. Fourth Down does not guess.

### Unsupported (13)

- Long-touchdown bonuses: PTD40, PTD50, RTD40, RTD50, RETD40, RETD50. Projected touchdown length is unavailable.
- Special returns: 2PTRET and 1PSF. No projected fields are available.
- Yards allowed: YA100, YA199, YA399, YA449, YA499. Tank01 does not supply projected team yards allowed.

## Recommendation input trace

1. `Tank01ProjectionProvider` normalizes provider stat lines.
2. `syncProjections` calls `scoreEspnProjectedStats` with the target league's `espnScoring` object and persists the result as `PlayerProjection.projectedPoints`.
3. `loadTeamProjections` selects manual override, scoring-calculator value, or stored provider projection in that order.
4. `toCandidates` passes that selected `projectedPoints` to the deterministic lineup optimizer.
5. Waiver candidate refresh reads the same stored `PlayerProjection.projectedPoints` before calling the deterministic waiver ranker.

Neither recommendation engine reads Tank01's `fantasyPointsDefault` field or raw provider payload.

## Live cached acceptance report

The current 2026 week 1 cache was rescored for the `Fighting Hawks League` using its `CUSTOM` ESPN settings:

| Position | Player        | Relevant projected stat line                                 | Calculated points |
| -------- | ------------- | ------------------------------------------------------------ | ----------------: |
| QB       | Jaxson Dart   | 244 pass yd, 1.6 pass TD, 0.6 INT, 32.2 rush yd, 0.4 rush TD |             37.64 |
| RB       | Jahmyr Gibbs  | 90.8 rush yd, 0.8 rush TD, 4.5 rec, 34.9 rec yd, 0.2 rec TD  |             34.54 |
| WR       | Ja'Marr Chase | 7.6 rec, 94.7 rec yd, 0.7 rec TD, 1.1 rush yd                |             26.40 |
| TE       | Trey McBride  | 5.8 rec, 57 rec yd, 0.4 rec TD                               |             16.12 |
| K        | Jake Bates    | 3 XP made, 0.2 FG missed, 1.5 FG made without distance       |              2.80 |
| D/ST     | Tennessee     | 3.4 sacks, 0.8 INT, 0.5 FR, 0.1 blocks, 20.1 PA              |              6.20 |

No cached Tank01 IDP projection exists. IDP scoring therefore remains unsupported and missing data is not converted into invented points.
