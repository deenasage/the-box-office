-- AlterTable
ALTER TABLE "TeamCapacity" ADD COLUMN "daysOff" INTEGER DEFAULT 0;

-- AlterTable
ALTER TABLE "User" ADD COLUMN "defaultHoursPerDay" REAL;
ALTER TABLE "User" ADD COLUMN "defaultWorkdaysPerWeek" INTEGER;
