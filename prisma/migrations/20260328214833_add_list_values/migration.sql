-- CreateTable
CREATE TABLE "ListValue" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "listKey" TEXT NOT NULL,
    "value" TEXT NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateIndex
CREATE INDEX "ListValue_listKey_idx" ON "ListValue"("listKey");

-- CreateIndex
CREATE UNIQUE INDEX "ListValue_listKey_value_key" ON "ListValue"("listKey", "value");
