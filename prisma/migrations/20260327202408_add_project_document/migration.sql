-- CreateTable
CREATE TABLE "ProjectDocument" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "epicId" TEXT NOT NULL,
    "overview" TEXT,
    "deliveryPlan" TEXT,
    "deliveryTimeline" TEXT,
    "raci" TEXT,
    "raid" TEXT,
    "gapsTracker" TEXT,
    "hypercare" TEXT,
    "riskRegister" TEXT,
    "issueLog" TEXT,
    "goLiveComms" TEXT,
    "aiPrefilled" BOOLEAN NOT NULL DEFAULT false,
    "aiPrefilledAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "ProjectDocument_epicId_fkey" FOREIGN KEY ("epicId") REFERENCES "Epic" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "ProjectDocument_epicId_key" ON "ProjectDocument"("epicId");

-- CreateIndex
CREATE INDEX "ProjectDocument_epicId_idx" ON "ProjectDocument"("epicId");
