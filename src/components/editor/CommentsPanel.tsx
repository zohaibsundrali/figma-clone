"use client";

import { useEffect, useState, useCallback } from "react";
import { MessageSquare, Plus, MoreHorizontal, Filter, Loader2 } from "lucide-react";
import { useEditorContext } from "./EditorContext";
import { useUser } from "@clerk/nextjs";

interface Comment {
  id: string;
  fileId: string;
  authorId: string;
  authorName: string;
  x: number;
  y: number;
  text: string;
  createdAt: string;
}

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
      createdAt: new Date().toISOString(),
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
          `/api/files/${fileId}/comments?commentId=${commentId}`,
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
      <div className="flex-1 overflow-y-auto py-1">
        {error && (
          <div className="mx-3 mb-2 rounded bg-red-500/10 px-3 py-2 text-xs text-red-400">
            {error}
          </div>
        )}

        {isLoading && comments.length === 0 ? (
          <div className="px-3 py-4 text-center text-xs text-muted">
            Loading comments...
          </div>
        ) : comments.length === 0 ? (
          <div className="px-3 py-4 text-center text-xs text-muted">
            <MessageSquare className="mx-auto mb-2 h-5 w-5 opacity-50" />
            No comments yet
          </div>
        ) : (
          comments.map((comment) => (
            <div
              key={comment.id}
              className="border-l-2 border-transparent px-3 py-2 transition-all hover:border-accent hover:bg-surface-elevated"
            >
              <div className="mb-1 flex items-start justify-between">
                <div className="flex items-center gap-2">
                  <div className="flex h-5 w-5 items-center justify-center rounded-full bg-accent text-[10px] font-bold text-white">
                    {(comment.authorName ?? "?").charAt(0).toUpperCase()}
                  </div>
                  <span className="text-xs font-semibold text-foreground">
                    {comment.authorName ?? "Anonymous"}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-[10px] text-muted">
                    {new Date(comment.createdAt).toLocaleDateString()}
                  </span>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      void handleDelete(comment.id);
                    }}
                    className="text-[10px] text-red-400 hover:text-red-300"
                  >
                    Delete
                  </button>
                </div>
              </div>
              <p className="line-clamp-3 text-xs leading-snug text-foreground/80">
                {comment.text}
              </p>
            </div>
          ))
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
