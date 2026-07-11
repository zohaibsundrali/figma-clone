"use client";

import { useEffect, useState } from "react";
import { X, Save } from "lucide-react";
import { useEditorContext } from "./EditorContext";
import { getSnapshot, loadSnapshot } from "tldraw";

interface VersionHistory {
  id: string;
  fileId: string;
  authorId: string;
  authorName: string;
  name: string;
  canvasData: import("tldraw").StoreSnapshot<import("tldraw").TLRecord>;
  createdAt: string;
}

export function VersionHistorySidebar({ fileId, onClose }: { fileId: string, onClose: () => void }) {
  const { editor, setNotifications } = useEditorContext();
  const [versions, setVersions] = useState<VersionHistory[]>([]);
  const [description, setDescription] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [selectedVersionId, setSelectedVersionId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const refreshVersions = async () => {
    try {
      const res = await fetch(`/api/files/${fileId}/versions`);
      if (res.ok) {
        const data = await res.json();
        setVersions(data);
      }
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    const controller = new AbortController();

    const loadVersions = async () => {
      try {
        const response = await fetch(
          `/api/files/${fileId}/versions`,
          { signal: controller.signal }
        );

        if (!response.ok) {
          throw new Error("Failed to load versions");
        }

        const data = await response.json();

        if (!controller.signal.aborted) {
          setVersions(data);
        }
      } catch (error) {
        if (
          error instanceof DOMException &&
          error.name === "AbortError"
        ) {
          return;
        }

        console.error("Failed to load versions:", error);
      } finally {
        if (!controller.signal.aborted) {
          setIsLoading(false);
        }
      }
    };

    void loadVersions();

    return () => {
      controller.abort();
    };
  }, [fileId]);

  const handleSaveVersion = async () => {
    if (!editor || !description.trim() || isSaving) return;
    setIsSaving(true);
    
    try {
      const snapshot = getSnapshot(editor.store);
      const res = await fetch(`/api/files/${fileId}/versions`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: description,
          canvasData: snapshot,
          authorName: "You" 
        }),
      });

      if (res.ok) {
        const savedDescription = description;
        setDescription("");
        if (setNotifications) {
          setNotifications((prev) => [
            {
              id: `version-${Date.now()}`,
              type: "version",
              title: "Version saved",
              message: `Snapshot "${savedDescription}" saved successfully.`,
              timestamp: "Just now",
              read: false,
            },
            ...prev,
          ]);
        }
        await refreshVersions();
      }
    } catch (e) {
      console.error(e);
    } finally {
      setIsSaving(false);
    }
  };

  const handleRestore = async (version: VersionHistory) => {
    if (!editor) return;
    if (!confirm(`Are you sure you want to restore to "${version.name}"?`)) return;

    try {
      loadSnapshot(editor.store, version.canvasData);

      // Force an interaction marker so Liveblocks detects changes properly
      editor.markHistoryStoppingPoint("restore");
      
      await fetch(`/api/files/${fileId}/versions/${version.id}/restore`, {
        method: "POST",
      });
      
      onClose();
    } catch (e) {
      console.error("Failed to restore", e);
    }
  };

  return (
    <aside className="bg-surface-container-low border-l border-border w-60 h-full flex flex-col shrink-0 z-[60] absolute right-0 top-0 shadow-2xl transition-transform">
      <div className="h-12 flex items-center justify-between px-4 border-b border-border bg-surface-container">
        <h2 className="text-sm font-medium text-foreground">Version History</h2>
        <button className="p-1 hover:bg-white/5 rounded-full transition-colors" onClick={onClose}>
          <X className="h-4 w-4 text-muted" />
        </button>
      </div>
      
      <div className="flex-1 overflow-y-auto custom-scrollbar">
        {isLoading ? (
          <div className="p-4 text-xs text-muted text-center">Loading versions...</div>
        ) : versions.length === 0 ? (
          <div className="p-4 text-xs text-muted text-center">No versions saved yet.</div>
        ) : (
          versions.map((v) => {
            const isSelected = selectedVersionId === v.id;
            return (
              <div 
                key={v.id} 
                className={`relative flex flex-col px-4 py-3 cursor-pointer transition-all duration-150 group ${
                  isSelected ? 'border-l-2 border-primary bg-primary/10' : 'hover:bg-white/5 border-l-2 border-transparent'
                }`}
                onClick={() => setSelectedVersionId(v.id)}
              >
                <div className="flex justify-between items-start mb-1">
                  <span className={`text-[13px] font-medium truncate pr-2 ${isSelected ? 'text-primary' : 'text-foreground'}`}>
                    {v.name}
                  </span>
                  <span className="text-[10px] text-muted whitespace-nowrap pt-0.5">
                    {new Date(v.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>
                <div className="flex items-center gap-1.5 mt-1">
                  <div className="w-4 h-4 rounded-full overflow-hidden bg-primary flex items-center justify-center text-[8px] font-bold text-on-primary">
                    {v.authorName.charAt(0).toUpperCase()}
                  </div>
                  <span className="text-[11px] text-muted">{v.authorName}</span>
                </div>
                
                {isSelected && (
                  <button 
                    onClick={(e) => { e.stopPropagation(); handleRestore(v); }}
                    className="mt-3 w-full bg-surface-elevated hover:bg-border text-foreground text-xs py-1.5 rounded border border-border transition-colors font-medium"
                  >
                    Restore this version
                  </button>
                )}
              </div>
            );
          })
        )}
      </div>

      <div className="p-4 border-t border-border bg-surface-container-low">
        <label className="block text-xs font-medium text-muted mb-2">Version Description</label>
        <textarea 
          className="w-full bg-surface-elevated text-foreground text-xs rounded border border-border p-2 focus:border-primary focus:ring-0 resize-none h-16 mb-3 transition-all outline-none" 
          placeholder="Describe these changes..."
          value={description}
          onChange={(e) => setDescription(e.target.value)}
        ></textarea>
        <button 
          className="w-full bg-primary text-on-primary py-2 rounded text-xs font-medium hover:brightness-110 transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
          onClick={handleSaveVersion}
          disabled={!description.trim() || isSaving}
        >
          <Save className="h-3.5 w-3.5" />
          {isSaving ? "Saving..." : "Save current version"}
        </button>
      </div>
    </aside>
  );
}
