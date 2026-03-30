-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Epic" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "status" TEXT NOT NULL DEFAULT 'INTAKE',
    "team" TEXT,
    "color" TEXT NOT NULL DEFAULT '#6366f1',
    "startDate" DATETIME,
    "endDate" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);
INSERT INTO "new_Epic" ("color", "createdAt", "description", "endDate", "id", "name", "startDate", "team", "updatedAt") SELECT "color", "createdAt", "description", "endDate", "id", "name", "startDate", "team", "updatedAt" FROM "Epic";
DROP TABLE "Epic";
ALTER TABLE "new_Epic" RENAME TO "Epic";
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
