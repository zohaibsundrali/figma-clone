"use client";

import { useRef, useEffect } from "react";
import { useEditor, track } from "tldraw";

export const MiniMapViewer = track(function MiniMapViewer() {
  const editor = useEditor();
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    if (!editor || !canvasRef.current) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    function render() {
      const shapes = editor.getCurrentPageShapes();
      if (shapes.length === 0) {
        ctx!.fillStyle = "#1a1a1a";
        ctx!.fillRect(0, 0, canvas.width, canvas.height);
        return;
      }

      // Get bounds of all shapes
      let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
      shapes.forEach((shape: any) => {
        if (typeof shape.x === "number" && typeof shape.y === "number" &&
            typeof shape.w === "number" && typeof shape.h === "number") {
          minX = Math.min(minX, shape.x);
          minY = Math.min(minY, shape.y);
          maxX = Math.max(maxX, shape.x + shape.w);
          maxY = Math.max(maxY, shape.y + shape.h);
        }
      });

      if (minX === Infinity) return;

      const padding = 20;
      const contentWidth = maxX - minX;
      const contentHeight = maxY - minY;
      const scale = Math.min(
        (canvas.width - padding * 2) / contentWidth,
        (canvas.height - padding * 2) / contentHeight,
        1
      );

      // Draw background
      ctx!.fillStyle = "#1a1a1a";
      ctx!.fillRect(0, 0, canvas.width, canvas.height);

      // Draw viewport frame
      const vp = editor.getViewportPageBounds();
      ctx!.strokeStyle = "#4f46e5";
      ctx!.lineWidth = 1;
      ctx!.globalAlpha = 0.6;
      const vpX = (vp.x - minX) * scale + padding;
      const vpY = (vp.y - minY) * scale + padding;
      const vpW = vp.w * scale;
      const vpH = vp.h * scale;
      ctx!.strokeRect(vpX, vpY, vpW, vpH);
      ctx!.globalAlpha = 1;

      // Draw shapes as rectangles
      ctx!.fillStyle = "#7c3aed";
      shapes.forEach((shape: any) => {
        if (typeof shape.x === "number" && typeof shape.y === "number" &&
            typeof shape.w === "number" && typeof shape.h === "number") {
          const x = (shape.x - minX) * scale + padding;
          const y = (shape.y - minY) * scale + padding;
          const w = shape.w * scale;
          const h = shape.h * scale;
          ctx!.globalAlpha = 0.4;
          ctx!.fillRect(x, y, w, h);
          ctx!.globalAlpha = 1;
          ctx!.strokeStyle = "#7c3aed";
          ctx!.lineWidth = 0.5;
          ctx!.strokeRect(x, y, w, h);
        }
      });
    }

    render();
    const cleanup = editor.store.listen(() => render());
    return cleanup;
  }, [editor]);

  return (
    <canvas
      ref={canvasRef}
      width={160}
      height={120}
      className="cursor-pointer rounded"
      onClick={(e) => {
        if (!editor) return;
        const canvas = canvasRef.current;
        if (!canvas) return;

        const rect = canvas.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;

        // Get all shapes to calculate bounds
        const shapes = editor.getCurrentPageShapes();
        let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
        shapes.forEach((shape: any) => {
          if (typeof shape.x === "number" && typeof shape.y === "number" &&
              typeof shape.w === "number" && typeof shape.h === "number") {
            minX = Math.min(minX, shape.x);
            minY = Math.min(minY, shape.y);
            maxX = Math.max(maxX, shape.x + shape.w);
            maxY = Math.max(maxY, shape.y + shape.h);
          }
        });

        if (minX === Infinity) return;

        const contentWidth = maxX - minX;
        const contentHeight = maxY - minY;
        const padding = 20;
        const scale = Math.min(
          (canvas.width - padding * 2) / contentWidth,
          (canvas.height - padding * 2) / contentHeight,
          1
        );

        // Convert click position back to page coordinates
        const pageX = (x - padding) / scale + minX;
        const pageY = (y - padding) / scale + minY;

        // Pan to that location
        const vp = editor.getViewportPageBounds();
        editor.setCamera({
          x: pageX - vp.w / 2,
          y: pageY - vp.h / 2,
          z: 1,
        });
      }}
    />
  );
});
