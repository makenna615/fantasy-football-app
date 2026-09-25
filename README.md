# Fourth Down

__This is currently a personal project, not a ready-to-use application__
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

## Current limitations

- Not yet deployed on Vercel app
- Provider fields without enough detail are retained but not guessed—for example, field-goal makes without distance and aggregate touchdown types.
- Tank01 did not supply forward-looking IDP projections in the verified dataset.
- Some newly added or unsigned players may remain unmatched until a stable provider ID becomes available.
- Deployment scheduling, backups, and production monitoring must be configured on the selected hosting platform.