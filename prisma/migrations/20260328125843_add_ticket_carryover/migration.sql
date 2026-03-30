-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Ticket" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "team" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'BACKLOG',
    "size" TEXT,
    "dueDate" DATETIME,
    "priority" INTEGER NOT NULL DEFAULT 0,
    "isPriority" BOOLEAN NOT NULL DEFAULT false,
    "formData" TEXT NOT NULL,
    "templateId" TEXT,
    "assigneeId" TEXT,
    "creatorId" TEXT NOT NULL,
    "sprintId" TEXT,
    "epicId" TEXT,
    "briefId" TEXT,
    "requiredSkillsetId" TEXT,
    "acceptanceCriteria" TEXT,
    "isCarryover" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Ticket_templateId_fkey" FOREIGN KEY ("templateId") REFERENCES "FormTemplate" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "Ticket_assigneeId_fkey" FOREIGN KEY ("assigneeId") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "Ticket_creatorId_fkey" FOREIGN KEY ("creatorId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Ticket_sprintId_fkey" FOREIGN KEY ("sprintId") REFERENCES "Sprint" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "Ticket_epicId_fkey" FOREIGN KEY ("epicId") REFERENCES "Epic" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "Ticket_briefId_fkey" FOREIGN KEY ("briefId") REFERENCES "Brief" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "Ticket_requiredSkillsetId_fkey" FOREIGN KEY ("requiredSkillsetId") REFERENCES "Skillset" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_Ticket" ("acceptanceCriteria", "assigneeId", "briefId", "createdAt", "creatorId", "description", "dueDate", "epicId", "formData", "id", "isPriority", "priority", "requiredSkillsetId", "size", "sprintId", "status", "team", "templateId", "title", "updatedAt") SELECT "acceptanceCriteria", "assigneeId", "briefId", "createdAt", "creatorId", "description", "dueDate", "epicId", "formData", "id", "isPriority", "priority", "requiredSkillsetId", "size", "sprintId", "status", "team", "templateId", "title", "updatedAt" FROM "Ticket";
DROP TABLE "Ticket";
ALTER TABLE "new_Ticket" RENAME TO "Ticket";
CREATE INDEX "Ticket_status_idx" ON "Ticket"("status");
CREATE INDEX "Ticket_team_idx" ON "Ticket"("team");
CREATE INDEX "Ticket_sprintId_idx" ON "Ticket"("sprintId");
CREATE INDEX "Ticket_epicId_idx" ON "Ticket"("epicId");
CREATE INDEX "Ticket_assigneeId_idx" ON "Ticket"("assigneeId");
CREATE INDEX "Ticket_createdAt_idx" ON "Ticket"("createdAt");
CREATE INDEX "Ticket_requiredSkillsetId_idx" ON "Ticket"("requiredSkillsetId");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
