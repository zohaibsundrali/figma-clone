"use client";

import { track } from "tldraw";
import { useState, useMemo, useCallback } from "react";
import {
  Copy,
  Trash2,
  Package,
  Search,
  Plus,
  Edit3,
  Check,
  X,
  Unlink,
  Layers,
  ChevronDown,
  ChevronRight,
  AlertTriangle,
} from "lucide-react";
import { useEditorContext } from "./EditorContext";
import {
  getComponentDefinitions,
  createComponentFromSelection,
  createComponentInstance,
  duplicateComponent,
  deleteComponent,
  renameComponent,
  getComponentInstances,
  detachInstance,
  switchInstanceVariant,
  createVariantSet,
  wouldCreateCircularReference,
  findComponentMasterAncestor,
  type ComponentDefinition,
} from "@/lib/component-system";

export const ComponentsLibrary = track(function ComponentsLibrary() {
  const { editor, fileId } = useEditorContext();
  const [componentName, setComponentName] = useState("");
  const [description, setDescription] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState("");
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  if (!editor) return null;

  const selectedShapes = editor.getSelectedShapes();
  const canCreateComponent = selectedShapes.length > 0;

  // Read component definitions from the editor store (reactive via track())
  const definitions = getComponentDefinitions(editor);

  // Filter by search
  const filteredDefinitions = useMemo(() => {
    if (!searchQuery.trim()) return definitions;
    const q = searchQuery.toLowerCase();
    return definitions.filter(
      (d) =>
        d.name.toLowerCase().includes(q) ||
        d.description.toLowerCase().includes(q)
    );
  }, [definitions, searchQuery]);

  // ─── Actions ────────────────────────────────────────────────────────────

  const handleCreateComponent = useCallback(() => {
    if (!canCreateComponent || !componentName.trim() || !editor) return;

    const result = createComponentFromSelection(
      editor,
      componentName.trim(),
      description.trim()
    );

    if (result && fileId) {
      fetch(`/api/files/${fileId}/activity`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "component_created",
          details: `Created component "${componentName.trim()}"`,
        }),
      }).catch(() => {});
    }

    setComponentName("");
    setDescription("");
  }, [canCreateComponent, componentName, description, editor, fileId]);

  const handleCreateInstance = useCallback(
    (definitionId: string) => {
      if (!editor) return;

      // Check for circular references if inserting inside a component
      const selectedIds = editor.getSelectedShapeIds();
      if (selectedIds.length > 0) {
        for (const selectedId of selectedIds) {
          if (wouldCreateCircularReference(editor, selectedId, definitionId)) {
            alert(
              "Cannot insert this component here — it would create a circular reference."
            );
            return;
          }
        }
      }

      const instanceId = createComponentInstance(editor, definitionId);

      if (instanceId && fileId) {
        const def = definitions.find((d) => d.definitionId === definitionId);
        fetch(`/api/files/${fileId}/activity`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            action: "component_instance_created",
            details: `Created instance of "${def?.name || "component"}"`,
          }),
        }).catch(() => {});
      }
    },
    [editor, fileId, definitions]
  );

  const handleDuplicate = useCallback(
    (definitionId: string) => {
      if (!editor) return;
      const result = duplicateComponent(editor, definitionId);
      if (result && fileId) {
        fetch(`/api/files/${fileId}/activity`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            action: "component_duplicated",
            details: `Duplicated component as "${result.name}"`,
          }),
        }).catch(() => {});
      }
    },
    [editor, fileId]
  );

  const handleDelete = useCallback(
    (definitionId: string) => {
      if (!editor) return;

      const instances = getComponentInstances(editor, definitionId);
      if (instances.length > 0 && confirmDeleteId !== definitionId) {
        setConfirmDeleteId(definitionId);
        return;
      }

      const def = definitions.find((d) => d.definitionId === definitionId);
      deleteComponent(editor, definitionId, false);
      setConfirmDeleteId(null);

      if (fileId) {
        fetch(`/api/files/${fileId}/activity`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            action: "component_deleted",
            details: `Deleted component "${def?.name || "component"}"`,
          }),
        }).catch(() => {});
      }
    },
    [editor, fileId, definitions, confirmDeleteId]
  );

  const handleRename = useCallback(
    (definitionId: string) => {
      if (!editor || !editingName.trim()) return;
      renameComponent(editor, definitionId, editingName.trim());
      setEditingId(null);
      setEditingName("");
    },
    [editor, editingName]
  );

  const handleDetachSelected = useCallback(() => {
    if (!editor) return;
    const selected = editor.getSelectedShapes();
    for (const shape of selected) {
      const meta = shape.meta as Record<string, unknown>;
      if (meta?.isComponentInstance) {
        detachInstance(editor, shape.id);
      }
    }
  }, [editor]);

  // Check if any selected shape is an instance
  const selectedInstance = selectedShapes.find((s) => {
    const meta = s.meta as Record<string, unknown>;
    return meta?.isComponentInstance === true;
  });

  const selectedMaster = selectedShapes.find((s) => {
    const meta = s.meta as Record<string, unknown>;
    return meta?.isComponentMaster === true;
  });

  // Get variant siblings for selected instance
  const variantSiblings = useMemo(() => {
    if (!selectedInstance || !editor) return [];
    const instanceMeta = selectedInstance.meta as Record<string, unknown>;
    const defId = instanceMeta.componentDefinitionId as string;

    // Find the master and its variant set
    const masterDef = definitions.find((d) => d.definitionId === defId);
    if (!masterDef?.variantSetId) return [];

    return definitions.filter(
      (d) =>
        d.variantSetId === masterDef.variantSetId &&
        d.definitionId !== defId
    );
  }, [selectedInstance, editor, definitions]);

  return (
    <div className="flex flex-col h-full bg-surface border-l border-border overflow-y-auto">
      {/* Search */}
      <div className="sticky top-0 bg-surface border-b border-border p-3 space-y-3 z-10">
        <h3 className="text-sm font-semibold">Components Library</h3>

        <div className="flex items-center gap-2 bg-surface-elevated border border-border rounded px-2 py-1.5">
          <Search className="h-3.5 w-3.5 text-muted flex-shrink-0" />
          <input
            type="text"
            placeholder="Search components..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onKeyDown={(e) => e.stopPropagation()}
            onKeyUp={(e) => e.stopPropagation()}
            className="flex-1 bg-transparent text-xs text-foreground outline-none placeholder:text-muted"
          />
        </div>

        <div className="flex gap-2 items-center">
          <Package className="h-3.5 w-3.5 text-muted" />
          <span className="text-xs font-medium text-muted">
            {definitions.length} component{definitions.length !== 1 ? "s" : ""}
          </span>
        </div>

        {/* Create from selection */}
        {canCreateComponent && !selectedMaster && !selectedInstance && (
          <div className="bg-accent/10 border border-accent/20 rounded p-2 space-y-2">
            <p className="text-xs text-muted">
              Create from {selectedShapes.length} selected shape
              {selectedShapes.length > 1 ? "s" : ""}
            </p>
            <input
              type="text"
              placeholder="Component name"
              value={componentName}
              onChange={(e) => setComponentName(e.target.value)}
              onKeyDown={(e) => {
                e.stopPropagation();
                if (e.key === "Enter") handleCreateComponent();
              }}
              onKeyUp={(e) => e.stopPropagation()}
              className="w-full px-2 py-1 text-xs rounded border border-border bg-surface-elevated focus:border-accent outline-none"
            />
            <input
              type="text"
              placeholder="Description (optional)"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              onKeyDown={(e) => e.stopPropagation()}
              onKeyUp={(e) => e.stopPropagation()}
              className="w-full px-2 py-1 text-xs rounded border border-border bg-surface-elevated focus:border-accent outline-none"
            />
            <button
              onClick={handleCreateComponent}
              disabled={!componentName.trim()}
              className="w-full px-3 py-1.5 text-xs font-medium rounded bg-accent text-white hover:bg-accent/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              Create Component
            </button>
          </div>
        )}

        {/* Detach instance action */}
        {selectedInstance && (
          <div className="bg-orange-500/10 border border-orange-500/20 rounded p-2 space-y-2">
            <p className="text-xs text-muted">
              Selected instance of{" "}
              <span className="font-semibold text-foreground">
                {definitions.find(
                  (d) =>
                    d.definitionId ===
                    (selectedInstance.meta as Record<string, unknown>)
                      .componentDefinitionId
                )?.name || "Component"}
              </span>
            </p>
            <div className="flex gap-2">
              <button
                onClick={handleDetachSelected}
                className="flex-1 flex items-center justify-center gap-1.5 px-2 py-1.5 text-xs font-medium rounded bg-orange-500/20 text-orange-300 hover:bg-orange-500/30 transition-colors"
              >
                <Unlink className="h-3 w-3" />
                Detach Instance
              </button>
              <button
                onClick={() => {
                  const meta = selectedInstance.meta as Record<string, unknown>;
                  const defId = meta.componentDefinitionId as string;
                  handleCreateInstance(defId);
                }}
                className="flex-1 flex items-center justify-center gap-1.5 px-2 py-1.5 text-xs font-medium rounded bg-accent/20 text-accent hover:bg-accent/30 transition-colors"
              >
                <Plus className="h-3 w-3" />
                New Instance
              </button>
            </div>

            {/* Variant switching */}
            {variantSiblings.length > 0 && (
              <div className="pt-2 border-t border-border/40 space-y-1.5">
                <span className="text-[10px] text-muted font-semibold">
                  Switch Variant
                </span>
                {variantSiblings.map((variant) => (
                  <button
                    key={variant.definitionId}
                    onClick={() => {
                      switchInstanceVariant(
                        editor,
                        selectedInstance.id,
                        variant.definitionId
                      );
                    }}
                    className="w-full text-left px-2 py-1 text-xs rounded hover:bg-accent/10 text-foreground transition-colors"
                  >
                    {variant.name}
                    {Object.entries(variant.variantProperties).length > 0 && (
                      <span className="text-muted ml-1">
                        (
                        {Object.entries(variant.variantProperties)
                          .map(([k, v]) => `${k}: ${v}`)
                          .join(", ")}
                        )
                      </span>
                    )}
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Master component selected */}
        {selectedMaster && (
          <div className="bg-purple-500/10 border border-purple-500/20 rounded p-2 space-y-1">
            <p className="text-xs text-purple-300 font-semibold">
              ◆ Main Component
            </p>
            <p className="text-[10px] text-muted">
              Editing this will update all linked instances
            </p>
          </div>
        )}
      </div>

      {/* Components List */}
      <div className="flex-1 p-3 space-y-2">
        {filteredDefinitions.length === 0 ? (
          <div className="text-center py-8">
            <Package className="h-8 w-8 mx-auto text-muted/40 mb-2" />
            <p className="text-xs text-muted">
              {searchQuery ? "No matching components" : "No components yet"}
            </p>
            <p className="text-xs text-muted/60 mt-1">
              {searchQuery
                ? "Try a different search"
                : "Select shapes and create one"}
            </p>
          </div>
        ) : (
          filteredDefinitions.map((def) => {
            const instances = getComponentInstances(editor, def.definitionId);
            const isExpanded = expandedId === def.definitionId;
            const isEditing = editingId === def.definitionId;
            const isConfirmingDelete = confirmDeleteId === def.definitionId;

            return (
              <div
                key={def.definitionId}
                className="bg-surface-elevated rounded-lg border border-border hover:border-accent/50 transition-colors"
              >
                {/* Header */}
                <div
                  className="p-2.5 cursor-pointer"
                  onClick={() =>
                    setExpandedId(isExpanded ? null : def.definitionId)
                  }
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      {isEditing ? (
                        <div className="flex gap-1">
                          <input
                            type="text"
                            value={editingName}
                            onChange={(e) => setEditingName(e.target.value)}
                            onKeyDown={(e) => {
                              e.stopPropagation();
                              if (e.key === "Enter")
                                handleRename(def.definitionId);
                              if (e.key === "Escape") setEditingId(null);
                            }}
                            onKeyUp={(e) => e.stopPropagation()}
                            onClick={(e) => e.stopPropagation()}
                            autoFocus
                            className="flex-1 px-1.5 py-0.5 text-xs rounded border border-accent bg-surface focus:outline-none text-foreground"
                          />
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleRename(def.definitionId);
                            }}
                            className="p-0.5 text-green-400 hover:bg-green-500/20 rounded"
                          >
                            <Check className="h-3 w-3" />
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setEditingId(null);
                            }}
                            className="p-0.5 text-red-400 hover:bg-red-500/20 rounded"
                          >
                            <X className="h-3 w-3" />
                          </button>
                        </div>
                      ) : (
                        <div className="flex items-center gap-1.5">
                          <span className="text-purple-400 text-xs">◆</span>
                          <h4 className="text-xs font-semibold truncate text-foreground">
                            {def.name}
                          </h4>
                        </div>
                      )}
                      {def.description && !isEditing && (
                        <p className="text-[10px] text-muted truncate mt-0.5 ml-5">
                          {def.description}
                        </p>
                      )}
                      <p className="text-[10px] text-muted/60 mt-0.5 ml-5">
                        {instances.length} instance
                        {instances.length !== 1 ? "s" : ""}
                        {def.variantSetId && " • Has Variants"}
                      </p>
                    </div>

                    <div className="flex items-center gap-0.5 flex-shrink-0">
                      {isExpanded ? (
                        <ChevronDown className="h-3 w-3 text-muted" />
                      ) : (
                        <ChevronRight className="h-3 w-3 text-muted" />
                      )}
                    </div>
                  </div>
                </div>

                {/* Expanded actions */}
                {isExpanded && (
                  <div className="px-2.5 pb-2.5 pt-0 space-y-2 border-t border-border/40">
                    <div className="flex gap-1 pt-2">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleCreateInstance(def.definitionId);
                        }}
                        className="flex-1 flex items-center justify-center gap-1 px-2 py-1.5 text-[10px] font-medium rounded bg-accent/10 text-accent hover:bg-accent/20 transition-colors"
                        title="Insert instance"
                      >
                        <Plus className="h-3 w-3" />
                        Insert
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDuplicate(def.definitionId);
                        }}
                        className="flex-1 flex items-center justify-center gap-1 px-2 py-1.5 text-[10px] font-medium rounded bg-surface hover:bg-border/40 text-muted hover:text-foreground transition-colors"
                        title="Duplicate component"
                      >
                        <Copy className="h-3 w-3" />
                        Duplicate
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setEditingId(def.definitionId);
                          setEditingName(def.name);
                        }}
                        className="flex-1 flex items-center justify-center gap-1 px-2 py-1.5 text-[10px] font-medium rounded bg-surface hover:bg-border/40 text-muted hover:text-foreground transition-colors"
                        title="Rename component"
                      >
                        <Edit3 className="h-3 w-3" />
                        Rename
                      </button>
                    </div>

                    {/* Go to master */}
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        editor.select(def.masterShapeId);
                        editor.zoomToSelection();
                      }}
                      className="w-full flex items-center justify-center gap-1.5 px-2 py-1.5 text-[10px] font-medium rounded bg-surface hover:bg-border/40 text-muted hover:text-foreground transition-colors"
                    >
                      <Layers className="h-3 w-3" />
                      Go to Main Component
                    </button>

                    {/* Delete with confirmation */}
                    {isConfirmingDelete ? (
                      <div className="bg-red-500/10 border border-red-500/20 rounded p-2 space-y-1.5">
                        <div className="flex items-start gap-1.5">
                          <AlertTriangle className="h-3 w-3 text-red-400 flex-shrink-0 mt-0.5" />
                          <p className="text-[10px] text-red-300">
                            This component has {instances.length} active
                            instance{instances.length !== 1 ? "s" : ""}. They
                            will be detached.
                          </p>
                        </div>
                        <div className="flex gap-1">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDelete(def.definitionId);
                            }}
                            className="flex-1 px-2 py-1 text-[10px] font-medium rounded bg-red-500/20 text-red-300 hover:bg-red-500/30 transition-colors"
                          >
                            Delete & Detach
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setConfirmDeleteId(null);
                            }}
                            className="flex-1 px-2 py-1 text-[10px] font-medium rounded bg-surface text-muted hover:text-foreground transition-colors"
                          >
                            Cancel
                          </button>
                        </div>
                      </div>
                    ) : (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDelete(def.definitionId);
                        }}
                        className="w-full flex items-center justify-center gap-1 px-2 py-1.5 text-[10px] font-medium rounded hover:bg-red-500/10 text-red-400 transition-colors"
                        title="Delete component"
                      >
                        <Trash2 className="h-3 w-3" />
                        Delete Component
                      </button>
                    )}

                    {/* Info */}
                    <div className="bg-surface rounded p-2 text-[10px] text-muted space-y-0.5">
                      <p>
                        <span className="font-medium">Created:</span>{" "}
                        {new Date(def.createdAt).toLocaleDateString()}
                      </p>
                      <p>
                        <span className="font-medium">ID:</span>{" "}
                        {def.definitionId.substring(0, 16)}...
                      </p>
                    </div>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

      {/* Footer */}
      <div className="border-t border-border p-3 text-[10px] text-muted space-y-1.5">
        <p>💡 Create reusable components</p>
        <p>• Select shapes → Create Component</p>
        <p>• Click Insert → Create Instance</p>
        <p>• Edit master → All instances update</p>
        <p>• Override individual instance props</p>
      </div>
    </div>
  );
});
