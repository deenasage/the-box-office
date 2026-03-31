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

-- CreateTable
CREATE TABLE "CopilotSession" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "CopilotSession_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "CopilotMessage" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "sessionId" TEXT NOT NULL,
    "role" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "contextSnapshot" TEXT,
    "aiModel" TEXT,
    "aiPromptTokens" INTEGER,
    "aiOutputTokens" INTEGER,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "CopilotMessage_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "CopilotSession" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Milestone" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "date" DATETIME NOT NULL,
    "description" TEXT,
    "color" TEXT NOT NULL DEFAULT '#6366f1',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

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

-- CreateTable
CREATE TABLE "TimeLog" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "ticketId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "hours" REAL NOT NULL,
    "note" TEXT,
    "loggedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "TimeLog_ticketId_fkey" FOREIGN KEY ("ticketId") REFERENCES "Ticket" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "TimeLog_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Skillset" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "team" TEXT,
    "color" TEXT NOT NULL DEFAULT '#7c3aed',
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "UserSkillset" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "skillsetId" TEXT NOT NULL,
    "assignedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "UserSkillset_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "UserSkillset_skillsetId_fkey" FOREIGN KEY ("skillsetId") REFERENCES "Skillset" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

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
    "expiresAt" DATETIME,
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

-- CreateTable
CREATE TABLE "ListValue" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "listKey" TEXT NOT NULL,
    "value" TEXT NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "FormField_templateId_fieldKey_key" ON "FormField"("templateId", "fieldKey");

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
CREATE INDEX "Ticket_requiredSkillsetId_idx" ON "Ticket"("requiredSkillsetId");

-- CreateIndex
CREATE UNIQUE INDEX "TeamCapacity_sprintId_userId_key" ON "TeamCapacity"("sprintId", "userId");

-- CreateIndex
CREATE INDEX "Epic_status_idx" ON "Epic"("status");

-- CreateIndex
CREATE INDEX "RoutingRule_isActive_priority_idx" ON "RoutingRule"("isActive", "priority");

-- CreateIndex
CREATE INDEX "TicketStatusHistory_ticketId_idx" ON "TicketStatusHistory"("ticketId");

-- CreateIndex
CREATE INDEX "TicketStatusHistory_changedAt_idx" ON "TicketStatusHistory"("changedAt");

-- CreateIndex
CREATE INDEX "TicketStatusHistory_ticketId_changedAt_idx" ON "TicketStatusHistory"("ticketId", "changedAt");

-- CreateIndex
CREATE UNIQUE INDEX "Label_name_key" ON "Label"("name");

-- CreateIndex
CREATE INDEX "TicketLabel_labelId_idx" ON "TicketLabel"("labelId");

-- CreateIndex
CREATE INDEX "Notification_userId_read_idx" ON "Notification"("userId", "read");

-- CreateIndex
CREATE UNIQUE INDEX "KanbanColumnConfig_team_status_key" ON "KanbanColumnConfig"("team", "status");

-- CreateIndex
CREATE INDEX "Brief_creatorId_idx" ON "Brief"("creatorId");

-- CreateIndex
CREATE INDEX "Brief_status_idx" ON "Brief"("status");

-- CreateIndex
CREATE INDEX "TicketGenerationJob_briefId_idx" ON "TicketGenerationJob"("briefId");

-- CreateIndex
CREATE INDEX "SprintSuggestion_briefId_idx" ON "SprintSuggestion"("briefId");

-- CreateIndex
CREATE INDEX "SprintSuggestion_createdBy_idx" ON "SprintSuggestion"("createdBy");

-- CreateIndex
CREATE INDEX "TicketDependency_fromTicketId_idx" ON "TicketDependency"("fromTicketId");

-- CreateIndex
CREATE INDEX "TicketDependency_toTicketId_idx" ON "TicketDependency"("toTicketId");

-- CreateIndex
CREATE UNIQUE INDEX "TicketDependency_fromTicketId_toTicketId_type_key" ON "TicketDependency"("fromTicketId", "toTicketId", "type");

-- CreateIndex
CREATE INDEX "CopilotSession_userId_idx" ON "CopilotSession"("userId");

-- CreateIndex
CREATE INDEX "CopilotMessage_sessionId_idx" ON "CopilotMessage"("sessionId");

-- CreateIndex
CREATE INDEX "AIEstimate_ticketId_idx" ON "AIEstimate"("ticketId");

-- CreateIndex
CREATE INDEX "TimeLog_ticketId_idx" ON "TimeLog"("ticketId");

-- CreateIndex
CREATE INDEX "TimeLog_userId_idx" ON "TimeLog"("userId");

-- CreateIndex
CREATE INDEX "Skillset_team_idx" ON "Skillset"("team");

-- CreateIndex
CREATE UNIQUE INDEX "Skillset_name_team_key" ON "Skillset"("name", "team");

-- CreateIndex
CREATE INDEX "UserSkillset_skillsetId_idx" ON "UserSkillset"("skillsetId");

-- CreateIndex
CREATE UNIQUE INDEX "UserSkillset_userId_skillsetId_key" ON "UserSkillset"("userId", "skillsetId");

-- CreateIndex
CREATE INDEX "DeletionLog_entityType_idx" ON "DeletionLog"("entityType");

-- CreateIndex
CREATE INDEX "DeletionLog_createdAt_idx" ON "DeletionLog"("createdAt");

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

-- CreateIndex
CREATE UNIQUE INDEX "ProjectDocument_epicId_key" ON "ProjectDocument"("epicId");

-- CreateIndex
CREATE INDEX "ProjectDocument_epicId_idx" ON "ProjectDocument"("epicId");

-- CreateIndex
CREATE INDEX "ListValue_listKey_idx" ON "ListValue"("listKey");

-- CreateIndex
CREATE UNIQUE INDEX "ListValue_listKey_value_key" ON "ListValue"("listKey", "value");

