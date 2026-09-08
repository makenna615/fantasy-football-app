# External data provider contracts

Fourth Down never passes provider-specific payloads into the recommendation engines. An adapter must resolve the provider's player identifier to `PlayerExternalId`, normalize its output, and persist source payloads for traceability.

## Player identity

Every provider supplies a stable `external_id`, full name, NFL team, and canonical position. Player imports run before dependent datasets. A provider ID maps to one canonical player, and a player has at most one ID per provider.

## Projection data

Required: `external_id`, season, week, and projected fantasy points. Recommended: floor, ceiling, rest-of-season points, consistency from 0–1, and matchup rating from -5–5. Raw stats may be retained in `sourcePayload`; league scoring is applied before optimization when a source supplies statistics rather than fantasy points.

## Rankings

Required: `external_id`, season, and rank. Optional: week, tier, and numeric value. Rankings provide future rest-of-season context and never override deterministic scoring.

## Injuries

Required: `external_id`, season, week, and status. Recommended: factual details and a documented availability multiplier from 0–1. AI text cannot change availability or rank.

## Matchups

Required: `external_id`, season, week, opponent, and home/away. Optional: a normalized matchup rating from -5–5 and structured details. League opponent comparison belongs in `LeagueMatchup`, separate from NFL player matchup facts.

## Future adapters

API integrations implement `ProjectionProvider` in `src/features/projections/provider.ts`. Sleeper, ESPN, Yahoo, and ranking vendors remain behind adapters and must not leak response shapes into the optimizer, waiver advisor, or UI. Scraping is intentionally out of scope.
