-- AlterTable
ALTER TABLE "BriefShareToken" ADD COLUMN "expiresAt" DATETIME;

-- AlterTable
ALTER TABLE "Sprint" ADD COLUMN "retroActionItems" TEXT;
