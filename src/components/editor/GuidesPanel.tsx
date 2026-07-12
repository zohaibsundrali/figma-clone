"use client";

import { useEffect, useState } from "react";
import { useEditorContext } from "./EditorContext";
import { Trash2, Plus, Eye, Lock } from "lucide-react";

interface Guide {
  id: string;
  fileId: string;
  setName: string;
  position: number;
  type: "horizontal" | "vertical";
  locked: boolean;
  color: string;
  createdAt: string;
  updatedAt: string;
}

interface GuideSet {
  name: string;
  guides: Guide[];
}

export function GuidesPanel() {
  const { fileId } = useEditorContext();
  const [guides, setGuides] = useState<Guide[]>([]);
  const [loading, setLoading] = useState(false);
  const [newSetName, setNewSetName] = useState("");
  const [newPosition, setNewPosition] = useState("");
  const [newType, setNewType] = useState<"horizontal" | "vertical">("horizontal");

  useEffect(() => {
    if (!fileId) return;
    loadGuides();
  }, [fileId]);

  const loadGuides = async () => {
    if (!fileId) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/files/${fileId}/guides`);
      if (res.ok) {
        const data = await res.json();
        setGuides(data);
      }
    } catch (error) {
      console.error("Failed to load guides:", error);
    } finally {
      setLoading(false);
    }
  };

  const addGuide = async () => {
    if (!fileId || !newSetName || newPosition === "") return;

    try {
      const res = await fetch(`/api/files/${fileId}/guides`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          setName: newSetName,
          position: parseFloat(newPosition),
          type: newType,
        }),
      });

      if (res.ok) {
        const guide = await res.json();
        setGuides([...guides, guide]);
        setNewPosition("");
        setNewSetName("");
      }
    } catch (error) {
      console.error("Failed to add guide:", error);
    }
  };

  const deleteGuide = async (guideId: string) => {
    if (!fileId) return;

    try {
      const res = await fetch(`/api/files/${fileId}/guides/${guideId}`, {
        method: "DELETE",
      });

      if (res.ok) {
        setGuides(guides.filter((g) => g.id !== guideId));
      }
    } catch (error) {
      console.error("Failed to delete guide:", error);
    }
  };

  const toggleLock = async (guideId: string, currentLocked: boolean) => {
    if (!fileId) return;

    try {
      const res = await fetch(`/api/files/${fileId}/guides/${guideId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ locked: !currentLocked }),
      });

      if (res.ok) {
        setGuides(
          guides.map((g) => (g.id === guideId ? { ...g, locked: !currentLocked } : g))
        );
      }
    } catch (error) {
      console.error("Failed to toggle lock:", error);
    }
  };

  // Group guides by set
  const guideSets: Record<string, Guide[]> = {};
  guides.forEach((guide) => {
    if (!guideSets[guide.setName]) {
      guideSets[guide.setName] = [];
    }
    guideSets[guide.setName].push(guide);
  });

  return (
    <div className="flex flex-col h-full bg-surface border-l border-border">
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {/* Add Guide Section */}
        <div className="space-y-2 pb-4 border-b border-border">
          <h3 className="text-sm font-semibold">Add Guide</h3>
          <input
            type="text"
            placeholder="Guide set name"
            value={newSetName}
            onChange={(e) => setNewSetName(e.target.value)}
            className="w-full px-2 py-1 text-xs rounded border border-border bg-surface-elevated focus:border-accent outline-none"
          />
          <div className="flex gap-2">
            <input
              type="number"
              placeholder="Position (px)"
              value={newPosition}
              onChange={(e) => setNewPosition(e.target.value)}
              className="flex-1 px-2 py-1 text-xs rounded border border-border bg-surface-elevated focus:border-accent outline-none"
            />
            <select
              value={newType}
              onChange={(e) => setNewType(e.target.value as "horizontal" | "vertical")}
              className="px-2 py-1 text-xs rounded border border-border bg-surface-elevated focus:border-accent outline-none"
            >
              <option value="horizontal">H</option>
              <option value="vertical">V</option>
            </select>
          </div>
          <button
            onClick={addGuide}
            disabled={!newSetName || newPosition === ""}
            className="w-full px-3 py-1 text-xs font-medium rounded bg-accent text-white hover:bg-accent/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-1"
          >
            <Plus className="h-3 w-3" />
            Add Guide
          </button>
        </div>

        {/* Guides List */}
        {loading ? (
          <div className="text-xs text-muted text-center py-4">Loading guides...</div>
        ) : Object.keys(guideSets).length === 0 ? (
          <div className="text-xs text-muted text-center py-4">No guides yet</div>
        ) : (
          Object.entries(guideSets).map(([setName, setGuides]) => (
            <div key={setName} className="space-y-1">
              <h4 className="text-xs font-semibold text-muted uppercase">{setName}</h4>
              {setGuides.map((guide) => (
                <div
                  key={guide.id}
                  className="flex items-center gap-2 p-2 rounded bg-surface-elevated hover:bg-border/50 transition-colors"
                >
                  <div
                    className="h-3 w-3 rounded-sm"
                    style={{ backgroundColor: guide.color }}
                    title={`${guide.type[0].toUpperCase()} @ ${guide.position}px`}
                  />
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-medium truncate">
                      {guide.type === "horizontal" ? "H" : "V"} {guide.position}px
                    </p>
                  </div>
                  <button
                    onClick={() => toggleLock(guide.id, guide.locked)}
                    className="p-1 hover:bg-border rounded transition-colors"
                    title={guide.locked ? "Unlock" : "Lock"}
                  >
                    <Lock
                      className={`h-3 w-3 ${guide.locked ? "text-accent" : "text-muted"}`}
                    />
                  </button>
                  <button
                    onClick={() => deleteGuide(guide.id)}
                    className="p-1 hover:bg-destructive/10 rounded transition-colors text-destructive"
                  >
                    <Trash2 className="h-3 w-3" />
                  </button>
                </div>
              ))}
            </div>
          ))
        )}
      </div>

      {/* Footer */}
      <div className="border-t border-border p-3 text-xs text-muted">
        <p>💡 Create guides for alignment and snapping</p>
      </div>
    </div>
  );
}
