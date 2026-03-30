-- CreateTable
CREATE TABLE "SprintSuggestion" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "briefId" TEXT,
    "ticketIds" TEXT NOT NULL,
    "scenarios" TEXT NOT NULL,
    "recommendation" TEXT,
    "aiModel" TEXT NOT NULL DEFAULT 'claude-sonnet-4-6',
    "aiPromptTokens" INTEGER,
    "aiOutputTokens" INTEGER,
    "createdBy" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "SprintSuggestion_briefId_fkey" FOREIGN KEY ("briefId") REFERENCES "Brief" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "SprintSuggestion_createdBy_fkey" FOREIGN KEY ("createdBy") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateIndex
CREATE INDEX "SprintSuggestion_briefId_idx" ON "SprintSuggestion"("briefId");

-- CreateIndex
CREATE INDEX "SprintSuggestion_createdBy_idx" ON "SprintSuggestion"("createdBy");
