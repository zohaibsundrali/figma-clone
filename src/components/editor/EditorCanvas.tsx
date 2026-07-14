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
  type TLShapeId,
} from "tldraw";
import "tldraw/tldraw.css";
import { MessageSquarePlus } from "lucide-react";
import { useEditorContext } from "./EditorContext";
import { MiniMapViewer } from "./MiniMapViewer";
import {
  useMutation,
  useOthers,
  useStorage,
  useUpdateMyPresence,
} from "@/lib/liveblocks";
import {
  findComponentMasterAncestor,
  propagateMasterToInstances,
} from "@/lib/component-system";
import {
  isAutoLayoutContainer,
  recalculateLayout,
} from "@/lib/auto-layout-engine";

interface CanvasInnerProps {
  initialData: unknown | null;
  readonly: boolean;
  onSave: (data: unknown, getThumbnail?: () => Promise<string | null>) => void;
}

async function captureThumbnail(editor: Editor): Promise<string | null> {
  // Find all Google Fonts link stylesheets and temporarily disable them to avoid CORS "Failed to fetch" on toImageDataUrl
  const googleFontLinks = typeof document !== "undefined"
    ? Array.from(document.querySelectorAll('link[id^="google-font-"], link[href*="fonts.googleapis.com"]')) as HTMLLinkElement[]
    : [];
  
  const originalDisabledStates = googleFontLinks.map((link) => {
    const original = link.disabled;
    link.disabled = true;
    return { link, original };
  });

  try {
    const shapeIds = editor.getCurrentPageShapeIds();
    if (shapeIds.size === 0) return null;
    const result = await editor.toImageDataUrl([...shapeIds], {
      format: "png",
      scale: 0.3,
      background: true,
    });
    return result.url;
  } catch (err) {
    console.warn("Autosave: failed to capture thumbnail:", err);
    return null;
  } finally {
    // Restore link states
    originalDisabledStates.forEach(({ link, original }) => {
      link.disabled = original;
    });
  }
}

