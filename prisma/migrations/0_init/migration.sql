-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateTable
CREATE TABLE "public"."Comment" (
    "id" TEXT NOT NULL,
    "fileId" TEXT NOT NULL,
    "authorId" TEXT NOT NULL,
    "authorName" TEXT NOT NULL,
    "x" DOUBLE PRECISION NOT NULL,
    "y" DOUBLE PRECISION NOT NULL,
    "text" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Comment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."DesignFile" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL DEFAULT 'Untitled Design',
    "ownerId" TEXT NOT NULL,
    "canvasData" JSONB,
    "isPublic" BOOLEAN NOT NULL DEFAULT false,
    "shareToken" TEXT NOT NULL,
    "thumbnail" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DesignFile_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."VersionHistory" (
    "id" TEXT NOT NULL,
    "fileId" TEXT NOT NULL,
    "authorId" TEXT NOT NULL,
    "authorName" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "canvasData" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "VersionHistory_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Comment_fileId_idx" ON "public"."Comment"("fileId" ASC);

-- CreateIndex
CREATE INDEX "DesignFile_ownerId_idx" ON "public"."DesignFile"("ownerId" ASC);

-- CreateIndex
CREATE INDEX "DesignFile_shareToken_idx" ON "public"."DesignFile"("shareToken" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "DesignFile_shareToken_key" ON "public"."DesignFile"("shareToken" ASC);

-- CreateIndex
CREATE INDEX "DesignFile_updatedAt_idx" ON "public"."DesignFile"("updatedAt" ASC);

-- CreateIndex
CREATE INDEX "VersionHistory_fileId_idx" ON "public"."VersionHistory"("fileId" ASC);
