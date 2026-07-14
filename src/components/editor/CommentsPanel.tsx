"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { MessageSquare, Plus, Filter, Loader2, RefreshCw, X } from "lucide-react";
import { CommentsThread } from "./CommentsThread";
import { MentionInput } from "./MentionInput";
import { extractMentionIds } from "./mention-utils";
import { useEditorContext } from "./EditorContext";
import { useBroadcastEvent, useEventListener } from "@/lib/liveblocks";
import { useUser } from "@clerk/nextjs";
import type { Comment, CommentAccess, MentionMember } from "@/types";

interface CommentsPanelProps {
  fileId: string;
  readonly?: boolean;
}

/**
 * Bridges Liveblocks room events into the panel. Rendered only when a room is
 * available (non-readonly), so the liveblocks hooks never run outside a room.
 */
function RoomBridge({
  onRemoteChange,
  bindBroadcast,
}: {
  onRemoteChange: () => void;
  bindBroadcast: (fn: () => void) => void;
}) {
  const broadcast = useBroadcastEvent();
  useEffect(() => {
    bindBroadcast(() => broadcast({ type: "comments-updated" }));
  }, [broadcast, bindBroadcast]);
  useEventListener(({ event }) => {
    if (event.type === "comments-updated") onRemoteChange();
  });
  return null;
}

