import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUserContext } from "@/lib/file-access";
import { getFileAccess, isAuthor } from "@/lib/comment-access";
import { updateCommentSchema, sanitizeText } from "@/lib/comment-validation";
import { serializeComment } from "@/lib/comment-serialize";

type RouteParams = { params: Promise<{ fileId: string; commentId: string }> };

export async function PATCH(req: NextRequest, { params }: RouteParams) {
  try {
    const me = await getCurrentUserContext();
    if (!me) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { fileId, commentId } = await params;
    const access = await getFileAccess(fileId, me.userId, me.email);
    if (!access.canView) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    let raw: unknown;
    try {
      raw = await req.json();
    } catch {
      return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
    }

    const parsed = updateCommentSchema.safeParse(raw);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid input", details: parsed.error.flatten() },
        { status: 400 }
      );
    }
    const input = parsed.data;

    const existing = await prisma.comment.findUnique({
      where: { id: commentId },
      select: { fileId: true, authorId: true },
    });
    if (!existing || existing.fileId !== fileId) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    const data: {
      resolved?: boolean;
      text?: string;
      edited?: boolean;
    } = {};

    // Resolve / reopen — editors and admins only.
    if (input.resolved !== undefined) {
      if (!access.canResolve) {
        return NextResponse.json(
          { error: "Only editors can resolve or reopen threads." },
          { status: 403 }
        );
      }
      data.resolved = input.resolved;
    }

    // Edit text — author or admin only.
    if (input.text !== undefined) {
      if (!isAuthor(access, existing.authorId) && !access.isAdmin) {
        return NextResponse.json(
          { error: "You can only edit your own messages." },
          { status: 403 }
        );
      }
      const text = sanitizeText(input.text);
      if (!text) {
        return NextResponse.json({ error: "Comment is empty" }, { status: 400 });
      }
      data.text = text;
      data.edited = true;
    }

    const updated = await prisma.comment.update({
      where: { id: commentId },
      data,
      include: { reactions: true },
    });

    return NextResponse.json(serializeComment(updated));
  } catch (err) {
    console.error("[Comment PATCH]", err);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}

export async function DELETE(_req: NextRequest, { params }: RouteParams) {
  try {
    const me = await getCurrentUserContext();
    if (!me) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { fileId, commentId } = await params;
    const access = await getFileAccess(fileId, me.userId, me.email);
    if (!access.canView) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const existing = await prisma.comment.findUnique({
      where: { id: commentId },
      select: { fileId: true, authorId: true },
    });
    if (!existing || existing.fileId !== fileId) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    // Delete own message, or any message if admin.
    if (!isAuthor(access, existing.authorId) && !access.isAdmin) {
      return NextResponse.json(
        { error: "You can only delete your own messages." },
        { status: 403 }
      );
    }

    // Replies, reactions and notifications cascade via schema onDelete: Cascade.
    await prisma.comment.delete({ where: { id: commentId } });

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("[Comment DELETE]", err);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
