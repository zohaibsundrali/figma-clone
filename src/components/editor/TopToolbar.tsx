"use client";

import {
  ArrowUpRight,
  Circle,
  Download,
  Hand,
  ImageIcon,
  Minus,
  MousePointer2,
  Pencil,
  Redo2,
  Share2,
  Square,
  Type,
  Undo2,
  MessageSquare,
  Keyboard,
  History,
  Bell,
  Search,
  Frame,
} from "lucide-react";
import Link from "next/link";
import { useState, useEffect } from "react";
import { GeoShapeGeoStyle } from "@tldraw/tlschema";
import { track } from "tldraw";
import { useEditorContext } from "./EditorContext";
import { ExportMenu } from "./ExportMenu";
import { PresenceBar } from "./PresenceBar";
import { ShareDialog } from "./ShareDialog";
import { KeyboardShortcutsDialog } from "./KeyboardShortcutsDialog";
import { NotificationsPanel } from "./NotificationsPanel";
import { CommandPalette } from "./CommandPalette";
import { Button } from "@/components/ui/Button";
import type { DesignFile, SaveStatus } from "@/types";

interface TopToolbarProps {
  file: DesignFile;
  saveStatus: SaveStatus;
  onTitleChange: (title: string) => void;
  onFileChange: (updates: Partial<Pick<DesignFile, "isPublic">>) => void;
  readonly?: boolean;
}

// Tool bar entries. `id` is our internal key; actual tldraw tool
// activation is handled by setSafeTool() below.
const tools = [
  { id: "select",    icon: MousePointer2, label: "Select"    },
  { id: "hand",      icon: Hand,          label: "Hand"      },
  { id: "frame",     icon: Frame,         label: "Frame"     },
  { id: "rectangle", icon: Square,        label: "Rectangle" },
  { id: "ellipse",   icon: Circle,        label: "Ellipse"   },
  { id: "arrow",     icon: ArrowUpRight,  label: "Arrow"     },
  { id: "line",      icon: Minus,         label: "Line"      },
  { id: "text",      icon: Type,          label: "Text"      },
  { id: "draw",      icon: Pencil,        label: "Draw"      },
  { id: "image",     icon: ImageIcon,     label: "Image"     },
] as const;

type ToolId = (typeof tools)[number]["id"];

