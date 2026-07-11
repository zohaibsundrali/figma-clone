"use client";

import { useEffect, useState } from "react";
import { useEditorContext } from "./EditorContext";
import type { TLShape } from "tldraw";
import { Plus, Trash2, Zap, ArrowRight, Laptop } from "lucide-react";

interface PrototypeInteraction {
  trigger: string;
  action: string;
  destination: string;
  animation: string;
}

function getShapeLabel(shape: TLShape) {
  if (shape.props && "text" in shape.props && typeof shape.props.text === "string" && shape.props.text.trim()) {
    return shape.props.text;
  }
  return shape.type;
}

export function PrototypePanel() {
  const { editor } = useEditorContext();
  const [shape, setShape] = useState<TLShape | null>(null);
  const [pages, setPages] = useState<any[]>([]);

  useEffect(() => {
    if (!editor) return;

    function update() {
      if (!editor) return;
      const selected = editor.getSelectedShapes();
      setShape(selected.length === 1 ? selected[0] : null);
      setPages(editor.getPages());
    }

    update();
    const cleanup = editor.store.listen(update);
    return cleanup;
  }, [editor]);

  if (!editor) {
    return (
      <div className="flex-1 p-4 text-xs text-muted">
        Loading...
      </div>
    );
  }

  if (!shape) {
    return (
      <div className="flex-1 p-4 text-xs text-muted flex items-center justify-center text-center h-full">
        Select a layer to add an interaction.
      </div>
    );
  }

  const prototype = (shape.meta?.prototype as unknown as PrototypeInteraction) || null;

  function handleAddInteraction() {
    if (!editor || !shape) return;
    const defaultDest = pages[0]?.id || "";
    editor.updateShape({
      id: shape.id,
      type: shape.type,
      meta: {
        ...shape.meta,
        prototype: {
          trigger: "click",
          action: "navigate",
          destination: defaultDest,
          animation: "instant",
        },
      },
    });
  }

  function handleUpdateInteraction(updates: Partial<PrototypeInteraction>) {
    if (!editor || !shape || !prototype) return;
    editor.updateShape({
      id: shape.id,
      type: shape.type,
      meta: {
        ...shape.meta,
        prototype: {
          ...prototype,
          ...updates,
        },
      },
    });
  }

  function handleRemoveInteraction() {
    if (!editor || !shape) return;
    const nextMeta = { ...shape.meta };
    delete nextMeta.prototype;
    editor.updateShape({
      id: shape.id,
      type: shape.type,
      meta: nextMeta,
    });
  }

  const targetPageName = pages.find((p) => p.id === prototype?.destination)?.name || "Select Destination";

  return (
    <div className="flex-1 overflow-y-auto space-y-4">
      {/* Selection Info */}
      <div className="p-4 border-b border-border">
        <div className="flex items-center space-x-2">
          <span className="text-xs uppercase px-2 py-0.5 rounded bg-accent/20 text-accent font-semibold">
            {shape.type}
          </span>
          <span className="font-medium text-sm text-foreground truncate flex-1">
            {getShapeLabel(shape)}
          </span>
        </div>
      </div>

      {/* Interactions Section */}
      <div className="px-4 pb-4 border-b border-border">
        <div className="flex justify-between items-center mb-2">
          <span className="text-xs font-bold text-muted uppercase">Interactions</span>
          {!prototype && (
            <button
              onClick={handleAddInteraction}
              className="w-6 h-6 flex items-center justify-center hover:bg-border rounded text-foreground transition-colors"
              title="Add interaction"
            >
              <Plus className="h-4 w-4" />
            </button>
          )}
        </div>

        {prototype ? (
          <div className="flex items-center justify-between py-1.5 px-2 bg-accent/10 border border-accent/20 rounded group">
            <div className="flex items-center space-x-2">
              <Zap className="h-3.5 w-3.5 text-accent" />
              <span className="text-xs font-medium text-foreground">On click</span>
            </div>
            <button
              onClick={handleRemoveInteraction}
              className="opacity-0 group-hover:opacity-100 hover:text-red-400 text-muted transition-all duration-150"
              title="Remove interaction"
            >
              <Trash2 className="h-3.5 w-3.5" />
            </button>
          </div>
        ) : (
          <div className="text-[11px] text-muted py-2">
            No interactions yet. Click + to add.
          </div>
        )}
      </div>

      {prototype && (
        <>
          {/* Interaction Detail */}
          <div className="p-4 border-b border-border space-y-3">
            <span className="text-xs font-bold text-muted uppercase block">Interaction Detail</span>
            
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-[11px] text-muted w-20">Trigger</span>
                <select
                  value={prototype.trigger}
                  onChange={(e) => handleUpdateInteraction({ trigger: e.target.value })}
                  className="flex-1 h-8 rounded border border-border bg-surface px-2 text-xs text-foreground outline-none focus:border-accent"
                >
                  <option value="click">On click</option>
                </select>
              </div>

              <div className="flex items-center justify-between">
                <span className="text-[11px] text-muted w-20">Action</span>
                <select
                  value={prototype.action}
                  onChange={(e) => handleUpdateInteraction({ action: e.target.value })}
                  className="flex-1 h-8 rounded border border-border bg-surface px-2 text-xs text-foreground outline-none focus:border-accent"
                >
                  <option value="navigate">Navigate to</option>
                </select>
              </div>

              <div className="flex items-center justify-between">
                <span className="text-[11px] text-muted w-20">Destination</span>
                <select
                  value={prototype.destination}
                  onChange={(e) => handleUpdateInteraction({ destination: e.target.value })}
                  className="flex-1 h-8 rounded border border-border bg-surface px-2 text-xs text-foreground outline-none focus:border-accent"
                >
                  <option value="" disabled>Select Page</option>
                  {pages.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* Animation Panel */}
          <div className="p-4 border-b border-border space-y-3">
            <span className="text-xs font-bold text-muted uppercase block">Animation</span>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-[11px] text-muted w-20">Type</span>
                <select
                  value={prototype.animation}
                  onChange={(e) => handleUpdateInteraction({ animation: e.target.value })}
                  className="flex-1 h-8 rounded border border-border bg-surface px-2 text-xs text-foreground outline-none focus:border-accent"
                >
                  <option value="instant">Instant</option>
                  <option value="dissolve">Dissolve</option>
                  <option value="smart">Smart Animate</option>
                </select>
              </div>
            </div>
          </div>
        </>
      )}

      {/* Device Details Mockup */}
      <div className="p-4 space-y-3">
        <span className="text-xs font-bold text-muted uppercase block">Device</span>
        
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-[11px] text-muted w-20">Frame</span>
            <div className="flex-1 h-8 rounded border border-border bg-[#2C2C2C] px-2 flex items-center justify-between text-xs text-foreground">
              <span>MacBook Pro 14"</span>
            </div>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-[11px] text-muted w-20">Background</span>
            <div className="flex-1 flex items-center space-x-2">
              <div className="w-6 h-6 rounded border border-border bg-surface"></div>
              <div className="flex-1 h-8 rounded border border-border bg-[#2C2C2C] px-2 flex items-center text-xs text-foreground font-mono">
                #0F141A
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
