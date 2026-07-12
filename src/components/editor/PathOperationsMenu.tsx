"use client";

import { useEditor, track } from "tldraw";
import { useState } from "react";
import { Combine, Minus, Maximize2, Zap } from "lucide-react";
import { useEditorContext } from "./EditorContext";

export const PathOperationsMenu = track(function PathOperationsMenu() {
  const editor = useEditor();
  const { fileId } = useEditorContext();
  const [isOpen, setIsOpen] = useState(false);

  if (!editor) return null;

  const selectedShapes = editor.getSelectedShapes();
  const canPerformOperation = selectedShapes.length >= 2;

  const handleUnion = () => {
    if (!canPerformOperation) return;

    // Get bounds of all shapes
    const boundsList = selectedShapes.map((s) => editor.getShapePageBounds(s)).filter(Boolean);
    if (boundsList.length < 2) return;

    const bounds = boundsList as NonNullable<typeof boundsList[0]>[];

    // Calculate union bounds
    const minX = Math.min(...bounds.map((b) => b.x));
    const minY = Math.min(...bounds.map((b) => b.y));
    const maxX = Math.max(...bounds.map((b) => b.x + b.w));
    const maxY = Math.max(...bounds.map((b) => b.y + b.h));

    // Create new combined shape
    editor.createShape({
      type: "geo",
      x: minX,
      y: minY,
      props: {
        w: maxX - minX,
        h: maxY - minY,
        geo: "rectangle",
      },
    });

    // Delete original shapes
    selectedShapes.forEach((s) => editor.deleteShape(s.id));

    // Log activity
    if (fileId) {
      fetch(`/api/files/${fileId}/activity`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "path_union",
          details: `Combined ${selectedShapes.length} shapes`,
        }),
      }).catch(() => {});
    }

    setIsOpen(false);
  };

  const handleIntersect = () => {
    if (!canPerformOperation) return;

    // Get bounds of all shapes
    const boundsList = selectedShapes.map((s) => editor.getShapePageBounds(s)).filter(Boolean);
    if (boundsList.length < 2) return;

    const bounds = boundsList as NonNullable<typeof boundsList[0]>[];

    // Calculate intersection bounds
    const minX = Math.max(...bounds.map((b) => b.x));
    const minY = Math.max(...bounds.map((b) => b.y));
    const maxX = Math.min(...bounds.map((b) => b.x + b.w));
    const maxY = Math.min(...bounds.map((b) => b.y + b.h));

    // Only create shape if there's actual intersection
    if (minX < maxX && minY < maxY) {
      editor.createShape({
        type: "geo",
        x: minX,
        y: minY,
        props: {
          w: maxX - minX,
          h: maxY - minY,
          geo: "rectangle",
        },
      });

      selectedShapes.forEach((s) => editor.deleteShape(s.id));
    }

    setIsOpen(false);
  };

  const handleSubtract = () => {
    if (selectedShapes.length < 2) return;

    const [baseShape, ...shapesToSubtract] = selectedShapes;
    const baseBounds = editor.getShapePageBounds(baseShape);

    if (!baseBounds) return;

    // Calculate area remaining after subtractions
    let remainingArea = { x: baseBounds.x, y: baseBounds.y, w: baseBounds.w, h: baseBounds.h };

    shapesToSubtract.forEach((shape) => {
      const bounds = editor.getShapePageBounds(shape);
      if (bounds) {
        // Simple rectangular subtraction
        // This is a simplified version; real path subtraction is more complex
        const overlapX = Math.max(remainingArea.x, bounds.x);
        const overlapY = Math.max(remainingArea.y, bounds.y);
        const overlapW = Math.min(remainingArea.x + remainingArea.w, bounds.x + bounds.w) - overlapX;
        const overlapH = Math.min(remainingArea.y + remainingArea.h, bounds.y + bounds.h) - overlapY;

        if (overlapW > 0 && overlapH > 0) {
          // Update remaining area (simplified)
          remainingArea = {
            x: remainingArea.x,
            y: remainingArea.y,
            w: remainingArea.w - (overlapW > 0 ? overlapW : 0),
            h: remainingArea.h,
          };
        }
      }
    });

    // Create result shape
    editor.createShape({
      type: "geo",
      x: remainingArea.x,
      y: remainingArea.y,
      props: {
        w: Math.max(1, remainingArea.w),
        h: Math.max(1, remainingArea.h),
        geo: "rectangle",
      },
    });

    selectedShapes.forEach((s) => editor.deleteShape(s.id));

    setIsOpen(false);
  };

  const handleDivide = () => {
    if (!canPerformOperation) return;

    // Divide creates multiple shapes at intersection points
    // This is a simplified implementation
    const boundsList = selectedShapes.map((s) => editor.getShapePageBounds(s)).filter(Boolean);
    if (boundsList.length < 2) return;

    const bounds = boundsList as NonNullable<typeof boundsList[0]>[];

    // For now, just create a grid of shapes at intersections
    bounds.forEach((bound) => {
      editor.createShape({
        type: "geo",
        x: bound.x,
        y: bound.y,
        props: {
          w: bound.w / 2,
          h: bound.h / 2,
          geo: "rectangle",
        },
      });
    });

    selectedShapes.forEach((s) => editor.deleteShape(s.id));

    setIsOpen(false);
  };

  return (
    <>
      <button
        onClick={() => setIsOpen(!isOpen)}
        disabled={selectedShapes.length < 2}
        className="fixed bottom-32 left-1/2 -translate-x-1/2 bg-surface-elevated border border-border rounded-lg shadow-lg p-2 z-40 hover:bg-border disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        title="Path Operations (2+ shapes required)"
      >
        <Combine className="h-4 w-4" />
      </button>

      {isOpen && canPerformOperation && (
        <div className="fixed bottom-44 left-1/2 -translate-x-1/2 bg-surface-elevated border border-border rounded-lg shadow-lg p-2 flex flex-col gap-1 z-40 w-32">
          <button
            onClick={handleUnion}
            className="flex items-center gap-2 px-3 py-1.5 text-xs font-medium hover:bg-border rounded transition-colors"
            title="Combine shapes into one"
          >
            <Combine className="h-3.5 w-3.5" />
            Union
          </button>

          <button
            onClick={handleIntersect}
            className="flex items-center gap-2 px-3 py-1.5 text-xs font-medium hover:bg-border rounded transition-colors"
            title="Keep only overlapping area"
          >
            <Maximize2 className="h-3.5 w-3.5" />
            Intersect
          </button>

          <button
            onClick={handleSubtract}
            className="flex items-center gap-2 px-3 py-1.5 text-xs font-medium hover:bg-border rounded transition-colors"
            title="Subtract second from first"
          >
            <Minus className="h-3.5 w-3.5" />
            Subtract
          </button>

          <button
            onClick={handleDivide}
            className="flex items-center gap-2 px-3 py-1.5 text-xs font-medium hover:bg-border rounded transition-colors"
            title="Split at intersections"
          >
            <Zap className="h-3.5 w-3.5" />
            Divide
          </button>
        </div>
      )}
    </>
  );
});
