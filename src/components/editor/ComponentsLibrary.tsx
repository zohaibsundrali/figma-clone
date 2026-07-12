"use client";

import { useEditor, track } from "tldraw";
import { useState, useEffect } from "react";
import { Copy, Trash2, Settings, Package } from "lucide-react";
import { useEditorContext } from "./EditorContext";

interface Component {
  id: string;
  name: string;
  masterShapeId: string;
  description?: string;
  instances: number;
  createdAt: string;
  updatedAt: string;
}

interface ComponentInstance {
  id: string;
  componentId: string;
  shapeId: string;
  overrides: Record<string, unknown>;
}

export const ComponentsLibrary = track(function ComponentsLibrary() {
  const editor = useEditor();
  const { fileId } = useEditorContext();
  const [components, setComponents] = useState<Component[]>([]);
  const [instances, setInstances] = useState<Map<string, ComponentInstance>>(new Map());
  const [componentName, setComponentName] = useState("");
  const [description, setDescription] = useState("");
  const [selectedComponent, setSelectedComponent] = useState<string | null>(null);

  if (!editor) return null;

  const selectedShapes = editor.getSelectedShapes();
  const canCreateComponent = selectedShapes.length > 0;

  const createComponent = () => {
    if (!canCreateComponent || !componentName.trim()) return;

    const newComponent: Component = {
      id: `comp_${Date.now()}`,
      name: componentName,
      masterShapeId: selectedShapes[0].id,
      description,
      instances: 0,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    setComponents([...components, newComponent]);

    // Log activity
    if (fileId) {
      fetch(`/api/files/${fileId}/activity`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "component_created",
          details: `Created component "${componentName}"`,
        }),
      }).catch(() => {});
    }

    setComponentName("");
    setDescription("");
  };

  const createInstance = (componentId: string) => {
    const component = components.find((c) => c.id === componentId);
    if (!component || !editor) return;

    const masterShape = editor.getShape(component.masterShapeId as any);
    if (!masterShape) return;

    const masterBounds = editor.getShapePageBounds(masterShape);
    if (!masterBounds) return;

    // Create new shape as instance
    editor.createShape({
      id: `shape_${Date.now()}` as any,
      type: masterShape.type,
      x: masterBounds.x + 50,
      y: masterBounds.y + 50,
      props: {
        ...masterShape.props,
      } as any,
      meta: {
        ...masterShape.meta,
        isComponentInstance: true,
        componentId,
      },
    } as any);

    // Track instance
    const instanceShapeId = `shape_${Date.now()}`;
    const newInstance: ComponentInstance = {
      id: `inst_${Date.now()}`,
      componentId,
      shapeId: instanceShapeId,
      overrides: {},
    };

    setInstances((prev) => new Map(prev).set(instanceShapeId, newInstance));

    // Update component instance count
    setComponents((prev) =>
      prev.map((c) =>
        c.id === componentId ? { ...c, instances: c.instances + 1 } : c
      )
    );

    // Log activity
    if (fileId) {
      fetch(`/api/files/${fileId}/activity`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "component_instance_created",
          details: `Created instance of "${component.name}"`,
        }),
      }).catch(() => {});
    }
  };

  const deleteComponent = (componentId: string) => {
    const component = components.find((c) => c.id === componentId);
    if (!component) return;

    setComponents(components.filter((c) => c.id !== componentId));

    // Log activity
    if (fileId) {
      fetch(`/api/files/${fileId}/activity`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "component_deleted",
          details: `Deleted component "${component.name}"`,
        }),
      }).catch(() => {});
    }
  };

  return (
    <div className="flex flex-col h-full bg-surface border-l border-border overflow-y-auto">
      {/* Create Component Section */}
      <div className="sticky top-0 bg-surface border-b border-border p-4 space-y-3">
        <h3 className="text-sm font-semibold">Components Library</h3>

        <div className="space-y-2">
          <div className="flex gap-2 items-center">
            <Package className="h-3.5 w-3.5 text-muted" />
            <span className="text-xs font-medium text-muted">
              {components.length} component{components.length !== 1 ? "s" : ""}
            </span>
          </div>

          {selectedShapes.length > 0 && (
            <div className="bg-accent/10 border border-accent/20 rounded p-2 space-y-2">
              <p className="text-xs text-muted">Create from selection</p>
              <input
                type="text"
                placeholder="Component name"
                value={componentName}
                onChange={(e) => setComponentName(e.target.value)}
                className="w-full px-2 py-1 text-xs rounded border border-border bg-surface-elevated focus:border-accent outline-none"
              />
              <input
                type="text"
                placeholder="Description (optional)"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="w-full px-2 py-1 text-xs rounded border border-border bg-surface-elevated focus:border-accent outline-none"
              />
              <button
                onClick={createComponent}
                disabled={!componentName.trim()}
                className="w-full px-3 py-1.5 text-xs font-medium rounded bg-accent text-white hover:bg-accent/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                Create Component
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Components List */}
      <div className="flex-1 p-4 space-y-3">
        {components.length === 0 ? (
          <div className="text-center py-8">
            <p className="text-xs text-muted">No components yet</p>
            <p className="text-xs text-muted/60 mt-1">Select a shape and create one</p>
          </div>
        ) : (
          components.map((component) => (
            <div
              key={component.id}
              className="bg-surface-elevated rounded-lg p-3 space-y-2 border border-border hover:border-accent/50 transition-colors cursor-pointer"
              onClick={() =>
                setSelectedComponent(
                  selectedComponent === component.id ? null : component.id
                )
              }
            >
              <div className="flex items-start justify-between gap-2">
                <div className="flex-1 min-w-0">
                  <h4 className="text-xs font-semibold truncate">{component.name}</h4>
                  {component.description && (
                    <p className="text-xs text-muted truncate">{component.description}</p>
                  )}
                  <p className="text-xs text-muted/60 mt-1">
                    {component.instances} instance{component.instances !== 1 ? "s" : ""}
                  </p>
                </div>
                <div className="flex gap-1">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      createInstance(component.id);
                    }}
                    className="p-1 hover:bg-border rounded transition-colors"
                    title="Create instance"
                  >
                    <Copy className="h-3.5 w-3.5" />
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      deleteComponent(component.id);
                    }}
                    className="p-1 hover:bg-destructive/10 rounded transition-colors text-destructive"
                    title="Delete component"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>

              {/* Expanded Details */}
              {selectedComponent === component.id && (
                <div className="pt-2 border-t border-border/50 space-y-2">
                  <div className="bg-surface rounded p-2 text-xs space-y-1">
                    <p className="text-muted">
                      <span className="font-medium">Created:</span>{" "}
                      {new Date(component.createdAt).toLocaleDateString()}
                    </p>
                    <p className="text-muted">
                      <span className="font-medium">Master:</span>{" "}
                      {component.masterShapeId.substring(0, 8)}...
                    </p>
                  </div>
                  <div className="text-xs text-muted/60 space-y-1">
                    <p>• All instances linked to master</p>
                    <p>• Edit master to update all</p>
                    <p>• Override properties per instance</p>
                  </div>
                </div>
              )}
            </div>
          ))
        )}
      </div>

      {/* Footer */}
      <div className="border-t border-border p-3 text-xs text-muted space-y-2">
        <p>💡 Create reusable components</p>
        <p>• Select shape → Create Component</p>
        <p>• Click copy → Create Instance</p>
      </div>
    </div>
  );
});
