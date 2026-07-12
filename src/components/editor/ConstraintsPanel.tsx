"use client";

import { useEditor, track } from "tldraw";
import { useState, useEffect } from "react";
import { Lock, Maximize2, Square } from "lucide-react";
import { useEditorContext } from "./EditorContext";

interface ShapeConstraints {
  shapeId: string;
  aspectRatioLock: boolean;
  pinLeft: boolean;
  pinRight: boolean;
  pinTop: boolean;
  pinBottom: boolean;
  fixedWidth: boolean;
  fixedHeight: boolean;
}

const CONSTRAINT_PRESETS = {
  "Fixed Size": {
    aspectRatioLock: true,
    pinLeft: true,
    pinRight: false,
    pinTop: true,
    pinBottom: false,
    fixedWidth: true,
    fixedHeight: true,
  },
  "Flexible Width": {
    aspectRatioLock: false,
    pinLeft: true,
    pinRight: true,
    pinTop: true,
    pinBottom: false,
    fixedWidth: false,
    fixedHeight: true,
  },
  "Flexible Height": {
    aspectRatioLock: false,
    pinLeft: true,
    pinRight: false,
    pinTop: true,
    pinBottom: true,
    fixedWidth: true,
    fixedHeight: false,
  },
  "Hug Contents": {
    aspectRatioLock: false,
    pinLeft: true,
    pinRight: false,
    pinTop: true,
    pinBottom: false,
    fixedWidth: false,
    fixedHeight: false,
  },
  "Fill Container": {
    aspectRatioLock: false,
    pinLeft: true,
    pinRight: true,
    pinTop: true,
    pinBottom: true,
    fixedWidth: false,
    fixedHeight: false,
  },
};

