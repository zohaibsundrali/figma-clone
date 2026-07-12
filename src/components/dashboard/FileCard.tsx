"use client";

import { Copy, MoreHorizontal, Trash2, FolderOpen, Star, Undo, Layers, Presentation, FileCode } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { Button } from "@/components/ui/Button";
import type { DesignFileSummary } from "@/types";

interface FileCardProps {
  file: DesignFileSummary;
  onDelete: (id: string) => void;
  onDuplicate: (id: string) => void;
  folders: Array<{ id: string; name: string }>;
  onMoveToFolder: (fileId: string, folderId: string | null) => void;
  currentFolderId: string | null;
  onStar: (id: string) => void;
  onRestore?: (id: string) => void;
  isTrashTab?: boolean;
}

function getRelativeTimeString(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffMins < 1) return "Edited just now";
  if (diffMins < 60) return `Edited ${diffMins}m ago`;
  if (diffHours < 24) return `Edited ${diffHours}h ago`;
  if (diffDays === 1) return "Edited yesterday";
  if (diffDays < 30) return `Edited ${diffDays} days ago`;
  const diffMonths = Math.floor(diffDays / 30);
  if (diffMonths === 1) return "Edited 1 month ago";
  if (diffMonths < 12) return `Edited ${diffMonths} months ago`;
  return `Edited ${Math.floor(diffMonths / 12)} years ago`;
}

