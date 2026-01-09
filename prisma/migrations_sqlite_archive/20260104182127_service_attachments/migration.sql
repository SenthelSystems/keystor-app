-- CreateTable
CREATE TABLE "ServiceAttachment" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "organizationId" TEXT NOT NULL,
    "requestId" TEXT NOT NULL,
    "uploadedByUserId" TEXT NOT NULL,
    "kind" TEXT NOT NULL,
    "mimeType" TEXT NOT NULL,
    "sizeBytes" INTEGER NOT NULL,
    "storagePath" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ServiceAttachment_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "ServiceAttachment_requestId_fkey" FOREIGN KEY ("requestId") REFERENCES "MaintenanceRequest" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "ServiceAttachment_uploadedByUserId_fkey" FOREIGN KEY ("uploadedByUserId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateIndex
CREATE INDEX "ServiceAttachment_organizationId_idx" ON "ServiceAttachment"("organizationId");

-- CreateIndex
CREATE INDEX "ServiceAttachment_requestId_idx" ON "ServiceAttachment"("requestId");

-- CreateIndex
CREATE INDEX "ServiceAttachment_uploadedByUserId_idx" ON "ServiceAttachment"("uploadedByUserId");
