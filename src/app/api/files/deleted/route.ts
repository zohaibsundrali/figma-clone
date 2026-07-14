import { NextResponse } from "next/server";
import { Prisma } from "@/generated/prisma/client";
import { getCurrentUserId, listFileSummaries } from "@/lib/file-access";
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

  const deletedFiles = await listFileSummaries({
    where: Prisma.sql`"ownerId" = ${userId} AND "isDeleted" = true`,
    orderBy: Prisma.sql`"deletedAt" DESC`,
    limit: 100,
  });

  setCacheWithTTL(cacheKey, deletedFiles, 30);
  return NextResponse.json(deletedFiles);
}
