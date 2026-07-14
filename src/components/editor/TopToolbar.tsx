"use client";

import {
  Download,
  Redo2,
  Undo2,
  Keyboard,
  History,
  Bell,
  Search,
  Layers,
  Menu,
  Play,
  X,
} from "lucide-react";
import Link from "next/link";
import { useState, useEffect, useRef } from "react";
import { track } from "tldraw";
import { useEditorContext } from "./EditorContext";
import { PresenceBar } from "./PresenceBar";
import dynamic from "next/dynamic";
import { Button } from "@/components/ui/Button";
import type { DesignFile, SaveStatus } from "@/types";

// These dialogs are only needed when user explicitly clicks their trigger buttons.
// Lazy-loading them removes ~80KB from the critical editor parse budget.
//
// IMPORTANT: every one of these must pass its own `loading` fallback. Without
// one, next/dynamic has no local Suspense boundary to resolve against and the
// suspend bubbles up to Liveblocks' <ClientSideSuspense>, which wraps the
// entire editor — unmounting and remounting the whole Tldraw instance (wiping
// the in-memory canvas) the first time any of these is opened. Confirmed via
// instrumented mount/unmount logging before this fix — do not remove `loading`.
const ExportMenu = dynamic(() => import("./ExportMenu").then(m => ({ default: m.ExportMenu })), { loading: () => null });
const ShareDialog = dynamic(() => import("./ShareDialog").then(m => ({ default: m.ShareDialog })), { loading: () => null });
const KeyboardShortcutsDialog = dynamic(() => import("./KeyboardShortcutsDialog").then(m => ({ default: m.KeyboardShortcutsDialog })), { loading: () => null });
const NotificationsPanel = dynamic(() => import("./NotificationsPanel").then(m => ({ default: m.NotificationsPanel })), { loading: () => null });
const CommandPalette = dynamic(() => import("./CommandPalette").then(m => ({ default: m.CommandPalette })), { loading: () => null });
const AlignmentToolsMenu = dynamic(() => import("./AlignmentToolsMenu").then(m => ({ default: m.AlignmentToolsMenu })), { loading: () => null });

interface TopToolbarProps {
  file: DesignFile;
  saveStatus: SaveStatus;
  onTitleChange: (title: string) => void;
  onFileChange: (updates: Partial<Pick<DesignFile, "isPublic">>) => void;
  readonly?: boolean;
}

