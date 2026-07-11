"use client";

import { useEffect, useState } from "react";
import { useEditorContext } from "./EditorContext";
import type { TLShape } from "tldraw";
import { Settings2, Copy, Download } from "lucide-react";

function getShapeLabel(shape: TLShape) {
  if (shape.props && "text" in shape.props && typeof shape.props.text === "string" && shape.props.text.trim()) {
    return shape.props.text;
  }
  return shape.type;
}

export function InspectPanel() {
  const { editor } = useEditorContext();
  const [shape, setShape] = useState<TLShape | null>(null);

  useEffect(() => {
    if (!editor) return;
    const ed = editor;

    function update() {
      const selected = ed.getSelectedShapes();
      setShape(selected.length === 1 ? selected[0] : null);
    }

    update();
    const cleanup = ed.store.listen(update);
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
        Select an object to inspect.
      </div>
    );
  }

  const props = shape.props as Record<string, any>;
  const x = Math.round(shape.x);
  const y = Math.round(shape.y);
  const w = Math.round(props.w || 0);
  const h = Math.round(props.h || 0);
  const opacity = Math.round((props.opacity || 1) * 100);

  // Derive simple CSS representation
  const cssLines = [
    w ? `width: ${w}px;` : "",
    h ? `height: ${h}px;` : "",
    x ? `transform: translate(${x}px, ${y}px);` : "",
    props.opacity !== undefined ? `opacity: ${props.opacity};` : "",
    props.color ? `color: ${props.color};` : "",
    props.fill ? `background: ${props.fill};` : "",
  ].filter(Boolean);

  const cssString = cssLines.join("\n");

  const handleCopyCode = () => {
    navigator.clipboard.writeText(cssString);
  };

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

      {/* Properties Section */}
      <div className="p-4 border-b border-border space-y-3">
        <span className="text-xs font-bold text-muted uppercase block">Properties</span>
        <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-xs">
          <div className="flex justify-between py-1">
            <span className="text-muted">Width</span>
            <span className="font-mono text-foreground">{w}px</span>
          </div>
          <div className="flex justify-between py-1">
            <span className="text-muted">Height</span>
            <span className="font-mono text-foreground">{h}px</span>
          </div>
          <div className="flex justify-between py-1">
            <span className="text-muted">Top</span>
            <span className="font-mono text-foreground">{y}px</span>
          </div>
          <div className="flex justify-between py-1">
            <span className="text-muted">Left</span>
            <span className="font-mono text-foreground">{x}px</span>
          </div>
          <div className="flex justify-between py-1 col-span-2">
            <span className="text-muted">Opacity</span>
            <span className="font-mono text-foreground">{opacity}%</span>
          </div>
        </div>
      </div>

      {/* CSS Code Snippet Section */}
      <div className="p-4 border-b border-border space-y-2">
        <div className="flex justify-between items-center">
          <span className="text-xs font-bold text-muted uppercase">Code</span>
          <span className="text-[11px] text-accent font-semibold uppercase">CSS</span>
        </div>
        <div className="bg-[#2C2C2C] rounded p-2 relative group border border-border">
          <pre className="font-mono text-[11px] text-foreground leading-relaxed overflow-x-auto whitespace-pre-wrap">
            {cssString || "/* No style properties */"}
          </pre>
          {cssString && (
            <button
              onClick={handleCopyCode}
              className="absolute top-2 right-2 p-1 rounded hover:bg-border text-muted hover:text-foreground transition-all duration-150"
              title="Copy CSS"
            >
              <Copy className="h-3.5 w-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* Export Mockup Section */}
      <div className="p-4 space-y-3">
        <span className="text-xs font-bold text-muted uppercase block">Export</span>
        <div className="flex items-center justify-between">
          <div className="flex space-x-1.5">
            <button className="px-2.5 py-1 bg-surface border border-border rounded text-[11px] hover:bg-border transition-colors">PNG</button>
            <button className="px-2.5 py-1 bg-surface border border-border rounded text-[11px] hover:bg-border transition-colors">SVG</button>
            <button className="px-2.5 py-1 bg-surface border border-border rounded text-[11px] hover:bg-border transition-colors">JPG</button>
          </div>
          <button className="p-1.5 rounded hover:bg-border text-muted hover:text-foreground transition-colors">
            <Download className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
