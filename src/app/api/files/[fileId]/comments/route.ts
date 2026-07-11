import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma";
import { getOwnedFile } from "@/lib/file-access";

type RouteParams = { params: Promise<{ fileId: string }> };

export async function GET(
  _request: NextRequest,
  { params }: RouteParams
) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { fileId } = await params;

    const file = await getOwnedFile(fileId, userId);
    if (!file) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    const comments = await prisma.comment.findMany({
      where: { fileId },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json(comments);
  } catch (error) {
    console.error("[COMMENTS_GET]", error);
    return NextResponse.json({ error: "Internal Error" }, { status: 500 });
  }
}

export async function POST(
  request: NextRequest,
  { params }: RouteParams
) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { fileId } = await params;

    const file = await getOwnedFile(fileId, userId);
    if (!file) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    const body = await request.json();
    const { text, x, y, authorName } = body;

    if (!text || typeof text !== "string" || text.trim() === "") {
      return NextResponse.json({ error: "text is required" }, { status: 400 });
    }
    if (typeof x !== "number" || typeof y !== "number") {
      return NextResponse.json(
        { error: "x and y must be numbers" },
        { status: 400 }
      );
    }

    const comment = await prisma.comment.create({
      data: {
        fileId,
        authorId: userId,
        authorName:
          typeof authorName === "string" && authorName.trim()
            ? authorName.trim()
            : "Anonymous",
        x,
        y,
        text: text.trim(),
      },
    });

    return NextResponse.json(comment, { status: 201 });
  } catch (error) {
    console.error("[COMMENTS_POST]", error);
    return NextResponse.json({ error: "Internal Error" }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: RouteParams
) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { fileId } = await params;

    const file = await getOwnedFile(fileId, userId);
    if (!file) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    const commentId = request.nextUrl.searchParams.get("commentId");
    if (!commentId) {
      return NextResponse.json({ error: "Missing commentId" }, { status: 400 });
    }

    // Verify the comment exists and belongs to this user before deleting
    const comment = await prisma.comment.findUnique({
      where: { id: commentId },
    });

    if (!comment) {
      return NextResponse.json({ error: "Comment not found" }, { status: 404 });
    }

    if (comment.authorId !== userId) {
      return NextResponse.json(
        { error: "You can only delete your own comments" },
        { status: 403 }
      );
    }

    await prisma.comment.delete({ where: { id: commentId } });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[COMMENTS_DELETE]", error);
    return NextResponse.json({ error: "Internal Error" }, { status: 500 });
  }
}
