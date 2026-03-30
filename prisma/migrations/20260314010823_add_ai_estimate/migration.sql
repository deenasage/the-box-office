-- CreateTable
CREATE TABLE "AIEstimate" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "ticketId" TEXT NOT NULL,
    "suggestedSize" TEXT NOT NULL,
    "confidence" REAL NOT NULL,
    "rationale" TEXT NOT NULL,
    "flags" TEXT,
    "similarTickets" TEXT,
    "aiModel" TEXT NOT NULL DEFAULT 'claude-sonnet-4-6',
    "aiPromptTokens" INTEGER,
    "aiOutputTokens" INTEGER,
    "accepted" BOOLEAN NOT NULL DEFAULT false,
    "acceptedBy" TEXT,
    "acceptedAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "AIEstimate_ticketId_fkey" FOREIGN KEY ("ticketId") REFERENCES "Ticket" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE INDEX "AIEstimate_ticketId_idx" ON "AIEstimate"("ticketId");
