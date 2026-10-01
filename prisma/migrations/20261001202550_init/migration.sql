-- CreateEnum
CREATE TYPE "TournamentStatus" AS ENUM ('ACTIVE', 'COMPLETED');

-- CreateEnum
CREATE TYPE "RoundStatus" AS ENUM ('PENDING', 'VALIDATED');

-- CreateEnum
CREATE TYPE "ScoringMode" AS ENUM ('VOLLEYBALL', 'WIN_ONLY', 'SETS_WON');

-- CreateTable
CREATE TABLE "AdminUser" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AdminUser_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Player" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Player_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Tournament" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "startDate" TIMESTAMP(3) NOT NULL,
    "status" "TournamentStatus" NOT NULL DEFAULT 'ACTIVE',
    "scoringMode" "ScoringMode" NOT NULL DEFAULT 'VOLLEYBALL',
    "currentRoundNumber" INTEGER NOT NULL DEFAULT 1,
    "totalRounds" INTEGER NOT NULL DEFAULT 11,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Tournament_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TournamentPlayer" (
    "id" TEXT NOT NULL,
    "tournamentId" TEXT NOT NULL,
    "playerId" TEXT NOT NULL,
    "number" INTEGER NOT NULL,

    CONSTRAINT "TournamentPlayer_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Round" (
    "id" TEXT NOT NULL,
    "tournamentId" TEXT NOT NULL,
    "roundNumber" INTEGER NOT NULL,
    "weekStartAt" TIMESTAMP(3) NOT NULL,
    "status" "RoundStatus" NOT NULL DEFAULT 'PENDING',
    "restingNumbers" INTEGER[],

    CONSTRAINT "Round_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Match" (
    "id" TEXT NOT NULL,
    "roundId" TEXT NOT NULL,
    "team1Numbers" INTEGER[],
    "team2Numbers" INTEGER[],
    "winnerTeam" INTEGER,

    CONSTRAINT "Match_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MatchSet" (
    "id" TEXT NOT NULL,
    "matchId" TEXT NOT NULL,
    "setNumber" INTEGER NOT NULL,
    "team1Games" INTEGER NOT NULL,
    "team2Games" INTEGER NOT NULL,

    CONSTRAINT "MatchSet_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "AdminUser_email_key" ON "AdminUser"("email");

-- CreateIndex
CREATE UNIQUE INDEX "TournamentPlayer_tournamentId_number_key" ON "TournamentPlayer"("tournamentId", "number");

-- CreateIndex
CREATE UNIQUE INDEX "TournamentPlayer_tournamentId_playerId_key" ON "TournamentPlayer"("tournamentId", "playerId");

-- CreateIndex
CREATE UNIQUE INDEX "Round_tournamentId_roundNumber_key" ON "Round"("tournamentId", "roundNumber");

-- CreateIndex
CREATE UNIQUE INDEX "Match_roundId_key" ON "Match"("roundId");

-- CreateIndex
CREATE UNIQUE INDEX "MatchSet_matchId_setNumber_key" ON "MatchSet"("matchId", "setNumber");

-- AddForeignKey
ALTER TABLE "TournamentPlayer" ADD CONSTRAINT "TournamentPlayer_tournamentId_fkey" FOREIGN KEY ("tournamentId") REFERENCES "Tournament"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TournamentPlayer" ADD CONSTRAINT "TournamentPlayer_playerId_fkey" FOREIGN KEY ("playerId") REFERENCES "Player"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Round" ADD CONSTRAINT "Round_tournamentId_fkey" FOREIGN KEY ("tournamentId") REFERENCES "Tournament"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Match" ADD CONSTRAINT "Match_roundId_fkey" FOREIGN KEY ("roundId") REFERENCES "Round"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MatchSet" ADD CONSTRAINT "MatchSet_matchId_fkey" FOREIGN KEY ("matchId") REFERENCES "Match"("id") ON DELETE CASCADE ON UPDATE CASCADE;