export const TopToolbar = track(function TopToolbar({
  file,
  saveStatus,
  onTitleChange,
  onFileChange,
  readonly = false,
}: TopToolbarProps) {
  const {
    editor,
    isVersionHistoryOpen,
    setIsVersionHistoryOpen,
    notifications,
    setNotifications,
    dbNotifications,
    isNotificationsOpen,
    setIsNotificationsOpen,
    isPresenting,
    setIsPresenting,
  } = useEditorContext();
  const unreadNotifications =
    notifications.filter((n) => !n.read).length +
    dbNotifications.filter((n) => !n.read).length;
  const [shareOpen, setShareOpen] = useState(false);
  const [exportOpen, setExportOpen] = useState(false);
  const [shortcutsOpen, setShortcutsOpen] = useState(false);
  const [commandPaletteOpen, setCommandPaletteOpen] = useState(false);
  const [alignmentOpen, setAlignmentOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const gridVisible = editor?.getInstanceState().isGridMode ?? false;
  const snapEnabled = editor?.user.getIsSnapMode() ?? false;

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ignore if typing in an input
      if ((e.target as HTMLElement).tagName === "INPUT") return;

      const key = e.key.toLowerCase();

      // Command Palette (Ctrl+K)
      if ((e.ctrlKey || e.metaKey) && key === "k") {
        e.preventDefault();
        setCommandPaletteOpen((open) => !open);
        return;
      }

      // Alignment Menu (Ctrl+Shift+A)
      if ((e.ctrlKey || e.metaKey) && e.shiftKey && key === "a") {
        e.preventDefault();
        setAlignmentOpen((open) => !open);
        return;
      }

      // Exit Present mode
      if (key === "escape" && isPresenting) {
        setIsPresenting(false);
        return;
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [isPresenting, setIsPresenting]);

  // Close the main menu on outside click
  useEffect(() => {
    if (!menuOpen) return;
    const handleClick = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [menuOpen]);

  const handleFileChangeWrapper = (updates: Partial<Pick<DesignFile, "isPublic">>) => {
    onFileChange(updates);
    if (updates.isPublic !== undefined && setNotifications) {
      setNotifications((prev) => [
        {
          id: `share-${Date.now()}`,
          type: "share",
          title: "Share settings updated",
          message: updates.isPublic
            ? "File is now public. Anyone with the link can view."
            : "File is now private. Access is restricted.",
          timestamp: "Just now",
          read: false,
        },
        ...prev,
      ]);
    }
  };

  const toggleGrid = () => editor?.updateInstanceState({ isGridMode: !gridVisible });
  const toggleSnap = () => editor?.user.updateUserPreferences({ isSnapMode: !snapEnabled });

  const handlePresent = () => {
    setIsPresenting(true);
    setMenuOpen(false);
    // Fit the whole design in frame, like Figma's Present view does on entry.
    requestAnimationFrame(() => editor?.zoomToFit());
  };

  const saveLabel =
    saveStatus === "saving"
      ? "Saving..."
      : saveStatus === "saved"
        ? "Saved"
        : saveStatus === "error"
          ? "Error saving"
          : "";

  // ── Present mode: a stripped-down chrome, just an exit control up top ──
  if (isPresenting) {
    return (
      <div className="pointer-events-none absolute top-3 right-3 z-50 flex items-center gap-2">
        <button
          onClick={() => setIsPresenting(false)}
          title="Exit present mode (Esc)"
          className="pointer-events-auto flex h-9 items-center gap-1.5 rounded-lg border border-border bg-surface px-3 text-xs font-medium text-foreground shadow-lg hover:bg-surface-elevated"
        >
          <X className="h-3.5 w-3.5" />
          Exit
        </button>
      </div>
    );
  }

  return (
    <>
      <header className="flex h-12 items-center gap-2 border-b border-border bg-surface px-2">
        <div ref={menuRef} className="relative">
          <button
            onClick={() => setMenuOpen((o) => !o)}
            title="Main menu"
            className={`flex h-8 w-8 items-center justify-center rounded-md transition-colors ${
              menuOpen ? "bg-surface-elevated text-foreground" : "text-muted hover:bg-surface-elevated hover:text-foreground"
            }`}
          >
            <Menu className="h-4 w-4" />
          </button>
          {menuOpen && (
            <div className="absolute left-0 top-full mt-1 w-56 rounded-lg border border-border bg-surface p-1 shadow-2xl z-50">
              <Link
                href="/dashboard"
                className="flex items-center rounded px-2 py-1.5 text-xs text-foreground hover:bg-surface-elevated"
              >
                Back to dashboard
              </Link>
              <div className="my-1 h-px bg-border" />
              {!readonly && (
                <>
                  <button
                    onClick={toggleGrid}
                    className="flex w-full items-center justify-between rounded px-2 py-1.5 text-left text-xs text-foreground hover:bg-surface-elevated"
                  >
                    Show grid
                    {gridVisible && <span className="text-accent">✓</span>}
                  </button>
                  <button
                    onClick={toggleSnap}
                    className="flex w-full items-center justify-between rounded px-2 py-1.5 text-left text-xs text-foreground hover:bg-surface-elevated"
                  >
                    Snap to grid
                    {snapEnabled && <span className="text-accent">✓</span>}
                  </button>
                  <div className="my-1 h-px bg-border" />
                  <button
                    onClick={() => { setExportOpen(true); setMenuOpen(false); }}
                    className="flex w-full items-center rounded px-2 py-1.5 text-left text-xs text-foreground hover:bg-surface-elevated"
                  >
                    Export…
                  </button>
                  <button
                    onClick={() => { setIsVersionHistoryOpen(true); setMenuOpen(false); }}
                    className="flex w-full items-center rounded px-2 py-1.5 text-left text-xs text-foreground hover:bg-surface-elevated"
                  >
                    Show version history
                  </button>
                  <button
                    onClick={() => { setShortcutsOpen(true); setMenuOpen(false); }}
                    className="flex w-full items-center rounded px-2 py-1.5 text-left text-xs text-foreground hover:bg-surface-elevated"
                  >
                    Keyboard shortcuts
                  </button>
                </>
              )}
            </div>
          )}
        </div>

        <div className="h-5 w-px bg-border" />

        {!readonly ? (
          <input
            value={file.title}
            onChange={(e) => onTitleChange(e.target.value)}
            className="max-w-50 rounded bg-transparent px-1.5 py-0.5 text-sm font-medium outline-none hover:bg-surface-elevated focus:bg-surface-elevated"
          />
        ) : (
          <span className="text-sm font-medium">{file.title}</span>
        )}

        {saveLabel && (
          <span
            className={`text-xs ${saveStatus === "error" ? "text-danger" : "text-muted"}`}
          >
            {saveLabel}
          </span>
        )}

        <div className="flex-1" />

        {!readonly && (
          <>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => editor?.undo()}
              title="Undo (Ctrl+Z)"
            >
              <Undo2 className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => editor?.redo()}
              title="Redo (Ctrl+Shift+Z)"
            >
              <Redo2 className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setAlignmentOpen(true)}
              title="Arrange & Align (Ctrl+Shift+A)"
            >
              <Layers className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsVersionHistoryOpen(!isVersionHistoryOpen)}
              title="Version History"
            >
              <History className="h-4 w-4" />
            </Button>

            <div className="w-px h-5 bg-border mx-1" />
          </>
        )}

        <PresenceBar />

        {!readonly && (
          <>
            <Button variant="primary" size="sm" onClick={() => setShareOpen(true)}>
              Share
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={handlePresent}
              title="Present"
            >
              <Play className="h-4 w-4" />
            </Button>

            <div className="w-px h-5 bg-border mx-1" />

            <Button
              variant="ghost"
              size="sm"
              onClick={() => setExportOpen(true)}
              title="Export"
            >
              <Download className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShortcutsOpen(true)}
              title="Keyboard Shortcuts"
            >
              <Keyboard className="h-4 w-4" />
            </Button>
            <div className="relative">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setIsNotificationsOpen(!isNotificationsOpen)}
                title="Notifications"
                className="notification-trigger relative"
              >
                <Bell className="h-4 w-4" />
                {unreadNotifications > 0 && (
                  <span className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-accent text-[9px] font-bold text-white ring-1 ring-background animate-pulse">
                    {unreadNotifications}
                  </span>
                )}
              </Button>
              {isNotificationsOpen && (
                <NotificationsPanel onClose={() => setIsNotificationsOpen(false)} />
              )}
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setCommandPaletteOpen(true)}
              title="Command Palette (Ctrl+K)"
              className="flex items-center gap-1"
            >
              <Search className="h-4 w-4 text-muted" />
              <kbd className="hidden sm:inline-flex h-4 px-1 rounded bg-background text-[9px] font-medium text-muted font-mono leading-none items-center justify-center">
                ⌘K
              </kbd>
            </Button>
          </>
        )}
      </header>

      {!readonly && (
        <>
          <ShareDialog
            open={shareOpen}
            onClose={() => setShareOpen(false)}
            file={file}
            onFileChange={handleFileChangeWrapper}
          />
          <ExportMenu
            open={exportOpen}
            onClose={() => setExportOpen(false)}
          />
          <KeyboardShortcutsDialog
            open={shortcutsOpen}
            onClose={() => setShortcutsOpen(false)}
          />
          <CommandPalette
            isOpen={commandPaletteOpen}
            onClose={() => setCommandPaletteOpen(false)}
          />
          <AlignmentToolsMenu
            isOpen={alignmentOpen}
            onClose={() => setAlignmentOpen(false)}
          />
        </>
      )}
    </>
  );
});
