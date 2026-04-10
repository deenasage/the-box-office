-- CreateEnum
CREATE TYPE "Team" AS ENUM ('CONTENT', 'DESIGN', 'SEO', 'WEM', 'PAID_MEDIA', 'ANALYTICS');

-- CreateEnum
CREATE TYPE "TicketStatus" AS ENUM ('BACKLOG', 'TODO', 'READY', 'IN_PROGRESS', 'IN_REVIEW', 'BLOCKED', 'DONE');

-- CreateEnum
CREATE TYPE "TicketSize" AS ENUM ('XS', 'S', 'M', 'L', 'XL', 'XXL');

-- CreateEnum
CREATE TYPE "FieldType" AS ENUM ('TEXT', 'TEXTAREA', 'SELECT', 'MULTISELECT', 'CHECKBOX', 'RADIO', 'DATE', 'NUMBER', 'EMAIL', 'URL');

-- CreateEnum
CREATE TYPE "UserRole" AS ENUM ('ADMIN', 'TEAM_LEAD_CRAFT', 'TEAM_LEAD_STAKEHOLDER', 'MEMBER_CRAFT', 'MEMBER_STAKEHOLDER');

-- CreateEnum
CREATE TYPE "StakeholderTeam" AS ENUM ('DIGITAL_DELIVERY', 'WEB_STRATEGY', 'ECOM', 'OPTIMIZATION');

-- CreateEnum
CREATE TYPE "DependencyType" AS ENUM ('BLOCKS', 'BLOCKED_BY', 'RELATED');

-- CreateEnum
CREATE TYPE "DetectionMethod" AS ENUM ('MANUAL', 'AI');

