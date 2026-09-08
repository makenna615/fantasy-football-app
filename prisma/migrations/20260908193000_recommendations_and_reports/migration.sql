ALTER TABLE "RosterPlayer" ADD COLUMN "injuryStatus" TEXT NOT NULL DEFAULT 'HEALTHY';

CREATE TABLE "WaiverCandidate" (
  "id" TEXT NOT NULL,
  "teamId" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "nflTeam" TEXT NOT NULL,
  "position" "Position" NOT NULL,
  "projectedPoints" DOUBLE PRECISION NOT NULL,
  "floorPoints" DOUBLE PRECISION,
  "ceilingPoints" DOUBLE PRECISION,
  "consistency" DOUBLE PRECISION NOT NULL DEFAULT 0.5,
  "matchupRating" DOUBLE PRECISION NOT NULL DEFAULT 0,
  "injuryMultiplier" DOUBLE PRECISION NOT NULL DEFAULT 1,
  "restOfSeasonPoints" DOUBLE PRECISION,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "WaiverCandidate_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "WeeklyTeamReport" (
  "id" TEXT NOT NULL,
  "teamId" TEXT NOT NULL,
  "season" INTEGER NOT NULL,
  "week" INTEGER NOT NULL,
  "grade" TEXT NOT NULL,
  "strongestPosition" "Position" NOT NULL,
  "weakestPosition" "Position" NOT NULL,
  "riskiestStarter" TEXT,
  "bestBenchOption" TEXT,
  "summary" TEXT NOT NULL,
  "algorithmVersion" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "WeeklyTeamReport_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "WaiverCandidate_teamId_position_idx" ON "WaiverCandidate"("teamId", "position");
CREATE UNIQUE INDEX "WeeklyTeamReport_teamId_season_week_key" ON "WeeklyTeamReport"("teamId", "season", "week");
CREATE INDEX "WeeklyTeamReport_teamId_season_week_idx" ON "WeeklyTeamReport"("teamId", "season", "week");
ALTER TABLE "WaiverCandidate" ADD CONSTRAINT "WaiverCandidate_teamId_fkey" FOREIGN KEY ("teamId") REFERENCES "Team"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "WeeklyTeamReport" ADD CONSTRAINT "WeeklyTeamReport_teamId_fkey" FOREIGN KEY ("teamId") REFERENCES "Team"("id") ON DELETE CASCADE ON UPDATE CASCADE;
