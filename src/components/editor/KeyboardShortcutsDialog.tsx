"use client";

import { Search } from "lucide-react";
import { useEffect, useState } from "react";

interface KeyboardShortcutsDialogProps {
  open: boolean;
  onClose: () => void;
}

export function KeyboardShortcutsDialog({ open, onClose }: KeyboardShortcutsDialogProps) {
  const [search, setSearch] = useState("");

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    if (open) window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div 
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/40 backdrop-blur-sm"
      onClick={onClose}
    >
      <div 
        className="w-[640px] max-h-[80vh] bg-surface-elevated/90 backdrop-blur-[20px] border border-border rounded-xl shadow-2xl flex flex-col overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Search Header */}
        <div className="p-4 border-b border-border flex items-center gap-3">
          <Search className="h-5 w-5 text-muted" />
          <input 
            className="bg-transparent border-none p-0 flex-1 text-sm text-foreground focus:ring-0 placeholder:text-muted outline-none" 
            placeholder="Search shortcuts..." 
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          <span className="text-[11px] text-muted bg-white/5 px-2 py-0.5 rounded border border-border">Esc</span>
        </div>
        
        {/* Content Area */}
        <div className="flex-1 overflow-y-auto p-6 grid grid-cols-2 gap-8">
          {/* Tools Section */}
          <div className="space-y-4">
            <h3 className="text-xs font-semibold text-muted uppercase tracking-wider">Tools</h3>
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <span className="text-sm text-foreground/90">Select</span>
                <kbd className="font-mono text-[11px] bg-white/10 px-2 py-1 rounded border border-border text-foreground/90">V</kbd>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-foreground/90">Hand</span>
                <kbd className="font-mono text-[11px] bg-white/10 px-2 py-1 rounded border border-border text-foreground/90">H</kbd>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-foreground/90">Rectangle</span>
                <kbd className="font-mono text-[11px] bg-white/10 px-2 py-1 rounded border border-border text-foreground/90">R</kbd>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-foreground/90">Ellipse</span>
                <kbd className="font-mono text-[11px] bg-white/10 px-2 py-1 rounded border border-border text-foreground/90">O</kbd>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-foreground/90">Line</span>
                <kbd className="font-mono text-[11px] bg-white/10 px-2 py-1 rounded border border-border text-foreground/90">L</kbd>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-foreground/90">Arrow</span>
                <kbd className="font-mono text-[11px] bg-white/10 px-2 py-1 rounded border border-border text-foreground/90">A</kbd>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-foreground/90">Text</span>
                <kbd className="font-mono text-[11px] bg-white/10 px-2 py-1 rounded border border-border text-foreground/90">T</kbd>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-foreground/90">Pen/Draw</span>
                <kbd className="font-mono text-[11px] bg-white/10 px-2 py-1 rounded border border-border text-foreground/90">P</kbd>
              </div>
            </div>
          </div>
          
          {/* Edit Section */}
          <div className="space-y-4">
            <h3 className="text-xs font-semibold text-muted uppercase tracking-wider">Edit</h3>
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <span className="text-sm text-foreground/90">Undo</span>
                <kbd className="font-mono text-[11px] bg-white/10 px-2 py-1 rounded border border-border text-foreground/90">Ctrl/Cmd Z</kbd>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-foreground/90">Redo</span>
                <kbd className="font-mono text-[11px] bg-white/10 px-2 py-1 rounded border border-border text-foreground/90">Ctrl/Cmd Shift Z</kbd>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-foreground/90">Copy</span>
                <kbd className="font-mono text-[11px] bg-white/10 px-2 py-1 rounded border border-border text-foreground/90">Ctrl/Cmd C</kbd>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-foreground/90">Paste</span>
                <kbd className="font-mono text-[11px] bg-white/10 px-2 py-1 rounded border border-border text-foreground/90">Ctrl/Cmd V</kbd>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-foreground/90">Delete</span>
                <kbd className="font-mono text-[11px] bg-white/10 px-2 py-1 rounded border border-border text-foreground/90">Delete/Backspace</kbd>
              </div>
            </div>
          </div>
        </div>
        
        {/* Footer */}
        <div className="px-4 py-3 bg-white/5 border-t border-border flex justify-between items-center">
          <span className="text-[11px] text-muted">13 shortcuts available</span>
          <div className="flex gap-2">
            <button 
              className="px-2 py-1 text-xs text-muted hover:text-foreground transition-colors" 
              onClick={onClose}
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
