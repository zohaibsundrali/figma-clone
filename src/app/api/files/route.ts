import { NextResponse } from "next/server";
import { getCurrentUserId } from "@/lib/file-access";
import { prisma } from "@/lib/prisma";
import { getCacheIfValid, setCacheWithTTL, getCacheKey, clearCache } from "@/lib/api-cache";

export async function GET(request: Request) {
  const userId = await getCurrentUserId();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const q = searchParams.get("q")?.trim();

  // For search queries, don't use cache (results may vary)
  if (q) {
    const files = await prisma.designFile.findMany({
      where: {
        ownerId: userId,
        isDeleted: false,
        title: { contains: q, mode: "insensitive" },
      },
      orderBy: { updatedAt: "desc" },
      take: 50, // Limit search results
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
      },
    });
    return NextResponse.json(files);
  }

  // Cache list requests for 30 seconds
  const cacheKey = getCacheKey(userId, "files:list");
  const cached = getCacheIfValid(cacheKey);
  if (cached) {
    return NextResponse.json(cached);
  }

  const files = await prisma.designFile.findMany({
    where: {
      ownerId: userId,
      isDeleted: false,
    },
    orderBy: { updatedAt: "desc" },
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
    },
  });

  setCacheWithTTL(cacheKey, files, 30);
  return NextResponse.json(files);
}

export async function POST() {
  const userId = await getCurrentUserId();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const file = await prisma.designFile.create({
    data: {
      title: "Untitled Design",
      ownerId: userId,
      canvasData: undefined,
    },
  });

  // Clear caches for this user
  clearCache(userId);

  await prisma.activity.create({
    data: {
      fileId: file.id,
      authorId: userId,
      authorName: "You",
      action: "file_created",
      details: "Created new design",
    },
  }).catch((err) => console.error("[Activity logging]", err));

  return NextResponse.json(file, { status: 201 });
}