-- CreateEnum
CREATE TYPE "BriefStatus" AS ENUM ('DRAFT', 'GENERATING', 'REVIEW', 'APPROVED', 'FINALIZED', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "EpicStatus" AS ENUM ('INTAKE', 'IN_BRIEF', 'BRIEFED', 'IN_PLANNING', 'IN_PROGRESS', 'DONE', 'ON_HOLD', 'CANCELLED');

-- CreateEnum
CREATE TYPE "GenerationStatus" AS ENUM ('PENDING', 'RUNNING', 'DONE', 'FAILED');

-- CreateEnum
CREATE TYPE "MessageRole" AS ENUM ('USER', 'ASSISTANT');

-- CreateEnum
CREATE TYPE "CarryoverStatus" AS ENUM ('PENDING', 'ACCEPTED', 'DISMISSED');

-- CreateEnum
CREATE TYPE "TicketType" AS ENUM ('BUG', 'FEATURE', 'TASK', 'STORY', 'IMPROVEMENT');

-- CreateEnum
CREATE TYPE "CustomFieldType" AS ENUM ('TEXT', 'NUMBER', 'SELECT', 'DATE', 'CHECKBOX');

-- CreateEnum
CREATE TYPE "Hub" AS ENUM ('NA_HUB', 'EU_HUB', 'UKIA_HUB');

-- CreateEnum
CREATE TYPE "RoadmapItemStatus" AS ENUM ('NOT_STARTED', 'IN_PROGRESS', 'DONE', 'CARRIED_OVER', 'NOT_COMMITTED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "EntityType" AS ENUM ('SPRINT', 'TICKET', 'EPIC', 'BRIEF');

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "password" TEXT NOT NULL,
    "role" "UserRole" NOT NULL DEFAULT 'MEMBER_CRAFT',
    "team" "Team",
    "stakeholderTeam" "StakeholderTeam",
    "defaultHoursPerDay" DOUBLE PRECISION,
    "defaultWorkdaysPerWeek" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "ssoProvider" TEXT,
    "ssoId" TEXT,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FormTemplate" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "FormTemplate_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FormField" (
    "id" TEXT NOT NULL,
    "templateId" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "fieldKey" TEXT NOT NULL,
    "type" "FieldType" NOT NULL,
    "required" BOOLEAN NOT NULL DEFAULT false,
    "order" INTEGER NOT NULL,
    "options" TEXT,
    "conditions" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "FormField_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Ticket" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "team" "Team" NOT NULL,
    "status" "TicketStatus" NOT NULL DEFAULT 'BACKLOG',
    "size" "TicketSize",
    "type" "TicketType",
    "dueDate" TIMESTAMP(3),
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
    "hub" "Hub",
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Ticket_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Sprint" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "goal" TEXT,
    "notes" TEXT,
    "startDate" TIMESTAMP(3) NOT NULL,
    "endDate" TIMESTAMP(3) NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT false,
    "committedPoints" INTEGER,
    "retrospectiveNotes" TEXT,
    "retroActionItems" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Sprint_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TeamCapacity" (
    "id" TEXT NOT NULL,
    "sprintId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "points" INTEGER NOT NULL,
    "hours" INTEGER,
    "daysOff" INTEGER DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TeamCapacity_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Epic" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "status" "EpicStatus" NOT NULL DEFAULT 'INTAKE',
    "team" "Team",
    "color" TEXT NOT NULL DEFAULT '#6366f1',
    "startDate" TIMESTAMP(3),
    "endDate" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Epic_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RoutingRule" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "keywords" TEXT NOT NULL,
    "team" "Team" NOT NULL,
    "priority" INTEGER NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "RoutingRule_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TicketStatusHistory" (
    "id" TEXT NOT NULL,
    "ticketId" TEXT NOT NULL,
    "fromStatus" "TicketStatus",
    "toStatus" "TicketStatus" NOT NULL,
    "changedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "changedById" TEXT NOT NULL,

    CONSTRAINT "TicketStatusHistory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TicketAuditLog" (
    "id" TEXT NOT NULL,
    "ticketId" TEXT NOT NULL,
    "field" TEXT NOT NULL,
    "oldValue" TEXT,
    "newValue" TEXT,
    "changedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "changedById" TEXT NOT NULL,

    CONSTRAINT "TicketAuditLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Comment" (
    "id" TEXT NOT NULL,
    "ticketId" TEXT NOT NULL,
    "authorId" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Comment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Label" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "color" TEXT NOT NULL DEFAULT '#6366f1',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Label_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TicketLabel" (
    "ticketId" TEXT NOT NULL,
    "labelId" TEXT NOT NULL,

    CONSTRAINT "TicketLabel_pkey" PRIMARY KEY ("ticketId","labelId")
);

-- CreateTable
CREATE TABLE "Notification" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "link" TEXT,
    "read" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Notification_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "KanbanColumnConfig" (
    "id" TEXT NOT NULL,
    "team" "Team" NOT NULL,
    "status" "TicketStatus" NOT NULL,
    "wipLimit" INTEGER,
    "hidden" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "KanbanColumnConfig_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CustomField" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "fieldType" "CustomFieldType" NOT NULL,
    "teamScope" "Team",
    "required" BOOLEAN NOT NULL DEFAULT false,
    "order" INTEGER NOT NULL DEFAULT 0,
    "options" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CustomField_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TicketCustomFieldValue" (
    "id" TEXT NOT NULL,
    "ticketId" TEXT NOT NULL,
    "fieldId" TEXT NOT NULL,
    "value" TEXT NOT NULL,

    CONSTRAINT "TicketCustomFieldValue_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Brief" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "status" "BriefStatus" NOT NULL DEFAULT 'DRAFT',
    "rawInput" TEXT NOT NULL,
    "extractedText" TEXT,
    "objective" TEXT,
    "targetAudience" TEXT,
    "deliverables" TEXT,
    "dependencies" TEXT,
    "requiredTeams" TEXT,
    "timeline" TEXT,
    "successMetrics" TEXT,
    "clarifications" TEXT,
    "aiModel" TEXT NOT NULL DEFAULT 'claude-sonnet-4-6',
    "aiPromptTokens" INTEGER,
    "aiOutputTokens" INTEGER,
    "briefType" TEXT,
    "briefData" TEXT,
    "epicId" TEXT,
    "creatorId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Brief_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TicketGenerationJob" (
    "id" TEXT NOT NULL,
    "briefId" TEXT NOT NULL,
    "status" "GenerationStatus" NOT NULL DEFAULT 'PENDING',
    "teamResults" TEXT,
    "aiModel" TEXT NOT NULL DEFAULT 'claude-sonnet-4-6',
    "aiPromptTokens" INTEGER,
    "aiOutputTokens" INTEGER,
    "errorMessage" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TicketGenerationJob_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BriefAttachment" (
    "id" TEXT NOT NULL,
    "briefId" TEXT NOT NULL,
    "fileName" TEXT NOT NULL,
    "mimeType" TEXT NOT NULL,
    "sizeBytes" INTEGER NOT NULL,
    "storedPath" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "BriefAttachment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SprintSuggestion" (
    "id" TEXT NOT NULL,
    "briefId" TEXT,
    "ticketIds" TEXT NOT NULL,
    "scenarios" TEXT NOT NULL,
    "recommendation" TEXT,
    "aiModel" TEXT NOT NULL DEFAULT 'claude-sonnet-4-6',
    "aiPromptTokens" INTEGER,
    "aiOutputTokens" INTEGER,
    "createdBy" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SprintSuggestion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TicketDependency" (
    "id" TEXT NOT NULL,
    "fromTicketId" TEXT NOT NULL,
    "toTicketId" TEXT NOT NULL,
    "type" "DependencyType" NOT NULL,
    "detectedBy" "DetectionMethod" NOT NULL DEFAULT 'MANUAL',
    "aiConfidence" DOUBLE PRECISION,
    "aiRationale" TEXT,
    "createdBy" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TicketDependency_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CopilotSession" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CopilotSession_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CopilotMessage" (
    "id" TEXT NOT NULL,
    "sessionId" TEXT NOT NULL,
    "role" "MessageRole" NOT NULL,
    "content" TEXT NOT NULL,
    "contextSnapshot" TEXT,
    "aiModel" TEXT,
    "aiPromptTokens" INTEGER,
    "aiOutputTokens" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CopilotMessage_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Milestone" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "description" TEXT,
    "color" TEXT NOT NULL DEFAULT '#6366f1',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Milestone_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AIEstimate" (
    "id" TEXT NOT NULL,
    "ticketId" TEXT NOT NULL,
    "suggestedSize" "TicketSize" NOT NULL,
    "confidence" DOUBLE PRECISION NOT NULL,
    "rationale" TEXT NOT NULL,
    "flags" TEXT,
    "similarTickets" TEXT,
    "aiModel" TEXT NOT NULL DEFAULT 'claude-sonnet-4-6',
    "aiPromptTokens" INTEGER,
    "aiOutputTokens" INTEGER,
    "accepted" BOOLEAN NOT NULL DEFAULT false,
    "acceptedBy" TEXT,
    "acceptedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AIEstimate_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TimeLog" (
    "id" TEXT NOT NULL,
    "ticketId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "hours" DOUBLE PRECISION NOT NULL,
    "note" TEXT,
    "loggedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TimeLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Skillset" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "team" "Team",
    "color" TEXT NOT NULL DEFAULT '#7c3aed',
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Skillset_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UserSkillset" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "skillsetId" TEXT NOT NULL,
    "assignedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "UserSkillset_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DeletionLog" (
    "id" TEXT NOT NULL,
    "entityType" "EntityType" NOT NULL,
    "entityId" TEXT NOT NULL,
    "entityTitle" TEXT NOT NULL,
    "deletedById" TEXT NOT NULL,
    "payload" TEXT NOT NULL,
    "ticketCount" INTEGER NOT NULL DEFAULT 0,
    "restoredAt" TIMESTAMP(3),
    "restoredById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DeletionLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RoadmapItem" (
    "id" TEXT NOT NULL,
    "tier" TEXT,
    "category" TEXT,
    "initiative" TEXT,
    "region" TEXT,
    "title" TEXT NOT NULL,
    "titleManuallyEdited" BOOLEAN NOT NULL DEFAULT false,
    "ownerId" TEXT,
    "status" "RoadmapItemStatus" NOT NULL DEFAULT 'NOT_STARTED',
    "period" TEXT NOT NULL,
    "startDate" TIMESTAMP(3),
    "endDate" TIMESTAMP(3),
    "notes" TEXT,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "epicId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "RoadmapItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BriefShareToken" (
    "id" TEXT NOT NULL,
    "briefId" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "label" TEXT,
    "revoked" BOOLEAN NOT NULL DEFAULT false,
    "expiresAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "BriefShareToken_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BriefComment" (
    "id" TEXT NOT NULL,
    "briefId" TEXT NOT NULL,
    "shareTokenId" TEXT NOT NULL,
    "authorName" TEXT NOT NULL,
    "authorEmail" TEXT,
    "body" TEXT NOT NULL,
    "resolved" BOOLEAN NOT NULL DEFAULT false,
    "resolvedAt" TIMESTAMP(3),
    "resolvedById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "BriefComment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TicketAttachment" (
    "id" TEXT NOT NULL,
    "ticketId" TEXT NOT NULL,
    "uploadedById" TEXT NOT NULL,
    "fileName" TEXT NOT NULL,
    "mimeType" TEXT NOT NULL,
    "sizeBytes" INTEGER NOT NULL,
    "storedPath" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TicketAttachment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GanttItem" (
    "id" TEXT NOT NULL,
    "epicId" TEXT NOT NULL,
    "ticketId" TEXT,
    "title" TEXT NOT NULL,
    "team" "Team",
    "color" TEXT,
    "startDate" TIMESTAMP(3) NOT NULL,
    "endDate" TIMESTAMP(3) NOT NULL,
    "order" INTEGER NOT NULL DEFAULT 0,
    "aiGenerated" BOOLEAN NOT NULL DEFAULT false,
    "slippedFromSprintId" TEXT,
    "slippedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "GanttItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SprintCarryoverSuggestion" (
    "id" TEXT NOT NULL,
    "ticketId" TEXT NOT NULL,
    "fromSprintId" TEXT NOT NULL,
    "toSprintId" TEXT,
    "status" "CarryoverStatus" NOT NULL DEFAULT 'PENDING',
    "resolvedByUserId" TEXT,
    "resolvedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SprintCarryoverSuggestion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProjectDocument" (
    "id" TEXT NOT NULL,
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
    "aiPrefilledAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ProjectDocument_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ListValue" (
    "id" TEXT NOT NULL,
    "listKey" TEXT NOT NULL,
    "value" TEXT NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ListValue_pkey" PRIMARY KEY ("id")
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
CREATE INDEX "TicketAuditLog_ticketId_idx" ON "TicketAuditLog"("ticketId");

-- CreateIndex
CREATE INDEX "TicketAuditLog_changedAt_idx" ON "TicketAuditLog"("changedAt");

-- CreateIndex
CREATE INDEX "TicketAuditLog_ticketId_changedAt_idx" ON "TicketAuditLog"("ticketId", "changedAt");

-- CreateIndex
CREATE UNIQUE INDEX "Label_name_key" ON "Label"("name");

-- CreateIndex
CREATE INDEX "TicketLabel_labelId_idx" ON "TicketLabel"("labelId");

-- CreateIndex
CREATE INDEX "Notification_userId_read_idx" ON "Notification"("userId", "read");

-- CreateIndex
CREATE UNIQUE INDEX "KanbanColumnConfig_team_status_key" ON "KanbanColumnConfig"("team", "status");

-- CreateIndex
CREATE INDEX "TicketCustomFieldValue_fieldId_idx" ON "TicketCustomFieldValue"("fieldId");

-- CreateIndex
CREATE UNIQUE INDEX "TicketCustomFieldValue_ticketId_fieldId_key" ON "TicketCustomFieldValue"("ticketId", "fieldId");

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

-- AddForeignKey
ALTER TABLE "FormField" ADD CONSTRAINT "FormField_templateId_fkey" FOREIGN KEY ("templateId") REFERENCES "FormTemplate"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Ticket" ADD CONSTRAINT "Ticket_templateId_fkey" FOREIGN KEY ("templateId") REFERENCES "FormTemplate"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Ticket" ADD CONSTRAINT "Ticket_assigneeId_fkey" FOREIGN KEY ("assigneeId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Ticket" ADD CONSTRAINT "Ticket_creatorId_fkey" FOREIGN KEY ("creatorId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Ticket" ADD CONSTRAINT "Ticket_sprintId_fkey" FOREIGN KEY ("sprintId") REFERENCES "Sprint"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Ticket" ADD CONSTRAINT "Ticket_epicId_fkey" FOREIGN KEY ("epicId") REFERENCES "Epic"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Ticket" ADD CONSTRAINT "Ticket_briefId_fkey" FOREIGN KEY ("briefId") REFERENCES "Brief"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Ticket" ADD CONSTRAINT "Ticket_requiredSkillsetId_fkey" FOREIGN KEY ("requiredSkillsetId") REFERENCES "Skillset"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TeamCapacity" ADD CONSTRAINT "TeamCapacity_sprintId_fkey" FOREIGN KEY ("sprintId") REFERENCES "Sprint"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TeamCapacity" ADD CONSTRAINT "TeamCapacity_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TicketStatusHistory" ADD CONSTRAINT "TicketStatusHistory_ticketId_fkey" FOREIGN KEY ("ticketId") REFERENCES "Ticket"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TicketStatusHistory" ADD CONSTRAINT "TicketStatusHistory_changedById_fkey" FOREIGN KEY ("changedById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TicketAuditLog" ADD CONSTRAINT "TicketAuditLog_ticketId_fkey" FOREIGN KEY ("ticketId") REFERENCES "Ticket"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TicketAuditLog" ADD CONSTRAINT "TicketAuditLog_changedById_fkey" FOREIGN KEY ("changedById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Comment" ADD CONSTRAINT "Comment_ticketId_fkey" FOREIGN KEY ("ticketId") REFERENCES "Ticket"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Comment" ADD CONSTRAINT "Comment_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TicketLabel" ADD CONSTRAINT "TicketLabel_ticketId_fkey" FOREIGN KEY ("ticketId") REFERENCES "Ticket"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TicketLabel" ADD CONSTRAINT "TicketLabel_labelId_fkey" FOREIGN KEY ("labelId") REFERENCES "Label"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Notification" ADD CONSTRAINT "Notification_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TicketCustomFieldValue" ADD CONSTRAINT "TicketCustomFieldValue_ticketId_fkey" FOREIGN KEY ("ticketId") REFERENCES "Ticket"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TicketCustomFieldValue" ADD CONSTRAINT "TicketCustomFieldValue_fieldId_fkey" FOREIGN KEY ("fieldId") REFERENCES "CustomField"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Brief" ADD CONSTRAINT "Brief_epicId_fkey" FOREIGN KEY ("epicId") REFERENCES "Epic"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Brief" ADD CONSTRAINT "Brief_creatorId_fkey" FOREIGN KEY ("creatorId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TicketGenerationJob" ADD CONSTRAINT "TicketGenerationJob_briefId_fkey" FOREIGN KEY ("briefId") REFERENCES "Brief"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BriefAttachment" ADD CONSTRAINT "BriefAttachment_briefId_fkey" FOREIGN KEY ("briefId") REFERENCES "Brief"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SprintSuggestion" ADD CONSTRAINT "SprintSuggestion_briefId_fkey" FOREIGN KEY ("briefId") REFERENCES "Brief"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SprintSuggestion" ADD CONSTRAINT "SprintSuggestion_createdBy_fkey" FOREIGN KEY ("createdBy") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TicketDependency" ADD CONSTRAINT "TicketDependency_fromTicketId_fkey" FOREIGN KEY ("fromTicketId") REFERENCES "Ticket"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TicketDependency" ADD CONSTRAINT "TicketDependency_toTicketId_fkey" FOREIGN KEY ("toTicketId") REFERENCES "Ticket"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TicketDependency" ADD CONSTRAINT "TicketDependency_createdBy_fkey" FOREIGN KEY ("createdBy") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CopilotSession" ADD CONSTRAINT "CopilotSession_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CopilotMessage" ADD CONSTRAINT "CopilotMessage_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "CopilotSession"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AIEstimate" ADD CONSTRAINT "AIEstimate_ticketId_fkey" FOREIGN KEY ("ticketId") REFERENCES "Ticket"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TimeLog" ADD CONSTRAINT "TimeLog_ticketId_fkey" FOREIGN KEY ("ticketId") REFERENCES "Ticket"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TimeLog" ADD CONSTRAINT "TimeLog_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserSkillset" ADD CONSTRAINT "UserSkillset_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserSkillset" ADD CONSTRAINT "UserSkillset_skillsetId_fkey" FOREIGN KEY ("skillsetId") REFERENCES "Skillset"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DeletionLog" ADD CONSTRAINT "DeletionLog_deletedById_fkey" FOREIGN KEY ("deletedById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DeletionLog" ADD CONSTRAINT "DeletionLog_restoredById_fkey" FOREIGN KEY ("restoredById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RoadmapItem" ADD CONSTRAINT "RoadmapItem_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RoadmapItem" ADD CONSTRAINT "RoadmapItem_epicId_fkey" FOREIGN KEY ("epicId") REFERENCES "Epic"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BriefShareToken" ADD CONSTRAINT "BriefShareToken_briefId_fkey" FOREIGN KEY ("briefId") REFERENCES "Brief"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BriefComment" ADD CONSTRAINT "BriefComment_briefId_fkey" FOREIGN KEY ("briefId") REFERENCES "Brief"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BriefComment" ADD CONSTRAINT "BriefComment_shareTokenId_fkey" FOREIGN KEY ("shareTokenId") REFERENCES "BriefShareToken"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BriefComment" ADD CONSTRAINT "BriefComment_resolvedById_fkey" FOREIGN KEY ("resolvedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TicketAttachment" ADD CONSTRAINT "TicketAttachment_ticketId_fkey" FOREIGN KEY ("ticketId") REFERENCES "Ticket"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TicketAttachment" ADD CONSTRAINT "TicketAttachment_uploadedById_fkey" FOREIGN KEY ("uploadedById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GanttItem" ADD CONSTRAINT "GanttItem_epicId_fkey" FOREIGN KEY ("epicId") REFERENCES "Epic"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GanttItem" ADD CONSTRAINT "GanttItem_ticketId_fkey" FOREIGN KEY ("ticketId") REFERENCES "Ticket"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GanttItem" ADD CONSTRAINT "GanttItem_slippedFromSprintId_fkey" FOREIGN KEY ("slippedFromSprintId") REFERENCES "Sprint"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SprintCarryoverSuggestion" ADD CONSTRAINT "SprintCarryoverSuggestion_ticketId_fkey" FOREIGN KEY ("ticketId") REFERENCES "Ticket"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SprintCarryoverSuggestion" ADD CONSTRAINT "SprintCarryoverSuggestion_fromSprintId_fkey" FOREIGN KEY ("fromSprintId") REFERENCES "Sprint"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SprintCarryoverSuggestion" ADD CONSTRAINT "SprintCarryoverSuggestion_toSprintId_fkey" FOREIGN KEY ("toSprintId") REFERENCES "Sprint"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SprintCarryoverSuggestion" ADD CONSTRAINT "SprintCarryoverSuggestion_resolvedByUserId_fkey" FOREIGN KEY ("resolvedByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProjectDocument" ADD CONSTRAINT "ProjectDocument_epicId_fkey" FOREIGN KEY ("epicId") REFERENCES "Epic"("id") ON DELETE CASCADE ON UPDATE CASCADE;
