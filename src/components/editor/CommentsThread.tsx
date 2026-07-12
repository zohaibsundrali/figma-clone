"use client";

import { useState } from "react";
import { MessageCircle, CheckCircle2, Trash2 } from "lucide-react";
import type { Comment } from "@/types";

interface CommentsThreadProps {
  comments: Comment[];
  onResolve: (commentId: string, resolved: boolean) => Promise<void>;
  onReply: (parentId: string, text: string) => Promise<void>;
  onDelete: (commentId: string) => Promise<void>;
  currentUserId: string;
}

export function CommentsThread({
  comments,
  onResolve,
  onReply,
  onDelete,
  currentUserId,
}: CommentsThreadProps) {
  const [replyingTo, setReplyingTo] = useState<string | null>(null);
  const [replyText, setReplyText] = useState("");
  const [loading, setLoading] = useState(false);

  // Filter only top-level comments (no parentCommentId)
  const rootComments = comments.filter((c) => !c.parentCommentId);

  // Find replies for a comment
  const getReplies = (commentId: string) =>
    comments.filter((c) => c.parentCommentId === commentId);

  const handleReply = async (parentId: string) => {
    if (!replyText.trim()) return;
    setLoading(true);
    try {
      await onReply(parentId, replyText);
      setReplyText("");
      setReplyingTo(null);
    } finally {
      setLoading(false);
    }
  };

  const handleResolve = async (commentId: string, resolved: boolean) => {
    try {
      await onResolve(commentId, !resolved);
    } catch (err) {
      console.error("Failed to resolve comment:", err);
    }
  };

  const renderComment = (comment: Comment, isReply = false) => (
    <div
      key={comment.id}
      className={`flex gap-3 ${isReply ? "ml-8 mt-2 border-l border-muted pl-4" : "mt-4"}`}
    >
      {/* Avatar */}
      <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-blue-400 to-blue-600 text-xs font-bold text-white">
        {comment.authorName.charAt(0).toUpperCase()}
      </div>

      {/* Comment body */}
      <div className="flex-1">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium">{comment.authorName}</span>
          <span className="text-xs text-muted">
            {new Date(comment.createdAt).toLocaleDateString()} at{" "}
            {new Date(comment.createdAt).toLocaleTimeString()}
          </span>
          {comment.resolved && (
            <span className="text-xs font-semibold text-green-600">Resolved</span>
          )}
        </div>

        <p className="mt-1 text-sm text-foreground">{comment.text}</p>

        {/* Actions */}
        <div className="mt-2 flex gap-2 text-xs">
          <button
            onClick={() => handleResolve(comment.id, comment.resolved)}
            className="flex items-center gap-1 text-muted transition-colors hover:text-foreground"
          >
            <CheckCircle2 className="h-3.5 w-3.5" />
            {comment.resolved ? "Unresolve" : "Resolve"}
          </button>
          <button
            onClick={() => setReplyingTo(comment.id)}
            className="flex items-center gap-1 text-muted transition-colors hover:text-foreground"
          >
            <MessageCircle className="h-3.5 w-3.5" />
            Reply
          </button>
          {comment.authorId === currentUserId && (
            <button
              onClick={() => onDelete(comment.id)}
              className="flex items-center gap-1 text-muted transition-colors hover:text-red-500"
            >
              <Trash2 className="h-3.5 w-3.5" />
              Delete
            </button>
          )}
        </div>

        {/* Replies */}
        {!isReply && getReplies(comment.id).length > 0 && (
          <div className="mt-3">
            {getReplies(comment.id).map((reply) => renderComment(reply, true))}
          </div>
        )}

        {/* Reply input */}
        {replyingTo === comment.id && (
          <div className="mt-3 flex gap-2">
            <textarea
              autoFocus
              placeholder="Write a reply..."
              value={replyText}
              onChange={(e) => setReplyText(e.target.value)}
              className="flex-1 rounded border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-accent"
              rows={2}
            />
            <div className="flex flex-col gap-1">
              <button
                onClick={() => handleReply(comment.id)}
                disabled={loading || !replyText.trim()}
                className="rounded bg-accent px-3 py-1 text-xs font-medium text-white transition-opacity hover:opacity-90 disabled:opacity-50"
              >
                Reply
              </button>
              <button
                onClick={() => {
                  setReplyingTo(null);
                  setReplyText("");
                }}
                className="rounded border border-input px-3 py-1 text-xs transition-colors hover:bg-muted"
              >
                Cancel
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );

  if (comments.length === 0) {
    return (
      <div className="py-8 text-center text-sm text-muted">
        No comments yet. Click on the canvas to add one.
      </div>
    );
  }

  return <div>{rootComments.map((c) => renderComment(c))}</div>;
}
