# External data providers

Fourth Down keeps provider payloads outside the recommendation engines. Adapters normalize data, resolve stable IDs to canonical `Player` records, and persist source metadata. The ESPN-style scoring engine converts projected statistics into league-specific fantasy points; OpenAI never calculates projections or changes rankings.

## Provider-neutral contracts

Shared contracts live in `src/features/providers/contracts.ts`: `PlayerDataProvider`, `ProjectionProvider`, `InjuryProvider`, `StatsProvider`, and `MatchupProvider`. Provider IDs are mappings, not Fourth Down primary keys. Manual projections and CSV imports remain supported. Effective projection priority is manual override, scoring-calculator projection, configured provider projection, then existing fallback. Removing an override reveals the stored provider projection again.

## NFLverse

NFLverse requires no API key. Fourth Down uses the official release assets for players, seasonal and weekly rosters, injuries, combined weekly player statistics, and schedules. URL construction is centralized in `src/features/providers/nflverse/urls.ts`.

NFL roster status remains separate from fantasy roster membership. Uncertain identity matches are recorded for admin review rather than silently merged. NFLverse data is used under its applicable licenses, including CC BY 4.0 for nflverse-data; preserve attribution and source metadata.

## Tank01 through RapidAPI

Tank01 is optional and server-only. Configure `RAPIDAPI_KEY` and the exact `TANK01_API_HOST` shown by RapidAPI in `.env.local`. The adapter calls `GET /getNFLProjections` with `X-RapidAPI-Key` and `X-RapidAPI-Host`, validates responses, uses a bulk weekly request, and caches results in PostgreSQL.

Tank01 projected statistics—not provider fantasy-point totals—flow through Fourth Down's scoring engine. A generic two-point conversion cannot safely be assigned to passing/rushing/receiving, and a field goal without distance cannot safely be assigned to an ESPN distance bucket. Such values are retained rather than guessed.

## Injury rules

Deterministic availability multipliers are: healthy/full `1.0`, questionable/limited `0.85`, did not practice `0.5`, doubtful `0.25`, and out/IR `0`. Unknown statuses remain neutral at `1.0`. Manual injury records coexist with provider records.

## Refresh and failure behavior

Dashboard reads use PostgreSQL, not live provider requests. The protected `GET /api/cron/sync` endpoint runs stale-aware synchronization with `Authorization: Bearer <CRON_SECRET>`. Suggested schedules are daily for players/rosters, several times daily for injuries, and no more frequently than the projection cache and RapidAPI plan allow.

Transient Tank01 failures use bounded exponential backoff; authentication/validation errors and HTTP 429 are not retried. Provider failures never replace previous valid records. The application continues using manual data and CSV imports when Tank01 is absent or either provider is temporarily unavailable.
