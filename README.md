# Fourth Down

A full-stack fantasy football lineup optimizer and waiver advisor. Rankings are deterministic; OpenAI is used only to explain already-calculated results.

## Run locally

Requirements: Node.js 20+, npm, and PostgreSQL 15+. Docker is optional.

```powershell
Copy-Item .env.example .env
npm install
```

Set `DATABASE_URL` in `.env`. To run the included PostgreSQL container (after installing Docker Desktop):

```powershell
npm run db:up
npm run db:migrate
npm run dev
```

Without Docker, create a PostgreSQL database using your preferred provider and run the last two commands. Open `http://localhost:3000`, register, and create a team. `OPENAI_API_KEY` is optional; explanations use deterministic templates without it.

## User workflow

1. Register and create one or more teams.
2. Configure the complete ESPN League Manager scoring catalog and lineup slots, including WR/TE, FLEX, and SUPERFLEX.
3. Add roster players and assign their current slots.
4. Enter weekly fantasy projections directly or calculate them from projected stats using league scoring.
5. Generate the optimal lineup.
6. Add available players and rank waiver pickups/drop candidates.
7. Generate the weekly team report.

## Commands

```text
npm run dev          Development server
npm run build        Production build
npm test             Deterministic engine tests
npm run db:migrate   Apply committed migrations
npm run db:studio    Inspect data with Prisma Studio
```

The health endpoint is `GET /api/health`.

## Deploy to Vercel

1. Provision PostgreSQL and add `DATABASE_URL` to the Vercel project.
2. Optionally add `OPENAI_API_KEY` and `OPENAI_MODEL`.
3. Apply migrations to the production database with `npm run db:migrate`.
4. Deploy normally; `npm run build` generates Prisma Client before building Next.js.

See [docs/architecture.md](docs/architecture.md) for architecture, algorithm details, provider boundaries, and the expansion roadmap.
