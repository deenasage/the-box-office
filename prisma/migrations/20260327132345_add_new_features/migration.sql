-- AlterTable
ALTER TABLE "Sprint" ADD COLUMN "goal" TEXT;

-- AlterTable
ALTER TABLE "User" ADD COLUMN "ssoId" TEXT;
ALTER TABLE "User" ADD COLUMN "ssoProvider" TEXT;

-- CreateTable
CREATE TABLE "RoadmapItem" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "tier" TEXT,
    "category" TEXT,
    "initiative" TEXT,
    "region" TEXT,
    "title" TEXT NOT NULL,
    "titleManuallyEdited" BOOLEAN NOT NULL DEFAULT false,
    "ownerId" TEXT,
    "status" TEXT NOT NULL DEFAULT 'NOT_STARTED',
    "period" TEXT NOT NULL,
    "startDate" DATETIME,
    "endDate" DATETIME,
    "notes" TEXT,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "epicId" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "RoadmapItem_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "RoadmapItem_epicId_fkey" FOREIGN KEY ("epicId") REFERENCES "Epic" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "BriefShareToken" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "briefId" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "label" TEXT,
    "revoked" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "BriefShareToken_briefId_fkey" FOREIGN KEY ("briefId") REFERENCES "Brief" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "BriefComment" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "briefId" TEXT NOT NULL,
    "shareTokenId" TEXT NOT NULL,
    "authorName" TEXT NOT NULL,
    "authorEmail" TEXT,
    "body" TEXT NOT NULL,
    "resolved" BOOLEAN NOT NULL DEFAULT false,
    "resolvedAt" DATETIME,
    "resolvedById" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "BriefComment_briefId_fkey" FOREIGN KEY ("briefId") REFERENCES "Brief" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "BriefComment_shareTokenId_fkey" FOREIGN KEY ("shareTokenId") REFERENCES "BriefShareToken" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "BriefComment_resolvedById_fkey" FOREIGN KEY ("resolvedById") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "TicketAttachment" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "ticketId" TEXT NOT NULL,
    "uploadedById" TEXT NOT NULL,
    "fileName" TEXT NOT NULL,
    "mimeType" TEXT NOT NULL,
    "sizeBytes" INTEGER NOT NULL,
    "storedPath" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "TicketAttachment_ticketId_fkey" FOREIGN KEY ("ticketId") REFERENCES "Ticket" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "TicketAttachment_uploadedById_fkey" FOREIGN KEY ("uploadedById") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "GanttItem" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "epicId" TEXT NOT NULL,
    "ticketId" TEXT,
    "title" TEXT NOT NULL,
    "team" TEXT,
    "color" TEXT,
    "startDate" DATETIME NOT NULL,
    "endDate" DATETIME NOT NULL,
    "order" INTEGER NOT NULL DEFAULT 0,
    "aiGenerated" BOOLEAN NOT NULL DEFAULT false,
    "slippedFromSprintId" TEXT,
    "slippedAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "GanttItem_epicId_fkey" FOREIGN KEY ("epicId") REFERENCES "Epic" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "GanttItem_ticketId_fkey" FOREIGN KEY ("ticketId") REFERENCES "Ticket" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "GanttItem_slippedFromSprintId_fkey" FOREIGN KEY ("slippedFromSprintId") REFERENCES "Sprint" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "SprintCarryoverSuggestion" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "ticketId" TEXT NOT NULL,
    "fromSprintId" TEXT NOT NULL,
    "toSprintId" TEXT,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "resolvedByUserId" TEXT,
    "resolvedAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "SprintCarryoverSuggestion_ticketId_fkey" FOREIGN KEY ("ticketId") REFERENCES "Ticket" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "SprintCarryoverSuggestion_fromSprintId_fkey" FOREIGN KEY ("fromSprintId") REFERENCES "Sprint" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "SprintCarryoverSuggestion_toSprintId_fkey" FOREIGN KEY ("toSprintId") REFERENCES "Sprint" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "SprintCarryoverSuggestion_resolvedByUserId_fkey" FOREIGN KEY ("resolvedByUserId") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "RoadmapItem_epicId_key" ON "RoadmapItem"("epicId");

-- CreateIndex
CREATE INDEX "RoadmapItem_period_idx" ON "RoadmapItem"("period");

-- CreateIndex
CREATE INDEX "RoadmapItem_ownerId_idx" ON "RoadmapItem"("ownerId");

-- CreateIndex
CREATE INDEX "RoadmapItem_status_idx" ON "RoadmapItem"("status");

-- CreateIndex
CREATE INDEX "RoadmapItem_epicId_idx" ON "RoadmapItem"("epicId");

-- CreateIndex
CREATE UNIQUE INDEX "BriefShareToken_token_key" ON "BriefShareToken"("token");

-- CreateIndex
CREATE INDEX "BriefShareToken_token_idx" ON "BriefShareToken"("token");

-- CreateIndex
CREATE INDEX "BriefShareToken_briefId_idx" ON "BriefShareToken"("briefId");

-- CreateIndex
CREATE INDEX "BriefComment_briefId_idx" ON "BriefComment"("briefId");

-- CreateIndex
CREATE INDEX "BriefComment_shareTokenId_idx" ON "BriefComment"("shareTokenId");

-- CreateIndex
CREATE INDEX "TicketAttachment_ticketId_idx" ON "TicketAttachment"("ticketId");

-- CreateIndex
CREATE UNIQUE INDEX "GanttItem_ticketId_key" ON "GanttItem"("ticketId");

-- CreateIndex
CREATE INDEX "GanttItem_epicId_idx" ON "GanttItem"("epicId");

-- CreateIndex
CREATE INDEX "SprintCarryoverSuggestion_fromSprintId_idx" ON "SprintCarryoverSuggestion"("fromSprintId");

-- CreateIndex
CREATE INDEX "SprintCarryoverSuggestion_ticketId_idx" ON "SprintCarryoverSuggestion"("ticketId");

-- CreateIndex
CREATE INDEX "SprintCarryoverSuggestion_status_idx" ON "SprintCarryoverSuggestion"("status");
