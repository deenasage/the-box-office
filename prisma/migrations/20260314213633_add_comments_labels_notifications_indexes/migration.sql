-- AlterTable
ALTER TABLE "Sprint" ADD COLUMN "retrospectiveNotes" TEXT;

-- AlterTable
ALTER TABLE "Ticket" ADD COLUMN "dueDate" DATETIME;

-- CreateTable
CREATE TABLE "Comment" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "ticketId" TEXT NOT NULL,
    "authorId" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Comment_ticketId_fkey" FOREIGN KEY ("ticketId") REFERENCES "Ticket" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Comment_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Label" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "color" TEXT NOT NULL DEFAULT '#6b7280'
);

-- CreateTable
CREATE TABLE "Notification" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "link" TEXT,
    "read" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Notification_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "KanbanColumnConfig" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "team" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "wipLimit" INTEGER
);

-- CreateTable
CREATE TABLE "_TicketLabels" (
    "A" TEXT NOT NULL,
    "B" TEXT NOT NULL,
    CONSTRAINT "_TicketLabels_A_fkey" FOREIGN KEY ("A") REFERENCES "Label" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "_TicketLabels_B_fkey" FOREIGN KEY ("B") REFERENCES "Ticket" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "Label_name_key" ON "Label"("name");

-- CreateIndex
CREATE INDEX "Notification_userId_read_idx" ON "Notification"("userId", "read");

-- CreateIndex
CREATE UNIQUE INDEX "KanbanColumnConfig_team_status_key" ON "KanbanColumnConfig"("team", "status");

-- CreateIndex
CREATE UNIQUE INDEX "_TicketLabels_AB_unique" ON "_TicketLabels"("A", "B");

-- CreateIndex
CREATE INDEX "_TicketLabels_B_index" ON "_TicketLabels"("B");

-- CreateIndex
CREATE INDEX "Epic_status_idx" ON "Epic"("status");

-- CreateIndex
CREATE INDEX "RoutingRule_isActive_priority_idx" ON "RoutingRule"("isActive", "priority");

-- CreateIndex
CREATE INDEX "Ticket_status_idx" ON "Ticket"("status");

-- CreateIndex
CREATE INDEX "Ticket_team_idx" ON "Ticket"("team");

-- CreateIndex
CREATE INDEX "Ticket_sprintId_idx" ON "Ticket"("sprintId");

-- CreateIndex
CREATE INDEX "Ticket_epicId_idx" ON "Ticket"("epicId");

-- CreateIndex
CREATE INDEX "Ticket_assigneeId_idx" ON "Ticket"("assigneeId");

-- CreateIndex
CREATE INDEX "Ticket_createdAt_idx" ON "Ticket"("createdAt");

-- CreateIndex
CREATE INDEX "TicketStatusHistory_ticketId_changedAt_idx" ON "TicketStatusHistory"("ticketId", "changedAt");
