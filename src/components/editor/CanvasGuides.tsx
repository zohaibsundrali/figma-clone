"use client";

import { useEffect, useState } from "react";
import { useEditor } from "tldraw";
import { useEditorContext } from "./EditorContext";

interface Guide {
  id: string;
  fileId: string;
  setName: string;
  position: number;
  type: "horizontal" | "vertical";
  locked: boolean;
  color: string;
  createdAt: string;
  updatedAt: string;
}

export function CanvasGuides() {
  const editor = useEditor();
  const { fileId } = useEditorContext();
  const [guides, setGuides] = useState<Guide[]>([]);
  const [showGuides, setShowGuides] = useState(true);

  useEffect(() => {
    if (!fileId || !editor) return;
    loadGuides();
  }, [fileId, editor]);

  const loadGuides = async () => {
    if (!fileId) return;
    try {
      const res = await fetch(`/api/files/${fileId}/guides`);
      if (res.ok) {
        const data = await res.json();
        setGuides(data);
      }
    } catch (error) {
      console.error("Failed to load guides:", error);
    }
  };

  if (!showGuides || !guides.length) return null;

  return (
    <>
      {guides.map((guide) => {
        const viewport = editor?.getViewportPageBounds();
        if (!viewport) return null;

        const color = guide.color || "#4f46e5";
        const opacity = guide.locked ? 0.8 : 0.6;

        if (guide.type === "vertical") {
          return (
            <div
              key={guide.id}
              className="pointer-events-none absolute z-20"
              style={{
                left: `${guide.position}px`,
                top: 0,
                width: "1px",
                height: "100%",
                backgroundColor: color,
                opacity,
                boxShadow: guide.locked ? `0 0 3px ${color}` : undefined,
              }}
            />
          );
        } else {
          return (
            <div
              key={guide.id}
              className="pointer-events-none absolute z-20"
              style={{
                left: 0,
                top: `${guide.position}px`,
                width: "100%",
                height: "1px",
                backgroundColor: color,
                opacity,
                boxShadow: guide.locked ? `0 0 3px ${color}` : undefined,
              }}
            />
          );
        }
      })}

      {/* Guide visibility toggle button */}
      <button
        onClick={() => setShowGuides(!showGuides)}
        className="absolute bottom-0 right-0 p-1 m-2 text-xs text-muted hover:text-foreground transition-colors z-30"
        title={showGuides ? "Hide guides" : "Show guides"}
      >
        {showGuides ? "◉" : "○"} Guides
      </button>
    </>
  );
}
