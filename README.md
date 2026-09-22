# Fourth Down

Fourth Down is a free, full-stack fantasy football lineup and waiver optimization application. Add your fantasy team and ESPN-style league settings, then use current NFL projections to generate an optimal lineup, compare start/sit options, and find waiver additions and drops.

Recommendation math is deterministic. OpenAI is optional and is used only to explain results that Fourth Down has already calculated—it never creates projections, scores players, or changes rankings.

## What it does

- Account-based leagues, fantasy teams, and rosters.
- Mobile-friendly weekly **My Team** dashboard.
- ESPN-style scoring configuration with 53 categories and negative-point support.
- Custom roster slots including WR/TE, FLEX, SUPERFLEX/OP, IR, and IDP positions.
- Deterministic lineup optimization with start/sit alternatives and risk indicators.
- **Waiver Wire Sniper** with searchable current projections and team-specific add/drop rankings.
- Automatic NFL player, roster, injury, statistics, and schedule ingestion from NFLverse.
- Weekly stat-line projections from Tank01 through RapidAPI when configured.
- Canonical player identity and provider-ID crosswalks using stable GSIS/ESPN/provider IDs.
- Manual projection overrides, manual waiver candidates, and administrator CSV imports.
- Weekly natural-language reports with an optional OpenAI explanation layer.
- Demo mode at `/demo` without registration.

## Projection and scoring pipeline

```text
Tank01 projected stat line
        ↓
Fourth Down normalization and canonical player matching
        ↓
The league's exact ESPN-style scoring settings
        ↓
Stored projected fantasy points
        ↓
Deterministic lineup optimizer and waiver ranking
        ↓
Optional OpenAI explanation
```

Tank01 fantasy-point totals are not authoritative. Fourth Down calculates fantasy points from the provider's projected statistics for each league. Dashboard requests read cached PostgreSQL records and do not call Tank01 on every page load.

See [scoring coverage](docs/scoring-coverage.md) for fully supported, partial, and unavailable provider/scoring combinations.

## Technology stack

| Layer | Technology |
| --- | --- |
| Application | Next.js 15 App Router, React 19, TypeScript 5 |
| UI | Tailwind CSS 4, Lucide React, responsive server/client components |
| Server | Next.js Server Actions and route handlers |
| Database | PostgreSQL on Neon |
| Data access | Prisma ORM 6 with committed SQL migrations |
| Validation | Zod 3 |
| NFL data | NFLverse official data releases |
| Projections | Tank01 NFL API through RapidAPI |
| AI explanations | OpenAI SDK 5, optional and isolated from recommendation math |
| Testing | Vitest 3 |
| Tooling | npm, tsx, Prettier, Docker Compose (optional) |

## Architecture

- `src/app` contains App Router pages, layouts, API routes, and thin UI entry points.
- `src/features` contains domain-focused authentication, league settings, roster, provider, projection, identity, recommendation, waiver, report, and synchronization code.
- `src/features/recommendations` contains the deterministic optimizer and waiver algorithms.
- `prisma` contains the relational schema and additive migrations.
- `scripts` contains local provider synchronization and diagnostic commands.
- `docs` contains provider contracts, scoring coverage, and architecture decisions.

Provider data, fantasy roster membership, manual overrides, scoring results, and recommendation outputs remain separate database concepts. See [architecture](docs/architecture.md) and [provider contracts](docs/provider-contracts.md) for more detail.

## Run locally

Requirements:

- Node.js 20 or newer
- npm
- A PostgreSQL-compatible database, such as Neon
- Docker Desktop only if using the included local PostgreSQL container

Install the project:

```powershell
git clone https://github.com/makenna615/fantasy-football-app.git
Set-Location fantasy-football-app
Copy-Item .env.example .env.local
npm install
```

Configure at least `DATABASE_URL` and `DATABASE_URL_UNPOOLED` in `.env.local`. For the included Docker database instead:

```powershell
npm run db:up
```

Apply migrations and start the application:

```powershell
npm run db:migrate
npm run dev
```

Open the local URL printed by Next.js, normally `http://localhost:3000`. The health endpoint is `GET /api/health`.

## Environment variables

Copy `.env.example` to `.env.local`; never commit `.env.local`.

| Variable | Required | Purpose |
| --- | --- | --- |
| `DATABASE_URL` | Yes | Pooled application PostgreSQL connection |
| `DATABASE_URL_UNPOOLED` | Yes | Direct connection used for Prisma migrations |
| `NFLVERSE_ENABLED` | No | Enables automatic NFLverse synchronization |
| `RAPIDAPI_KEY` | No | Server-only RapidAPI credential for Tank01 |
| `TANK01_API_HOST` | With Tank01 | Exact Tank01 host supplied by RapidAPI |
| `PROJECTION_CACHE_MINUTES` | No | Projection refresh interval; defaults to 60 minutes |
| `CRON_SECRET` | For cron | Protects `/api/cron/sync` |
| `OPENAI_API_KEY` | No | Enables AI-written explanations |
| `OPENAI_MODEL` | No | OpenAI explanation model |
| `ADMIN_EMAILS` | No | Comma-separated administrator accounts |

Secrets must never use a `NEXT_PUBLIC_` prefix. Provider requests run only on the server.

## Data synchronization

Administrators can inspect data-source status, freshness, errors, identity matches, and unmatched records at `/admin/import`. Manual CSV imports remain available when an external provider is unavailable.

Useful commands:

```text
npm run data:sync              Synchronize stale provider datasets
npm run data:sync -- --force  Force all configured datasets to refresh
npm run data:status            Show stored provider and sync status
```

The protected `GET /api/cron/sync` route can be scheduled by the deployment platform with `Authorization: Bearer <CRON_SECRET>`. Provider failures preserve the last successful data.

## Testing and validation

```text
npm test             Run the full deterministic test suite
npm run test:watch  Run tests in watch mode
npm run build        Generate Prisma Client and create a production build
npm run db:studio    Open Prisma Studio
```

Coverage includes scoring, Tank01 normalization, canonical identity matching, projection priority, roster eligibility, FLEX/SUPERFLEX/IDP lineup behavior, optimizer inputs, waiver inputs, and provider failure cases. Tests do not require live API credentials.

## Current limitations

- Provider fields without enough detail are retained but not guessed—for example, field-goal makes without distance and aggregate touchdown types.
- Tank01 did not supply forward-looking IDP projections in the verified dataset.
- Some newly added or unsigned players may remain unmatched until a stable provider ID becomes available.
- Deployment scheduling, backups, and production monitoring must be configured on the selected hosting platform.

## Security

- `.env`, `.env.local`, Neon metadata, private keys, and deployment output are Git-ignored.
- RapidAPI, database, cron, and OpenAI credentials stay server-side.
- Authentication and team ownership checks are enforced in server actions.
- External payloads are validated before persistence.
- OpenAI receives structured recommendation facts, not secrets, and cannot alter deterministic outputs.
