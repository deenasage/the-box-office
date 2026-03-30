-- CreateTable
CREATE TABLE "TicketDependency" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "fromTicketId" TEXT NOT NULL,
    "toTicketId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "detectedBy" TEXT NOT NULL DEFAULT 'MANUAL',
    "aiConfidence" REAL,
    "aiRationale" TEXT,
    "createdBy" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "TicketDependency_fromTicketId_fkey" FOREIGN KEY ("fromTicketId") REFERENCES "Ticket" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "TicketDependency_toTicketId_fkey" FOREIGN KEY ("toTicketId") REFERENCES "Ticket" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "TicketDependency_createdBy_fkey" FOREIGN KEY ("createdBy") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateIndex
CREATE INDEX "TicketDependency_fromTicketId_idx" ON "TicketDependency"("fromTicketId");

-- CreateIndex
CREATE INDEX "TicketDependency_toTicketId_idx" ON "TicketDependency"("toTicketId");

-- CreateIndex
CREATE UNIQUE INDEX "TicketDependency_fromTicketId_toTicketId_type_key" ON "TicketDependency"("fromTicketId", "toTicketId", "type");
