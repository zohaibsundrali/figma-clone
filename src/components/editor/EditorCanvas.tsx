"use client";

import type { JsonObject } from "@liveblocks/client";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  Tldraw,
  getSnapshot,
  loadSnapshot,
  useEditor,
  track,
  type Editor,
} from "tldraw";
import "tldraw/tldraw.css";
import { useEditorContext } from "./EditorContext";
import {
  useMutation,
  useOthers,
  useStorage,
  useUpdateMyPresence,
} from "@/lib/liveblocks";

interface CanvasInnerProps {
  initialData: unknown | null;
  readonly: boolean;
  onSave: (data: unknown, getThumbnail?: () => Promise<string | null>) => void;
}

async function captureThumbnail(editor: Editor): Promise<string | null> {
  try {
    const shapeIds = editor.getCurrentPageShapeIds();
    if (shapeIds.size === 0) return null;
    const result = await editor.toImageDataUrl([...shapeIds], {
      format: "png",
      scale: 0.3,
      background: true,
    });
    return result.url;
  } catch {
    return null;
  }
}

function CanvasInner({
  initialData,
  readonly,
  onSave,
}: CanvasInnerProps) {
  const editor = useEditor();
  const { setEditor } = useEditorContext();
  const updatePresence = useUpdateMyPresence();

  // Liveblocks shared storage — used for real-time collaboration sync
  const root = useStorage((root) => root);
  const isStorageLoaded = root !== null;
  const canvasData = root?.canvasData;
  const updateStorage = useMutation(
    ({ storage }, data: JsonObject | null) => {
      storage.set("canvasData", data);
    },
    []
  );

  // loadedRef prevents loading the snapshot more than once per mount
  const loadedRef = useRef(false);

  // ── Register editor instance in context ──────────────────────────────────
  useEffect(() => {
    setEditor(editor);
    return () => setEditor(null);
  }, [editor, setEditor]);

  // ── Load initial snapshot exactly once ───────────────────────────────────
  // Priority: Liveblocks canvasData (if already synced) > DB initialData
  useEffect(() => {
    if (!editor || loadedRef.current || !isStorageLoaded) return;

    // Use Liveblocks data if it arrived already, otherwise fall back to DB data
    const data = (canvasData ?? initialData) as Parameters<typeof loadSnapshot>[1] | null;

    if (data) {
      try {
        loadSnapshot(editor.store, data);
      } catch {
        // Snapshot may be from an incompatible version — start with blank canvas
        console.warn("[EditorCanvas] Could not load snapshot, starting blank");
      }
    }

    loadedRef.current = true;
  // Intentionally omit canvasData from deps: we only want this to fire once
  // when the editor is ready. canvasData changes are handled by the sync effect below.
  }, [editor, initialData, canvasData, isStorageLoaded]);

  // ── Listen for user-initiated changes → Liveblocks sync + autosave delegate
  useEffect(() => {
    if (!editor || readonly || !isStorageLoaded) return;

    const cleanup = editor.store.listen(
      () => {
        const snapshot = getSnapshot(editor.store);

        // Keep Liveblocks storage in sync for real-time collaboration
        updateStorage(snapshot as unknown as JsonObject);

        void onSave(snapshot, () => captureThumbnail(editor));
      },
      // source: "user"  → only fires for user interactions, not loadSnapshot calls
      // scope: "document" → only fires for shape/content changes, not camera/selection
      { source: "user", scope: "document" }
    );

    return () => {
      cleanup();
    };
  }, [editor, readonly, onSave, updateStorage, isStorageLoaded]);

  // ── Apply remote Liveblocks updates (another user drew something) ─────────
  useEffect(() => {
    if (!editor || readonly || !canvasData || !loadedRef.current || !isStorageLoaded) return;

    const current = getSnapshot(editor.store);
    // Skip if the remote data matches what we already have
    if (JSON.stringify(current) === JSON.stringify(canvasData)) return;

    try {
      loadSnapshot(
        editor.store,
        canvasData as Parameters<typeof loadSnapshot>[1]
      );
    } catch {
      // ignore incompatible remote snapshot
    }
  }, [canvasData, editor, readonly, isStorageLoaded]);

  // ── Track cursor for presence avatars ────────────────────────────────────
  useEffect(() => {
    if (!editor || readonly) return;

    function handlePointerMove(e: PointerEvent) {
      const rect = editor.getContainer().getBoundingClientRect();
      updatePresence({
        cursor: { x: e.clientX - rect.left, y: e.clientY - rect.top },
      });
    }

    function handlePointerLeave() {
      updatePresence({ cursor: null });
    }

    const container = editor.getContainer();
    container.addEventListener("pointermove", handlePointerMove);
    container.addEventListener("pointerleave", handlePointerLeave);

    return () => {
      container.removeEventListener("pointermove", handlePointerMove);
      container.removeEventListener("pointerleave", handlePointerLeave);
    };
  }, [editor, readonly, updatePresence]);

  return (
    <>
      <CursorOverlay readonly={readonly} />
      <CommentPins />
    </>
  );
}

