import { NextResponse } from "next/server";
import { getCurrentUserId } from "@/lib/file-access";
import { prisma } from "@/lib/prisma";

export async function GET(request: Request) {
  const userId = await getCurrentUserId();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const q = searchParams.get("q")?.trim();

  const files = await prisma.designFile.findMany({
    where: {
      ownerId: userId,
      isDeleted: false,
      ...(q ? { title: { contains: q, mode: "insensitive" } } : {}),
    },
    orderBy: { updatedAt: "desc" },
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
