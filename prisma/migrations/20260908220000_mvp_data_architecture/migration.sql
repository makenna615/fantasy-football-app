-- Evolve the prototype in place: every existing team becomes the first team in
-- its own league, and every roster row receives a canonical player identity.
CREATE TYPE "UserRole" AS ENUM ('USER', 'ADMIN');
CREATE TYPE "ProviderType" AS ENUM ('MANUAL', 'CSV', 'API');

ALTER TABLE "User" ADD COLUMN "role" "UserRole" NOT NULL DEFAULT 'USER';

CREATE TABLE "League" (
  "id" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "ownerId" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "League_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "League_ownerId_idx" ON "League"("ownerId");
ALTER TABLE "League" ADD CONSTRAINT "League_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "Team" ADD COLUMN "leagueId" TEXT;
INSERT INTO "League" ("id", "name", "ownerId", "createdAt", "updatedAt")
SELECT 'league_' || "id", "name" || ' League', "userId", "createdAt", "updatedAt" FROM "Team";
UPDATE "Team" SET "leagueId" = 'league_' || "id";
ALTER TABLE "Team" ALTER COLUMN "leagueId" SET NOT NULL;
CREATE INDEX "Team_leagueId_idx" ON "Team"("leagueId");
ALTER TABLE "Team" ADD CONSTRAINT "Team_leagueId_fkey" FOREIGN KEY ("leagueId") REFERENCES "League"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "LeagueSettings" ADD COLUMN "leagueId" TEXT;
UPDATE "LeagueSettings" s SET "leagueId" = t."leagueId" FROM "Team" t WHERE s."teamId" = t."id";
ALTER TABLE "LeagueSettings" ALTER COLUMN "leagueId" SET NOT NULL;
ALTER TABLE "LeagueSettings" DROP CONSTRAINT "LeagueSettings_teamId_fkey";
DROP INDEX "LeagueSettings_teamId_key";
ALTER TABLE "LeagueSettings" DROP COLUMN "teamId";
CREATE UNIQUE INDEX "LeagueSettings_leagueId_key" ON "LeagueSettings"("leagueId");
ALTER TABLE "LeagueSettings" ADD CONSTRAINT "LeagueSettings_leagueId_fkey" FOREIGN KEY ("leagueId") REFERENCES "League"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE "Player" (
  "id" TEXT NOT NULL,
  "fullName" TEXT NOT NULL,
  "nflTeam" TEXT NOT NULL,
  "position" "Position" NOT NULL,
  "active" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "Player_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "Player_fullName_idx" ON "Player"("fullName");
CREATE INDEX "Player_nflTeam_position_idx" ON "Player"("nflTeam", "position");

ALTER TABLE "RosterPlayer" ADD COLUMN "playerId" TEXT;
INSERT INTO "Player" ("id", "fullName", "nflTeam", "position", "createdAt", "updatedAt")
SELECT DISTINCT ON (lower("name"), "nflTeam", "position")
  'player_' || md5(lower("name") || '|' || "nflTeam" || '|' || "position"::text), "name", "nflTeam", "position", "createdAt", "updatedAt"
FROM "RosterPlayer" ORDER BY lower("name"), "nflTeam", "position", "createdAt";
UPDATE "RosterPlayer" SET "playerId" = 'player_' || md5(lower("name") || '|' || "nflTeam" || '|' || "position"::text);
ALTER TABLE "RosterPlayer" ALTER COLUMN "playerId" SET NOT NULL;
DROP INDEX "RosterPlayer_externalId_idx";
DROP INDEX "RosterPlayer_teamId_position_idx";
ALTER TABLE "RosterPlayer" DROP COLUMN "externalId", DROP COLUMN "name", DROP COLUMN "nflTeam", DROP COLUMN "position";
CREATE UNIQUE INDEX "RosterPlayer_teamId_playerId_key" ON "RosterPlayer"("teamId", "playerId");
CREATE INDEX "RosterPlayer_teamId_currentSlot_idx" ON "RosterPlayer"("teamId", "currentSlot");
CREATE INDEX "RosterPlayer_playerId_idx" ON "RosterPlayer"("playerId");
ALTER TABLE "RosterPlayer" ADD CONSTRAINT "RosterPlayer_playerId_fkey" FOREIGN KEY ("playerId") REFERENCES "Player"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

CREATE TABLE "DataProvider" (
  "id" TEXT NOT NULL,
  "key" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "type" "ProviderType" NOT NULL,
  "active" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "DataProvider_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "DataProvider_key_key" ON "DataProvider"("key");
INSERT INTO "DataProvider" ("id", "key", "name", "type", "updatedAt") VALUES
('provider_manual', 'manual', 'Manual entry', 'MANUAL', CURRENT_TIMESTAMP),
('provider_csv', 'admin-csv', 'Admin CSV import', 'CSV', CURRENT_TIMESTAMP);

CREATE TABLE "PlayerExternalId" (
  "id" TEXT NOT NULL, "playerId" TEXT NOT NULL, "providerId" TEXT NOT NULL, "externalId" TEXT NOT NULL,
  CONSTRAINT "PlayerExternalId_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "PlayerExternalId_providerId_externalId_key" ON "PlayerExternalId"("providerId", "externalId");
CREATE UNIQUE INDEX "PlayerExternalId_playerId_providerId_key" ON "PlayerExternalId"("playerId", "providerId");
ALTER TABLE "PlayerExternalId" ADD CONSTRAINT "PlayerExternalId_playerId_fkey" FOREIGN KEY ("playerId") REFERENCES "Player"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "PlayerExternalId" ADD CONSTRAINT "PlayerExternalId_providerId_fkey" FOREIGN KEY ("providerId") REFERENCES "DataProvider"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "WaiverCandidate" ADD COLUMN "playerId" TEXT;
CREATE INDEX "WaiverCandidate_playerId_idx" ON "WaiverCandidate"("playerId");
ALTER TABLE "WaiverCandidate" ADD CONSTRAINT "WaiverCandidate_playerId_fkey" FOREIGN KEY ("playerId") REFERENCES "Player"("id") ON DELETE SET NULL ON UPDATE CASCADE;

CREATE TABLE "PlayerProjection" (
  "id" TEXT NOT NULL, "playerId" TEXT NOT NULL, "providerId" TEXT NOT NULL, "leagueId" TEXT,
  "season" INTEGER NOT NULL, "week" INTEGER NOT NULL, "projectedPoints" DOUBLE PRECISION NOT NULL,
  "floorPoints" DOUBLE PRECISION, "ceilingPoints" DOUBLE PRECISION, "restOfSeason" DOUBLE PRECISION,
  "consistency" DOUBLE PRECISION NOT NULL DEFAULT 0.5, "matchupRating" DOUBLE PRECISION NOT NULL DEFAULT 0,
  "sourcePayload" JSONB, "importedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "PlayerProjection_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "PlayerProjection_playerId_providerId_leagueId_season_week_key" ON "PlayerProjection"("playerId", "providerId", "leagueId", "season", "week");
CREATE INDEX "PlayerProjection_season_week_providerId_idx" ON "PlayerProjection"("season", "week", "providerId");
ALTER TABLE "PlayerProjection" ADD CONSTRAINT "PlayerProjection_playerId_fkey" FOREIGN KEY ("playerId") REFERENCES "Player"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "PlayerProjection" ADD CONSTRAINT "PlayerProjection_providerId_fkey" FOREIGN KEY ("providerId") REFERENCES "DataProvider"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "PlayerProjection" ADD CONSTRAINT "PlayerProjection_leagueId_fkey" FOREIGN KEY ("leagueId") REFERENCES "League"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE "PlayerRanking" (
  "id" TEXT NOT NULL, "playerId" TEXT NOT NULL, "providerId" TEXT NOT NULL, "season" INTEGER NOT NULL,
  "week" INTEGER, "rank" INTEGER NOT NULL, "tier" INTEGER, "value" DOUBLE PRECISION,
  "importedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, CONSTRAINT "PlayerRanking_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "PlayerRanking_playerId_providerId_season_week_key" ON "PlayerRanking"("playerId", "providerId", "season", "week");
CREATE INDEX "PlayerRanking_season_week_rank_idx" ON "PlayerRanking"("season", "week", "rank");
ALTER TABLE "PlayerRanking" ADD CONSTRAINT "PlayerRanking_playerId_fkey" FOREIGN KEY ("playerId") REFERENCES "Player"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "PlayerRanking" ADD CONSTRAINT "PlayerRanking_providerId_fkey" FOREIGN KEY ("providerId") REFERENCES "DataProvider"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE "PlayerInjury" (
  "id" TEXT NOT NULL, "playerId" TEXT NOT NULL, "providerId" TEXT NOT NULL, "season" INTEGER NOT NULL,
  "week" INTEGER NOT NULL, "status" TEXT NOT NULL, "details" TEXT, "multiplier" DOUBLE PRECISION NOT NULL DEFAULT 1,
  "importedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, CONSTRAINT "PlayerInjury_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "PlayerInjury_playerId_providerId_season_week_key" ON "PlayerInjury"("playerId", "providerId", "season", "week");
CREATE INDEX "PlayerInjury_season_week_status_idx" ON "PlayerInjury"("season", "week", "status");
ALTER TABLE "PlayerInjury" ADD CONSTRAINT "PlayerInjury_playerId_fkey" FOREIGN KEY ("playerId") REFERENCES "Player"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "PlayerInjury" ADD CONSTRAINT "PlayerInjury_providerId_fkey" FOREIGN KEY ("providerId") REFERENCES "DataProvider"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE "PlayerMatchup" (
  "id" TEXT NOT NULL, "playerId" TEXT NOT NULL, "providerId" TEXT NOT NULL, "season" INTEGER NOT NULL,
  "week" INTEGER NOT NULL, "opponent" TEXT NOT NULL, "home" BOOLEAN NOT NULL, "matchupRating" DOUBLE PRECISION NOT NULL DEFAULT 0,
  "details" JSONB, "importedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, CONSTRAINT "PlayerMatchup_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "PlayerMatchup_playerId_providerId_season_week_key" ON "PlayerMatchup"("playerId", "providerId", "season", "week");
CREATE INDEX "PlayerMatchup_season_week_opponent_idx" ON "PlayerMatchup"("season", "week", "opponent");
ALTER TABLE "PlayerMatchup" ADD CONSTRAINT "PlayerMatchup_playerId_fkey" FOREIGN KEY ("playerId") REFERENCES "Player"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "PlayerMatchup" ADD CONSTRAINT "PlayerMatchup_providerId_fkey" FOREIGN KEY ("providerId") REFERENCES "DataProvider"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE "LeagueMatchup" (
  "id" TEXT NOT NULL, "leagueId" TEXT NOT NULL, "teamId" TEXT NOT NULL, "opponentTeamId" TEXT,
  "opponentName" TEXT, "season" INTEGER NOT NULL, "week" INTEGER NOT NULL,
  "teamProjectedPoints" DOUBLE PRECISION, "opponentProjectedPoints" DOUBLE PRECISION,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "LeagueMatchup_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "LeagueMatchup_leagueId_teamId_season_week_key" ON "LeagueMatchup"("leagueId", "teamId", "season", "week");
CREATE INDEX "LeagueMatchup_season_week_idx" ON "LeagueMatchup"("season", "week");
ALTER TABLE "LeagueMatchup" ADD CONSTRAINT "LeagueMatchup_leagueId_fkey" FOREIGN KEY ("leagueId") REFERENCES "League"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "LeagueMatchup" ADD CONSTRAINT "LeagueMatchup_teamId_fkey" FOREIGN KEY ("teamId") REFERENCES "Team"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "LeagueMatchup" ADD CONSTRAINT "LeagueMatchup_opponentTeamId_fkey" FOREIGN KEY ("opponentTeamId") REFERENCES "Team"("id") ON DELETE SET NULL ON UPDATE CASCADE;
