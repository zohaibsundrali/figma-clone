"use client";

import { FileText, Pencil, Plus, Trash2 } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { useEditorContext } from "./EditorContext";
import type { TLPage, TLPageId } from "tldraw";

function getNextPageName(pages: TLPage[]) {
  const existing = new Set(pages.map((p) => p.name));
  let index = pages.length + 1;

  while (existing.has(`Page ${index}`)) {
    index += 1;
  }

  return `Page ${index}`;
}

export function PagesPanel() {
  const { editor } = useEditorContext();
  const [pages, setPages] = useState<TLPage[]>([]);
  const [currentPageId, setCurrentPageId] = useState<TLPageId | null>(null);
  const [editingPageId, setEditingPageId] = useState<TLPageId | null>(null);
  const [editingName, setEditingName] = useState("");

  useEffect(() => {
    if (!editor) return;

    const update = () => {
      const nextPages = editor.getPages();
      setPages(nextPages);
      setCurrentPageId(editor.getCurrentPageId());
    };

    update();
    const cleanup = editor.store.listen(update);
    return cleanup;
  }, [editor]);

  const canDelete = useMemo(() => pages.length > 1, [pages.length]);

  function handleCreatePage() {
    if (!editor) return;

    const before = new Set(editor.getPages().map((p) => p.id));
    editor.createPage({ name: getNextPageName(editor.getPages()) });

    const created = editor.getPages().find((p) => !before.has(p.id));
    if (created) {
      editor.setCurrentPage(created.id);
    }
  }

  function handleStartRename(page: TLPage) {
    setEditingPageId(page.id);
    setEditingName(page.name);
  }

  function handleCommitRename(pageId: TLPageId) {
    if (!editor) return;
    const nextName = editingName.trim();
    if (nextName.length > 0) {
      editor.renamePage(pageId, nextName);
    }
    setEditingPageId(null);
    setEditingName("");
  }

  function handleDeletePage(pageId: TLPageId) {
    if (!editor || !canDelete) return;
    editor.deletePage(pageId);
  }

  if (!editor) {
    return (
      <section className="border-b border-border pb-2">
        <div className="flex h-10 items-center justify-between px-3">
          <span className="text-[11px] font-semibold uppercase tracking-wider text-muted">
            Pages
          </span>
        </div>
        <div className="px-3 pb-2 text-xs text-muted">Loading pages...</div>
      </section>
    );
  }

  return (
    <section className="border-b border-border pb-2">
      <div className="flex h-10 items-center justify-between px-3">
        <span className="text-[11px] font-semibold uppercase tracking-wider text-muted">
          Pages
        </span>
        <button
          onClick={handleCreatePage}
          className="flex h-6 w-6 items-center justify-center rounded text-muted transition-colors hover:bg-surface-elevated hover:text-foreground"
          title="Add page"
        >
          <Plus className="h-3.5 w-3.5" />
        </button>
      </div>

      <div className="space-y-1 px-2">
        {pages.map((page) => {
          const isActive = page.id === currentPageId;
          const isEditing = page.id === editingPageId;

          return (
            <div
              key={page.id}
              className={`group flex items-center gap-2 rounded-md px-2 py-1.5 text-xs transition-colors ${
                isActive
                  ? "border-l-2 border-accent bg-accent/10 text-foreground"
                  : "text-muted hover:bg-surface-elevated hover:text-foreground"
              }`}
            >
              <FileText className={`h-3.5 w-3.5 ${isActive ? "text-accent" : ""}`} />

              {isEditing ? (
                <input
                  autoFocus
                  value={editingName}
                  onChange={(e) => setEditingName(e.target.value)}
                  onBlur={() => handleCommitRename(page.id)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") handleCommitRename(page.id);
                    if (e.key === "Escape") {
                      setEditingPageId(null);
                      setEditingName("");
                    }
                  }}
                  className="h-6 flex-1 rounded border border-border bg-surface px-2 text-xs text-foreground outline-none focus:border-accent"
                />
              ) : (
                <button
                  onClick={() => editor.setCurrentPage(page.id)}
                  onDoubleClick={() => handleStartRename(page)}
                  className="flex-1 truncate text-left"
                  title={page.name}
                >
                  {page.name}
                </button>
              )}

              {!isEditing && (
                <div className="flex items-center gap-1 opacity-0 transition-opacity group-hover:opacity-100">
                  <button
                    onClick={() => handleStartRename(page)}
                    className="flex h-5 w-5 items-center justify-center rounded text-muted hover:bg-surface hover:text-foreground"
                    title="Rename page"
                  >
                    <Pencil className="h-3 w-3" />
                  </button>
                  <button
                    onClick={() => handleDeletePage(page.id)}
                    disabled={!canDelete}
                    className="flex h-5 w-5 items-center justify-center rounded text-muted hover:bg-surface hover:text-red-300 disabled:cursor-not-allowed disabled:opacity-40"
                    title={canDelete ? "Delete page" : "At least one page is required"}
                  >
                    <Trash2 className="h-3 w-3" />
                  </button>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </section>
  );
}
