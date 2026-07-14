import type { Comment, CommentReaction } from "@/generated/prisma/client";

/** One reaction group as sent to the client. */
export interface SerializedReaction {
  emoji: string;
  users: { userId: string; userName: string }[];
}

/** Comment shape returned by every comments API route. */
export interface SerializedComment {
  id: string;
  fileId: string;
  authorId: string;
  authorName: string;
  authorAvatar: string | null;
  x: number;
  y: number;
  text: string;
  shapeId: string | null;
  mentions: string[];
  edited: boolean;
  resolved: boolean;
  parentCommentId: string | null;
  createdAt: string;
  updatedAt: string;
  reactions: SerializedReaction[];
}

type CommentWithReactions = Comment & { reactions?: CommentReaction[] };

/** Group raw reaction rows by emoji, preserving first-reacted order. */
function groupReactions(reactions: CommentReaction[]): SerializedReaction[] {
  const order: string[] = [];
  const byEmoji = new Map<string, SerializedReaction>();

  for (const r of reactions) {
    let group = byEmoji.get(r.emoji);
    if (!group) {
      group = { emoji: r.emoji, users: [] };
      byEmoji.set(r.emoji, group);
      order.push(r.emoji);
    }
    // Guard against a user being counted twice for the same emoji.
    if (!group.users.some((u) => u.userId === r.userId)) {
      group.users.push({ userId: r.userId, userName: r.userName });
    }
  }

  return order.map((e) => byEmoji.get(e)!);
}

export function serializeComment(comment: CommentWithReactions): SerializedComment {
  return {
    id: comment.id,
    fileId: comment.fileId,
    authorId: comment.authorId,
    authorName: comment.authorName,
    authorAvatar: comment.authorAvatar,
    x: comment.x,
    y: comment.y,
    text: comment.text,
    shapeId: comment.shapeId,
    mentions: comment.mentions,
    edited: comment.edited,
    resolved: comment.resolved,
    parentCommentId: comment.parentCommentId,
    createdAt: comment.createdAt.toISOString(),
    updatedAt: comment.updatedAt.toISOString(),
    reactions: groupReactions(comment.reactions ?? []),
  };
}
