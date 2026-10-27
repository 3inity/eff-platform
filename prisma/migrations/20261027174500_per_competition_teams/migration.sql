-- AlterTable
ALTER TABLE "Player" DROP COLUMN IF EXISTS "clubLogoUrl";
ALTER TABLE "Player" DROP COLUMN IF EXISTS "clubName";

-- AlterTable
ALTER TABLE "Competition" ADD COLUMN IF NOT EXISTS "description" TEXT;
ALTER TABLE "Competition" ADD COLUMN IF NOT EXISTS "additionalInfo" JSONB;
ALTER TABLE "Competition" ADD COLUMN IF NOT EXISTS "matchdayDurationHours" INTEGER NOT NULL DEFAULT 24;
ALTER TABLE "Competition" ADD COLUMN IF NOT EXISTS "matchdayEndsAt" TIMESTAMP(3);

-- CreateTable
CREATE TABLE IF NOT EXISTS "Team" (
    "id" TEXT NOT NULL,
    "competitionId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "logoUrl" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Team_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "Team_competitionId_name_key" ON "Team"("competitionId", "name");

-- AddForeignKey
ALTER TABLE "Team" DROP CONSTRAINT IF EXISTS "Team_competitionId_fkey";
ALTER TABLE "Team" ADD CONSTRAINT "Team_competitionId_fkey" FOREIGN KEY ("competitionId") REFERENCES "Competition"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AlterTable
ALTER TABLE "CompetitionParticipant" ADD COLUMN IF NOT EXISTS "teamId" TEXT;
ALTER TABLE "CompetitionParticipant" ADD COLUMN IF NOT EXISTS "teamName" TEXT;
ALTER TABLE "CompetitionParticipant" ADD COLUMN IF NOT EXISTS "teamLogoUrl" TEXT;

-- AddForeignKey
ALTER TABLE "CompetitionParticipant" DROP CONSTRAINT IF EXISTS "CompetitionParticipant_teamId_fkey";
ALTER TABLE "CompetitionParticipant" ADD CONSTRAINT "CompetitionParticipant_teamId_fkey" FOREIGN KEY ("teamId") REFERENCES "Team"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CompetitionParticipant" DROP CONSTRAINT IF EXISTS "CompetitionParticipant_playerId_fkey";
ALTER TABLE "CompetitionParticipant" ADD CONSTRAINT "CompetitionParticipant_playerId_fkey" FOREIGN KEY ("playerId") REFERENCES "Player"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CompetitionParticipant" DROP CONSTRAINT IF EXISTS "CompetitionParticipant_competitionId_fkey";
ALTER TABLE "CompetitionParticipant" ADD CONSTRAINT "CompetitionParticipant_competitionId_fkey" FOREIGN KEY ("competitionId") REFERENCES "Competition"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Bet" DROP CONSTRAINT IF EXISTS "Bet_playerId_fkey";
ALTER TABLE "Bet" ADD CONSTRAINT "Bet_playerId_fkey" FOREIGN KEY ("playerId") REFERENCES "Player"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Withdrawal" DROP CONSTRAINT IF EXISTS "Withdrawal_playerId_fkey";
ALTER TABLE "Withdrawal" ADD CONSTRAINT "Withdrawal_playerId_fkey" FOREIGN KEY ("playerId") REFERENCES "Player"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AlterTable
ALTER TABLE "AuditLog" ALTER COLUMN "adminId" DROP NOT NULL;
ALTER TABLE "AuditLog" DROP CONSTRAINT IF EXISTS "AuditLog_adminId_fkey";
ALTER TABLE "AuditLog" ADD CONSTRAINT "AuditLog_adminId_fkey" FOREIGN KEY ("adminId") REFERENCES "Admin"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Admin" DROP CONSTRAINT IF EXISTS "Admin_playerId_fkey";
ALTER TABLE "Admin" ADD CONSTRAINT "Admin_playerId_fkey" FOREIGN KEY ("playerId") REFERENCES "Player"("id") ON DELETE CASCADE ON UPDATE CASCADE;
