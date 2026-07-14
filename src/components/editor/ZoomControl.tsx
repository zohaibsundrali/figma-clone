"use client";

import { useState, useRef, useEffect } from "react";
import { Minus, Plus, ChevronDown } from "lucide-react";
import { track, useEditor } from "tldraw";

/**
 * Bottom-left floating zoom pill — Figma always shows the current zoom
 * percentage here, with a dropdown for common zoom actions.
 */
export const ZoomControl = track(function ZoomControl() {
  const editor = useEditor();
  const [menuOpen, setMenuOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!menuOpen) return;
    const handleClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [menuOpen]);

  if (!editor) return null;

  const zoomPercent = Math.round(editor.getZoomLevel() * 100);

  const actions = [
    { label: "Zoom in", shortcut: "Ctrl +", onClick: () => editor.zoomIn() },
    { label: "Zoom out", shortcut: "Ctrl -", onClick: () => editor.zoomOut() },
    { label: "Zoom to 100%", shortcut: "Shift 0", onClick: () => editor.resetZoom() },
    { label: "Zoom to fit", shortcut: "Shift 1", onClick: () => editor.zoomToFit() },
    { label: "Zoom to selection", shortcut: "Shift 2", onClick: () => editor.zoomToSelection() },
  ];

  return (
    <div ref={ref} className="pointer-events-none absolute bottom-4 left-4 z-40">
      <div className="pointer-events-auto relative flex items-center rounded-lg border border-border bg-surface shadow-2xl">
        <button
          onClick={() => editor.zoomOut()}
          title="Zoom out"
          className="flex h-8 w-8 items-center justify-center rounded-l-lg text-muted transition-colors hover:bg-surface-elevated hover:text-foreground"
        >
          <Minus className="h-3.5 w-3.5" />
        </button>
        <button
          onClick={() => setMenuOpen((o) => !o)}
          className="flex h-8 min-w-14 items-center justify-center gap-1 px-1 text-xs font-medium text-foreground transition-colors hover:bg-surface-elevated"
        >
          {zoomPercent}%
          <ChevronDown className="h-3 w-3 text-muted" />
        </button>
        <button
          onClick={() => editor.zoomIn()}
          title="Zoom in"
          className="flex h-8 w-8 items-center justify-center rounded-r-lg text-muted transition-colors hover:bg-surface-elevated hover:text-foreground"
        >
          <Plus className="h-3.5 w-3.5" />
        </button>

        {menuOpen && (
          <div className="absolute bottom-full left-0 mb-1 w-44 rounded-lg border border-border bg-surface p-1 shadow-2xl">
            {actions.map((action) => (
              <button
                key={action.label}
                onClick={() => {
                  action.onClick();
                  setMenuOpen(false);
                }}
                className="flex w-full items-center justify-between rounded px-2 py-1.5 text-left text-xs text-foreground transition-colors hover:bg-surface-elevated"
              >
                <span>{action.label}</span>
                <span className="text-[10px] text-muted">{action.shortcut}</span>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
});