function CanvasInner({
  initialData,
  readonly,
  onSave,
}: CanvasInnerProps) {
  const editor = useEditor();
  const {
    setEditor,
    isCommentsMode,
    draftComment,
    setDraftComment,
    commentAccess,
  } = useEditorContext();
  const updatePresence = useUpdateMyPresence();
  const [showMiniMap, setShowMiniMap] = useState(true);

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

  // ── Keep tldraw's own readonly flag in sync (covers Present mode toggling
  // readonly on/off after mount, not just the shared-link readonly case) ──
  useEffect(() => {
    if (!editor) return;
    editor.updateInstanceState({ isReadonly: readonly });
  }, [editor, readonly]);

  // ── Handle Keyboard Shortcuts ───────────────────────────────────────────
  useEffect(() => {
    if (!editor) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      const activeEl = document.activeElement;
      const isTyping =
        activeEl &&
        (activeEl.tagName === "INPUT" ||
          activeEl.tagName === "TEXTAREA" ||
          activeEl.getAttribute("contenteditable") === "true" ||
          editor.getEditingShapeId() !== null);

      const isCmdOrCtrl = e.metaKey || e.ctrlKey;
      const isShift = e.shiftKey;
      const key = e.key.toLowerCase();

      // 1. Tool shortcuts (only if NOT typing)
      if (!isTyping && !isCmdOrCtrl && !isShift && key === "t") {
        e.preventDefault();
        editor.setCurrentTool("text");
        return;
      }

      // Toggle Mini Map (M key)
      if (!isTyping && !isCmdOrCtrl && !isShift && key === "m") {
        e.preventDefault();
        setShowMiniMap((prev) => !prev);
        return;
      }

      // 2. Formatting shortcuts (work when text layers are selected)
      const selectedShapes = editor.getSelectedShapes();
      const textShapes = selectedShapes.filter((s) => s.type === "text");

      if (textShapes.length > 0) {
        if (isCmdOrCtrl) {
          // Bold (Ctrl+B)
          if (key === "b" && !isShift) {
            e.preventDefault();
            editor.markHistoryStoppingPoint("keyboard-bold");
            editor.updateShapes(
              textShapes.map((s) => ({
                id: s.id,
                type: s.type,
                meta: {
                  ...s.meta,
                  fontWeight: s.meta?.fontWeight === "bold" ? "normal" : "bold",
                },
              }))
            );
            return;
          }
          // Italic (Ctrl+I)
          if (key === "i" && !isShift) {
            e.preventDefault();
            editor.markHistoryStoppingPoint("keyboard-italic");
            editor.updateShapes(
              textShapes.map((s) => ({
                id: s.id,
                type: s.type,
                meta: {
                  ...s.meta,
                  fontStyle: s.meta?.fontStyle === "italic" ? "normal" : "italic",
                },
              }))
            );
            return;
          }
          // Underline (Ctrl+U)
          if (key === "u" && !isShift) {
            e.preventDefault();
            editor.markHistoryStoppingPoint("keyboard-underline");
            editor.updateShapes(
              textShapes.map((s) => ({
                id: s.id,
                type: s.type,
                meta: {
                  ...s.meta,
                  textDecoration: s.meta?.textDecoration === "underline" ? "none" : "underline",
                },
              }))
            );
            return;
          }
          // Strikethrough (Ctrl+Shift+X)
          if (key === "x" && isShift) {
            e.preventDefault();
            editor.markHistoryStoppingPoint("keyboard-strikethrough");
            editor.updateShapes(
              textShapes.map((s) => ({
                id: s.id,
                type: s.type,
                meta: {
                  ...s.meta,
                  textDecoration: s.meta?.textDecoration === "line-through" ? "none" : "line-through",
                },
              }))
            );
            return;
          }
          // Increase Font Size (Ctrl+Shift+>)
          if (e.key === ">" && isShift) {
            e.preventDefault();
            editor.markHistoryStoppingPoint("keyboard-increase-font-size");
            editor.updateShapes(
              textShapes.map((s) => {
                const currentSize = typeof s.meta?.fontSize === "number" ? s.meta.fontSize : 16;
                return {
                  id: s.id,
                  type: s.type,
                  meta: {
                    ...s.meta,
                    fontSize: Math.max(1, currentSize + 2),
                  },
                };
              })
            );
            return;
          }
          // Decrease Font Size (Ctrl+Shift+<)
          if (e.key === "<" && isShift) {
            e.preventDefault();
            editor.markHistoryStoppingPoint("keyboard-decrease-font-size");
            editor.updateShapes(
              textShapes.map((s) => {
                const currentSize = typeof s.meta?.fontSize === "number" ? s.meta.fontSize : 16;
                return {
                  id: s.id,
                  type: s.type,
                  meta: {
                    ...s.meta,
                    fontSize: Math.max(1, currentSize - 2),
                  },
                };
              })
            );
            return;
          }
          // Align Left (Ctrl+Shift+L)
          if (key === "l" && isShift) {
            e.preventDefault();
            editor.markHistoryStoppingPoint("keyboard-align-left");
            editor.updateShapes(
              textShapes.map((s) => ({
                id: s.id,
                type: s.type,
                props: {
                  ...s.props,
                  textAlign: "start",
                },
              }))
            );
            return;
          }
          // Align Center (Ctrl+Shift+E)
          if (key === "e" && isShift) {
            e.preventDefault();
            editor.markHistoryStoppingPoint("keyboard-align-center");
            editor.updateShapes(
              textShapes.map((s) => ({
                id: s.id,
                type: s.type,
                props: {
                  ...s.props,
                  textAlign: "middle",
                },
              }))
            );
            return;
          }
          // Align Right (Ctrl+Shift+R)
          if (key === "r" && isShift) {
            e.preventDefault();
            editor.markHistoryStoppingPoint("keyboard-align-right");
            editor.updateShapes(
              textShapes.map((s) => ({
                id: s.id,
                type: s.type,
                props: {
                  ...s.props,
                  textAlign: "end",
                },
              }))
            );
            return;
          }
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown, true);
    return () => {
      window.removeEventListener("keydown", handleKeyDown, true);
    };
  }, [editor]);

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

  // ── Click-to-place comment (comments mode) ───────────────────────────────
  // Non-blocking: hooks into tldraw's own event stream so pan/zoom/select keep
  // working. A clean click (not a drag) on empty canvas or a shape opens the
  // composer with the page coordinates, attaching the shape id when present.
  const draftRef = useRef<boolean>(false);
  draftRef.current = draftComment !== null;
  const canComment = commentAccess?.canComment ?? true;
  useEffect(() => {
    if (!editor || readonly || !isCommentsMode || !canComment) return;

    const handleEvent = (info: import("tldraw").TLEventInfo) => {
      if (info.type !== "pointer" || info.name !== "pointer_up") return;
      if (info.button !== 0) return; // primary button only
      if (editor.inputs.isDragging) return; // ignore pans/drags
      if (draftRef.current) return; // a draft is already open
      if (info.target !== "canvas" && info.target !== "shape") return;

      const page = editor.screenToPage(info.point);
      const shapeId =
        info.target === "shape" && info.shape ? info.shape.id : null;
      setDraftComment({ x: page.x, y: page.y, shapeId });
    };

    editor.on("event", handleEvent);
    return () => {
      editor.off("event", handleEvent);
    };
  }, [editor, readonly, isCommentsMode, canComment, setDraftComment]);

  // ── Side effects: Component propagation & Auto Layout recalculation ──────
  useEffect(() => {
    if (!editor || readonly) return;

    // Debounce timer refs
    let propagationTimer: ReturnType<typeof setTimeout> | null = null;
    let layoutTimer: ReturnType<typeof setTimeout> | null = null;

    // Track which master definitions need propagation
    const dirtyMasters = new Set<string>();
    // Track which auto-layout containers need recalculation
    const dirtyLayouts = new Set<TLShapeId>();

    const cleanup = editor.store.listen(
      () => {
        // Check all shapes in the current page for changes
        const allShapes = [...editor.getCurrentPageShapes()];

        for (const shape of allShapes) {
          const meta = shape.meta as Record<string, unknown>;

          // If a shape inside a component master changed, queue propagation
          if (meta?.isComponentMaster) {
            dirtyMasters.add(meta.componentDefinitionId as string);
          } else {
            // Check if this shape's ancestor is a master
            const masterAncestor = findComponentMasterAncestor(editor, shape.id);
            if (masterAncestor) {
              const masterMeta = masterAncestor.meta as Record<string, unknown>;
              dirtyMasters.add(masterMeta.componentDefinitionId as string);
            }
          }

          // If a shape's parent is an auto-layout container, queue recalculation
          if (
            shape.parentId &&
            shape.parentId !== editor.getCurrentPageId()
          ) {
            const parent = editor.getShape(shape.parentId as TLShapeId);
            if (parent && isAutoLayoutContainer(parent)) {
              dirtyLayouts.add(parent.id);
            }
          }
        }

        // Debounced auto-layout recalculation (runs quickly)
        if (dirtyLayouts.size > 0 && !layoutTimer) {
          layoutTimer = setTimeout(() => {
            for (const layoutId of dirtyLayouts) {
              try {
                recalculateLayout(editor, layoutId);
              } catch {
                // ignore errors during recalculation
              }
            }
            dirtyLayouts.clear();
            layoutTimer = null;
          }, 100);
        }

        // Debounced component propagation (slower to avoid infinite loops)
        if (dirtyMasters.size > 0 && !propagationTimer) {
          propagationTimer = setTimeout(() => {
            for (const defId of dirtyMasters) {
              try {
                propagateMasterToInstances(editor, defId);
              } catch {
                // ignore errors during propagation
              }
            }
            dirtyMasters.clear();
            propagationTimer = null;
          }, 500);
        }
      },
      { source: "user", scope: "document" }
    );

    return () => {
      cleanup();
      if (propagationTimer) clearTimeout(propagationTimer);
      if (layoutTimer) clearTimeout(layoutTimer);
    };
  }, [editor, readonly]);

  return (
    <>
      <CursorOverlay readonly={readonly} />
      <CommentPins />
      <CanvasGuides />
      <SmartGuides />
      <TransformControls />
      <PathOperationsMenu />
      <DistributionToolsMenu />
      <BottomToolbar readonly={readonly} />
      <ZoomControl />
      {showMiniMap && (
        <div className="absolute top-3 right-3 z-40 rounded border border-border bg-surface/80 p-2 shadow-lg backdrop-blur">
          <MiniMapViewer />
        </div>
      )}
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
                fill={info?.color ?? "#0d99ff"}
              />
            </svg>
            <div className="ml-3 -mt-1 inline-flex items-center gap-1 rounded-full border border-white/10 bg-[#0f141a]/90 px-2 py-1 text-[10px] text-white shadow-lg backdrop-blur-sm">
              <span
                className="h-1.5 w-1.5 rounded-full"
                style={{ backgroundColor: info?.color ?? "#0d99ff" }}
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
  const {
    editor,
    comments,
    isCommentsMode,
    activeCommentId,
    setActiveCommentId,
    draftComment,
  } = useEditorContext();

  if (!editor || !isCommentsMode) return null;

  // Only root comments get a pin; replies live inside the thread. Reading the
  // camera via pageToViewport inside this track() component keeps pins anchored
  // through zoom and pan automatically.
  const rootComments = comments.filter((c) => !c.parentCommentId);

  return (
    <>
      {rootComments.map((comment) => {
        const screenPos = editor.pageToViewport({ x: comment.x, y: comment.y });
        const isActive = comment.id === activeCommentId;
        return (
          <button
            key={comment.id}
            onPointerDown={(e) => e.stopPropagation()}
            onClick={(e) => {
              e.stopPropagation();
              setActiveCommentId(comment.id);
            }}
            title={`${comment.authorName}: ${comment.text.replace(/@\[([^\]]+)\]\([^)]+\)/g, "@$1")}`}
            className={`absolute z-[60] flex h-8 w-8 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full rounded-bl-none border-2 bg-white shadow-lg transition-transform hover:scale-110 ${
              isActive ? "border-accent ring-2 ring-accent/50" : "border-border"
            } ${comment.resolved ? "opacity-50" : ""}`}
            style={{ left: screenPos.x, top: screenPos.y }}
          >
            <div className="flex h-7 w-7 items-center justify-center rounded-full rounded-bl-none bg-accent text-[12px] font-bold text-white">
              {comment.authorName.charAt(0).toUpperCase()}
            </div>
          </button>
        );
      })}

      {/* Draft placement marker while composing a new comment. */}
      {draftComment && (
        (() => {
          const pos = editor.pageToViewport({ x: draftComment.x, y: draftComment.y });
          return (
            <div
              className="pointer-events-none absolute z-[60] flex h-8 w-8 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full rounded-bl-none border-2 border-dashed border-accent bg-white/90 shadow-lg"
              style={{ left: pos.x, top: pos.y }}
            >
              <MessageSquarePlus className="h-4 w-4 text-accent" />
            </div>
          );
        })()
      )}
    </>
  );
});

import { EditorContextMenu } from "./EditorContextMenu";

import { FigmaTextShapeUtil } from "./FigmaTextShapeUtil";
import { SmartGuides } from "./SmartGuides";
import { TransformControls } from "./TransformControls";
import { PathOperationsMenu } from "./PathOperationsMenu";
import { DistributionToolsMenu } from "./DistributionToolsMenu";
import { CanvasGuides } from "./CanvasGuides";
import { BottomToolbar } from "./BottomToolbar";
import { ZoomControl } from "./ZoomControl";

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

  const handleMount = useCallback((editor: Editor) => {
    editor.updateInstanceState({ isReadonly: readonly });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div 
      className="relative flex-1 overflow-hidden bg-[#1e1e1e]"
      onContextMenu={(e) => {
        if (readonly) return;
        e.preventDefault();
        setContextMenu({ x: e.clientX, y: e.clientY });
      }}
    >
      <Tldraw hideUi onMount={handleMount} shapeUtils={[FigmaTextShapeUtil]}>
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
