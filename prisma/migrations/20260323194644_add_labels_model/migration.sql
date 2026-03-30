/*
  Warnings:

  - You are about to drop the `_TicketLabels` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropIndex
DROP INDEX "_TicketLabels_B_index";

-- DropIndex
DROP INDEX "_TicketLabels_AB_unique";

-- AlterTable
ALTER TABLE "Sprint" ADD COLUMN "committedPoints" INTEGER;

-- DropTable
PRAGMA foreign_keys=off;
DROP TABLE "_TicketLabels";
PRAGMA foreign_keys=on;

-- CreateTable
CREATE TABLE "TicketLabel" (
    "ticketId" TEXT NOT NULL,
    "labelId" TEXT NOT NULL,

    PRIMARY KEY ("ticketId", "labelId"),
    CONSTRAINT "TicketLabel_ticketId_fkey" FOREIGN KEY ("ticketId") REFERENCES "Ticket" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "TicketLabel_labelId_fkey" FOREIGN KEY ("labelId") REFERENCES "Label" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Label" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "color" TEXT NOT NULL DEFAULT '#6366f1',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);
INSERT INTO "new_Label" ("color", "id", "name") SELECT "color", "id", "name" FROM "Label";
DROP TABLE "Label";
ALTER TABLE "new_Label" RENAME TO "Label";
CREATE UNIQUE INDEX "Label_name_key" ON "Label"("name");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

-- CreateIndex
CREATE INDEX "TicketLabel_labelId_idx" ON "TicketLabel"("labelId");
