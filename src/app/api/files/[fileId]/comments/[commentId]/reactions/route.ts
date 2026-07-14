import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUserContext } from "@/lib/file-access";
import { getFileAccess } from "@/lib/comment-access";
import { reactionSchema } from "@/lib/comment-validation";
import { serializeComment } from "@/lib/comment-serialize";

type RouteParams = { params: Promise<{ fileId: string; commentId: string }> };

async function resolve(req: NextRequest, params: RouteParams["params"]) {
  const me = await getCurrentUserContext();
  if (!me) return { error: NextResponse.json({ error: "Unauthorized" }, { status: 401 }) };

  const { fileId, commentId } = await params;
  const access = await getFileAccess(fileId, me.userId, me.email);
  // Reacting is a form of commenting participation — require comment rights.
  if (!access.canComment) {
    return { error: NextResponse.json({ error: "Forbidden" }, { status: 403 }) };
  }

  let raw: unknown;
  try {
    raw = await req.json();
  } catch {
    return { error: NextResponse.json({ error: "Invalid JSON" }, { status: 400 }) };
  }
  const parsed = reactionSchema.safeParse(raw);
  if (!parsed.success) {
    return { error: NextResponse.json({ error: "Invalid emoji" }, { status: 400 }) };
  }

  const comment = await prisma.comment.findUnique({
    where: { id: commentId },
    select: { fileId: true },
  });
  if (!comment || comment.fileId !== fileId) {
    return { error: NextResponse.json({ error: "Not found" }, { status: 404 }) };
  }

  return { me, fileId, commentId, emoji: parsed.data.emoji };
}

async function serialize(commentId: string) {
  const updated = await prisma.comment.findUnique({
    where: { id: commentId },
    include: { reactions: true },
  });
  return updated ? serializeComment(updated) : null;
}

/** Add a reaction (idempotent — a user is never counted twice per emoji). */
export async function POST(req: NextRequest, { params }: RouteParams) {
  try {
    const r = await resolve(req, params);
    if ("error" in r) return r.error;

    await prisma.commentReaction.upsert({
      where: {
        commentId_userId_emoji: {
          commentId: r.commentId,
          userId: r.me.userId,
          emoji: r.emoji,
        },
      },
      create: {
        commentId: r.commentId,
        userId: r.me.userId,
        userName: r.me.name,
        emoji: r.emoji,
      },
      update: {},
    });

    return NextResponse.json(await serialize(r.commentId));
  } catch (err) {
    console.error("[Reaction POST]", err);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}

/** Remove the current user's reaction for the given emoji. */
export async function DELETE(req: NextRequest, { params }: RouteParams) {
  try {
    const r = await resolve(req, params);
    if ("error" in r) return r.error;

    await prisma.commentReaction.deleteMany({
      where: { commentId: r.commentId, userId: r.me.userId, emoji: r.emoji },
    });

    return NextResponse.json(await serialize(r.commentId));
  } catch (err) {
    console.error("[Reaction DELETE]", err);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
