import { NextResponse } from "next/server";
import { getCurrentUserId } from "@/lib/file-access";
import { prisma } from "@/lib/prisma";
import { getCacheIfValid, setCacheWithTTL, getCacheKey } from "@/lib/api-cache";

export async function GET() {
  const userId = await getCurrentUserId();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Cache deleted files for 30 seconds
  const cacheKey = getCacheKey(userId, "files:deleted");
  const cached = getCacheIfValid(cacheKey);
  if (cached) {
    return NextResponse.json(cached);
  }

  const deletedFiles = await prisma.designFile.findMany({
    where: {
      ownerId: userId,
      isDeleted: true,
    },
    orderBy: { deletedAt: "desc" },
    take: 100,
    select: {
      id: true,
      title: true,
      isPublic: true,
      thumbnail: true,
      isDeleted: true,
      isStarred: true,
      workspaceId: true,
      createdAt: true,
      updatedAt: true,
      deletedAt: true,
    },
  });

  setCacheWithTTL(cacheKey, deletedFiles, 30);
  return NextResponse.json(deletedFiles);
}
