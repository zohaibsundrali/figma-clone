"use client";

import { useState, useEffect, useRef } from "react";
import {
  MessageCircle,
  CheckCircle2,
  Trash2,
  Pencil,
  SmilePlus,
  X,
} from "lucide-react";
import { MentionInput } from "./MentionInput";
import { renderTextWithMentions } from "./mention-utils";
import type { Comment, CommentAccess, MentionMember } from "@/types";

const EMOJIS = ["👍", "❤️", "😂", "🎉", "😮", "👀"];

interface CommentsThreadProps {
  comments: Comment[];
  members: MentionMember[];
  access: CommentAccess | null;
  currentUserId: string;
  currentUserEmail: string;
  showResolved: boolean;
  activeCommentId: string | null;
  onResolve: (commentId: string, resolved: boolean) => Promise<void>;
  onReply: (parentId: string, text: string) => Promise<void>;
  onEdit: (commentId: string, text: string) => Promise<void>;
  onDelete: (commentId: string) => Promise<void>;
  onReact: (commentId: string, emoji: string, mine: boolean) => Promise<void>;
}

export function CommentsThread({
  comments,
  members,
  access,
  currentUserId,
  currentUserEmail,
  showResolved,
  activeCommentId,
  onResolve,
  onReply,
  onEdit,
  onDelete,
  onReact,
}: CommentsThreadProps) {
  const [replyingTo, setReplyingTo] = useState<string | null>(null);
  const [replyText, setReplyText] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editText, setEditText] = useState("");
  const [busy, setBusy] = useState(false);
  const [pickerFor, setPickerFor] = useState<string | null>(null);
  const activeRef = useRef<HTMLDivElement>(null);

  const isMine = (authorId: string) =>
    authorId === currentUserId ||
    (currentUserEmail.length > 0 && authorId === currentUserEmail);

  // Scroll the focused comment (from a pin/notification click) into view.
  useEffect(() => {
    if (activeCommentId && activeRef.current) {
      activeRef.current.scrollIntoView({ behavior: "smooth", block: "center" });
    }
  }, [activeCommentId, comments]);

  const rootComments = comments
    .filter((c) => !c.parentCommentId)
    .filter((c) => (showResolved ? true : !c.resolved));

  const getReplies = (commentId: string) =>
    comments
      .filter((c) => c.parentCommentId === commentId)
      .sort((a, b) => a.createdAt.localeCompare(b.createdAt));

  const submitReply = async (parentId: string) => {
    if (!replyText.trim() || busy) return;
    setBusy(true);
    try {
      await onReply(parentId, replyText);
      setReplyText("");
      setReplyingTo(null);
    } catch {
      /* error surfaced by parent */
    } finally {
      setBusy(false);
    }
  };

  const submitEdit = async (commentId: string) => {
    if (!editText.trim() || busy) return;
    setBusy(true);
    try {
      await onEdit(commentId, editText);
      setEditingId(null);
      setEditText("");
    } catch {
      /* error surfaced by parent */
    } finally {
      setBusy(false);
    }
  };

  const renderComment = (comment: Comment, isReply = false) => {
    const mine = isMine(comment.authorId);
    const canModify = mine || Boolean(access?.isAdmin);
    const canResolve = Boolean(access?.canResolve);
    const canComment = access?.canComment ?? true;
    const isActive = comment.id === activeCommentId;
    const editing = editingId === comment.id;

    return (
      <div
        key={comment.id}
        ref={isActive ? activeRef : undefined}
        className={`flex gap-3 rounded-lg ${
          isReply ? "ml-6 mt-2 border-l border-border pl-3" : "mt-3 p-1"
        } ${isActive ? "ring-1 ring-accent/60 bg-accent/5" : ""} ${
          comment.resolved ? "opacity-70" : ""
        }`}
      >
        {/* Avatar */}
        {comment.authorAvatar ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={comment.authorAvatar}
            alt={comment.authorName}
            className="h-7 w-7 flex-shrink-0 rounded-full object-cover"
          />
        ) : (
          <div className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-blue-400 to-blue-600 text-xs font-bold text-white">
            {comment.authorName.charAt(0).toUpperCase()}
          </div>
        )}

        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5">
            <span className="text-sm font-medium">{comment.authorName}</span>
            <span className="text-[11px] text-muted">
              {new Date(comment.createdAt).toLocaleString()}
            </span>
            {comment.edited && (
              <span className="text-[10px] italic text-muted">(edited)</span>
            )}
            {comment.resolved && (
              <span className="flex items-center gap-0.5 text-[10px] font-semibold text-green-500">
                <CheckCircle2 className="h-3 w-3" /> Resolved
              </span>
            )}
          </div>

          {editing ? (
            <div className="mt-2 space-y-2">
              <MentionInput
                value={editText}
                onChange={setEditText}
                members={members}
                autoFocus
                rows={2}
                onSubmit={() => void submitEdit(comment.id)}
              />
              <div className="flex gap-2">
                <button
                  onClick={() => void submitEdit(comment.id)}
                  disabled={busy || !editText.trim()}
                  className="rounded bg-accent px-3 py-1 text-xs font-medium text-white disabled:opacity-50"
                >
                  Save
                </button>
                <button
                  onClick={() => {
                    setEditingId(null);
                    setEditText("");
                  }}
                  className="rounded border border-input px-3 py-1 text-xs hover:bg-border"
                >
                  Cancel
                </button>
              </div>
            </div>
          ) : (
            <p className="mt-1 whitespace-pre-wrap break-words text-sm text-foreground">
              {renderTextWithMentions(comment.text)}
            </p>
          )}

          {/* Reactions */}
          {!editing && (
            <div className="mt-2 flex flex-wrap items-center gap-1">
              {comment.reactions.map((r) => {
                const reactedByMe = r.users.some(
                  (u) => u.userId === currentUserId || u.userId === currentUserEmail
                );
                return (
                  <button
                    key={r.emoji}
                    onClick={() => void onReact(comment.id, r.emoji, reactedByMe)}
                    disabled={!canComment}
                    title={r.users.map((u) => u.userName).join(", ")}
                    className={`flex items-center gap-1 rounded-full border px-1.5 py-0.5 text-xs transition-colors disabled:opacity-50 ${
                      reactedByMe
                        ? "border-accent bg-accent/15 text-accent"
                        : "border-border text-muted hover:bg-border"
                    }`}
                  >
                    <span>{r.emoji}</span>
                    <span>{r.users.length}</span>
                  </button>
                );
              })}

              {canComment && (
                <div className="relative">
                  <button
                    onClick={() =>
                      setPickerFor((id) => (id === comment.id ? null : comment.id))
                    }
                    className="flex h-6 w-6 items-center justify-center rounded-full text-muted hover:bg-border hover:text-foreground"
                    title="Add reaction"
                  >
                    <SmilePlus className="h-3.5 w-3.5" />
                  </button>
                  {pickerFor === comment.id && (
                    <div className="absolute bottom-full left-0 z-[80] mb-1 flex gap-1 rounded-lg border border-border bg-surface-elevated p-1 shadow-xl">
                      {EMOJIS.map((emoji) => {
                        const group = comment.reactions.find((g) => g.emoji === emoji);
                        const mineReact = group?.users.some(
                          (u) =>
                            u.userId === currentUserId ||
                            u.userId === currentUserEmail
                        );
                        return (
                          <button
                            key={emoji}
                            onClick={() => {
                              void onReact(comment.id, emoji, Boolean(mineReact));
                              setPickerFor(null);
                            }}
                            className="rounded p-1 text-base hover:bg-border"
                          >
                            {emoji}
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Actions */}
          {!editing && (
            <div className="mt-2 flex flex-wrap gap-3 text-xs">
              {!isReply && canComment && (
                <button
                  onClick={() => {
                    setReplyingTo(comment.id);
                    setReplyText("");
                  }}
                  className="flex items-center gap-1 text-muted hover:text-foreground"
                >
                  <MessageCircle className="h-3.5 w-3.5" /> Reply
                </button>
              )}
              {!isReply && canResolve && (
                <button
                  onClick={() => void onResolve(comment.id, !comment.resolved)}
                  className="flex items-center gap-1 text-muted hover:text-foreground"
                >
                  <CheckCircle2 className="h-3.5 w-3.5" />
                  {comment.resolved ? "Reopen" : "Resolve"}
                </button>
              )}
              {canModify && (
                <button
                  onClick={() => {
                    setEditingId(comment.id);
                    setEditText(comment.text);
                  }}
                  className="flex items-center gap-1 text-muted hover:text-foreground"
                >
                  <Pencil className="h-3.5 w-3.5" /> Edit
                </button>
              )}
              {canModify && (
                <button
                  onClick={() => void onDelete(comment.id)}
                  className="flex items-center gap-1 text-muted hover:text-red-500"
                >
                  <Trash2 className="h-3.5 w-3.5" /> Delete
                </button>
              )}
            </div>
          )}

          {/* Replies */}
          {!isReply && getReplies(comment.id).length > 0 && (
            <div className="mt-2">
              {getReplies(comment.id).map((reply) => renderComment(reply, true))}
            </div>
          )}

          {/* Reply composer */}
          {replyingTo === comment.id && (
            <div className="mt-3 space-y-2">
              <MentionInput
                value={replyText}
                onChange={setReplyText}
                members={members}
                placeholder="Write a reply… use @ to mention"
                autoFocus
                rows={2}
                onSubmit={() => void submitReply(comment.id)}
              />
              <div className="flex gap-2">
                <button
                  onClick={() => void submitReply(comment.id)}
                  disabled={busy || !replyText.trim()}
                  className="rounded bg-accent px-3 py-1 text-xs font-medium text-white disabled:opacity-50"
                >
                  Reply
                </button>
                <button
                  onClick={() => {
                    setReplyingTo(null);
                    setReplyText("");
                  }}
                  className="flex items-center gap-1 rounded border border-input px-3 py-1 text-xs hover:bg-border"
                >
                  <X className="h-3 w-3" /> Cancel
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    );
  };

  if (rootComments.length === 0) {
    return (
      <div className="py-8 text-center text-sm text-muted">
        {comments.some((c) => c.resolved) && !showResolved
          ? "All comments resolved. Toggle the filter to show them."
          : "No comments yet. Click on the canvas to add one."}
      </div>
    );
  }

  return <div>{rootComments.map((c) => renderComment(c))}</div>;
}
