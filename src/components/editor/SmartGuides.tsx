"use client";

import { useEditor, track } from "tldraw";
import { useEffect, useState } from "react";

interface Guide {
  type: "horizontal" | "vertical";
  position: number;
  color: string;
}

export const SmartGuides = track(function SmartGuides() {
  const editor = useEditor();
  const [guides, setGuides] = useState<Guide[]>([]);

  useEffect(() => {
    if (!editor) return;

    const handleSelectionChange = () => {
      const selectedShapes = editor.getSelectedShapes();
      if (selectedShapes.length < 2) {
        setGuides([]);
        return;
      }

      const newGuides: Guide[] = [];

      // Get bounds of all selected shapes
      const bounds = selectedShapes.map((shape) => {
        const bounds = editor.getShapePageBounds(shape);
        return bounds;
      });

      // Check for vertical alignment (left, center, right)
      const lefts = bounds.map((b) => b?.x || 0);
      const centerXs = bounds.map((b) => ((b?.x || 0) + ((b?.w || 0) / 2)));
      const rights = bounds.map((b) => ((b?.x || 0) + (b?.w || 0)));

      // Find aligned positions
      const positions = new Set<number>();
      [...lefts, ...centerXs, ...rights].forEach((pos) => {
        const matches = [...lefts, ...centerXs, ...rights].filter(
          (p) => Math.abs(p - pos) < 1
        );
        if (matches.length > 1) {
          positions.add(pos);
        }
      });

      // Create vertical guides
      positions.forEach((pos) => {
        newGuides.push({
          type: "vertical",
          position: pos,
          color: "#4f46e5",
        });
      });

      // Check for horizontal alignment (top, middle, bottom)
      const tops = bounds.map((b) => b?.y || 0);
      const centerYs = bounds.map((b) => ((b?.y || 0) + ((b?.h || 0) / 2)));
      const bottoms = bounds.map((b) => ((b?.y || 0) + (b?.h || 0)));

      const hPositions = new Set<number>();
      [...tops, ...centerYs, ...bottoms].forEach((pos) => {
        const matches = [...tops, ...centerYs, ...bottoms].filter(
          (p) => Math.abs(p - pos) < 1
        );
        if (matches.length > 1) {
          hPositions.add(pos);
        }
      });

      // Create horizontal guides
      hPositions.forEach((pos) => {
        newGuides.push({
          type: "horizontal",
          position: pos,
          color: "#4f46e5",
        });
      });

      setGuides(newGuides);
    };

    // Listen for selection changes
    const unsubscribe = editor.store.listen(handleSelectionChange);

    return () => {
      unsubscribe();
    };
  }, [editor]);

  return (
    <>
      {guides.map((guide, i) => (
        <div
          key={i}
          className="pointer-events-none absolute z-10"
          style={
            guide.type === "vertical"
              ? {
                  left: `${guide.position}px`,
                  top: 0,
                  width: "1px",
                  height: "100%",
                  backgroundColor: guide.color,
                  opacity: 0.6,
                }
              : {
                  left: 0,
                  top: `${guide.position}px`,
                  width: "100%",
                  height: "1px",
                  backgroundColor: guide.color,
                  opacity: 0.6,
                }
          }
        />
      ))}
    </>
  );
});
