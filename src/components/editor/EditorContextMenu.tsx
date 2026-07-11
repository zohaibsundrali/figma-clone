"use client";

import { useEffect, useRef } from "react";
import { useEditorContext } from "./EditorContext";

interface EditorContextMenuProps {
  x: number;
  y: number;
  onClose: () => void;
}

export function EditorContextMenu({ x, y, onClose }: EditorContextMenuProps) {
  const { editor } = useEditorContext();
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        onClose();
      }
    }
    
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }

    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [onClose]);

  if (!editor) return null;

  // We need to keep menu inside screen bounds
  const adjustedX = Math.min(x, window.innerWidth - 220);
  const adjustedY = Math.min(y, window.innerHeight - 300);

  const handleAction = (action: () => void) => {
    try {
      action();
    } catch (err) {
      console.warn("Context menu action failed:", err);
    }
    onClose();
  };

  const selectedShapeIds = editor.getSelectedShapeIds();
  const hasSelection = selectedShapeIds.length > 0;

  return (
    <div
      ref={menuRef}
      className="fixed w-[220px] bg-surface-elevated border border-border rounded shadow-lg py-1 z-50 flex flex-col text-xs font-medium"
      style={{ left: adjustedX, top: adjustedY }}
      onContextMenu={(e) => e.preventDefault()}
    >
      <div className="flex items-center justify-between px-3 py-1.5 opacity-50 cursor-not-allowed">
        <span className="text-foreground">Copy</span>
        <span className="text-muted font-mono text-[11px]">⌘C</span>
      </div>
      <div className="flex items-center justify-between px-3 py-1.5 opacity-50 cursor-not-allowed">
        <span className="text-foreground">Paste</span>
        <span className="text-muted font-mono text-[11px]">⌘V</span>
      </div>
      <div 
        className={`flex items-center justify-between px-3 py-1.5 ${hasSelection ? 'hover:bg-primary/10 cursor-pointer group' : 'opacity-50 cursor-not-allowed'}`}
        onClick={() => hasSelection && handleAction(() => editor.duplicateShapes(editor.getSelectedShapeIds()))}
      >
        <span className="text-foreground">Duplicate</span>
        <span className="text-muted font-mono text-[11px]">⌘D</span>
      </div>
      <div 
        className={`flex items-center justify-between px-3 py-1.5 ${hasSelection ? 'hover:bg-primary/10 cursor-pointer group text-red-400' : 'opacity-50 cursor-not-allowed'}`}
        onClick={() => hasSelection && handleAction(() => editor.deleteShapes(editor.getSelectedShapeIds()))}
      >
        <span className="text-red-400">Delete</span>
        <span className="text-muted font-mono text-[11px]">⌫</span>
      </div>
      
      <div className="h-px bg-border my-1 mx-1"></div>
      
      <div 
        className={`flex items-center justify-between px-3 py-1.5 ${hasSelection ? 'hover:bg-primary/10 cursor-pointer group' : 'opacity-50 cursor-not-allowed'}`}
        onClick={() => hasSelection && handleAction(() => editor.groupShapes(editor.getSelectedShapeIds()))}
      >
        <span className="text-foreground">Group Selection</span>
        <span className="text-muted font-mono text-[11px]">⌘G</span>
      </div>
      <div 
        className={`flex items-center justify-between px-3 py-1.5 ${hasSelection ? 'hover:bg-primary/10 cursor-pointer group' : 'opacity-50 cursor-not-allowed'}`}
        onClick={() => hasSelection && handleAction(() => editor.ungroupShapes(editor.getSelectedShapeIds()))}
      >
        <span className="text-foreground">Ungroup Selection</span>
        <span className="text-muted font-mono text-[11px]">⇧⌘G</span>
      </div>
      
      <div className="h-px bg-border my-1 mx-1"></div>
      
      <div 
        className={`flex items-center justify-between px-3 py-1.5 ${hasSelection ? 'hover:bg-primary/10 cursor-pointer group' : 'opacity-50 cursor-not-allowed'}`}
        onClick={() => hasSelection && handleAction(() => editor.bringToFront(editor.getSelectedShapeIds()))}
      >
        <span className="text-foreground">Bring to Front</span>
        <span className="text-muted font-mono text-[11px]">]</span>
      </div>
      <div 
        className={`flex items-center justify-between px-3 py-1.5 ${hasSelection ? 'hover:bg-primary/10 cursor-pointer group' : 'opacity-50 cursor-not-allowed'}`}
        onClick={() => hasSelection && handleAction(() => editor.sendToBack(editor.getSelectedShapeIds()))}
      >
        <span className="text-foreground">Send to Back</span>
        <span className="text-muted font-mono text-[11px]">[</span>
      </div>
      
      <div className="h-px bg-border my-1 mx-1"></div>
      
      <div 
        className={`flex items-center justify-between px-3 py-1.5 ${hasSelection ? 'hover:bg-primary/10 cursor-pointer group' : 'opacity-50 cursor-not-allowed'}`}
        onClick={() => hasSelection && handleAction(() => editor.toggleLock(editor.getSelectedShapeIds()))}
      >
        <span className="text-foreground">Lock/Unlock</span>
        <span className="text-muted font-mono text-[11px]">⇧⌘L</span>
      </div>
    </div>
  );
}
