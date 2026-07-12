-- CreateTable
CREATE TABLE "Guide" (
    "id" TEXT NOT NULL,
    "fileId" TEXT NOT NULL,
    "setName" TEXT NOT NULL,
    "position" DOUBLE PRECISION NOT NULL,
    "type" VARCHAR(10) NOT NULL,
    "locked" BOOLEAN NOT NULL DEFAULT false,
    "color" TEXT NOT NULL DEFAULT '#4f46e5',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Guide_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Guide_fileId_idx" ON "Guide"("fileId");

-- CreateIndex
CREATE INDEX "Guide_setName_idx" ON "Guide"("setName");

-- CreateIndex
CREATE INDEX "Guide_type_idx" ON "Guide"("type");
