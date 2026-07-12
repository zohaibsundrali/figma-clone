import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUserId } from "@/lib/file-access";

type RouteParams = { params: Promise<{ fileId: string }> };

export async function GET(
  req: NextRequest,
  { params }: RouteParams
) {
  try {
    const userId = await getCurrentUserId();
    if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { fileId } = await params;

    // Verify user owns this file
    const file = await prisma.designFile.findUnique({
      where: { id: fileId },
      select: { ownerId: true },
    });

    if (!file || file.ownerId !== userId) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const comments = await prisma.comment.findMany({
      where: { fileId },
      orderBy: { createdAt: "asc" },
    });

    return NextResponse.json(comments);
  } catch (err) {
    console.error("[Comments GET]", err);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}

export async function POST(
  req: NextRequest,
  { params }: RouteParams
) {
  try {
    const userId = await getCurrentUserId();
    if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { fileId } = await params;
    const body = await req.json();
    const { text, x, y, authorName, parentCommentId } = body;

    // Verify user owns this file
    const file = await prisma.designFile.findUnique({
      where: { id: fileId },
      select: { ownerId: true },
    });

    if (!file || file.ownerId !== userId) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const comment = await prisma.comment.create({
      data: {
        fileId,
        authorId: userId,
        authorName: authorName || "You",
        text,
        x: x || 0,
        y: y || 0,
        parentCommentId: parentCommentId || null,
      },
    });

    return NextResponse.json(comment, { status: 201 });
  } catch (err) {
    console.error("[Comments POST]", err);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
