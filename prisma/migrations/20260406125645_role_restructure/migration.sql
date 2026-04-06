-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_User" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "email" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "password" TEXT NOT NULL,
    "role" TEXT NOT NULL DEFAULT 'MEMBER_CRAFT',
    "team" TEXT,
    "stakeholderTeam" TEXT,
    "defaultHoursPerDay" REAL,
    "defaultWorkdaysPerWeek" INTEGER,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "ssoProvider" TEXT,
    "ssoId" TEXT
);
INSERT INTO "new_User" ("createdAt", "defaultHoursPerDay", "defaultWorkdaysPerWeek", "email", "id", "name", "password", "role", "ssoId", "ssoProvider", "team", "updatedAt") SELECT "createdAt", "defaultHoursPerDay", "defaultWorkdaysPerWeek", "email", "id", "name", "password", "role", "ssoId", "ssoProvider", "team", "updatedAt" FROM "User";
DROP TABLE "User";
ALTER TABLE "new_User" RENAME TO "User";
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
