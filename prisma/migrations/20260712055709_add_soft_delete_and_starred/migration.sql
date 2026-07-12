-- AlterTable
ALTER TABLE "DesignFile" ADD COLUMN     "deletedAt" TIMESTAMP(3),
ADD COLUMN     "isDeleted" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "isStarred" BOOLEAN NOT NULL DEFAULT false;

-- CreateIndex
CREATE INDEX "DesignFile_isDeleted_idx" ON "DesignFile"("isDeleted");

-- CreateIndex
CREATE INDEX "DesignFile_isStarred_idx" ON "DesignFile"("isStarred");
