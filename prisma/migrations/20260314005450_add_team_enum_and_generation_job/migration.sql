-- CreateTable
CREATE TABLE "TicketGenerationJob" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "briefId" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "teamResults" TEXT,
    "aiModel" TEXT NOT NULL DEFAULT 'claude-sonnet-4-6',
    "aiPromptTokens" INTEGER,
    "aiOutputTokens" INTEGER,
    "errorMessage" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "TicketGenerationJob_briefId_fkey" FOREIGN KEY ("briefId") REFERENCES "Brief" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateIndex
CREATE INDEX "TicketGenerationJob_briefId_idx" ON "TicketGenerationJob"("briefId");
