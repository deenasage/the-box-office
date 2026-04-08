-- AlterTable
ALTER TABLE "Ticket" ADD COLUMN "type" TEXT;

-- CreateTable
CREATE TABLE "CustomField" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "fieldType" TEXT NOT NULL,
    "teamScope" TEXT,
    "required" BOOLEAN NOT NULL DEFAULT false,
    "order" INTEGER NOT NULL DEFAULT 0,
    "options" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "TicketCustomFieldValue" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "ticketId" TEXT NOT NULL,
    "fieldId" TEXT NOT NULL,
    "value" TEXT NOT NULL,
    CONSTRAINT "TicketCustomFieldValue_ticketId_fkey" FOREIGN KEY ("ticketId") REFERENCES "Ticket" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "TicketCustomFieldValue_fieldId_fkey" FOREIGN KEY ("fieldId") REFERENCES "CustomField" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_KanbanColumnConfig" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "team" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "wipLimit" INTEGER,
    "hidden" BOOLEAN NOT NULL DEFAULT false
);
INSERT INTO "new_KanbanColumnConfig" ("id", "status", "team", "wipLimit") SELECT "id", "status", "team", "wipLimit" FROM "KanbanColumnConfig";
DROP TABLE "KanbanColumnConfig";
ALTER TABLE "new_KanbanColumnConfig" RENAME TO "KanbanColumnConfig";
CREATE UNIQUE INDEX "KanbanColumnConfig_team_status_key" ON "KanbanColumnConfig"("team", "status");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

-- CreateIndex
CREATE INDEX "TicketCustomFieldValue_fieldId_idx" ON "TicketCustomFieldValue"("fieldId");

-- CreateIndex
CREATE UNIQUE INDEX "TicketCustomFieldValue_ticketId_fieldId_key" ON "TicketCustomFieldValue"("ticketId", "fieldId");
