"use client";

import { useEditor, track } from "tldraw";
import { RotateCw } from "lucide-react";

export const TransformControls = track(function TransformControls() {
  const editor = useEditor();
  if (!editor) return null;

  const selectedShapes = editor.getSelectedShapes();
  if (selectedShapes.length === 0) return null;

  const shape = selectedShapes[0];

  const handleRotate = (degrees: number) => {
    selectedShapes.forEach((s) => {
      const current = (s.rotation || 0) * (180 / Math.PI);
      const newRotation = ((current + degrees) % 360) * (Math.PI / 180);

      editor.updateShape({
        id: s.id,
        type: s.type,
        rotation: newRotation,
      });
    });
  };

  return (
    <div className="fixed bottom-20 left-1/2 -translate-x-1/2 bg-surface-elevated border border-border rounded-lg shadow-lg p-2 flex gap-1 z-40">
      <button
        onClick={() => handleRotate(-15)}
        title="Rotate -15° (Shift+[)"
        className="p-2 hover:bg-border rounded transition-colors"
      >
        <RotateCw className="h-4 w-4 transform -scale-x-100" />
      </button>

      <button
        onClick={() => handleRotate(15)}
        title="Rotate +15° (Shift+])"
        className="p-2 hover:bg-border rounded transition-colors"
      >
        <RotateCw className="h-4 w-4" />
      </button>

      <div className="w-px bg-border" />

      <input
        type="number"
        min="0"
        max="359"
        step="1"
        defaultValue={(((shape?.rotation || 0) * 180) / Math.PI).toFixed(0)}
        onChange={(e) => {
          const degrees = parseFloat(e.target.value);
          const radians = (degrees * Math.PI) / 180;
          selectedShapes.forEach((s) => {
            editor.updateShape({
              id: s.id,
              type: s.type,
              rotation: radians,
            });
          });
        }}
        className="w-16 px-2 py-1 rounded border border-border bg-surface text-xs text-center focus:border-accent outline-none"
        title="Rotation in degrees"
      />
      <span className="text-xs text-muted py-1">°</span>
    </div>
  );
});
