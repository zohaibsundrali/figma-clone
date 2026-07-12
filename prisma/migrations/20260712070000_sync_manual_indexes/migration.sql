-- These three indexes were originally created directly on the live database
-- (Neon SQL console) as a performance fix, before a matching migration existed.
-- This migration records them in history so `prisma migrate dev` no longer
-- reports drift. IF NOT EXISTS makes it safe to replay on fresh environments
-- (CI, new clones) where the indexes don't exist yet.

-- CreateIndex
CREATE INDEX IF NOT EXISTS "idx_designfile_owner" ON "DesignFile"("ownerId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "idx_designfile_deleted" ON "DesignFile"("ownerId", "isDeleted") WHERE ("isDeleted" = true);

-- CreateIndex
CREATE INDEX IF NOT EXISTS "idx_designfile_starred" ON "DesignFile"("ownerId", "isStarred") WHERE ("isStarred" = true);
