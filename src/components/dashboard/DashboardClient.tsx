"use client";

import { useCallback, useState, useTransition, useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import { UserButton } from "@clerk/nextjs";
import { FileGrid } from "./FileGrid";
import type { DesignFileSummary } from "@/types";
import {
  Folder,
  FolderPlus,
  Clock,
  Share2,
  Archive,
  Layers,
  Trash2,
  Check,
  X,
  FileText,
  Search,
  ChevronDown,
  Globe,
  Star,
  FileCode,
  Presentation,
  Grid,
  Plus,
  Bell
} from "lucide-react";

interface DashboardClientProps {
  initialFiles: DesignFileSummary[];
}

export function DashboardClient({ initialFiles }: DashboardClientProps) {
  const router = useRouter();
  const [files, setFiles] = useState<DesignFileSummary[]>(initialFiles);
  const [search, setSearch] = useState("");
  const [filteredFiles, setFilteredFiles] = useState<DesignFileSummary[]>(initialFiles);
  const [error, setError] = useState<string | null>(null);
  const [isSearching, startSearchTransition] = useTransition();

  // Create file actions loading states
  const [creating, setCreating] = useState(false);

  // Folders and archiving state (frontend-only MVP)
  const [folders, setFolders] = useState<Array<{ id: string; name: string }>>([]);
  const [fileFolderMap, setFileFolderMap] = useState<Record<string, string>>({});
  const [archivedFileIds, setArchivedFileIds] = useState<string[]>([]);
  const [selectedTab, setSelectedTab] = useState<string>("recent");
  const [isCreatingFolder, setIsCreatingFolder] = useState(false);
  const [newFolderName, setNewFolderName] = useState("");
  const [isMounted, setIsMounted] = useState(false);

  // Load from localStorage on client-mount to prevent hydration mismatch
  useEffect(() => {
    setIsMounted(true);
    try {
      const storedFolders = localStorage.getItem("figma_folders");
      if (storedFolders) setFolders(JSON.parse(storedFolders));

      const storedMap = localStorage.getItem("figma_file_folder_map");
      if (storedMap) setFileFolderMap(JSON.parse(storedMap));

      const storedArchived = localStorage.getItem("figma_archived_files");
      if (storedArchived) setArchivedFileIds(JSON.parse(storedArchived));
    } catch (e) {
      console.error("Failed to load local storage dashboard configurations:", e);
    }
  }, []);

  // Client-side search — filters the already-loaded list instantly.
  const handleSearchChange = useCallback(
    (value: string) => {
      setSearch(value);
      setError(null);

      if (!value.trim()) {
        setFilteredFiles(files);
        return;
      }

      const lower = value.toLowerCase();
      setFilteredFiles(files.filter((f) => f.title.toLowerCase().includes(lower)));

      // Sync with server in background
      startSearchTransition(async () => {
        try {
          const res = await fetch(`/api/files?q=${encodeURIComponent(value.trim())}`);
          if (!res.ok) return;
          const data: DesignFileSummary[] = await res.json();
          setFilteredFiles(data);
        } catch {
          // local filter already shown
        }
      });
    },
    [files]
  );

  async function handleCreate(type: "design" | "figjam" | "slides") {
    if (creating) return;
    setCreating(true);
    let title = "Untitled Design";
    if (type === "figjam") title = "FigJam basics";
    if (type === "slides") title = "Slides Template";

    try {
      const res = await fetch("/api/files", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title }),
      });
      if (!res.ok) throw new Error("Failed to create file");
      const file = await res.json();
      router.push(`/editor/${file.id}`);
    } catch {
      setCreating(false);
      setError("Failed to create file. Please try again.");
    }
  }

  const handleDelete = useCallback(async (id: string) => {
    const prev = files;
    setFiles((f) => f.filter((x) => x.id !== id));
    setFilteredFiles((f) => f.filter((x) => x.id !== id));

    try {
      const res = await fetch(`/api/files/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Delete failed");
      
      setFileFolderMap((prevMap) => {
        const updated = { ...prevMap };
        delete updated[id];
        localStorage.setItem("figma_file_folder_map", JSON.stringify(updated));
        return updated;
      });
      setArchivedFileIds((prevArchived) => {
        const updated = prevArchived.filter((x) => x !== id);
        localStorage.setItem("figma_archived_files", JSON.stringify(updated));
        return updated;
      });
    } catch {
      setFiles(prev);
      setFilteredFiles(prev.filter((f) => f.title.toLowerCase().includes(search.toLowerCase())));
      setError("Failed to delete file. Please try again.");
    }
  }, [files, search]);

  const handleDuplicate = useCallback(async (id: string) => {
    try {
      const res = await fetch(`/api/files/${id}/duplicate`, { method: "POST" });
      if (!res.ok) throw new Error("Duplicate failed");
      const duplicate: DesignFileSummary = await res.json();
      setFiles((f) => [duplicate, ...f]);
      setFilteredFiles((f) => [duplicate, ...f]);
    } catch {
      setError("Failed to duplicate file. Please try again.");
    }
  }, []);

  const handleCreateFolderSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const name = newFolderName.trim();
    if (!name) return;

    const newFolder = { id: `folder-${Date.now()}`, name };
    const updated = [...folders, newFolder];
    setFolders(updated);
    localStorage.setItem("figma_folders", JSON.stringify(updated));
    setNewFolderName("");
    setIsCreatingFolder(false);
    setSelectedTab(newFolder.id);
  };

  const handleDeleteFolder = (folderId: string, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!confirm("Are you sure you want to delete this folder? Files inside will remain but be unassigned.")) return;

    const updatedFolders = folders.filter((f) => f.id !== folderId);
    setFolders(updatedFolders);
    localStorage.setItem("figma_folders", JSON.stringify(updatedFolders));

    setFileFolderMap((prevMap) => {
      const updated = { ...prevMap };
      Object.keys(updated).forEach((fileId) => {
        if (updated[fileId] === folderId) {
          delete updated[fileId];
        }
      });
      localStorage.setItem("figma_file_folder_map", JSON.stringify(updated));
      return updated;
    });

    if (selectedTab === folderId) {
      setSelectedTab("recent");
    }
  };

  const handleMoveToFolder = (fileId: string, folderId: string | null) => {
    setFileFolderMap((prevMap) => {
      const updated = { ...prevMap };
      if (folderId === null) {
        delete updated[fileId];
      } else {
        updated[fileId] = folderId;
      }
      localStorage.setItem("figma_file_folder_map", JSON.stringify(updated));
      return updated;
    });
  };

  const handleArchiveToggle = (fileId: string) => {
    setArchivedFileIds((prevArchived) => {
      const updated = prevArchived.includes(fileId)
        ? prevArchived.filter((id) => id !== fileId)
        : [...prevArchived, fileId];
      localStorage.setItem("figma_archived_files", JSON.stringify(updated));
      return updated;
    });
  };

  const displayedFiles = useMemo(() => {
    if (!isMounted) return filteredFiles;

    return filteredFiles.filter((file) => {
      const isArchived = archivedFileIds.includes(file.id);

      if (selectedTab === "archived") {
        return isArchived;
      }
      if (isArchived) {
        return false;
      }

      if (selectedTab === "all" || selectedTab === "recent") {
        return true;
      }
      if (selectedTab === "shared") {
        return file.isPublic;
      }
      return fileFolderMap[file.id] === selectedTab;
    });
  }, [filteredFiles, selectedTab, archivedFileIds, fileFolderMap, isMounted]);

  const activeTabTitle = useMemo(() => {
    if (selectedTab === "all") return "All projects";
    if (selectedTab === "recent") return "Recents";
    if (selectedTab === "shared") return "Shared files";
    if (selectedTab === "archived") return "Trash";
    return folders.find((f) => f.id === selectedTab)?.name || "Folder";
  }, [selectedTab, folders]);

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-background text-foreground select-none font-sans">
      {/* 1. LEFT SIDEBAR (Exactly matching Figma theme) */}
      <aside className="w-64 border-r border-border bg-surface flex flex-col justify-between flex-shrink-0 h-full">
        <div className="flex flex-col gap-4 p-4 min-h-0 overflow-y-auto">
          {/* User Profile dropdown & notifications */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5 cursor-pointer hover:bg-border/30 p-1.5 rounded-lg transition-colors">
              <div className="h-6 w-6 rounded-full bg-accent flex items-center justify-center text-xs font-bold text-white shadow-inner">
                Z
              </div>
              <span className="text-xs font-bold text-foreground">Zohaib</span>
              <ChevronDown className="h-3 w-3 text-muted" />
            </div>
            <button className="text-muted hover:text-foreground transition-colors p-1.5 rounded-full hover:bg-border/40">
              <Bell className="h-4 w-4" />
            </button>
          </div>

          {/* Search bar inside Sidebar */}
          <div className="relative">
            <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted" />
            <input
              type="text"
              placeholder="Search"
              value={search}
              onChange={(e) => handleSearchChange(e.target.value)}
              className="w-full bg-surface-elevated pl-8 pr-3 py-1.5 text-xs rounded border border-border outline-none focus:border-accent"
            />
          </div>

          {/* Recents and Community buttons */}
          <div className="space-y-0.5">
            <button
              onClick={() => setSelectedTab("recent")}
              className={`flex w-full items-center gap-2.5 px-2.5 py-2 rounded-lg text-xs font-semibold transition-colors ${
                selectedTab === "recent"
                  ? "bg-accent/10 text-accent font-bold"
                  : "text-muted hover:text-foreground hover:bg-border/20"
              }`}
            >
              <Clock className="h-4 w-4" />
              <span>Recents</span>
            </button>

            <button
              onClick={() => setSelectedTab("shared")}
              className={`flex w-full items-center gap-2.5 px-2.5 py-2 rounded-lg text-xs font-semibold transition-colors ${
                selectedTab === "shared"
                  ? "bg-accent/10 text-accent font-bold"
                  : "text-muted hover:text-foreground hover:bg-border/20"
              }`}
            >
              <Globe className="h-4 w-4" />
              <span>Community</span>
            </button>
          </div>

          {/* Divider */}
          <div className="h-px bg-border/40 my-1" />

          {/* Team Workspace section */}
          <div className="space-y-1">
            <div className="flex items-center justify-between px-2 py-1">
              <span className="text-[10px] font-bold text-muted uppercase tracking-wider">zohaib6511's team</span>
              <span className="text-[9px] font-bold bg-accent/15 text-accent px-1.5 py-0.5 rounded border border-accent/20">Free</span>
            </div>

            <button
              onClick={() => setSelectedTab("all")}
              className={`flex w-full items-center gap-2.5 px-2.5 py-2 rounded-lg text-xs font-semibold transition-colors ${
                selectedTab === "all"
                  ? "bg-accent/10 text-accent font-bold"
                  : "text-muted hover:text-foreground hover:bg-border/20"
              }`}
            >
              <FileText className="h-4 w-4" />
              <span>Drafts</span>
            </button>

            <button
              onClick={() => setSelectedTab("all")}
              className={`flex w-full items-center gap-2.5 px-2.5 py-2 rounded-lg text-xs font-semibold transition-colors ${
                selectedTab === "all"
                  ? "bg-accent/10 text-accent font-bold"
                  : "text-muted hover:text-foreground hover:bg-border/20"
              }`}
            >
              <Grid className="h-4 w-4" />
              <span>All projects</span>
            </button>

            <button
              onClick={() => setSelectedTab("archived")}
              className={`flex w-full items-center gap-2.5 px-2.5 py-2 rounded-lg text-xs font-semibold transition-colors ${
                selectedTab === "archived"
                  ? "bg-accent/10 text-accent font-bold"
                  : "text-muted hover:text-foreground hover:bg-border/20"
              }`}
            >
              <Trash2 className="h-4 w-4" />
              <span>Trash</span>
            </button>
          </div>

          {/* Starred Projects Section */}
          <div className="space-y-1">
            <div className="flex items-center justify-between px-2 py-1">
              <span className="text-[10px] font-bold text-muted uppercase tracking-wider">Starred</span>
            </div>
            <button
              onClick={() => setSelectedTab("all")}
              className="flex w-full items-center gap-2.5 px-2.5 py-2 rounded-lg text-xs font-semibold text-muted hover:text-foreground hover:bg-border/20"
            >
              <Star className="h-4 w-4 text-amber-400" />
              <span>Team project</span>
            </button>
          </div>

          {/* Custom Folders Section */}
          <div className="space-y-1">
            <div className="flex justify-between items-center px-2 py-1">
              <span className="text-[10px] font-bold text-muted uppercase tracking-wider">Folders</span>
              <button
                onClick={() => setIsCreatingFolder(!isCreatingFolder)}
                className="text-muted hover:text-foreground transition-colors p-0.5 rounded hover:bg-border/40"
              >
                <FolderPlus className="h-3.5 w-3.5" />
              </button>
            </div>

            {isCreatingFolder && (
              <form onSubmit={handleCreateFolderSubmit} className="flex items-center gap-1 p-1 border border-accent rounded bg-surface-elevated">
                <input
                  type="text"
                  autoFocus
                  value={newFolderName}
                  onChange={(e) => setNewFolderName(e.target.value)}
                  placeholder="New folder..."
                  className="flex-1 bg-transparent text-[11px] outline-none border-none p-1 text-foreground"
                />
                <button type="submit" className="p-0.5 text-emerald-400 hover:text-emerald-300">
                  <Check className="h-3 w-3" />
                </button>
                <button type="button" onClick={() => setIsCreatingFolder(false)} className="p-0.5 text-red-400 hover:text-red-300">
                  <X className="h-3 w-3" />
                </button>
              </form>
            )}

            <div className="space-y-0.5 max-h-[150px] overflow-y-auto">
              {folders.map((f) => (
                <div
                  key={f.id}
                  onClick={() => setSelectedTab(f.id)}
                  className={`group flex items-center justify-between w-full rounded-lg text-xs font-semibold transition-colors cursor-pointer ${
                    selectedTab === f.id ? "bg-accent/10 text-accent font-bold" : "text-muted hover:text-foreground hover:bg-border/20"
                  }`}
                >
                  <div className="flex items-center gap-2.5 px-2.5 py-2 truncate">
                    <Folder className="h-4 w-4 flex-shrink-0" />
                    <span className="truncate">{f.name}</span>
                  </div>
                  <button
                    onClick={(e) => handleDeleteFolder(f.id, e)}
                    className="opacity-0 group-hover:opacity-100 text-muted hover:text-red-400 p-1 mr-1 transition-opacity"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Upgrade Plan Promo Card */}
        <div className="p-4 border-t border-border bg-surface-elevated/20">
          <div className="bg-surface-elevated/60 border border-border p-3.5 rounded-lg flex flex-col gap-2.5 shadow-sm">
            <span className="text-[10px] font-bold text-muted uppercase tracking-wider block">Upgrade plans</span>
            <p className="text-[11px] text-muted font-medium leading-relaxed">
              You're running out of files in your free team. Upgrade to grow without limits.
            </p>
            <button className="w-full bg-accent text-white font-semibold text-xs py-1.5 rounded-md hover:bg-accent/90 transition-colors shadow">
              View plans
            </button>
          </div>
        </div>
      </aside>

      {/* 2. MAIN LAYOUT CONTAINER */}
      <main className="flex-1 flex flex-col min-w-0 bg-background h-full">
        {/* Top Header Menu Bar */}
        <header className="h-14 border-b border-border bg-surface px-6 flex items-center justify-between flex-shrink-0">
          {/* Left: Breadcrumbs */}
          <div className="flex items-center gap-2">
            <span className="text-sm font-bold text-foreground capitalize">{activeTabTitle}</span>
          </div>

          {/* Center/Right: Create Template Buttons and Clerk User Profile */}
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              {/* + Design Button (Blue) */}
              <button
                onClick={() => handleCreate("design")}
                disabled={creating}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded bg-accent hover:bg-accent/90 text-white text-xs font-bold transition-all shadow-sm disabled:opacity-50"
              >
                <Plus className="h-3.5 w-3.5" />
                <span>Design</span>
              </button>

              {/* + FigJam Button (Purple) */}
              <button
                onClick={() => handleCreate("figjam")}
                disabled={creating}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded bg-purple-600 hover:bg-purple-500 text-white text-xs font-bold transition-all shadow-sm disabled:opacity-50"
              >
                <FileCode className="h-3.5 w-3.5" />
                <span>FigJam</span>
              </button>

              {/* + Slides Button (Orange) */}
              <button
                onClick={() => handleCreate("slides")}
                disabled={creating}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded bg-orange-600 hover:bg-orange-500 text-white text-xs font-bold transition-all shadow-sm disabled:opacity-50"
              >
                <Presentation className="h-3.5 w-3.5" />
                <span>Slides</span>
              </button>
            </div>

            {/* Clerk User Profile button */}
            <div className="h-px bg-border w-4" />
            <UserButton />
          </div>
        </header>

        {/* Scrollable Workspace view */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Sub Navigation filters */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-border/60 pb-3">
            <div className="flex items-center gap-6">
              <button
                onClick={() => setSelectedTab("recent")}
                className={`text-xs font-bold pb-3 border-b-2 transition-all -mb-3.5 ${
                  selectedTab === "recent"
                    ? "border-accent text-foreground font-semibold"
                    : "border-transparent text-muted hover:text-foreground"
                }`}
              >
                Recently viewed
              </button>
              <button
                onClick={() => setSelectedTab("shared")}
                className={`text-xs font-bold pb-3 border-b-2 transition-all -mb-3.5 ${
                  selectedTab === "shared"
                    ? "border-accent text-foreground font-semibold"
                    : "border-transparent text-muted hover:text-foreground"
                }`}
              >
                Shared files
              </button>
              <button
                onClick={() => setSelectedTab("all")}
                className={`text-xs font-bold pb-3 border-b-2 transition-all -mb-3.5 ${
                  selectedTab === "all"
                    ? "border-accent text-foreground font-semibold"
                    : "border-transparent text-muted hover:text-foreground"
                }`}
              >
                All drafts
              </button>
            </div>

            <div className="flex items-center gap-3">
              <div className="text-[11px] text-muted font-bold bg-surface-elevated/40 border border-border px-2.5 py-1 rounded cursor-pointer hover:bg-border/20 transition-all flex items-center gap-1">
                <span>All organizations</span>
                <ChevronDown className="h-3 w-3" />
              </div>
              <div className="text-[11px] text-muted font-bold bg-surface-elevated/40 border border-border px-2.5 py-1 rounded cursor-pointer hover:bg-border/20 transition-all flex items-center gap-1">
                <span>All files</span>
                <ChevronDown className="h-3 w-3" />
              </div>
            </div>
          </div>

          {/* Error Alert bar */}
          {error && (
            <div className="flex items-center justify-between rounded-lg bg-red-500/10 px-4 py-3 text-xs text-red-400 font-semibold border border-red-500/20">
              <span>{error}</span>
              <button onClick={() => setError(null)} className="text-red-400 hover:text-red-300">
                ✕
              </button>
            </div>
          )}

          {/* Grid Layout of files */}
          <div className={isSearching ? "opacity-75 transition-opacity" : ""}>
            <FileGrid
              files={displayedFiles}
              onDelete={handleDelete}
              onDuplicate={handleDuplicate}
              folders={folders}
              onMoveToFolder={handleMoveToFolder}
              fileFolderMap={fileFolderMap}
              archivedFileIds={archivedFileIds}
              onArchiveToggle={handleArchiveToggle}
            />
          </div>
        </div>
      </main>
    </div>
  );
}
