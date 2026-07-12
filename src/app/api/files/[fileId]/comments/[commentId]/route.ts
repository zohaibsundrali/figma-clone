import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUserId } from "@/lib/file-access";

type RouteParams = { params: Promise<{ fileId: string; commentId: string }> };

export async function PATCH(
  req: NextRequest,
  { params }: RouteParams
) {
  try {
    const userId = await getCurrentUserId();
    if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { fileId, commentId } = await params;
    const body = await req.json();
    const { resolved } = body;

    // Verify user owns the file
    const file = await prisma.designFile.findUnique({
      where: { id: fileId },
      select: { ownerId: true },
    });

    if (!file || file.ownerId !== userId) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const comment = await prisma.comment.update({
      where: { id: commentId },
      data: { resolved: resolved !== undefined ? resolved : true },
    });

    return NextResponse.json(comment);
  } catch (err) {
    console.error("[Comment PATCH]", err);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}

export async function DELETE(
  _req: NextRequest,
  { params }: RouteParams
) {
  try {
    const userId = await getCurrentUserId();
    if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { fileId, commentId } = await params;

    // Verify user owns the file
    const file = await prisma.designFile.findUnique({
      where: { id: fileId },
      select: { ownerId: true },
    });

    if (!file || file.ownerId !== userId) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Verify comment belongs to this file
    const comment = await prisma.comment.findUnique({
      where: { id: commentId },
      select: { fileId: true },
    });

    if (!comment || comment.fileId !== fileId) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    await prisma.comment.delete({
      where: { id: commentId },
    });

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("[Comment DELETE]", err);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
