-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Invite" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "organizationId" TEXT,
    "email" TEXT NOT NULL,
    "name" TEXT,
    "role" TEXT NOT NULL DEFAULT 'TENANT',
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "token" TEXT NOT NULL,
    "expiresAt" DATETIME NOT NULL,
    "acceptedAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Invite_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_Invite" ("acceptedAt", "createdAt", "email", "expiresAt", "id", "name", "organizationId", "role", "status", "token", "updatedAt") SELECT "acceptedAt", "createdAt", "email", "expiresAt", "id", "name", "organizationId", "role", "status", "token", "updatedAt" FROM "Invite";
DROP TABLE "Invite";
ALTER TABLE "new_Invite" RENAME TO "Invite";
CREATE UNIQUE INDEX "Invite_token_key" ON "Invite"("token");
CREATE INDEX "Invite_organizationId_idx" ON "Invite"("organizationId");
CREATE INDEX "Invite_email_idx" ON "Invite"("email");
CREATE INDEX "Invite_status_idx" ON "Invite"("status");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
