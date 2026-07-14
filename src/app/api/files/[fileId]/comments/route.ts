import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUserContext } from "@/lib/file-access";
import { getFileAccess } from "@/lib/comment-access";
import {
  createCommentSchema,
  sanitizeText,
} from "@/lib/comment-validation";
import { serializeComment } from "@/lib/comment-serialize";

type RouteParams = { params: Promise<{ fileId: string }> };

export async function GET(_req: NextRequest, { params }: RouteParams) {
  try {
    const me = await getCurrentUserContext();
    if (!me) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { fileId } = await params;
    const access = await getFileAccess(fileId, me.userId, me.email);
    if (!access.canView) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const comments = await prisma.comment.findMany({
      where: { fileId },
      orderBy: { createdAt: "asc" },
      include: { reactions: true },
    });

    return NextResponse.json(comments.map(serializeComment));
  } catch (err) {
    console.error("[Comments GET]", err);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}

export async function POST(req: NextRequest, { params }: RouteParams) {
  try {
    const me = await getCurrentUserContext();
    if (!me) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { fileId } = await params;
    const access = await getFileAccess(fileId, me.userId, me.email);
    if (!access.canComment) {
      return NextResponse.json(
        { error: "You do not have permission to comment on this file." },
        { status: 403 }
      );
    }

    let raw: unknown;
    try {
      raw = await req.json();
    } catch {
      return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
    }

    const parsed = createCommentSchema.safeParse(raw);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid input", details: parsed.error.flatten() },
        { status: 400 }
      );
    }
    const input = parsed.data;

    const text = sanitizeText(input.text);
    if (!text) {
      return NextResponse.json({ error: "Comment is empty" }, { status: 400 });
    }

    // If replying, verify the parent exists and belongs to this file.
    if (input.parentCommentId) {
      const parent = await prisma.comment.findUnique({
        where: { id: input.parentCommentId },
        select: { fileId: true },
      });
      if (!parent || parent.fileId !== fileId) {
        return NextResponse.json(
          { error: "Parent comment not found" },
          { status: 404 }
        );
      }
    }

    // Dedupe mention ids and drop self-mentions (no self-notification).
    const mentions = Array.from(new Set(input.mentions)).filter(
      (id) => !access.identities.includes(id)
    );

    const authorName = input.authorName?.trim() || me.name;
    const authorAvatar = input.authorAvatar || me.avatar;

    // Create the comment and all mention notifications atomically. The unique
    // [userId, commentId, type] constraint plus skipDuplicates guarantees we
    // never create two notifications for the same mention event.
    const created = await prisma.$transaction(async (tx) => {
      const comment = await tx.comment.create({
        data: {
          fileId,
          authorId: me.userId,
          authorName,
          authorAvatar,
          text,
          x: input.x,
          y: input.y,
          shapeId: input.shapeId ?? null,
          mentions,
          parentCommentId: input.parentCommentId ?? null,
        },
        include: { reactions: true },
      });

      const notifications: {
        userId: string;
        type: string;
        fileId: string;
        commentId: string;
        actorId: string;
        actorName: string;
        message: string;
      }[] = [];

      // Mention notifications.
      for (const userId of mentions) {
        notifications.push({
          userId,
          type: "mention",
          fileId,
          commentId: comment.id,
          actorId: me.userId,
          actorName: authorName,
          message: `${authorName} mentioned you: "${text.slice(0, 120)}"`,
        });
      }

      // Reply notification to the parent author (unless self or already mentioned).
      if (input.parentCommentId) {
        const parent = await tx.comment.findUnique({
          where: { id: input.parentCommentId },
          select: { authorId: true },
        });
        if (
          parent &&
          !access.identities.includes(parent.authorId) &&
          !mentions.includes(parent.authorId)
        ) {
          notifications.push({
            userId: parent.authorId,
            type: "reply",
            fileId,
            commentId: comment.id,
            actorId: me.userId,
            actorName: authorName,
            message: `${authorName} replied to your comment: "${text.slice(0, 120)}"`,
          });
        }
      }

      if (notifications.length > 0) {
        await tx.notification.createMany({
          data: notifications,
          skipDuplicates: true,
        });
      }

      return comment;
    });

    return NextResponse.json(serializeComment(created), { status: 201 });
  } catch (err) {
    console.error("[Comments POST]", err);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
