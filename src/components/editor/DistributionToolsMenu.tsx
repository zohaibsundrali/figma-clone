"use client";

import { useEditor, track } from "tldraw";
import { useState } from "react";
import { ArrowDown, ArrowRight, Copy, Grid3x3 } from "lucide-react";
import { useEditorContext } from "./EditorContext";

export const DistributionToolsMenu = track(function DistributionToolsMenu() {
  const editor = useEditor();
  const { fileId } = useEditorContext();
  const [isOpen, setIsOpen] = useState(false);

  if (!editor) return null;

  const selectedShapes = editor.getSelectedShapes();
  const canDistribute = selectedShapes.length >= 3;

  // Contextual tool — only show once a qualifying selection exists, matching
  // Figma's behavior (no floating disabled buttons sitting over empty canvas).
  if (!canDistribute) return null;

  const distributeHorizontally = (mode: "equal-gap" | "equal-space") => {
    if (selectedShapes.length < 3) return;

    const bounds = selectedShapes
      .map((s) => editor.getShapePageBounds(s))
      .filter(Boolean) as NonNullable<ReturnType<typeof editor.getShapePageBounds>>[];

    if (bounds.length < 3) return;

    // Sort by x position
    const sorted = selectedShapes
      .map((s, i) => ({ shape: s, bounds: bounds[i], index: i }))
      .sort((a, b) => a.bounds.x - b.bounds.x);

    if (mode === "equal-gap") {
      // Calculate total gap needed
      const firstX = sorted[0].bounds.x;
      const lastX = sorted[sorted.length - 1].bounds.x + sorted[sorted.length - 1].bounds.w;
      const totalShapeWidth = sorted.reduce((sum, item) => sum + item.bounds.w, 0);
      const gap = (lastX - firstX - totalShapeWidth) / (sorted.length - 1);

      // Position shapes with equal gap
      let currentX = firstX;
      sorted.forEach((item) => {
        editor.updateShape({
          id: item.shape.id,
          type: item.shape.type,
          x: currentX,
        });
        currentX += item.bounds.w + gap;
      });
    } else {
      // equal-space: evenly distribute across container
      const firstX = sorted[0].bounds.x;
      const lastX = sorted[sorted.length - 1].bounds.x + sorted[sorted.length - 1].bounds.w;
      const totalWidth = lastX - firstX;
      const spacing = totalWidth / (sorted.length - 1);

      sorted.forEach((item, i) => {
        editor.updateShape({
          id: item.shape.id,
          type: item.shape.type,
          x: firstX + i * spacing - item.bounds.w / 2,
        });
      });
    }

    if (fileId) {
      fetch(`/api/files/${fileId}/activity`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "distribute_horizontal",
          details: `Distributed ${selectedShapes.length} shapes horizontally (${mode})`,
        }),
      }).catch(() => {});
    }

    setIsOpen(false);
  };

  const distributeVertically = (mode: "equal-gap" | "equal-space") => {
    if (selectedShapes.length < 3) return;

    const bounds = selectedShapes
      .map((s) => editor.getShapePageBounds(s))
      .filter(Boolean) as NonNullable<ReturnType<typeof editor.getShapePageBounds>>[];

    if (bounds.length < 3) return;

    // Sort by y position
    const sorted = selectedShapes
      .map((s, i) => ({ shape: s, bounds: bounds[i], index: i }))
      .sort((a, b) => a.bounds.y - b.bounds.y);

    if (mode === "equal-gap") {
      // Calculate total gap needed
      const firstY = sorted[0].bounds.y;
      const lastY = sorted[sorted.length - 1].bounds.y + sorted[sorted.length - 1].bounds.h;
      const totalShapeHeight = sorted.reduce((sum, item) => sum + item.bounds.h, 0);
      const gap = (lastY - firstY - totalShapeHeight) / (sorted.length - 1);

      // Position shapes with equal gap
      let currentY = firstY;
      sorted.forEach((item) => {
        editor.updateShape({
          id: item.shape.id,
          type: item.shape.type,
          y: currentY,
        });
        currentY += item.bounds.h + gap;
      });
    } else {
      // equal-space: evenly distribute across container
      const firstY = sorted[0].bounds.y;
      const lastY = sorted[sorted.length - 1].bounds.y + sorted[sorted.length - 1].bounds.h;
      const totalHeight = lastY - firstY;
      const spacing = totalHeight / (sorted.length - 1);

      sorted.forEach((item, i) => {
        editor.updateShape({
          id: item.shape.id,
          type: item.shape.type,
          y: firstY + i * spacing - item.bounds.h / 2,
        });
      });
    }

    if (fileId) {
      fetch(`/api/files/${fileId}/activity`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "distribute_vertical",
          details: `Distributed ${selectedShapes.length} shapes vertically (${mode})`,
        }),
      }).catch(() => {});
    }

    setIsOpen(false);
  };

  const makeGridLayout = () => {
    if (selectedShapes.length < 3) return;

    const bounds = selectedShapes
      .map((s) => editor.getShapePageBounds(s))
      .filter(Boolean) as NonNullable<ReturnType<typeof editor.getShapePageBounds>>[];

    if (bounds.length < 3) return;

    // Calculate grid dimensions (roughly square)
    const gridSize = Math.ceil(Math.sqrt(selectedShapes.length));
    const sorted = selectedShapes
      .map((s, i) => ({ shape: s, bounds: bounds[i] }))
      .sort((a, b) => a.bounds.x - b.bounds.x);

    // Get average width/height for spacing
    const avgWidth = sorted.reduce((sum, item) => sum + item.bounds.w, 0) / sorted.length;
    const avgHeight = sorted.reduce((sum, item) => sum + item.bounds.h, 0) / sorted.length;
    const padding = Math.max(avgWidth, avgHeight) * 0.5;

    // Position in grid
    sorted.forEach((item, index) => {
      const col = index % gridSize;
      const row = Math.floor(index / gridSize);
      const x = bounds[0].x + col * (avgWidth + padding);
      const y = bounds[0].y + row * (avgHeight + padding);

      editor.updateShape({
        id: item.shape.id,
        type: item.shape.type,
        x,
        y,
      });
    });

    if (fileId) {
      fetch(`/api/files/${fileId}/activity`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "distribute_grid",
          details: `Arranged ${selectedShapes.length} shapes in ${gridSize}×${gridSize} grid`,
        }),
      }).catch(() => {});
    }

    setIsOpen(false);
  };

  const distributeToCenter = (axis: "horizontal" | "vertical") => {
    if (selectedShapes.length < 2) return;

    const viewport = editor.getViewportPageBounds();
    if (!viewport) return;

    const centerX = viewport.x + viewport.w / 2;
    const centerY = viewport.y + viewport.h / 2;

    selectedShapes.forEach((shape) => {
      const bounds = editor.getShapePageBounds(shape);
      if (!bounds) return;

      const shapeCenter = {
        x: bounds.x + bounds.w / 2,
        y: bounds.y + bounds.h / 2,
      };

      if (axis === "horizontal") {
        editor.updateShape({
          id: shape.id,
          type: shape.type,
          x: centerX - bounds.w / 2,
        });
      } else {
        editor.updateShape({
          id: shape.id,
          type: shape.type,
          y: centerY - bounds.h / 2,
        });
      }
    });

    if (fileId) {
      fetch(`/api/files/${fileId}/activity`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "distribute_center",
          details: `Centered ${selectedShapes.length} shapes ${axis}`,
        }),
      }).catch(() => {});
    }

    setIsOpen(false);
  };

  return (
    <>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="fixed bottom-44 left-1/2 -translate-x-1/2 bg-surface-elevated border border-border rounded-lg shadow-lg p-2 z-40 hover:bg-border transition-colors"
        title="Distribution Tools"
      >
        <Grid3x3 className="h-4 w-4" />
      </button>

      {isOpen && canDistribute && (
        <div className="fixed bottom-56 left-1/2 -translate-x-1/2 bg-surface-elevated border border-border rounded-lg shadow-lg p-2 flex flex-col gap-1 z-40 w-40">
          <div className="px-2 py-1 text-xs font-semibold text-muted">Horizontal</div>
          <button
            onClick={() => distributeHorizontally("equal-gap")}
            className="flex items-center gap-2 px-3 py-1.5 text-xs font-medium hover:bg-border rounded transition-colors"
            title="Equal gaps between shapes"
          >
            <ArrowRight className="h-3.5 w-3.5" />
            Equal Gap
          </button>

          <button
            onClick={() => distributeHorizontally("equal-space")}
            className="flex items-center gap-2 px-3 py-1.5 text-xs font-medium hover:bg-border rounded transition-colors"
            title="Evenly spaced across width"
          >
            <Copy className="h-3.5 w-3.5" />
            Equal Space
          </button>

          <div className="h-px bg-border my-1" />

          <div className="px-2 py-1 text-xs font-semibold text-muted">Vertical</div>
          <button
            onClick={() => distributeVertically("equal-gap")}
            className="flex items-center gap-2 px-3 py-1.5 text-xs font-medium hover:bg-border rounded transition-colors"
            title="Equal gaps between shapes"
          >
            <ArrowDown className="h-3.5 w-3.5" />
            Equal Gap
          </button>

          <button
            onClick={() => distributeVertically("equal-space")}
            className="flex items-center gap-2 px-3 py-1.5 text-xs font-medium hover:bg-border rounded transition-colors"
            title="Evenly spaced across height"
          >
            <Copy className="h-3.5 w-3.5" />
            Equal Space
          </button>

          <div className="h-px bg-border my-1" />

          <div className="px-2 py-1 text-xs font-semibold text-muted">Layout</div>
          <button
            onClick={makeGridLayout}
            className="flex items-center gap-2 px-3 py-1.5 text-xs font-medium hover:bg-border rounded transition-colors"
            title="Arrange in grid layout"
          >
            <Grid3x3 className="h-3.5 w-3.5" />
            Grid Layout
          </button>

          <div className="h-px bg-border my-1" />

          <div className="px-2 py-1 text-xs font-semibold text-muted">Center</div>
          <button
            onClick={() => distributeToCenter("horizontal")}
            className="flex items-center gap-2 px-3 py-1.5 text-xs font-medium hover:bg-border rounded transition-colors"
            title="Center horizontally on canvas"
          >
            <ArrowRight className="h-3.5 w-3.5" />
            Center H
          </button>

          <button
            onClick={() => distributeToCenter("vertical")}
            className="flex items-center gap-2 px-3 py-1.5 text-xs font-medium hover:bg-border rounded transition-colors"
            title="Center vertically on canvas"
          >
            <ArrowDown className="h-3.5 w-3.5" />
            Center V
          </button>
        </div>
      )}
    </>
  );
});
