import { NextResponse } from "next/server";
import { getCurrentUserId, getOwnedFile } from "@/lib/file-access";
import { prisma } from "@/lib/prisma";

type RouteParams = { params: Promise<{ fileId: string }> };

export async function GET(_request: Request, { params }: RouteParams) {
  const userId = await getCurrentUserId();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { fileId } = await params;

  const file = await prisma.designFile.findFirst({
    where: { id: fileId, ownerId: userId },
    select: {
      id: true,
      title: true,
      ownerId: true,
      workspaceId: true,
      canvasData: true,
      isPublic: true,
      shareToken: true,
      thumbnail: true,
      isDeleted: true,
      deletedAt: true,
      isStarred: true,
      createdAt: true,
      updatedAt: true,
    },
  });

  if (!file) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  return NextResponse.json(file);
}

export async function PATCH(request: Request, { params }: RouteParams) {
  const userId = await getCurrentUserId();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { fileId } = await params;
  const file = await getOwnedFile(fileId, userId);

  if (!file) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  let body;
  try {
    body = await request.json();
  } catch (err) {
    return NextResponse.json({ error: "Invalid JSON payload" }, { status: 400 });
  }
  const { title, canvasData, isPublic, thumbnail, isStarred } = body;

  const updated = await prisma.designFile.update({
    where: { id: fileId },
    data: {
      ...(title !== undefined ? { title } : {}),
      ...(canvasData !== undefined ? { canvasData } : {}),
      ...(isPublic !== undefined ? { isPublic } : {}),
      ...(thumbnail !== undefined ? { thumbnail } : {}),
      ...(isStarred !== undefined ? { isStarred } : {}),
    },
  });

  // Log activity if canvasData was updated (actual editing)
  if (canvasData !== undefined) {
    await prisma.activity.create({
      data: {
        fileId,
        authorId: userId,
        authorName: "You",
        action: "file_updated",
        details: "Canvas changes saved",
      },
    }).catch((err) => console.error("[Activity logging]", err));
  }

  return NextResponse.json(updated);
}

export async function DELETE(_request: Request, { params }: RouteParams) {
  const userId = await getCurrentUserId();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { fileId } = await params;
  const file = await getOwnedFile(fileId, userId);

  if (!file) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  await prisma.designFile.update({
    where: { id: fileId },
    data: { isDeleted: true, deletedAt: new Date() },
  });

  await prisma.activity.create({
    data: {
      fileId,
      authorId: userId,
      authorName: "You",
      action: "file_deleted",
      details: "Moved to trash",
    },
  }).catch((err) => console.error("[Activity logging]", err));

  return NextResponse.json({ success: true });
}
