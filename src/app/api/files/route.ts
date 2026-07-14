import { NextResponse } from "next/server";
import { revalidateTag } from "next/cache";
import { Prisma } from "@/generated/prisma/client";
import { getCurrentUserId, listFileSummaries } from "@/lib/file-access";
import { prisma } from "@/lib/prisma";
import { getCacheIfValid, setCacheWithTTL, getCacheKey, clearCache } from "@/lib/api-cache";
import { checkProjectLimit } from "@/lib/subscription";

export async function GET(request: Request) {
  const userId = await getCurrentUserId();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const q = searchParams.get("q")?.trim();

  // For search queries, don't use cache (results may vary)
  if (q) {
    const files = await listFileSummaries({
      where: Prisma.sql`"ownerId" = ${userId} AND "isDeleted" = false AND "title" ILIKE ${"%" + q + "%"}`,
      orderBy: Prisma.sql`"updatedAt" DESC`,
      limit: 50, // Limit search results
    });
    return NextResponse.json(files);
  }

  // Cache list requests for 30 seconds
  const cacheKey = getCacheKey(userId, "files:list");
  const cached = getCacheIfValid(cacheKey);
  if (cached) {
    return NextResponse.json(cached);
  }

  const files = await listFileSummaries({
    where: Prisma.sql`"ownerId" = ${userId} AND "isDeleted" = false`,
    orderBy: Prisma.sql`"updatedAt" DESC`,
    limit: 100,
  });

  setCacheWithTTL(cacheKey, files, 30);
  return NextResponse.json(files, {
    headers: {
      "Cache-Control": "private, max-age=30, stale-while-revalidate=60",
    },
  });
}

export async function POST() {
  const userId = await getCurrentUserId();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const limitCheck = await checkProjectLimit(userId);
  if (!limitCheck.allowed) {
    return NextResponse.json(
      {
        error: "plan_limit_reached",
        message: `Your ${limitCheck.plan.name} plan allows up to ${limitCheck.plan.projectLimit} projects. Upgrade to create more.`,
        plan: limitCheck.plan.id,
        limit: limitCheck.plan.projectLimit,
        used: limitCheck.used,
      },
      { status: 403 }
    );
  }

  const file = await prisma.designFile.create({
    data: {
      title: "Untitled Design",
      ownerId: userId,
      canvasData: undefined,
    },
  });

  // Clear both in-memory cache and Next.js server cache
  clearCache(userId);
  revalidateTag(`user-files-${userId}`, "max");

  // Fire-and-forget: activity log doesn't need to block the response
  void prisma.activity.create({
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
