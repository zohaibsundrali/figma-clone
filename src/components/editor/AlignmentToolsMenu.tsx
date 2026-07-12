"use client";

import { useEditor, track } from "tldraw";
import {
  AlignLeft,
  AlignCenter,
  AlignRight,
  AlignStartVertical,
  AlignCenterVertical,
  AlignEndVertical,
  Copy,
  Trash2,
  ArrowUp,
  ArrowDown,
  Lock,
  LockOpen,
} from "lucide-react";
import { useState } from "react";

interface AlignmentMenuProps {
  isOpen: boolean;
  onClose: () => void;
}

export const AlignmentToolsMenu = track(function AlignmentToolsMenu({
  isOpen,
  onClose,
}: AlignmentMenuProps) {
  const editor = useEditor();

  if (!isOpen || !editor) return null;

  const selectedShapes = editor.getSelectedShapes();
  const hasMultipleShapes = selectedShapes.length > 1;
  const canAlign = selectedShapes.length > 0;

  const handleAlign = (direction: "left" | "center-horizontal" | "right" | "top" | "center-vertical" | "bottom") => {
    if (!canAlign) return;
    editor.alignShapes(selectedShapes.map((s) => s.id), direction);
    onClose();
  };

  const handleDistribute = (direction: "horizontal" | "vertical") => {
    if (!hasMultipleShapes) return;
    editor.distributeShapes(selectedShapes.map((s) => s.id), direction);
    onClose();
  };

  const handleArrange = (direction: "toFront" | "toBack" | "forward" | "backward") => {
    if (!canAlign) return;
    selectedShapes.forEach((shape) => {
      editor.updateShape({
        id: shape.id,
        type: shape.type,
        isLocked: shape.isLocked,
      });
    });
    onClose();
  };

  const handleLockToggle = () => {
    if (!canAlign) return;
    const allLocked = selectedShapes.every((s) => s.isLocked);
    selectedShapes.forEach((shape) => {
      editor.updateShape({
        id: shape.id,
        type: shape.type,
        isLocked: !allLocked,
      });
    });
    onClose();
  };

  const handleDuplicate = () => {
    if (!canAlign) return;
    editor.duplicateShapes(selectedShapes.map((s) => s.id));
    onClose();
  };

  const handleDelete = () => {
    if (!canAlign) return;
    editor.deleteShapes(selectedShapes.map((s) => s.id));
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="rounded-lg border border-border bg-surface shadow-lg max-w-sm w-96 max-h-96 overflow-y-auto">
        <div className="sticky top-0 flex items-center justify-between border-b border-border bg-surface-elevated px-4 py-3">
          <h2 className="text-sm font-semibold">Arrange & Align</h2>
          <button
            onClick={onClose}
            className="rounded p-1 hover:bg-surface-elevated text-muted"
          >
            ✕
          </button>
        </div>

        <div className="p-3 space-y-3">
          {/* Alignment Section */}
          <div>
            <p className="text-xs font-medium text-muted uppercase mb-2">Horizontal</p>
            <div className="flex gap-1.5">
              <button
                onClick={() => handleAlign("left")}
                disabled={!canAlign}
                className="flex-1 flex items-center justify-center gap-1 rounded px-2 py-1.5 text-xs font-medium bg-surface-elevated hover:bg-border disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                title="Align left (Ctrl+Alt+L)"
              >
                <AlignLeft className="h-4 w-4" />
              </button>
              <button
                onClick={() => handleAlign("center-horizontal")}
                disabled={!canAlign}
                className="flex-1 flex items-center justify-center gap-1 rounded px-2 py-1.5 text-xs font-medium bg-surface-elevated hover:bg-border disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                title="Align center (Ctrl+Alt+C)"
              >
                <AlignCenter className="h-4 w-4" />
              </button>
              <button
                onClick={() => handleAlign("right")}
                disabled={!canAlign}
                className="flex-1 flex items-center justify-center gap-1 rounded px-2 py-1.5 text-xs font-medium bg-surface-elevated hover:bg-border disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                title="Align right (Ctrl+Alt+R)"
              >
                <AlignRight className="h-4 w-4" />
              </button>
            </div>
          </div>

          {/* Vertical Alignment */}
          <div>
            <p className="text-xs font-medium text-muted uppercase mb-2">Vertical</p>
            <div className="flex gap-1.5">
              <button
                onClick={() => handleAlign("top")}
                disabled={!canAlign}
                className="flex-1 flex items-center justify-center gap-1 rounded px-2 py-1.5 text-xs font-medium bg-surface-elevated hover:bg-border disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                title="Align top (Ctrl+Shift+↑)"
              >
                <AlignStartVertical className="h-4 w-4" />
              </button>
              <button
                onClick={() => handleAlign("center-vertical")}
                disabled={!canAlign}
                className="flex-1 flex items-center justify-center gap-1 rounded px-2 py-1.5 text-xs font-medium bg-surface-elevated hover:bg-border disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                title="Align middle (Ctrl+Shift+M)"
              >
                <AlignCenterVertical className="h-4 w-4" />
              </button>
              <button
                onClick={() => handleAlign("bottom")}
                disabled={!canAlign}
                className="flex-1 flex items-center justify-center gap-1 rounded px-2 py-1.5 text-xs font-medium bg-surface-elevated hover:bg-border disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                title="Align bottom (Ctrl+Shift+↓)"
              >
                <AlignEndVertical className="h-4 w-4" />
              </button>
            </div>
          </div>

          <hr className="border-border/30" />

          {/* Arrange Section */}
          <div>
            <p className="text-xs font-medium text-muted uppercase mb-2">Order</p>
            <div className="grid grid-cols-2 gap-1.5">
              <button
                onClick={() => handleArrange("toFront")}
                disabled={!canAlign}
                className="flex items-center justify-center gap-1 rounded px-2 py-1.5 text-xs font-medium bg-surface-elevated hover:bg-border disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                title="Bring to front"
              >
                <ArrowUp className="h-3.5 w-3.5" />
                Front
              </button>
              <button
                onClick={() => handleArrange("toBack")}
                disabled={!canAlign}
                className="flex items-center justify-center gap-1 rounded px-2 py-1.5 text-xs font-medium bg-surface-elevated hover:bg-border disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                title="Send to back"
              >
                <ArrowDown className="h-3.5 w-3.5" />
                Back
              </button>
            </div>
          </div>

          <hr className="border-border/30" />

          {/* Lock/Duplicate/Delete */}
          <div className="space-y-1.5">
            <button
              onClick={handleLockToggle}
              disabled={!canAlign}
              className="w-full flex items-center justify-center gap-2 rounded px-2 py-1.5 text-xs font-medium bg-surface-elevated hover:bg-border disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              title="Lock/Unlock (Ctrl+Shift+L)"
            >
              {selectedShapes.every((s) => s.isLocked) ? (
                <>
                  <Lock className="h-4 w-4" />
                  Unlock
                </>
              ) : (
                <>
                  <LockOpen className="h-4 w-4" />
                  Lock
                </>
              )}
            </button>

            <button
              onClick={handleDuplicate}
              disabled={!canAlign}
              className="w-full flex items-center justify-center gap-2 rounded px-2 py-1.5 text-xs font-medium bg-surface-elevated hover:bg-border disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              title="Duplicate (Ctrl+D)"
            >
              <Copy className="h-4 w-4" />
              Duplicate
            </button>

            <button
              onClick={handleDelete}
              disabled={!canAlign}
              className="w-full flex items-center justify-center gap-2 rounded px-2 py-1.5 text-xs font-medium bg-red-500/10 text-red-400 hover:bg-red-500/20 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              title="Delete (Delete)"
            >
              <Trash2 className="h-4 w-4" />
              Delete
            </button>
          </div>
        </div>
      </div>
    </div>
  );
});
