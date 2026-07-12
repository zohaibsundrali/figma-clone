import { NextResponse } from "next/server";
import { getCurrentUserId } from "@/lib/file-access";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const userId = await getCurrentUserId();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
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

  return NextResponse.json(deletedFiles);
}