export function CommentsPanel({ fileId, readonly = false }: CommentsPanelProps) {
  const {
    editor,
    isCommentsMode,
    comments,
    setComments,
    draftComment,
    setDraftComment,
    activeCommentId,
    setActiveCommentId,
    mentionMembers,
    setMentionMembers,
    commentAccess,
    setCommentAccess,
  } = useEditorContext();
  const { user } = useUser();

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showResolved, setShowResolved] = useState(false);
  const [draftText, setDraftText] = useState("");
  const [submitting, setSubmitting] = useState(false);

  // A retry action captured from the last failed mutation.
  const [retry, setRetry] = useState<(() => void) | null>(null);

  const broadcastRef = useRef<(() => void) | null>(null);
  const broadcast = useCallback(() => broadcastRef.current?.(), []);

  const authorName =
    user?.fullName ?? user?.username ?? user?.primaryEmailAddress?.emailAddress ?? "Anonymous";
  const authorAvatar = user?.imageUrl ?? null;

  // ── Data loading ──────────────────────────────────────────────────────────
  const loadComments = useCallback(
    async (signal?: AbortSignal) => {
      const res = await fetch(`/api/files/${fileId}/comments`, { signal });
      if (!res.ok) throw new Error((await res.text()) || `HTTP ${res.status}`);
      const data = (await res.json()) as Comment[];
      if (!Array.isArray(data)) throw new Error("Invalid response from server");
      setComments(data);
    },
    [fileId, setComments]
  );

  useEffect(() => {
    if (!isCommentsMode) return;
    const controller = new AbortController();

    (async () => {
      setIsLoading(true);
      setError(null);
      try {
        await loadComments(controller.signal);
        // Mention candidates + this user's permissions (best-effort).
        const [membersRes, accessRes] = await Promise.all([
          fetch(`/api/files/${fileId}/members`, { signal: controller.signal }),
          fetch(`/api/files/${fileId}/access`, { signal: controller.signal }),
        ]);
        if (membersRes.ok) setMentionMembers((await membersRes.json()) as MentionMember[]);
        if (accessRes.ok) setCommentAccess((await accessRes.json()) as CommentAccess);
      } catch (err) {
        if ((err as Error).name === "AbortError") return;
        setError(err instanceof Error ? err.message : "Failed to load comments");
      } finally {
        if (!controller.signal.aborted) setIsLoading(false);
      }
    })();

    return () => controller.abort();
  }, [isCommentsMode, fileId, loadComments, setMentionMembers, setCommentAccess]);

  // Realtime: refetch on remote change (debounced so bursts collapse).
  const refetchTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const handleRemoteChange = useCallback(() => {
    if (refetchTimer.current) clearTimeout(refetchTimer.current);
    refetchTimer.current = setTimeout(() => {
      void loadComments().catch(() => {/* transient; next event retries */});
    }, 150);
  }, [loadComments]);

  // ── Mutations ─────────────────────────────────────────────────────────────
  const canComment = commentAccess?.canComment ?? true;

  const submitDraft = useCallback(async () => {
    if (!draftComment || !draftText.trim() || submitting) return;
    setSubmitting(true);
    setError(null);

    const text = draftText.trim();
    const mentions = extractMentionIds(text);
    const tempId = `temp-${Date.now()}`;
    const optimistic: Comment = {
      id: tempId,
      fileId,
      authorId: user?.id ?? "me",
      authorName,
      authorAvatar,
      x: draftComment.x,
      y: draftComment.y,
      text,
      shapeId: draftComment.shapeId,
      mentions,
      edited: false,
      resolved: false,
      parentCommentId: null,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      reactions: [],
    };
    setComments((prev) => [...prev, optimistic]);
    setDraftText("");
    setDraftComment(null);

    try {
      const res = await fetch(`/api/files/${fileId}/comments`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          text,
          x: draftComment.x,
          y: draftComment.y,
          shapeId: draftComment.shapeId,
          mentions,
          authorName,
          authorAvatar,
        }),
      });
      if (!res.ok) throw new Error((await res.text()) || `HTTP ${res.status}`);
      const saved = (await res.json()) as Comment;
      setComments((prev) => prev.map((c) => (c.id === tempId ? saved : c)));
      setActiveCommentId(saved.id);
      broadcast();
    } catch (err) {
      setComments((prev) => prev.filter((c) => c.id !== tempId));
      setError(err instanceof Error ? err.message : "Failed to add comment");
      setRetry(() => () => {
        setDraftComment(optimistic);
        setDraftText(text);
      });
    } finally {
      setSubmitting(false);
    }
  }, [
    draftComment, draftText, submitting, fileId, user, authorName, authorAvatar,
    setComments, setDraftComment, setActiveCommentId, broadcast,
  ]);

  const handleReply = useCallback(
    async (parentId: string, text: string) => {
      setError(null);
      const mentions = extractMentionIds(text);
      try {
        const res = await fetch(`/api/files/${fileId}/comments`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            text: text.trim(), x: 0, y: 0, parentCommentId: parentId,
            mentions, authorName, authorAvatar,
          }),
        });
        if (!res.ok) throw new Error((await res.text()) || `HTTP ${res.status}`);
        const reply = (await res.json()) as Comment;
        setComments((prev) => (prev.some((c) => c.id === reply.id) ? prev : [...prev, reply]));
        broadcast();
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to add reply");
        setRetry(() => () => void handleReply(parentId, text));
        throw err;
      }
    },
    [fileId, authorName, authorAvatar, setComments, broadcast]
  );

  const handleEdit = useCallback(
    async (commentId: string, text: string) => {
      setError(null);
      const mentions = extractMentionIds(text);
      const res = await fetch(`/api/files/${fileId}/comments/${commentId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: text.trim(), mentions }),
      });
      if (!res.ok) {
        const msg = (await res.text()) || `HTTP ${res.status}`;
        setError(msg);
        throw new Error(msg);
      }
      const updated = (await res.json()) as Comment;
      setComments((prev) => prev.map((c) => (c.id === commentId ? updated : c)));
      broadcast();
    },
    [fileId, setComments, broadcast]
  );

  const handleDelete = useCallback(
    async (commentId: string) => {
      setError(null);
      const previous = comments;
      setComments((prev) =>
        prev.filter((c) => c.id !== commentId && c.parentCommentId !== commentId)
      );
      try {
        const res = await fetch(`/api/files/${fileId}/comments/${commentId}`, {
          method: "DELETE",
        });
        if (!res.ok) throw new Error((await res.text()) || `HTTP ${res.status}`);
        broadcast();
      } catch (err) {
        setComments(previous);
        setError(err instanceof Error ? err.message : "Failed to delete comment");
        setRetry(() => () => void handleDelete(commentId));
      }
    },
    [fileId, comments, setComments, broadcast]
  );

  const handleResolve = useCallback(
    async (commentId: string, resolved: boolean) => {
      setError(null);
      // Optimistic toggle.
      setComments((prev) =>
        prev.map((c) => (c.id === commentId ? { ...c, resolved } : c))
      );
      try {
        const res = await fetch(`/api/files/${fileId}/comments/${commentId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ resolved }),
        });
        if (!res.ok) throw new Error((await res.text()) || `HTTP ${res.status}`);
        const updated = (await res.json()) as Comment;
        setComments((prev) => prev.map((c) => (c.id === commentId ? updated : c)));
        broadcast();
      } catch (err) {
        setComments((prev) =>
          prev.map((c) => (c.id === commentId ? { ...c, resolved: !resolved } : c))
        );
        setError(err instanceof Error ? err.message : "Failed to update thread");
        setRetry(() => () => void handleResolve(commentId, resolved));
      }
    },
    [fileId, setComments, broadcast]
  );

  const handleReact = useCallback(
    async (commentId: string, emoji: string, mine: boolean) => {
      setError(null);
      try {
        const res = await fetch(
          `/api/files/${fileId}/comments/${commentId}/reactions`,
          {
            method: mine ? "DELETE" : "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ emoji }),
          }
        );
        if (!res.ok) throw new Error((await res.text()) || `HTTP ${res.status}`);
        const updated = (await res.json()) as Comment;
        setComments((prev) => prev.map((c) => (c.id === commentId ? updated : c)));
        broadcast();
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to update reaction");
      }
    },
    [fileId, setComments, broadcast]
  );

  // "New Comment" button → drop a draft at the current viewport center.
  const startCenterDraft = useCallback(() => {
    const center = editor?.getViewportPageBounds()?.center ?? { x: 0, y: 0 };
    const selected = editor?.getOnlySelectedShapeId?.() ?? null;
    setDraftComment({ x: center.x, y: center.y, shapeId: selected });
    setActiveCommentId(null);
  }, [editor, setDraftComment, setActiveCommentId]);

  const runRetry = () => {
    const r = retry;
    setRetry(null);
    setError(null);
    r?.();
  };

  const rootCount = comments.filter((c) => !c.parentCommentId).length;

  return (
    <aside className="flex w-60 flex-col border-r border-border bg-surface">
      {!readonly && (
        <RoomBridge
          onRemoteChange={handleRemoteChange}
          bindBroadcast={(fn) => (broadcastRef.current = fn)}
        />
      )}

      {/* Header */}
      <div className="flex items-center justify-between border-b border-border px-3 py-2">
        <h2 className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-foreground">
          <MessageSquare className="h-3.5 w-3.5" />
          Comments
          {rootCount > 0 && <span className="text-muted">({rootCount})</span>}
        </h2>
        <div className="flex items-center gap-1">
          {isLoading && <Loader2 className="h-3 w-3 animate-spin text-muted" />}
          <button
            onClick={() => setShowResolved((v) => !v)}
            title={showResolved ? "Hide resolved" : "Show resolved"}
            className={`flex h-6 items-center gap-1 rounded px-1.5 text-[11px] ${
              showResolved
                ? "bg-accent/20 text-accent"
                : "text-muted hover:bg-surface-elevated hover:text-foreground"
            }`}
          >
            <Filter className="h-3.5 w-3.5" />
            {showResolved ? "All" : "Open"}
          </button>
        </div>
      </div>

      {/* Body */}
      <div className="flex-1 overflow-y-auto px-3 py-3">
        {error && (
          <div className="mb-2 flex items-start justify-between gap-2 rounded bg-red-500/10 px-3 py-2 text-xs text-red-400">
            <span className="flex-1">{error}</span>
            <div className="flex items-center gap-1">
              {retry && (
                <button
                  onClick={runRetry}
                  className="flex items-center gap-1 rounded px-1.5 py-0.5 text-red-300 hover:bg-red-500/20"
                >
                  <RefreshCw className="h-3 w-3" /> Retry
                </button>
              )}
              <button onClick={() => setError(null)} className="hover:text-red-200">
                <X className="h-3 w-3" />
              </button>
            </div>
          </div>
        )}

        {isLoading && comments.length === 0 ? (
          <div className="py-4 text-center text-xs text-muted">Loading comments…</div>
        ) : (
          <CommentsThread
            comments={comments}
            members={mentionMembers}
            access={commentAccess}
            currentUserId={user?.id ?? ""}
            currentUserEmail={user?.primaryEmailAddress?.emailAddress ?? ""}
            showResolved={showResolved}
            activeCommentId={activeCommentId}
            onResolve={handleResolve}
            onReply={handleReply}
            onEdit={handleEdit}
            onDelete={handleDelete}
            onReact={handleReact}
          />
        )}
      </div>

      {/* Footer / composer */}
      <div className="border-t border-border bg-[#0a0e14] p-3">
        {draftComment ? (
          <div className="space-y-2">
            <div className="flex items-center justify-between text-[11px] text-muted">
              <span>
                {draftComment.shapeId ? "Comment on selected layer" : "New comment"}
              </span>
              <button
                onClick={() => {
                  setDraftComment(null);
                  setDraftText("");
                }}
                className="hover:text-foreground"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
            <MentionInput
              value={draftText}
              onChange={setDraftText}
              members={mentionMembers}
              placeholder="Write a comment… use @ to mention"
              autoFocus
              rows={3}
              onSubmit={() => void submitDraft()}
            />
            <button
              onClick={() => void submitDraft()}
              disabled={submitting || !draftText.trim()}
              className="flex w-full items-center justify-center gap-2 rounded-lg bg-accent py-2 text-xs font-medium text-white transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
              Comment
            </button>
          </div>
        ) : (
          <button
            onClick={startCenterDraft}
            disabled={!canComment}
            title={canComment ? undefined : "You have read-only access"}
            className="flex w-full items-center justify-center gap-2 rounded-lg bg-surface-elevated py-2 text-xs font-medium text-foreground transition-colors hover:bg-border disabled:cursor-not-allowed disabled:opacity-50"
          >
            <Plus className="h-4 w-4" />
            New Comment
          </button>
        )}
        {!canComment && (
          <p className="mt-2 text-center text-[10px] text-muted">
            You have read-only access to comments.
          </p>
        )}
      </div>
    </aside>
  );
}
