-- CreateEnum
CREATE TYPE "CompetitionStatus" AS ENUM ('DRAFT', 'REGISTRATION_OPEN', 'REGISTRATION_CLOSED', 'IN_PROGRESS', 'COMPLETED');

-- CreateEnum
CREATE TYPE "ParticipantStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED', 'WITHDRAWN');

-- CreateEnum
CREATE TYPE "WithdrawalStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED');

-- AlterTable
ALTER TABLE "Competition" ADD COLUMN     "maxParticipants" INTEGER,
ADD COLUMN     "registrationCloseAt" TIMESTAMP(3),
ADD COLUMN     "registrationOpenAt" TIMESTAMP(3),
ADD COLUMN     "requiresApproval" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "status" "CompetitionStatus" NOT NULL DEFAULT 'DRAFT';

-- AlterTable
ALTER TABLE "CompetitionParticipant" ADD COLUMN     "status" "ParticipantStatus" NOT NULL DEFAULT 'APPROVED';

-- AlterTable
ALTER TABLE "Player" ADD COLUMN     "clubLogoUrl" TEXT,
ADD COLUMN     "clubName" TEXT,
ADD COLUMN     "nationality" TEXT;

-- CreateTable
CREATE TABLE "PlayerCredential" (
    "id" TEXT NOT NULL,
    "playerId" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "mustChangePassword" BOOLEAN NOT NULL DEFAULT true,
    "lastLoginAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PlayerCredential_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Withdrawal" (
    "id" TEXT NOT NULL,
    "playerId" TEXT NOT NULL,
    "amount" INTEGER NOT NULL,
    "status" "WithdrawalStatus" NOT NULL DEFAULT 'PENDING',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Withdrawal_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "PlayerCredential_playerId_key" ON "PlayerCredential"("playerId");

-- AddForeignKey
ALTER TABLE "PlayerCredential" ADD CONSTRAINT "PlayerCredential_playerId_fkey" FOREIGN KEY ("playerId") REFERENCES "Player"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Withdrawal" ADD CONSTRAINT "Withdrawal_playerId_fkey" FOREIGN KEY ("playerId") REFERENCES "Player"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
