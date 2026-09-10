ALTER TABLE "Player" ADD COLUMN "firstName" TEXT, ADD COLUMN "lastName" TEXT;

ALTER TABLE "PlayerProjection"
  ADD COLUMN "projectedStats" JSONB,
  ADD COLUMN "sourceUpdatedAt" TIMESTAMP(3),
  ADD COLUMN "fetchedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  ADD COLUMN "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  ADD COLUMN "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

ALTER TABLE "PlayerInjury"
  ADD COLUMN "team" TEXT,
  ADD COLUMN "bodyPart" TEXT,
  ADD COLUMN "practiceStatus" TEXT,
  ADD COLUMN "reportDate" TIMESTAMP(3),
  ADD COLUMN "sourceUpdatedAt" TIMESTAMP(3),
  ADD COLUMN "fetchedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

CREATE TABLE "NflRosterStatus" (
  "id" TEXT NOT NULL, "playerId" TEXT NOT NULL, "providerId" TEXT NOT NULL,
  "season" INTEGER NOT NULL, "week" INTEGER NOT NULL, "nflTeam" TEXT NOT NULL,
  "status" TEXT NOT NULL, "depthPosition" TEXT, "jerseyNumber" TEXT, "sourcePayload" JSONB,
  "fetchedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "NflRosterStatus_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "NflRosterStatus_playerId_providerId_season_week_key" ON "NflRosterStatus"("playerId","providerId","season","week");
CREATE INDEX "NflRosterStatus_season_week_nflTeam_idx" ON "NflRosterStatus"("season","week","nflTeam");
ALTER TABLE "NflRosterStatus" ADD CONSTRAINT "NflRosterStatus_playerId_fkey" FOREIGN KEY ("playerId") REFERENCES "Player"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "NflRosterStatus" ADD CONSTRAINT "NflRosterStatus_providerId_fkey" FOREIGN KEY ("providerId") REFERENCES "DataProvider"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE "PlayerWeeklyStat" (
  "id" TEXT NOT NULL, "playerId" TEXT NOT NULL, "providerId" TEXT NOT NULL,
  "season" INTEGER NOT NULL, "week" INTEGER NOT NULL, "nflTeam" TEXT, "opponent" TEXT,
  "stats" JSONB NOT NULL, "sourcePayload" JSONB, "fetchedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "PlayerWeeklyStat_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "PlayerWeeklyStat_playerId_providerId_season_week_key" ON "PlayerWeeklyStat"("playerId","providerId","season","week");
CREATE INDEX "PlayerWeeklyStat_season_week_idx" ON "PlayerWeeklyStat"("season","week");
ALTER TABLE "PlayerWeeklyStat" ADD CONSTRAINT "PlayerWeeklyStat_playerId_fkey" FOREIGN KEY ("playerId") REFERENCES "Player"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "PlayerWeeklyStat" ADD CONSTRAINT "PlayerWeeklyStat_providerId_fkey" FOREIGN KEY ("providerId") REFERENCES "DataProvider"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE "ProviderSyncRun" (
  "id" TEXT NOT NULL, "providerId" TEXT NOT NULL, "dataset" TEXT NOT NULL, "status" TEXT NOT NULL,
  "season" INTEGER, "week" INTEGER, "received" INTEGER NOT NULL DEFAULT 0, "imported" INTEGER NOT NULL DEFAULT 0,
  "updated" INTEGER NOT NULL DEFAULT 0, "skipped" INTEGER NOT NULL DEFAULT 0, "unmatched" INTEGER NOT NULL DEFAULT 0,
  "errors" INTEGER NOT NULL DEFAULT 0, "errorMessage" TEXT, "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "completedAt" TIMESTAMP(3), CONSTRAINT "ProviderSyncRun_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "ProviderSyncRun_providerId_dataset_startedAt_idx" ON "ProviderSyncRun"("providerId","dataset","startedAt");
ALTER TABLE "ProviderSyncRun" ADD CONSTRAINT "ProviderSyncRun_providerId_fkey" FOREIGN KEY ("providerId") REFERENCES "DataProvider"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE "UnmatchedProviderRecord" (
  "id" TEXT NOT NULL, "providerId" TEXT NOT NULL, "dataset" TEXT NOT NULL, "externalId" TEXT,
  "displayName" TEXT, "nflTeam" TEXT, "position" TEXT, "reason" TEXT NOT NULL, "payload" JSONB NOT NULL,
  "resolvedAt" TIMESTAMP(3), "playerId" TEXT, "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL, CONSTRAINT "UnmatchedProviderRecord_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "UnmatchedProviderRecord_providerId_dataset_resolvedAt_idx" ON "UnmatchedProviderRecord"("providerId","dataset","resolvedAt");
CREATE INDEX "UnmatchedProviderRecord_externalId_idx" ON "UnmatchedProviderRecord"("externalId");
ALTER TABLE "UnmatchedProviderRecord" ADD CONSTRAINT "UnmatchedProviderRecord_providerId_fkey" FOREIGN KEY ("providerId") REFERENCES "DataProvider"("id") ON DELETE CASCADE ON UPDATE CASCADE;
