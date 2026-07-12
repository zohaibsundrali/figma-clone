"use client";

import { useEffect, useState, useCallback } from "react";
import { MessageSquare, Plus, MoreHorizontal, Filter, Loader2 } from "lucide-react";
import { CommentsThread } from "./CommentsThread";
import { useEditorContext } from "./EditorContext";
import { useUser } from "@clerk/nextjs";
import type { Comment } from "@/types";

export function CommentsPanel({ fileId }: { fileId: string }) {
  const { editor, isCommentsMode, comments, setComments } = useEditorContext();
  const { user } = useUser();

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isCommentsMode) return;
    
    const controller = new AbortController();
    
    async function fetchComments() {
      setIsLoading(true);
      setError(null);
      
      try {
        const res = await fetch(`/api/files/${fileId}/comments`, {
          signal: controller.signal,
        });

        if (!res.ok) {
          const body = await res.text();
          throw new Error(body || `HTTP ${res.status}`);
        }

        const data = (await res.json()) as Comment[];
        if (!Array.isArray(data)) throw new Error("Invalid response from server");

        setComments(data);
      } catch (err) {
        if ((err as Error).name === "AbortError") return;
        const msg = err instanceof Error ? err.message : "Failed to load comments";
        console.error("[CommentsPanel] fetch error:", err);
        setError(msg);
      } finally {
        if (!controller.signal.aborted) {
          setIsLoading(false);
        }
      }
    }
    
    void fetchComments();

    return () => {
      controller.abort();
    };
  }, [isCommentsMode, fileId, setComments]);

  const handleNewComment = useCallback(async () => {
    if (!editor) return;
    const center = editor.getViewportPageBounds()?.center ?? { x: 0, y: 0 };

    const text = prompt("Enter your comment:");
    if (!text?.trim()) return;

    setError(null);

    // ── Optimistic update ────────────────────────────────────────────────────
    // Add a temporary comment instantly so the user sees it right away.
    // We replace it with the real server response once the POST completes.
    const tempId = `temp-${Date.now()}`;
    const optimisticComment: Comment = {
      id: tempId,
      fileId,
      authorId: user?.id ?? "unknown",
      authorName: user?.fullName ?? user?.username ?? "Anonymous",
      x: center.x,
      y: center.y,
      text: text.trim(),
      resolved: false,
      parentCommentId: null,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    setComments((prev) => [optimisticComment, ...prev]);

    try {
      const res = await fetch(`/api/files/${fileId}/comments`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          text: text.trim(),
          x: center.x,
          y: center.y,
          authorName: user?.fullName ?? user?.username ?? "Anonymous",
        }),
      });

      if (!res.ok) {
        // Roll back the optimistic entry on failure
        setComments((prev) => prev.filter((c) => c.id !== tempId));
        const body = await res.text();
        throw new Error(body || `HTTP ${res.status}`);
      }

      const savedComment = (await res.json()) as Comment;

      // Swap temp entry with the real persisted comment from the server
      setComments((prev) =>
        prev.map((c) => (c.id === tempId ? savedComment : c))
      );
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Failed to add comment";
      console.error("[CommentsPanel] add error:", err);
      setError(msg);
    }
  }, [editor, fileId, user, setComments]);

  const handleDelete = useCallback(
    async (commentId: string) => {
      // Optimistic removal — remove immediately, restore on failure
      const previous = comments;
      setComments((prev) => prev.filter((c) => c.id !== commentId));

      try {
        const res = await fetch(
          `/api/files/${fileId}/comments/${commentId}`,
          { method: "DELETE" }
        );

        if (!res.ok) {
          // Restore list if delete failed
          setComments(previous);
          const body = await res.text();
          throw new Error(body || `HTTP ${res.status}`);
        }
      } catch (err) {
        const msg = err instanceof Error ? err.message : "Failed to delete comment";
        console.error("[CommentsPanel] delete error:", err);
        setError(msg);
      }
    },
    [fileId, comments, setComments]
  );

  const handleResolve = useCallback(
    async (commentId: string, resolved: boolean) => {
      try {
        const res = await fetch(
          `/api/files/${fileId}/comments/${commentId}`,
          {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ resolved: !resolved }),
          }
        );

        if (!res.ok) {
          const body = await res.text();
          throw new Error(body || `HTTP ${res.status}`);
        }

        const updated = await res.json();
        setComments((prev) =>
          prev.map((c) => (c.id === commentId ? updated : c))
        );
      } catch (err) {
        const msg = err instanceof Error ? err.message : "Failed to resolve comment";
        console.error("[CommentsPanel] resolve error:", err);
        setError(msg);
      }
    },
    [fileId, setComments]
  );

  const handleReply = useCallback(
    async (parentId: string, text: string) => {
      try {
        const res = await fetch(`/api/files/${fileId}/comments`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            text: text.trim(),
            x: 0,
            y: 0,
            parentCommentId: parentId,
            authorName: user?.fullName ?? user?.username ?? "Anonymous",
          }),
        });

        if (!res.ok) {
          const body = await res.text();
          throw new Error(body || `HTTP ${res.status}`);
        }

        const newReply = await res.json();
        setComments((prev) => [...prev, newReply]);
      } catch (err) {
        const msg = err instanceof Error ? err.message : "Failed to add reply";
        console.error("[CommentsPanel] reply error:", err);
        setError(msg);
      }
    },
    [fileId, user, setComments]
  );

  return (
    <aside className="flex w-60 flex-col border-r border-border bg-surface">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-border px-3 py-2">
        <h2 className="text-xs font-bold uppercase tracking-wider text-foreground">
          Comments
        </h2>
        <div className="flex items-center gap-1">
          {isLoading && <Loader2 className="h-3 w-3 animate-spin text-muted" />}
          <button className="flex h-6 w-6 items-center justify-center rounded text-muted hover:bg-surface-elevated hover:text-foreground">
            <Filter className="h-3.5 w-3.5" />
          </button>
          <button className="flex h-6 w-6 items-center justify-center rounded text-muted hover:bg-surface-elevated hover:text-foreground">
            <MoreHorizontal className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>

      {/* Body */}
      <div className="flex-1 overflow-y-auto px-3 py-3">
        {error && (
          <div className="mb-2 rounded bg-red-500/10 px-3 py-2 text-xs text-red-400">
            {error}
          </div>
        )}

        {isLoading && comments.length === 0 ? (
          <div className="py-4 text-center text-xs text-muted">
            Loading comments...
          </div>
        ) : (
          <CommentsThread
            comments={comments}
            onResolve={handleResolve}
            onReply={handleReply}
            onDelete={handleDelete}
            currentUserId={user?.id ?? ""}
          />
        )}
      </div>

      {/* Footer */}
      <div className="border-t border-border bg-[#0a0e14] p-3">
        <button
          onClick={() => void handleNewComment()}
          disabled={isLoading}
          className="flex w-full items-center justify-center gap-2 rounded-lg bg-surface-elevated py-2 text-xs font-medium text-foreground transition-colors hover:bg-border disabled:cursor-not-allowed disabled:opacity-50"
        >
          <Plus className="h-4 w-4" />
          New Comment
        </button>
      </div>
    </aside>
  );
}