export function FileCard({
  file,
  onDelete,
  onDuplicate,
  folders,
  onMoveToFolder,
  currentFolderId,
  onStar,
  onRestore,
  isTrashTab,
}: FileCardProps) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [duplicating, setDuplicating] = useState(false);
  const [showMoveSubmenu, setShowMoveSubmenu] = useState(false);

  // Distinguish file type visually based on title
  const isFigJam = file.title.toLowerCase().includes("figjam") || file.title.toLowerCase().includes("diagram");
  const isSlides = file.title.toLowerCase().includes("slide") || file.title.toLowerCase().includes("presentation");

  async function handleDuplicate(e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    setDuplicating(true);
    await onDuplicate(file.id);
    setDuplicating(false);
    setMenuOpen(false);
  }

  async function handleDelete(e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    if (!confirm(`Delete "${file.title}"?`)) return;
    await onDelete(file.id);
    setMenuOpen(false);
  }

  function handleMove(folderId: string | null, e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    onMoveToFolder(file.id, folderId);
    setShowMoveSubmenu(false);
    setMenuOpen(false);
  }

  function handleStar(e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    onStar(file.id);
    setMenuOpen(false);
  }

  function handleRestore(e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    if (onRestore) {
      onRestore(file.id);
    }
    setMenuOpen(false);
  }

  return (
    <div className="group relative">
      <Link
        href={`/editor/${file.id}`}
        className="block overflow-hidden rounded-lg border border-border bg-surface-elevated/40 transition-all hover:border-accent/40 hover:shadow-md"
      >
        {/* Canvas Thumbnail Preview */}
        <div className="flex aspect-[1.5] items-center justify-center bg-surface-elevated border-b border-border/50 overflow-hidden relative">
          {file.thumbnail ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={file.thumbnail}
              alt={file.title}
              className="h-full w-full object-cover"
            />
          ) : (
            <div className={`flex h-full w-full items-center justify-center bg-gradient-to-br ${
              isFigJam 
                ? "from-purple-600/10 to-indigo-950/20" 
                : isSlides 
                ? "from-orange-600/10 to-red-950/20" 
                : "from-accent/15 to-purple-900/15"
            }`}>
              <span className={`text-4xl font-bold uppercase tracking-widest ${
                isFigJam ? "text-purple-400/40" : isSlides ? "text-orange-400/40" : "text-accent/40"
              }`}>
                {file.title.slice(0, 2)}
              </span>
            </div>
          )}
        </div>

        {/* Info bar below preview */}
        <div className="p-3.5 flex items-start gap-3 bg-surface">
          {/* File type icon indicator */}
          <div className={`mt-0.5 p-1.5 rounded flex-shrink-0 ${
            isFigJam 
              ? "bg-purple-500/10 text-purple-400" 
              : isSlides 
              ? "bg-orange-500/10 text-orange-400" 
              : "bg-accent/10 text-accent"
          }`}>
            {isFigJam ? (
              <FileCode className="h-4 w-4" />
            ) : isSlides ? (
              <Presentation className="h-4 w-4" />
            ) : (
              <Layers className="h-4 w-4" />
            )}
          </div>

          <div className="min-w-0 flex-1">
            <h3 className="truncate text-xs font-semibold text-foreground hover:text-accent transition-colors leading-tight">
              {file.title}
            </h3>
            <p className="mt-1 text-[10px] text-muted font-medium">
              {getRelativeTimeString(file.updatedAt)}
            </p>
          </div>
        </div>
      </Link>

      {/* Floating 3-dots actions menu */}
      <div className="absolute right-3.5 top-3 opacity-0 transition-opacity group-hover:opacity-100">
        <Button
          variant="secondary"
          size="sm"
          onClick={(e) => {
            e.preventDefault();
            setMenuOpen(!menuOpen);
            setShowMoveSubmenu(false);
          }}
          className="bg-surface border border-border hover:bg-surface-elevated h-7 w-7 p-0 flex items-center justify-center shadow"
        >
          <MoreHorizontal className="h-3.5 w-3.5" />
        </Button>

        {menuOpen && (
          <div className="absolute right-0 top-8 z-20 min-w-[180px] rounded-lg border border-border bg-surface-elevated py-1 shadow-lg text-xs font-medium">
            {/* Duplicate */}
            <button
              className="flex w-full items-center gap-2 px-3 py-2 hover:bg-border/50 text-left"
              onClick={handleDuplicate}
              disabled={duplicating}
            >
              <Copy className="h-3.5 w-3.5 text-muted" />
              <span>{duplicating ? "Duplicating..." : "Duplicate"}</span>
            </button>

            {/* Star / Unstar */}
            {!isTrashTab && (
              <button
                className="flex w-full items-center gap-2 px-3 py-2 hover:bg-border/50 text-left"
                onClick={handleStar}
              >
                <Star className={`h-3.5 w-3.5 ${file.isStarred ? "text-amber-400 fill-amber-400" : "text-muted"}`} />
                <span>{file.isStarred ? "Unstar" : "Star"}</span>
              </button>
            )}

            {/* Restore (for trash tab) */}
            {isTrashTab && onRestore && (
              <button
                className="flex w-full items-center gap-2 px-3 py-2 hover:bg-border/50 text-left"
                onClick={handleRestore}
              >
                <Undo className="h-3.5 w-3.5 text-muted" />
                <span>Restore</span>
              </button>
            )}

            {/* Move to Folder */}
            <div className="border-t border-border/50 my-1" />
            <button
              className="flex w-full items-center justify-between px-3 py-2 hover:bg-border/50 text-left"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                setShowMoveSubmenu(!showMoveSubmenu);
              }}
            >
              <span className="flex items-center gap-2">
                <FolderOpen className="h-3.5 w-3.5 text-muted" />
                <span>Move to folder</span>
              </span>
              <span className="text-[10px] text-muted">{showMoveSubmenu ? "▲" : "▼"}</span>
            </button>

            {/* Submenu for folders */}
            {showMoveSubmenu && (
              <div className="bg-background/40 border-l border-border ml-3 mt-1 py-1 space-y-0.5 max-h-[120px] overflow-y-auto">
                {currentFolderId && (
                  <button
                    className="flex w-full items-center px-3 py-1 hover:bg-border/30 text-left text-amber-400 font-medium"
                    onClick={(e) => handleMove(null, e)}
                  >
                    Unassign folder
                  </button>
                )}
                {folders.length === 0 ? (
                  <p className="px-3 py-1 text-muted text-[10px]">No folders created yet</p>
                ) : (
                  folders.map((f) => (
                    <button
                      key={f.id}
                      className={`flex w-full items-center px-3 py-1 hover:bg-border/30 text-left truncate ${
                        currentFolderId === f.id ? "text-accent font-semibold" : "text-muted"
                      }`}
                      onClick={(e) => handleMove(f.id, e)}
                    >
                      {f.name}
                    </button>
                  ))
                )}
              </div>
            )}

            {/* Delete */}
            <div className="border-t border-border/50 my-1" />
            <button
              className="flex w-full items-center gap-2 px-3 py-2 text-red-400 hover:bg-border/50 text-left"
              onClick={handleDelete}
            >
              <Trash2 className="h-3.5 w-3.5" />
              <span>Delete</span>
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