export const ConstraintsPanel = track(function ConstraintsPanel() {
  const editor = useEditor();
  const { fileId } = useEditorContext();
  const [constraints, setConstraints] = useState<Map<string, ShapeConstraints>>(
    new Map()
  );
  const [expanded, setExpanded] = useState(true);

  if (!editor) return null;

  const selectedShapes = editor.getSelectedShapes();
  const selectedConstraints = selectedShapes.length > 0
    ? constraints.get(selectedShapes[0].id)
    : null;

  const updateConstraint = (
    shapeId: string,
    key: keyof Omit<ShapeConstraints, "shapeId">,
    value: boolean
  ) => {
    const current = constraints.get(shapeId) || getDefaultConstraints(shapeId);
    const updated = { ...current, [key]: value };

    setConstraints((prev) => new Map(prev).set(shapeId, updated));

    // Log activity
    if (fileId) {
      fetch(`/api/files/${fileId}/activity`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "constraint_updated",
          details: `Updated ${key} constraint for shape`,
        }),
      }).catch(() => {});
    }
  };

  const applyPreset = (presetName: string) => {
    const preset = CONSTRAINT_PRESETS[presetName as keyof typeof CONSTRAINT_PRESETS];
    if (!preset) return;

    selectedShapes.forEach((shape) => {
      const updated = { shapeId: shape.id, ...preset };
      setConstraints((prev) => new Map(prev).set(shape.id, updated));
    });
  };

  const getDefaultConstraints = (shapeId: string): ShapeConstraints => ({
    shapeId,
    aspectRatioLock: false,
    pinLeft: true,
    pinRight: false,
    pinTop: true,
    pinBottom: false,
    fixedWidth: true,
    fixedHeight: true,
  });

  if (selectedShapes.length === 0) {
    return (
      <div className="flex flex-col h-full bg-surface border-l border-border p-4">
        <p className="text-xs text-muted text-center py-8">
          Select shapes to manage constraints
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full bg-surface border-l border-border overflow-y-auto">
      <div className="sticky top-0 bg-surface border-b border-border p-4 space-y-3">
        <h3 className="text-sm font-semibold">Constraints</h3>
        <p className="text-xs text-muted">
          {selectedShapes.length} shape{selectedShapes.length !== 1 ? "s" : ""} selected
        </p>

        {/* Constraint Presets */}
        <div className="space-y-2">
          <label className="text-xs font-medium block text-muted">Quick Presets</label>
          <div className="grid grid-cols-2 gap-1">
            {Object.keys(CONSTRAINT_PRESETS).map((preset) => (
              <button
                key={preset}
                onClick={() => applyPreset(preset)}
                className="px-2 py-1.5 text-xs font-medium rounded bg-surface-elevated hover:bg-border transition-colors"
              >
                {preset}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="flex-1 p-4 space-y-4">
        {selectedConstraints && (
          <>
            {/* Aspect Ratio */}
            <div className="space-y-2">
              <label className="flex items-center gap-2 text-xs font-medium cursor-pointer">
                <input
                  type="checkbox"
                  checked={selectedConstraints.aspectRatioLock}
                  onChange={(e) =>
                    updateConstraint(
                      selectedShapes[0].id,
                      "aspectRatioLock",
                      e.target.checked
                    )
                  }
                  className="rounded"
                />
                <Maximize2 className="h-3.5 w-3.5" />
                Lock Aspect Ratio
              </label>
              <p className="text-xs text-muted ml-6">
                Maintains width-to-height ratio when resizing
              </p>
            </div>

            <div className="h-px bg-border" />

            {/* Horizontal Constraints */}
            <div className="space-y-2">
              <p className="text-xs font-semibold text-muted">Horizontal</p>
              <div className="space-y-2 ml-2">
                <label className="flex items-center gap-2 text-xs font-medium cursor-pointer">
                  <input
                    type="checkbox"
                    checked={selectedConstraints.pinLeft}
                    onChange={(e) =>
                      updateConstraint(
                        selectedShapes[0].id,
                        "pinLeft",
                        e.target.checked
                      )
                    }
                    className="rounded"
                  />
                  Pin Left
                </label>
                <label className="flex items-center gap-2 text-xs font-medium cursor-pointer">
                  <input
                    type="checkbox"
                    checked={selectedConstraints.pinRight}
                    onChange={(e) =>
                      updateConstraint(
                        selectedShapes[0].id,
                        "pinRight",
                        e.target.checked
                      )
                    }
                    className="rounded"
                  />
                  Pin Right
                </label>
                <label className="flex items-center gap-2 text-xs font-medium cursor-pointer">
                  <input
                    type="checkbox"
                    checked={selectedConstraints.fixedWidth}
                    onChange={(e) =>
                      updateConstraint(
                        selectedShapes[0].id,
                        "fixedWidth",
                        e.target.checked
                      )
                    }
                    className="rounded"
                  />
                  Fixed Width
                </label>
              </div>
              <p className="text-xs text-muted ml-6">
                {selectedConstraints.pinLeft && selectedConstraints.pinRight
                  ? "Stretches between left and right edges"
                  : selectedConstraints.pinLeft
                  ? "Stays at distance from left edge"
                  : "Stays at distance from right edge"}
              </p>
            </div>

            <div className="h-px bg-border" />

            {/* Vertical Constraints */}
            <div className="space-y-2">
              <p className="text-xs font-semibold text-muted">Vertical</p>
              <div className="space-y-2 ml-2">
                <label className="flex items-center gap-2 text-xs font-medium cursor-pointer">
                  <input
                    type="checkbox"
                    checked={selectedConstraints.pinTop}
                    onChange={(e) =>
                      updateConstraint(
                        selectedShapes[0].id,
                        "pinTop",
                        e.target.checked
                      )
                    }
                    className="rounded"
                  />
                  Pin Top
                </label>
                <label className="flex items-center gap-2 text-xs font-medium cursor-pointer">
                  <input
                    type="checkbox"
                    checked={selectedConstraints.pinBottom}
                    onChange={(e) =>
                      updateConstraint(
                        selectedShapes[0].id,
                        "pinBottom",
                        e.target.checked
                      )
                    }
                    className="rounded"
                  />
                  Pin Bottom
                </label>
                <label className="flex items-center gap-2 text-xs font-medium cursor-pointer">
                  <input
                    type="checkbox"
                    checked={selectedConstraints.fixedHeight}
                    onChange={(e) =>
                      updateConstraint(
                        selectedShapes[0].id,
                        "fixedHeight",
                        e.target.checked
                      )
                    }
                    className="rounded"
                  />
                  Fixed Height
                </label>
              </div>
              <p className="text-xs text-muted ml-6">
                {selectedConstraints.pinTop && selectedConstraints.pinBottom
                  ? "Stretches between top and bottom edges"
                  : selectedConstraints.pinTop
                  ? "Stays at distance from top edge"
                  : "Stays at distance from bottom edge"}
              </p>
            </div>

            <div className="h-px bg-border" />

            {/* Constraint Summary */}
            <div className="bg-surface-elevated rounded p-2 space-y-1">
              <p className="text-xs font-semibold">Summary</p>
              <ul className="text-xs text-muted space-y-0.5">
                {selectedConstraints.aspectRatioLock && (
                  <li>• Aspect ratio locked</li>
                )}
                {selectedConstraints.pinLeft && selectedConstraints.pinRight && (
                  <li>• Expands horizontally</li>
                )}
                {selectedConstraints.fixedWidth && (
                  <li>• Fixed width: {selectedConstraints.fixedWidth}</li>
                )}
                {selectedConstraints.pinTop && selectedConstraints.pinBottom && (
                  <li>• Expands vertically</li>
                )}
                {selectedConstraints.fixedHeight && (
                  <li>• Fixed height: {selectedConstraints.fixedHeight}</li>
                )}
              </ul>
            </div>
          </>
        )}
      </div>
    </div>
  );
});
