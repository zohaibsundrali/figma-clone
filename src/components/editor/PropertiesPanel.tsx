"use client";

import { useEffect, useState } from "react";
import { useEditorContext } from "./EditorContext";
import type { TLShape } from "tldraw";
import {
  Settings2,
  ChevronDown,
  AlignLeft,
  AlignCenter,
  AlignRight,
  Maximize2,
  Type,
  Palette,
  Plus,
  Compass,
  FileText
} from "lucide-react";

const COLOR_MAP: Record<string, string> = {
  black: "#1E1E1E",
  grey: "#7B889B",
  "light-violet": "#D4C5FF",
  violet: "#9C80FF",
  blue: "#0D99FF",
  "light-blue": "#8CD3FF",
  yellow: "#FFD000",
  orange: "#FF9000",
  green: "#10B981",
  "light-green": "#A7F3D0",
  "light-red": "#FCA5A5",
  red: "#EF4444",
  white: "#FFFFFF",
};

export function PropertiesPanel({ embedded = false }: { embedded?: boolean } = {}) {
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
    const cleanup = ed.store.listen(update, { scope: "document" });
    return cleanup;
  }, [editor]);

  if (!editor) {
    if (embedded) {
      return <div className="p-3 text-xs text-muted">Loading...</div>;
    }
    return (
      <aside className="flex w-72 flex-col border-l border-border bg-surface">
        <div className="flex h-10 items-center gap-2 border-b border-border px-3">
          <Settings2 className="h-4 w-4 text-muted" />
          <span className="text-sm font-medium">Properties</span>
        </div>
        <div className="p-3 text-xs text-muted">Loading...</div>
      </aside>
    );
  }

  if (!shape) {
    if (embedded) {
      return (
        <div className="flex-grow p-4 text-xs text-muted flex items-center justify-center text-center h-full">
          Select a shape to view properties.
        </div>
      );
    }
    return (
      <aside className="flex w-72 flex-col border-l border-border bg-surface">
        <div className="flex h-10 items-center gap-2 border-b border-border px-3">
          <Settings2 className="h-4 w-4 text-muted" />
          <span className="text-sm font-medium">Properties</span>
        </div>
        <div className="p-4 text-xs text-muted">
          Select a shape to view properties
        </div>
      </aside>
    );
  }

  const props = shape.props as Record<string, unknown>;
  const hasFill = "fill" in props;
  const hasColor = "color" in props;
  const hasOpacity = "opacity" in props;
  const isText = shape.type === "text";

  function updateProp(key: string, value: unknown) {
    if (!editor || !shape) return;
    editor.updateShape({
      id: shape.id,
      type: shape.type,
      props: { [key]: value },
    });
  }

  const hexColor = (hasColor ? COLOR_MAP[props.color as string] : hasFill ? COLOR_MAP[props.fill as string] : "#FFFFFF") || "#FFFFFF";

  const body = (
    <div className="flex-grow overflow-y-auto divide-y divide-border/60">
      {/* 1. LAYOUT SECTION */}
      <div className="p-4 space-y-3">
        <div className="flex justify-between items-center text-xs font-bold text-muted uppercase tracking-wider">
          <span className="flex items-center gap-1.5">
            <Compass className="h-3.5 w-3.5" />
            <span>Layout</span>
          </span>
          <ChevronDown className="h-3 w-3" />
        </div>

        <div className="grid grid-cols-2 gap-x-4 gap-y-3">
          {/* X (Left) */}
          <div className="flex items-center space-x-2">
            <span className="text-[10px] text-muted w-3 font-mono">X</span>
            <input
              type="number"
              value={Math.round(shape.x)}
              onChange={(e) =>
                editor.updateShape({ id: shape.id, type: shape.type, x: Number(e.target.value) })
              }
              className="w-full bg-surface-elevated text-xs border border-border rounded px-2.5 py-1.5 focus:border-accent outline-none"
            />
          </div>

          {/* Y (Top) */}
          <div className="flex items-center space-x-2">
            <span className="text-[10px] text-muted w-3 font-mono">Y</span>
            <input
              type="number"
              value={Math.round(shape.y)}
              onChange={(e) =>
                editor.updateShape({ id: shape.id, type: shape.type, y: Number(e.target.value) })
              }
              className="w-full bg-surface-elevated text-xs border border-border rounded px-2.5 py-1.5 focus:border-accent outline-none"
            />
          </div>

          {/* Width (W) */}
          {"w" in props && (
            <div className="flex items-center space-x-2">
              <span className="text-[10px] text-muted w-3 font-mono">W</span>
              <input
                type="number"
                value={Math.round(props.w as number)}
                onChange={(e) => updateProp("w", Number(e.target.value))}
                className="w-full bg-surface-elevated text-xs border border-border rounded px-2.5 py-1.5 focus:border-accent outline-none"
              />
            </div>
          )}

          {/* Height (H) */}
          {"h" in props && (
            <div className="flex items-center space-x-2">
              <span className="text-[10px] text-muted w-3 font-mono">H</span>
              <input
                type="number"
                value={Math.round(props.h as number)}
                onChange={(e) => updateProp("h", Number(e.target.value))}
                className="w-full bg-surface-elevated text-xs border border-border rounded px-2.5 py-1.5 focus:border-accent outline-none"
              />
            </div>
          )}
        </div>
      </div>

      {/* 2. TEXT CONTENT SECTION (If shape contains text) */}
      {("text" in props) && (
        <div className="p-4 space-y-3">
          <div className="flex justify-between items-center text-xs font-bold text-muted uppercase tracking-wider">
            <span className="flex items-center gap-1.5">
              <FileText className="h-3.5 w-3.5" />
              <span>Content</span>
            </span>
            <ChevronDown className="h-3 w-3" />
          </div>
          <textarea
            value={(props.text as string) || ""}
            onChange={(e) => updateProp("text", e.target.value)}
            placeholder="Type text content..."
            rows={2}
            className="w-full bg-surface-elevated text-xs border border-border rounded p-2.5 focus:border-accent outline-none resize-none font-sans"
          />
        </div>
      )}

      {/* 3. TYPOGRAPHY SECTION (Figma details for text tool) */}
      {isText && (
        <div className="p-4 space-y-3">
          <div className="flex justify-between items-center text-xs font-bold text-muted uppercase tracking-wider">
            <span className="flex items-center gap-1.5">
              <Type className="h-3.5 w-3.5" />
              <span>Typography</span>
            </span>
            <ChevronDown className="h-3 w-3" />
          </div>

          <div className="space-y-3">
            {/* Font Family Selection */}
            <div className="flex items-center justify-between">
              <span className="text-[10px] text-muted font-semibold">Font</span>
              <select
                value={(props.font as string) || "sans"}
                onChange={(e) => updateProp("font", e.target.value)}
                className="w-36 bg-surface-elevated text-xs border border-border rounded px-2 py-1 outline-none text-foreground focus:border-accent cursor-pointer"
              >
                <option value="sans">Inter (Sans)</option>
                <option value="draw">Chalk (Draw)</option>
                <option value="serif">Serif (Classic)</option>
                <option value="mono">Code (Mono)</option>
              </select>
            </div>

            {/* Alignment and Size */}
            <div className="grid grid-cols-2 gap-4">
              {/* Text Size (S / M / L / XL) */}
              <div className="space-y-1">
                <span className="text-[10px] text-muted font-semibold">Size</span>
                <select
                  value={(props.size as string) || "m"}
                  onChange={(e) => updateProp("size", e.target.value)}
                  className="w-full bg-surface-elevated text-xs border border-border rounded px-2 py-1 outline-none text-foreground focus:border-accent cursor-pointer"
                >
                  <option value="s">Small</option>
                  <option value="m">Medium</option>
                  <option value="l">Large</option>
                  <option value="xl">Extra Large</option>
                </select>
              </div>

              {/* Align Option */}
              <div className="space-y-1">
                <span className="text-[10px] text-muted font-semibold block mb-1">Align</span>
                <div className="flex items-center gap-1 bg-surface-elevated p-0.5 border border-border rounded">
                  <button
                    onClick={() => updateProp("align", "start")}
                    className={`flex-1 py-1 rounded flex justify-center hover:bg-border transition-colors ${
                      props.align === "start" ? "bg-accent text-white" : "text-muted"
                    }`}
                    title="Align Left"
                  >
                    <AlignLeft className="h-3.5 w-3.5" />
                  </button>
                  <button
                    onClick={() => updateProp("align", "middle")}
                    className={`flex-1 py-1 rounded flex justify-center hover:bg-border transition-colors ${
                      props.align === "middle" ? "bg-accent text-white" : "text-muted"
                    }`}
                    title="Align Center"
                  >
                    <AlignCenter className="h-3.5 w-3.5" />
                  </button>
                  <button
                    onClick={() => updateProp("align", "end")}
                    className={`flex-1 py-1 rounded flex justify-center hover:bg-border transition-colors ${
                      props.align === "end" ? "bg-accent text-white" : "text-muted"
                    }`}
                    title="Align Right"
                  >
                    <AlignRight className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
            </div>

            {/* Figma Mock Decoratives */}
            <div className="grid grid-cols-2 gap-4 pt-1">
              <div>
                <span className="text-[10px] text-muted font-semibold block">Line height</span>
                <span className="text-[11px] font-semibold text-foreground/80 mt-0.5 block">131%</span>
              </div>
              <div>
                <span className="text-[10px] text-muted font-semibold block">Letter spacing</span>
                <span className="text-[11px] font-semibold text-foreground/80 mt-0.5 block">0%</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 4. COLORS SECTION */}
      {(hasColor || hasFill) && (
        <div className="p-4 space-y-3">
          <div className="flex justify-between items-center text-xs font-bold text-muted uppercase tracking-wider">
            <span className="flex items-center gap-1.5">
              <Palette className="h-3.5 w-3.5" />
              <span>Colors</span>
            </span>
            <ChevronDown className="h-3 w-3" />
          </div>

          <div className="space-y-3.5">
            {/* Color Swatch Picker */}
            <div className="grid grid-cols-7 gap-2">
              {Object.keys(COLOR_MAP).map((c) => {
                const isSelected = hasColor ? props.color === c : props.fill === c;
                return (
                  <button
                    key={c}
                    onClick={() => updateProp(hasColor ? "color" : "fill", c)}
                    title={c}
                    className={`h-5 w-5 rounded-full border shadow-sm transition-transform hover:scale-110 ${
                      isSelected ? "border-accent ring-2 ring-accent/30 scale-105" : "border-border"
                    }`}
                    style={{ backgroundColor: COLOR_MAP[c] }}
                  />
                );
              })}
            </div>

            {/* HEX Input */}
            <div className="flex items-center justify-between gap-3 bg-surface-elevated p-2 rounded border border-border">
              <span className="text-[11px] text-muted font-semibold">Hex</span>
              <div className="flex items-center gap-1.5 min-w-0">
                <div
                  className="h-3 w-3 rounded-full border border-border flex-shrink-0"
                  style={{ backgroundColor: hexColor }}
                />
                <span className="text-xs font-mono font-semibold text-foreground truncate">{hexColor}</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 5. OPACITY CONTROL */}
      {hasOpacity && (
        <div className="p-4 space-y-3">
          <div className="flex justify-between items-center text-xs font-bold text-muted uppercase tracking-wider">
            <span className="flex items-center gap-1.5">
              <Maximize2 className="h-3.5 w-3.5" />
              <span>Opacity</span>
            </span>
            <span className="text-xs font-mono font-semibold text-accent">
              {Math.round((props.opacity as number) * 100)}%
            </span>
          </div>
          <input
            type="range"
            min={0}
            max={1}
            step={0.05}
            value={props.opacity as number}
            onChange={(e) => updateProp("opacity", Number(e.target.value))}
            className="w-full h-1 bg-surface-elevated rounded-lg appearance-none cursor-pointer accent-accent"
          />
        </div>
      )}

      {/* 6. EXPORT MOCK SECTION */}
      <div className="p-4 space-y-3">
        <div className="flex justify-between items-center text-xs font-bold text-muted uppercase tracking-wider">
          <span>Export</span>
          <button className="p-0.5 rounded hover:bg-surface-elevated text-muted hover:text-foreground">
            <Plus className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>
    </div>
  );

  if (embedded) {
    return (
      <div className="flex flex-col h-full overflow-hidden bg-surface text-foreground select-none">
        {body}
      </div>
    );
  }

  return (
    <aside className="flex w-72 flex-col border-l border-border bg-surface h-full overflow-hidden select-none">
      <div className="flex h-10 items-center gap-2 border-b border-border px-3 bg-surface flex-shrink-0">
        <Settings2 className="h-4 w-4 text-muted" />
        <span className="text-sm font-semibold">Properties</span>
      </div>
      {body}
    </aside>
  );
}
