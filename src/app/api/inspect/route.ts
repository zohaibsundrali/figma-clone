import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUserId } from "@/lib/file-access";

export async function GET() {
  try {
    const userId = await getCurrentUserId();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const files = await prisma.designFile.findMany({
      where: { ownerId: userId },
      take: 10,
      orderBy: { updatedAt: "desc" },
      select: {
        id: true,
        title: true,
        ownerId: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    const comments = await prisma.comment.findMany({
      where: { file: { ownerId: userId } },
      take: 10,
      select: {
        authorId: true,
        authorName: true,
      },
    });

    return NextResponse.json({ files, comments });
  } catch (error) {
    return NextResponse.json({
      error: error instanceof Error ? error.message : "Unknown error",
    }, { status: 500 });
  }
}
