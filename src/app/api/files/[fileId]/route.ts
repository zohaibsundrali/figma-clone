import { NextResponse } from "next/server";
import { revalidateTag } from "next/cache";
import { getCurrentUserContext, getCurrentUserId, getOwnedFile } from "@/lib/file-access";
import { getFileAccess } from "@/lib/comment-access";
import { filePatchSchema } from "@/lib/share-validation";
import { prisma } from "@/lib/prisma";
import { clearCache } from "@/lib/api-cache";

type RouteParams = { params: Promise<{ fileId: string }> };

export async function GET(_request: Request, { params }: RouteParams) {
  const me = await getCurrentUserContext();
  if (!me) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { fileId } = await params;

  // IDOR-safe: only return the file if this user actually has view access.
  const access = await getFileAccess(fileId, me.userId, me.email);
  if (!access.canView) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const file = await prisma.designFile.findUnique({
    where: { id: fileId },
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
  const me = await getCurrentUserContext();
  if (!me) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { fileId } = await params;

  // Canvas/content edits require edit rights (editors, admins, owner).
  // Sharing settings (isPublic, password, expiry, role) are NOT accepted here —
  // they live on the dedicated /share route and require owner/admin.
  const access = await getFileAccess(fileId, me.userId, me.email);
  if (!access.canView) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  if (!access.canEdit) {
    return NextResponse.json(
      { error: "You have read-only access to this file." },
      { status: 403 }
    );
  }

  let raw: unknown;
  try {
    raw = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON payload" }, { status: 400 });
  }

  const parsed = filePatchSchema.safeParse(raw);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid input", details: parsed.error.flatten() },
      { status: 400 }
    );
  }
  const { title, canvasData, thumbnail, isStarred } = parsed.data;

  const updated = await prisma.designFile.update({
    where: { id: fileId },
    data: {
      ...(title !== undefined ? { title } : {}),
      ...(canvasData !== undefined ? { canvasData: canvasData as object } : {}),
      ...(thumbnail !== undefined ? { thumbnail } : {}),
      ...(isStarred !== undefined ? { isStarred } : {}),
    },
  });

  // Log activity if canvasData was updated (actual editing)
  if (canvasData !== undefined) {
    await prisma.activity.create({
      data: {
        fileId,
        authorId: me.userId,
        authorName: me.name,
        action: "file_updated",
        details: "Canvas changes saved",
      },
    }).catch((err) => console.error("[Activity logging]", err));
  }

  clearCache(updated.ownerId);
  revalidateTag(`user-files-${updated.ownerId}`);
  return NextResponse.json(updated);
}

export async function DELETE(_request: Request, { params }: RouteParams) {
  const userId = await getCurrentUserId();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { fileId } = await params;
  // Deletion remains owner-only.
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

  clearCache(userId);
  revalidateTag(`user-files-${userId}`);
  return NextResponse.json({ success: true });
}
