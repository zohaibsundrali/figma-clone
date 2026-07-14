"use client";

import { Layers } from "lucide-react";
import { useEffect, useState } from "react";
import { useEditorContext } from "./EditorContext";
import { PagesPanel } from "./PagesPanel";
import type { TLShape } from "tldraw";

export function LayersPanel() {
  const { editor } = useEditorContext();
  const [shapes, setShapes] = useState<TLShape[]>([]);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  useEffect(() => {
    if (!editor) return;
    const ed = editor;

    function update() {
      setShapes([...ed.getCurrentPageShapes()].reverse());
      setSelectedIds(ed.getSelectedShapeIds());
    }

    update();
    const cleanup = ed.store.listen(update, { scope: "document" });
    return cleanup;
  }, [editor]);

  if (!editor) {
    return (
      <aside className="flex w-[240px] flex-col border-r border-border bg-surface">
        <PagesPanel />
        <div className="flex h-10 items-center gap-2 border-b border-border px-3">
          <Layers className="h-4 w-4 text-muted" />
          <span className="text-sm font-medium">Layers</span>
        </div>
        <div className="p-3 text-xs text-muted">Loading layers...</div>
      </aside>
    );
  }

  return (
    <aside className="flex w-[240px] flex-col border-r border-border bg-surface">
      <PagesPanel />
      <div className="flex h-10 items-center gap-2 border-b border-border px-3">
        <Layers className="h-4 w-4 text-muted" />
        <span className="text-sm font-medium">Layers</span>
        <span className="ml-auto text-xs text-muted">{shapes.length}</span>
      </div>
      <div className="flex-1 overflow-y-auto p-2">
        {shapes.length === 0 ? (
          <p className="px-2 py-4 text-xs text-muted">No layers yet</p>
        ) : (
          shapes.map((shape) => (
            <button
              key={shape.id}
              onClick={() => editor.select(shape.id)}
              className={`flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-xs transition-colors ${
                selectedIds.includes(shape.id)
                  ? "bg-accent/20 text-foreground"
                  : "text-muted hover:bg-surface-elevated hover:text-foreground"
              }`}
            >
              <span className="truncate capitalize">{shape.type}</span>
              <span className="ml-auto truncate text-[10px] opacity-60">
                {shape.id.slice(-6)}
              </span>
            </button>
          ))
        )}
      </div>
    </aside>
  );
}
