-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Skillset" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "team" TEXT,
    "color" TEXT NOT NULL DEFAULT '#7c3aed',
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);
INSERT INTO "new_Skillset" ("createdAt", "id", "name", "team") SELECT "createdAt", "id", "name", "team" FROM "Skillset";
DROP TABLE "Skillset";
ALTER TABLE "new_Skillset" RENAME TO "Skillset";
CREATE INDEX "Skillset_team_idx" ON "Skillset"("team");
CREATE UNIQUE INDEX "Skillset_name_team_key" ON "Skillset"("name", "team");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
