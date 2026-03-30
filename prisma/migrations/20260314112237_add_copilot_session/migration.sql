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

-- CreateIndex
CREATE INDEX "CopilotSession_userId_idx" ON "CopilotSession"("userId");

-- CreateIndex
CREATE INDEX "CopilotMessage_sessionId_idx" ON "CopilotMessage"("sessionId");