function CursorOverlay({ readonly }: { readonly: boolean }) {
  const others = useOthers();
  if (readonly) return null;

  return (
    <>
      {others.map((other) => {
        const presence = other.presence;
        const info = other.info;
        if (!presence?.cursor) return null;

        return (
          <div
            key={other.connectionId}
            className="pointer-events-none absolute"
            style={{
              left: presence.cursor.x,
              top: presence.cursor.y,
              zIndex: 9999,
              transform: "translate(-2px, -2px)",
            }}
          >
            <svg width="16" height="20" viewBox="0 0 16 20" fill="none">
              <path
                d="M0 0L0 16L4 12L7 19L9 18L6 11L11 11L0 0Z"
                fill={info?.color ?? "#7c3aed"}
              />
            </svg>
            <div className="ml-3 -mt-1 inline-flex items-center gap-1 rounded-full border border-white/10 bg-[#0f141a]/90 px-2 py-1 text-[10px] text-white shadow-lg backdrop-blur-sm">
              <span
                className="h-1.5 w-1.5 rounded-full"
                style={{ backgroundColor: info?.color ?? "#7c3aed" }}
              />
              <span>{info?.name ?? "Anonymous"}</span>
            </div>
          </div>
        );
      })}
    </>
  );
}

const CommentPins = track(() => {
  const { editor, comments, isCommentsMode } = useEditorContext();

  if (!editor || !isCommentsMode || !comments) return null;

  return (
    <>
      {comments.map((comment) => {
        const screenPos = editor.pageToViewport({ x: comment.x, y: comment.y });
        return (
          <div
            key={comment.id}
            className="pointer-events-none absolute z-[60] flex h-8 w-8 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border-2 border-primary bg-white shadow-lg transition-transform hover:scale-110"
            style={{ left: screenPos.x, top: screenPos.y }}
          >
            <div className="flex h-7 w-7 items-center justify-center rounded-full bg-accent text-[12px] font-bold text-white">
              {comment.authorName.charAt(0).toUpperCase()}
            </div>
          </div>
        );
      })}
    </>
  );
});

import { EditorContextMenu } from "./EditorContextMenu";

interface EditorCanvasProps {
  initialData: unknown | null;
  readonly?: boolean;
  onSave: (data: unknown, getThumbnail?: () => Promise<string | null>) => void;
}

export function EditorCanvas({
  initialData,
  readonly = false,
  onSave,
}: EditorCanvasProps) {
  const [contextMenu, setContextMenu] = useState<{ x: number, y: number } | null>(null);

  const handleMount = useCallback(
    (editor: Editor) => {
      if (readonly) {
        editor.updateInstanceState({ isReadonly: true });
      }
    },
    [readonly]
  );

  return (
    <div 
      className="relative flex-1 overflow-hidden bg-[#1e1e1e]"
      onContextMenu={(e) => {
        if (readonly) return;
        e.preventDefault();
        setContextMenu({ x: e.clientX, y: e.clientY });
      }}
    >
      <Tldraw hideUi onMount={handleMount}>
        <CanvasInner
          initialData={initialData}
          readonly={readonly}
          onSave={onSave}
        />
      </Tldraw>
      {contextMenu && (
        <EditorContextMenu 
          x={contextMenu.x} 
          y={contextMenu.y} 
          onClose={() => setContextMenu(null)} 
        />
      )}
    </div>
  );
}
