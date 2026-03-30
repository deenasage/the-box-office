-- CreateTable
CREATE TABLE "DeletionLog" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "entityType" TEXT NOT NULL,
    "entityId" TEXT NOT NULL,
    "entityTitle" TEXT NOT NULL,
    "deletedById" TEXT NOT NULL,
    "payload" TEXT NOT NULL,
    "ticketCount" INTEGER NOT NULL DEFAULT 0,
    "restoredAt" DATETIME,
    "restoredById" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "DeletionLog_deletedById_fkey" FOREIGN KEY ("deletedById") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "DeletionLog_restoredById_fkey" FOREIGN KEY ("restoredById") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateIndex
CREATE INDEX "DeletionLog_entityType_idx" ON "DeletionLog"("entityType");

-- CreateIndex
CREATE INDEX "DeletionLog_createdAt_idx" ON "DeletionLog"("createdAt");
