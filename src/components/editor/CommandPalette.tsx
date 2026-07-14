"use client";

import React, { useState, useEffect, useRef, useMemo } from "react";
import { useEditorContext } from "./EditorContext";
import { GeoShapeGeoStyle } from "@tldraw/tlschema";
import { getSnapshot } from "tldraw";
import {
  MousePointer,
  Hand,
  Square,
  Circle,
  Type,
  Pencil,
  Download,
  MessageSquare,
  History,
  Eye,
  Sliders,
  AlertTriangle,
  Search
} from "lucide-react";

interface CommandItem {
  id: string;
  category: "Tools" | "Actions" | "Danger Zone";
  title: string;
  subtitle?: string;
  shortcut?: string;
  icon: React.ReactNode;
  action?: (editor: any, context: any) => void;
  disabled?: boolean;
  isRisky?: boolean;
}

interface CommandPaletteProps {
  isOpen: boolean;
  onClose: () => void;
}

export function CommandPalette({ isOpen, onClose }: CommandPaletteProps) {
  const context = useEditorContext();
  const { editor, setIsCommentsMode, setIsVersionHistoryOpen, setActiveRightTab } = context;
  const [search, setSearch] = useState("");
  const [selectedIndex, setSelectedIndex] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Focus input when palette opens
  useEffect(() => {
    if (isOpen) {
      setSearch("");
      setSelectedIndex(0);
      setTimeout(() => {
        inputRef.current?.focus();
      }, 50);
    }
  }, [isOpen]);

  // Handle Click Outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        onClose();
      }
    }
    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isOpen, onClose]);

  // Commands List Definition
  const commands: CommandItem[] = useMemo(() => [
    {
      id: "select-tool",
      category: "Tools",
      title: "Select Tool",
      subtitle: "Switch to pointer tool",
      shortcut: "V",
      icon: <MousePointer className="h-4 w-4 text-muted" />,
      action: (editor) => editor.setCurrentTool("select"),
    },
    {
      id: "hand-tool",
      category: "Tools",
      title: "Hand Tool",
      subtitle: "Pan the canvas",
      shortcut: "H",
      icon: <Hand className="h-4 w-4 text-muted" />,
      action: (editor) => editor.setCurrentTool("hand"),
    },
    {
      id: "rectangle-tool",
      category: "Tools",
      title: "Rectangle Tool",
      subtitle: "Draw a rectangle shape",
      shortcut: "R",
      icon: <Square className="h-4 w-4 text-muted" />,
      action: (editor) => {
        editor.setStyleForNextShapes(GeoShapeGeoStyle, "rectangle");
        editor.setCurrentTool("geo");
      },
    },
    {
      id: "ellipse-tool",
      category: "Tools",
      title: "Ellipse Tool",
      subtitle: "Draw an ellipse/circle shape",
      shortcut: "O",
      icon: <Circle className="h-4 w-4 text-muted" />,
      action: (editor) => {
        editor.setStyleForNextShapes(GeoShapeGeoStyle, "ellipse");
        editor.setCurrentTool("geo");
      },
    },
    {
      id: "text-tool",
      category: "Tools",
      title: "Text Tool",
      subtitle: "Add text labels",
      shortcut: "T",
      icon: <Type className="h-4 w-4 text-muted" />,
      action: (editor) => editor.setCurrentTool("text"),
    },
    {
      id: "draw-tool",
      category: "Tools",
      title: "Draw Tool",
      subtitle: "Freehand drawing brush",
      shortcut: "D",
      icon: <Pencil className="h-4 w-4 text-muted" />,
      action: (editor) => editor.setCurrentTool("draw"),
    },
    {
      id: "export-png",
      category: "Actions",
      title: "Export as PNG",
      subtitle: "Download page elements as PNG image",
      icon: <Download className="h-4 w-4 text-muted" />,
      action: async (editor) => {
        const shapeIds = editor.getCurrentPageShapeIds();
        if (shapeIds.size === 0) {
          alert("Canvas is empty. Draw some shapes first!");
          return;
        }
        const { blob } = await editor.toImage([...shapeIds], {
          format: "png",
          background: true,
        });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = "design.png";
        a.click();
        URL.revokeObjectURL(url);
      },
    },
    {
      id: "export-json",
      category: "Actions",
      title: "Export as JSON",
      subtitle: "Download design store raw state",
      icon: <Download className="h-4 w-4 text-muted" />,
      action: (editor) => {
        const snapshot = getSnapshot(editor.store);
        const blob = new Blob([JSON.stringify(snapshot, null, 2)], {
          type: "application/json",
        });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = "design.json";
        a.click();
        URL.revokeObjectURL(url);
      },
    },
    {
      id: "open-comments",
      category: "Actions",
      title: "Open Comments Mode",
      subtitle: "Toggle feedback and comment pins",
      icon: <MessageSquare className="h-4 w-4 text-muted" />,
      action: (_, ctx) => ctx.setIsCommentsMode(true),
    },
    {
      id: "open-version-history",
      category: "Actions",
      title: "Open Version History",
      subtitle: "View design snapshots and restore checkpoints",
      icon: <History className="h-4 w-4 text-muted" />,
      action: (_, ctx) => ctx.setIsVersionHistoryOpen(true),
    },
    {
      id: "open-prototype-panel",
      category: "Actions",
      title: "Open Prototype Panel",
      subtitle: "Configure interactions and navigation flows",
      icon: <Sliders className="h-4 w-4 text-muted" />,
      action: (_, ctx) => ctx.setActiveRightTab("prototype"),
    },
    {
      id: "open-inspect-panel",
      category: "Actions",
      title: "Open Inspect Panel",
      subtitle: "Access developer parameters and CSS styles",
      icon: <Eye className="h-4 w-4 text-muted" />,
      action: (_, ctx) => ctx.setActiveRightTab("inspect"),
    },
    {
      id: "delete-file",
      category: "Danger Zone",
      title: "Delete File",
      subtitle: "Move project permanently to trash",
      isRisky: true,
      disabled: true,
      icon: <AlertTriangle className="h-4 w-4 text-red-400/50" />,
    },
    {
      id: "reset-workspace",
      category: "Danger Zone",
      title: "Reset Workspace Data",
      subtitle: "Clear PostgreSQL canvas record (Irreversible)",
      isRisky: true,
      disabled: true,
      icon: <AlertTriangle className="h-4 w-4 text-red-400/50" />,
    },
  ], [setIsCommentsMode, setIsVersionHistoryOpen, setActiveRightTab]);

  // Filter commands by search query
  const filteredCommands = useMemo(() => {
    const query = search.toLowerCase().trim();
    if (!query) return commands;
    return commands.filter(
      (c) =>
        c.title.toLowerCase().includes(query) ||
        c.subtitle?.toLowerCase().includes(query) ||
        c.category.toLowerCase().includes(query)
    );
  }, [search, commands]);

  // Keep selection within bounds
  useEffect(() => {
    if (selectedIndex >= filteredCommands.length) {
      setSelectedIndex(Math.max(0, filteredCommands.length - 1));
    }
  }, [filteredCommands.length, selectedIndex]);

  // Handle arrow key and Enter navigation
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (!isOpen) return;

      if (e.key === "ArrowDown") {
        e.preventDefault();
        setSelectedIndex((prev) => (prev + 1) % filteredCommands.length);
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        setSelectedIndex((prev) => (prev - 1 + filteredCommands.length) % filteredCommands.length);
      } else if (e.key === "Enter") {
        e.preventDefault();
        const activeCmd = filteredCommands[selectedIndex];
        if (activeCmd && !activeCmd.disabled && activeCmd.action) {
          if (!editor && activeCmd.category === "Tools") {
            return;
          }
          activeCmd.action(editor, context);
          onClose();
        }
      } else if (e.key === "Escape") {
        e.preventDefault();
        onClose();
      }
    }

    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen, selectedIndex, filteredCommands, editor, context, onClose]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] bg-black/60 backdrop-blur-sm flex items-start justify-center pt-[15vh] px-4 animate-fade-in">
      <div
        ref={containerRef}
        className="bg-surface-elevated border border-border rounded-xl shadow-2xl w-full max-w-lg flex flex-col overflow-hidden max-h-[450px]"
      >
        {/* Search Input */}
        <div className="flex items-center px-4 py-3.5 border-b border-border bg-surface">
          <Search className="h-4.5 w-4.5 text-muted mr-3 flex-shrink-0" />
          <input
            ref={inputRef}
            type="text"
            className="flex-1 bg-transparent text-sm text-foreground placeholder-muted outline-none border-none p-0 focus:ring-0 focus:outline-none"
            placeholder="Type a command to search... (e.g. Rectangle, Text, Export)"
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setSelectedIndex(0);
            }}
          />
          <kbd className="hidden sm:inline-flex items-center justify-center h-5 px-1.5 rounded border border-border bg-background text-[10px] font-medium text-muted font-mono leading-none">
            ESC
          </kbd>
        </div>

        {/* List of Commands */}
        <div className="flex-1 overflow-y-auto p-2 space-y-2">
          {filteredCommands.length === 0 ? (
            <div className="text-center text-xs text-muted py-8">
              No matching commands found.
            </div>
          ) : (
            // Group commands by category
            Object.entries(
              filteredCommands.reduce((groups, item) => {
                if (!groups[item.category]) groups[item.category] = [];
                groups[item.category].push(item);
                return groups;
              }, {} as Record<string, CommandItem[]>)
            ).map(([category, items]) => (
              <div key={category} className="space-y-1">
                <div className="px-2 py-1 text-[10px] font-bold text-muted uppercase tracking-wider">
                  {category}
                </div>
                {items.map((item) => {
                  // Find the true index in the flat filtered array to handle key highlights
                  const flatIndex = filteredCommands.findIndex((fc) => fc.id === item.id);
                  const isHighlighted = flatIndex === selectedIndex;

                  return (
                    <div
                      key={item.id}
                      onClick={() => {
                        if (!item.disabled && item.action) {
                          if (!editor && item.category === "Tools") {
                            return;
                          }
                          item.action(editor, context);
                          onClose();
                        }
                      }}
                      className={`flex items-center justify-between px-3 py-2 rounded-lg cursor-pointer transition-colors ${
                        item.disabled
                          ? "opacity-50 cursor-not-allowed text-muted"
                          : isHighlighted
                          ? "bg-accent/15 text-accent"
                          : "hover:bg-border text-foreground"
                      }`}
                      onMouseEnter={() => setSelectedIndex(flatIndex)}
                    >
                      <div className="flex items-center space-x-3 min-w-0">
                        <div className={`flex-shrink-0 ${isHighlighted && !item.disabled ? "scale-105 transition-transform" : ""}`}>
                          {item.icon}
                        </div>
                        <div className="text-left min-w-0">
                          <p className="text-xs font-semibold truncate leading-none">{item.title}</p>
                          {item.subtitle && (
                            <p className="text-[10px] text-muted truncate mt-0.5">{item.subtitle}</p>
                          )}
                        </div>
                      </div>
                      
                      <div className="flex items-center space-x-2">
                        {item.isRisky && (
                          <span className="text-[9px] px-1.5 py-0.5 rounded bg-red-500/10 text-red-400 font-semibold border border-red-500/20">
                            Risky
                          </span>
                        )}
                        {item.shortcut && (
                          <kbd className="h-5 px-1.5 rounded border border-border bg-background text-[10px] font-medium text-muted font-mono leading-none flex items-center justify-center">
                            {item.shortcut}
                          </kbd>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
