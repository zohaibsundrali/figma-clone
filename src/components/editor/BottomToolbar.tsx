"use client";

import {
  ArrowUpRight,
  Circle,
  Hand,
  ImageIcon,
  Minus,
  MousePointer2,
  Pencil,
  Square,
  Type,
  MessageSquare,
  Frame,
} from "lucide-react";
import { useEffect } from "react";
import { GeoShapeGeoStyle } from "@tldraw/tlschema";
import { track, useEditor } from "tldraw";
import { useEditorContext } from "./EditorContext";

// Tool bar entries. `id` is our internal key; actual tldraw tool
// activation is handled by setSafeTool() below.
const tools = [
  { id: "select",    icon: MousePointer2, label: "Move"      },
  { id: "hand",      icon: Hand,          label: "Hand tool" },
  { id: "frame",     icon: Frame,         label: "Frame"     },
  { id: "rectangle", icon: Square,        label: "Rectangle" },
  { id: "ellipse",   icon: Circle,        label: "Ellipse"   },
  { id: "arrow",     icon: ArrowUpRight,  label: "Arrow"     },
  { id: "line",      icon: Minus,         label: "Line"      },
  { id: "text",      icon: Type,          label: "Text"      },
  { id: "draw",      icon: Pencil,        label: "Pen"       },
  { id: "image",     icon: ImageIcon,     label: "Image"     },
] as const;

type ToolId = (typeof tools)[number]["id"];

interface BottomToolbarProps {
  readonly?: boolean;
}

/**
 * The floating, pill-shaped tool switcher that hovers over the canvas —
 * Figma's real toolbar lives here (bottom-center), not in the top bar.
 */
export const BottomToolbar = track(function BottomToolbar({
  readonly = false,
}: BottomToolbarProps) {
  const editor = useEditor();
  const { isCommentsMode, setIsCommentsMode } = useEditorContext();

  useEffect(() => {
    if (readonly) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.target as HTMLElement).tagName === "INPUT") return;
      if (e.ctrlKey || e.metaKey) return;

      switch (e.key.toLowerCase()) {
        case "v": setSafeTool("select"); e.preventDefault(); break;
        case "h": setSafeTool("hand"); e.preventDefault(); break;
        case "f": setSafeTool("frame"); e.preventDefault(); break;
        case "r": setSafeTool("rectangle"); e.preventDefault(); break;
        case "o": setSafeTool("ellipse"); e.preventDefault(); break;
        case "a": setSafeTool("arrow"); e.preventDefault(); break;
        case "l": setSafeTool("line"); e.preventDefault(); break;
        case "t": setSafeTool("text"); e.preventDefault(); break;
        case "p": setSafeTool("draw"); e.preventDefault(); break;
        case "i": setSafeTool("image"); e.preventDefault(); break;
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [readonly, editor]);

  // Compute activeTool dynamically from the tldraw editor state
  let activeTool: ToolId = "select";
  if (editor) {
    const currentToolId = editor.getCurrentToolId();
    if (currentToolId === "geo") {
      const geoStyle = editor.getStyleForNextShape(GeoShapeGeoStyle);
      activeTool = geoStyle === "ellipse" ? "ellipse" : "rectangle";
    } else if (currentToolId === "select") {
      activeTool = "select";
    } else if (currentToolId === "hand") {
      activeTool = "hand";
    } else if (currentToolId === "frame") {
      activeTool = "frame";
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
        editor.setCurrentTool("line");
        break;
      case "text":
        editor.setCurrentTool("text");
        break;
      case "draw":
        editor.setCurrentTool("draw");
        break;
      case "image": {
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

            editor.setCurrentTool("select");
          };
          reader.onerror = () => {
            alert("Failed to read image file.");
          };
        };
        input.click();
        return;
      }

      default: {
        const _exhaustive: never = toolId;
        console.warn("Unsupported tool:", _exhaustive);
        editor.setCurrentTool("select");
        return;
      }
    }
  }

  if (readonly) return null;

  return (
    <div className="pointer-events-none absolute inset-x-0 bottom-4 z-40 flex justify-center">
      <div className="pointer-events-auto flex items-center gap-0.5 rounded-xl border border-border bg-surface p-1 shadow-2xl">
        {tools.map((tool) => (
          <button
            key={tool.id}
            onClick={() => {
              setSafeTool(tool.id);
              if (isCommentsMode) setIsCommentsMode(false);
            }}
            title={`${tool.label}${tool.id === "select" ? " (V)" : ""}`}
            className={`flex h-8 w-8 items-center justify-center rounded-md transition-colors ${
              activeTool === tool.id && !isCommentsMode
                ? "bg-accent text-white"
                : "text-muted hover:bg-surface-elevated hover:text-foreground"
            }`}
          >
            <tool.icon className="h-4 w-4" />
          </button>
        ))}
        <div className="mx-0.5 h-5 w-px bg-border" />
        <button
          onClick={() => setIsCommentsMode(!isCommentsMode)}
          title="Comment (C)"
          className={`flex h-8 w-8 items-center justify-center rounded-md transition-colors ${
            isCommentsMode
              ? "bg-primary-container text-on-primary-container"
              : "text-muted hover:bg-surface-elevated hover:text-foreground"
          }`}
        >
          <MessageSquare className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
});