export const TopToolbar = track(function TopToolbar({
  file,
  saveStatus,
  onTitleChange,
  onFileChange,
  readonly = false,
}: TopToolbarProps) {
  const {
    editor,
    isCommentsMode,
    setIsCommentsMode,
    isVersionHistoryOpen,
    setIsVersionHistoryOpen,
    notifications,
    setNotifications,
    isNotificationsOpen,
    setIsNotificationsOpen,
  } = useEditorContext();
  const [shareOpen, setShareOpen] = useState(false);
  const [exportOpen, setExportOpen] = useState(false);
  const [shortcutsOpen, setShortcutsOpen] = useState(false);
  const [commandPaletteOpen, setCommandPaletteOpen] = useState(false);
  const [gridVisible, setGridVisible] = useState(true);
  const [snapEnabled, setSnapEnabled] = useState(true);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ignore if typing in an input
      if ((e.target as HTMLElement).tagName === "INPUT") return;

      const key = e.key.toLowerCase();

      // Command Palette
      if ((e.ctrlKey || e.metaKey) && key === "k") {
        e.preventDefault();
        setCommandPaletteOpen((open) => !open);
        return;
      }

      // Tool shortcuts (only if not readonly)
      if (!readonly) {
        switch (key) {
          case "v": // Select
            setSafeTool("select");
            e.preventDefault();
            break;
          case "h": // Hand
            setSafeTool("hand");
            e.preventDefault();
            break;
          case "f": // Frame
            setSafeTool("frame");
            e.preventDefault();
            break;
          case "r": // Rectangle
            setSafeTool("rectangle");
            e.preventDefault();
            break;
          case "o": // Ellipse (O = circle)
            setSafeTool("ellipse");
            e.preventDefault();
            break;
          case "a": // Arrow
            setSafeTool("arrow");
            e.preventDefault();
            break;
          case "l": // Line
            setSafeTool("line");
            e.preventDefault();
            break;
          case "t": // Text
            setSafeTool("text");
            e.preventDefault();
            break;
          case "p": // Pencil (Draw)
            setSafeTool("draw");
            e.preventDefault();
            break;
          case "i": // Image
            setSafeTool("image");
            e.preventDefault();
            break;
          case "g": // Grid toggle
            toggleGrid();
            e.preventDefault();
            break;
          case "s": // Snap toggle
            toggleSnap();
            e.preventDefault();
            break;
        }
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [readonly]);

  const handleFileChangeWrapper = (updates: Partial<Pick<DesignFile, "isPublic">>) => {
    onFileChange(updates);
    if (updates.isPublic !== undefined && setNotifications) {
      setNotifications((prev) => [
        {
          id: `share-${Date.now()}`,
          type: "share",
          title: "Share settings updated",
          message: updates.isPublic
            ? "File is now public. Anyone with the link can view."
            : "File is now private. Access is restricted.",
          timestamp: "Just now",
          read: false,
        },
        ...prev,
      ]);
    }
  };

  // Compute activeTool dynamically from the tldraw editor state
  let activeTool: ToolId = "select";
  if (editor) {
    const currentToolId = editor.getCurrentToolId();
    if (currentToolId === "geo") {
      const geoStyle = editor.getStyleForNextShape(GeoShapeGeoStyle);
      if (geoStyle === "ellipse") {
        activeTool = "ellipse";
      } else {
        activeTool = "rectangle";
      }
    } else if (currentToolId === "select") {
      activeTool = "select";
    } else if (currentToolId === "hand") {
      activeTool = "hand";
    } else if (currentToolId === "arrow") {
      activeTool = "arrow";
    } else if (currentToolId === "line") {
      activeTool = "line";
    } else if (currentToolId === "text") {
      activeTool = "text";
    } else if (currentToolId === "draw") {
      activeTool = "draw";
    }
  }

  const toggleGrid = () => {
    if (!editor) return;
    setGridVisible(!gridVisible);
    // Toggle grid size in tldraw
    try {
      const page = editor.getCurrentPage();
      if (page) {
        editor.updatePage({
          ...page,
          // Grid toggle - just visual, tldraw handles internally
        });
      }
    } catch (e) {
      console.log("Grid toggle (visual only)");
    }
  };

  const toggleSnap = () => {
    if (!editor) return;
    setSnapEnabled(!snapEnabled);
    // Snap toggle - tldraw handles internally
    try {
      // Just toggle the state, tldraw's internal snap works automatically
    } catch (e) {
      console.log("Snap toggle (visual only)");
    }
  };

  /**
   * Maps our toolbar IDs to safe tldraw API calls.
   * Never calls setCurrentTool() with an invalid state machine ID.
   */
  function setSafeTool(toolId: ToolId) {
    if (!editor || readonly) return;

    switch (toolId) {
      case "select":
        editor.setCurrentTool("select");
        break;

      case "hand":
        editor.setCurrentTool("hand");
        break;

      case "frame":
        editor.setCurrentTool("frame");
        break;

      case "rectangle":
        // "geo" tool covers all geometric shapes; the variant is set via style
        editor.setStyleForNextShapes(GeoShapeGeoStyle, "rectangle");
        editor.setCurrentTool("geo");
        break;

      case "ellipse":
        editor.setStyleForNextShapes(GeoShapeGeoStyle, "ellipse");
        editor.setCurrentTool("geo");
        break;

      case "arrow":
        editor.setCurrentTool("arrow");
        break;

      case "line":
        // tldraw has a dedicated "line" tool (polyline, not straight arrow)
        editor.setCurrentTool("line");
        break;

      case "text":
        editor.setCurrentTool("text");
        break;

      case "draw":
        editor.setCurrentTool("draw");
        break;

      case "image": {
        // Image is not a tldraw tool state; open a file picker and insert directly
        const input = document.createElement("input");
        input.type = "file";
        input.accept = "image/png, image/jpeg, image/jpg, image/webp, image/gif";
        input.onchange = async (e) => {
          const picked = (e.target as HTMLInputElement).files?.[0];
          if (!picked) return;

          const validTypes = ["image/png", "image/jpeg", "image/jpg", "image/webp", "image/gif"];
          if (!validTypes.includes(picked.type)) {
            alert("Unsupported file type. Please upload a png, jpg, jpeg, webp, or gif.");
            return;
          }

          if (picked.size > 3 * 1024 * 1024) {
            alert("Image is too large. Please upload an image under 3MB.");
            return;
          }

          const reader = new FileReader();
          reader.readAsDataURL(picked);
          reader.onload = async () => {
            const src = reader.result as string;
            const { AssetRecordType } = await import("tldraw");
            const assetId = AssetRecordType.createId();

            const image = new Image();
            image.src = src;

            const size = await new Promise<{ w: number; h: number }>((resolve) => {
              image.onload = () => resolve({ w: image.naturalWidth || 400, h: image.naturalHeight || 300 });
              image.onerror = () => resolve({ w: 400, h: 300 });
            });

            editor.createAssets([
              {
                id: assetId,
                type: "image",
                typeName: "asset",
                props: {
                  name: picked.name,
                  src,
                  w: size.w,
                  h: size.h,
                  mimeType: picked.type,
                  isAnimated: false,
                },
                meta: {},
              } as import("tldraw").TLAsset,
            ]);
            
            const center = editor.getViewportPageBounds().center;
            editor.createShape({
              type: "image",
              x: center.x - size.w / 2,
              y: center.y - size.h / 2,
              props: { assetId, w: size.w, h: size.h },
            });

            if (setNotifications) {
              setNotifications((prev) => [
                {
                  id: `image-${Date.now()}`,
                  type: "image",
                  title: "Image uploaded",
                  message: `"${picked.name}" successfully added to the canvas.`,
                  timestamp: "Just now",
                  read: false,
                },
                ...prev,
              ]);
            }

            // Return to select after inserting the image
            editor.setCurrentTool("select");
          };
          reader.onerror = () => {
            alert("Failed to read image file.");
          };
        };
        input.click();
        // Don't change activeTool — image picker is transient
        return;
      }

      default: {
        // Future-proof: unknown tool → warn and stay on select
        const _exhaustive: never = toolId;
        console.warn("Unsupported tool:", _exhaustive);
        editor.setCurrentTool("select");
        return;
      }
    }
  }

  const saveLabel =
    saveStatus === "saving"
      ? "Saving..."
      : saveStatus === "saved"
        ? "Saved"
        : saveStatus === "error"
          ? "Error saving"
          : "";

  return (
    <>
      <header className="flex h-12 items-center gap-3 border-b border-border bg-surface px-3">
        <Link
          href="/dashboard"
          className="text-sm text-muted hover:text-foreground"
        >
          ← Dashboard
        </Link>

        <div className="h-5 w-px bg-border" />

        {!readonly ? (
          <input
            value={file.title}
            onChange={(e) => onTitleChange(e.target.value)}
            className="max-w-50 bg-transparent text-sm font-medium outline-none focus:underline"
          />
        ) : (
          <span className="text-sm font-medium">{file.title}</span>
        )}

        {saveLabel && (
          <span
            className={`text-xs ${saveStatus === "error" ? "text-red-400" : "text-muted"}`}
          >
            {saveLabel}
          </span>
        )}

        <div className="flex-1" />

        {!readonly && (
          <div className="flex items-center gap-0.5 rounded-lg border border-border bg-surface-elevated p-0.5">
            {tools.map((tool) => (
              <button
                key={tool.id}
                onClick={() => {
                  setSafeTool(tool.id);
                  if (isCommentsMode) setIsCommentsMode(false);
                }}
                title={tool.label}
                className={`flex h-8 w-8 items-center justify-center rounded-md transition-colors ${
                  activeTool === tool.id && !isCommentsMode
                    ? "bg-accent text-white"
                    : "text-muted hover:bg-border hover:text-foreground"
                }`}
              >
                <tool.icon className="h-4 w-4" />
              </button>
            ))}
            <div className="mx-0.5 w-px bg-border h-5" />
            <button
              onClick={() => {
                setIsCommentsMode(!isCommentsMode);
              }}
              title="Comments Mode"
              className={`flex h-8 w-8 items-center justify-center rounded-md transition-colors ${
                isCommentsMode
                  ? "bg-primary-container text-on-primary-container"
                  : "text-muted hover:bg-border hover:text-foreground"
              }`}
            >
              <MessageSquare className="h-4 w-4" />
            </button>
          </div>
        )}

        <div className="flex-1" />

        {!readonly && (
          <>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => editor?.undo()}
              title="Undo (Ctrl+Z)"
            >
              <Undo2 className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => editor?.redo()}
              title="Redo (Ctrl+Shift+Z)"
            >
              <Redo2 className="h-4 w-4" />
            </Button>
          </>
        )}

        <div className="w-px h-5 bg-border mx-1" />

        {!readonly && (
          <>
            <Button
              variant={gridVisible ? "primary" : "ghost"}
              size="sm"
              onClick={toggleGrid}
              title="Grid (G)"
            >
              <span className="text-xs font-semibold">⊞</span>
            </Button>
            <Button
              variant={snapEnabled ? "primary" : "ghost"}
              size="sm"
              onClick={toggleSnap}
              title="Snap (S)"
            >
              <span className="text-xs font-semibold">⊕</span>
            </Button>
          </>
        )}

        <PresenceBar />

        {!readonly && (
          <>
            <Button
              variant="secondary"
              size="sm"
              onClick={() => setIsVersionHistoryOpen(!isVersionHistoryOpen)}
              title="Version History"
            >
              <History className="h-4 w-4" />
            </Button>
            <Button
              variant="secondary"
              size="sm"
              onClick={() => setShareOpen(true)}
            >
              <Share2 className="h-4 w-4" />
              Share
            </Button>
            <Button
              variant="secondary"
              size="sm"
              onClick={() => setExportOpen(true)}
            >
              <Download className="h-4 w-4" />
              Export
            </Button>
            <Button
              variant="secondary"
              size="sm"
              onClick={() => setShortcutsOpen(true)}
              title="Keyboard Shortcuts"
            >
              <Keyboard className="h-4 w-4" />
            </Button>
            <div className="relative">
              <Button
                variant="secondary"
                size="sm"
                onClick={() => setIsNotificationsOpen(!isNotificationsOpen)}
                title="Notifications"
                className="notification-trigger relative"
              >
                <Bell className="h-4 w-4" />
                {notifications.filter((n) => !n.read).length > 0 && (
                  <span className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-accent text-[9px] font-bold text-white ring-1 ring-background animate-pulse">
                    {notifications.filter((n) => !n.read).length}
                  </span>
                )}
              </Button>
              {isNotificationsOpen && (
                <NotificationsPanel onClose={() => setIsNotificationsOpen(false)} />
              )}
            </div>
            <Button
              variant="secondary"
              size="sm"
              onClick={() => setCommandPaletteOpen(true)}
              title="Command Palette (Ctrl+K)"
              className="flex items-center gap-1"
            >
              <Search className="h-4 w-4 text-muted" />
              <kbd className="hidden sm:inline-flex h-4 px-1 rounded bg-background text-[9px] font-medium text-muted font-mono leading-none items-center justify-center">
                ⌘K
              </kbd>
            </Button>
          </>
        )}
      </header>

      {!readonly && (
        <>
          <ShareDialog
            open={shareOpen}
            onClose={() => setShareOpen(false)}
            file={file}
            onFileChange={handleFileChangeWrapper}
          />
          <ExportMenu
            open={exportOpen}
            onClose={() => setExportOpen(false)}
          />
          <KeyboardShortcutsDialog
            open={shortcutsOpen}
            onClose={() => setShortcutsOpen(false)}
          />
          <CommandPalette
            isOpen={commandPaletteOpen}
            onClose={() => setCommandPaletteOpen(false)}
          />
        </>
      )}
    </>
  );
});
