"use client";

import { useEffect, useState } from "react";
import { Trash2, Plus, Loader2 } from "lucide-react";
import type { Template } from "@/types";

interface TemplateGalleryProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectTemplate: (template: Template) => void;
}

export function TemplateGallery({ isOpen, onClose, onSelectTemplate }: TemplateGalleryProps) {
  const [templates, setTemplates] = useState<Template[]>([]);
  const [myTemplates, setMyTemplates] = useState<Template[]>([]);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<"public" | "mine">("public");

  useEffect(() => {
    if (!isOpen) return;

    const fetchTemplates = async () => {
      setLoading(true);
      try {
        const [publicRes, myRes] = await Promise.all([
          fetch("/api/templates?take=20"),
          fetch("/api/templates/my-templates?take=20"),
        ]);

        if (publicRes.ok) {
          setTemplates(await publicRes.json());
        }
        if (myRes.ok) {
          setMyTemplates(await myRes.json());
        }
      } catch (err) {
        console.error("Failed to fetch templates:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchTemplates();
  }, [isOpen]);

  const handleDeleteTemplate = async (id: string) => {
    if (!confirm("Delete this template?")) return;

    try {
      const res = await fetch(`/api/templates/${id}`, { method: "DELETE" });
      if (res.ok) {
        setMyTemplates((prev) => prev.filter((t) => t.id !== id));
      }
    } catch (err) {
      console.error("Failed to delete template:", err);
    }
  };

  if (!isOpen) return null;

  const displayTemplates = activeTab === "public" ? templates : myTemplates;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="rounded-lg border border-border bg-surface shadow-lg max-w-4xl w-full max-h-96 overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-border bg-surface-elevated px-6 py-4">
          <h2 className="text-lg font-semibold">Design Templates</h2>
          <button
            onClick={onClose}
            className="rounded p-1 hover:bg-surface text-muted text-xl"
          >
            ✕
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-border bg-surface-elevated/50 px-6">
          <button
            onClick={() => setActiveTab("public")}
            className={`px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
              activeTab === "public"
                ? "border-accent text-accent"
                : "border-transparent text-muted hover:text-foreground"
            }`}
          >
            Public Templates
          </button>
          <button
            onClick={() => setActiveTab("mine")}
            className={`px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
              activeTab === "mine"
                ? "border-accent text-accent"
                : "border-transparent text-muted hover:text-foreground"
            }`}
          >
            My Templates
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {loading ? (
            <div className="flex items-center justify-center h-32">
              <Loader2 className="h-6 w-6 animate-spin text-muted" />
            </div>
          ) : displayTemplates.length === 0 ? (
            <div className="text-center py-8 text-muted">
              {activeTab === "public"
                ? "No public templates available yet"
                : "You haven't created any templates yet"}
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-4">
              {displayTemplates.map((template) => (
                <div
                  key={template.id}
                  className="group rounded-lg border border-border bg-surface-elevated hover:border-accent/50 overflow-hidden transition-all cursor-pointer"
                >
                  {/* Thumbnail */}
                  <div
                    className="h-32 bg-surface-elevated/50 relative"
                    onClick={() => {
                      onSelectTemplate(template);
                      onClose();
                    }}
                  >
                    {template.thumbnail ? (
                      <img
                        src={template.thumbnail}
                        alt={template.name}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-muted text-sm">
                        No preview
                      </div>
                    )}
                  </div>

                  {/* Info */}
                  <div className="p-3">
                    <h3 className="font-semibold text-sm line-clamp-1">
                      {template.name}
                    </h3>
                    <p className="text-xs text-muted line-clamp-2 mt-1">
                      {template.description || "No description"}
                    </p>
                    <div className="flex items-center justify-between mt-3">
                      <span className="text-xs text-muted">
                        {template.usageCount} uses
                      </span>
                      {activeTab === "mine" && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDeleteTemplate(template.id);
                          }}
                          className="text-red-400 hover:text-red-300 p-1 rounded hover:bg-red-500/10 transition-colors"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
