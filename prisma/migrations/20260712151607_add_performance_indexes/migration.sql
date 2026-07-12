-- CreateIndex
CREATE INDEX "DesignFile_deletedAt_idx" ON "DesignFile"("deletedAt");

-- CreateIndex
CREATE INDEX "idx_designfile_owner_updated" ON "DesignFile"("ownerId", "updatedAt");

-- CreateIndex
CREATE INDEX "idx_designfile_deleted_at" ON "DesignFile"("ownerId", "isDeleted", "deletedAt");
