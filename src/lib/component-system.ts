/**
 * Component System Engine
 *
 * Manages reusable components, instances, variants, and nested components
 * within the tldraw editor. All data lives in tldraw's shape store so it
 * gets Liveblocks sync, undo/redo, and DB persistence for free.
 *
 * Key concepts:
 * - A "component master" is a tldraw group shape with meta.isComponentMaster = true
 * - A "component instance" is a tldraw group shape with meta.isComponentInstance = true
 *   and meta.componentDefinitionId pointing to the master's definitionId
 * - A "component set" (variant group) is stored in the master's meta.variantSetId
 */

import type { Editor, TLShape, TLShapeId, TLGroupShape } from "tldraw";
import { createShapeId } from "tldraw";

// ─── Types ──────────────────────────────────────────────────────────────────

export interface ComponentDefinition {
  definitionId: string;
  name: string;
  description: string;
  masterShapeId: TLShapeId;
  variantSetId: string | null;
  variantProperties: Record<string, string>;
  createdAt: string;
  updatedAt: string;
}

export interface ComponentInstanceMeta {
  isComponentInstance: true;
  componentDefinitionId: string;
  overrides: Record<string, unknown>;
}

export interface ComponentMasterMeta {
  isComponentMaster: true;
  componentDefinitionId: string;
  componentName: string;
  componentDescription: string;
  variantSetId: string | null;
  variantProperties: Record<string, string>;
}

// ─── Helpers ────────────────────────────────────────────────────────────────

function generateId(): string {
  return `comp_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

function deepCloneProps(props: Record<string, unknown>): Record<string, unknown> {
  return JSON.parse(JSON.stringify(props));
}

/**
 * Returns all shapes that are direct children of a group shape
 */
function getGroupChildren(editor: Editor, groupId: TLShapeId): TLShape[] {
  return editor
    .getSortedChildIdsForParent(groupId)
    .map((id) => editor.getShape(id))
    .filter((s): s is TLShape => s !== undefined);
}

/**
 * Recursively collect a shape and all its descendants
 */
function collectShapeTree(editor: Editor, shapeId: TLShapeId): TLShape[] {
  const shape = editor.getShape(shapeId);
  if (!shape) return [];
  const result: TLShape[] = [shape];
  const childIds = editor.getSortedChildIdsForParent(shapeId);
  for (const childId of childIds) {
    result.push(...collectShapeTree(editor, childId));
  }
  return result;
}

// ─── Public API ─────────────────────────────────────────────────────────────

/**
 * Get all component definitions from the current page
 */
export function getComponentDefinitions(editor: Editor): ComponentDefinition[] {
  const allShapes = [...editor.getCurrentPageShapes()];
  const definitions: ComponentDefinition[] = [];

  for (const shape of allShapes) {
    const meta = shape.meta as Record<string, unknown>;
    if (meta?.isComponentMaster === true) {
      definitions.push({
        definitionId: meta.componentDefinitionId as string,
        name: (meta.componentName as string) || "Untitled",
        description: (meta.componentDescription as string) || "",
        masterShapeId: shape.id,
        variantSetId: (meta.variantSetId as string) || null,
        variantProperties: (meta.variantProperties as Record<string, string>) || {},
        createdAt: (meta.componentCreatedAt as string) || new Date().toISOString(),
        updatedAt: (meta.componentUpdatedAt as string) || new Date().toISOString(),
      });
    }
  }

  return definitions;
}

/**
 * Get all instances of a specific component definition
 */
export function getComponentInstances(
  editor: Editor,
  definitionId: string
): TLShape[] {
  const allShapes = [...editor.getCurrentPageShapes()];
  return allShapes.filter((shape) => {
    const meta = shape.meta as Record<string, unknown>;
    return (
      meta?.isComponentInstance === true &&
      meta?.componentDefinitionId === definitionId
    );
  });
}

/**
 * Create a component from selected shapes.
 *
 * Groups the shapes under a new group shape and marks the group as a
 * component master. Preserves relative positions.
 */
export function createComponentFromSelection(
  editor: Editor,
  name: string,
  description: string = ""
): ComponentDefinition | null {
  const selectedShapes = editor.getSelectedShapes();
  if (selectedShapes.length === 0) return null;

  const definitionId = generateId();

  editor.markHistoryStoppingPoint("create-component");

  // Group the selected shapes — tldraw will create a group shape
  const selectedIds = selectedShapes.map((s) => s.id);
  editor.groupShapes(selectedIds);

  // The newly created group is the currently selected shape
  const groupShape = editor.getSelectedShapes()[0];
  if (!groupShape) return null;

  // Mark the group as a component master
  editor.updateShape({
    id: groupShape.id,
    type: groupShape.type,
    meta: {
      ...groupShape.meta,
      isComponentMaster: true,
      componentDefinitionId: definitionId,
      componentName: name,
      componentDescription: description,
      variantSetId: null,
      variantProperties: {},
      componentCreatedAt: new Date().toISOString(),
      componentUpdatedAt: new Date().toISOString(),
    },
  });

  return {
    definitionId,
    name,
    description,
    masterShapeId: groupShape.id,
    variantSetId: null,
    variantProperties: {},
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
}

/**
 * Create an instance of a component definition.
 *
 * Deep-clones all children of the master group, creates a new group,
 * and marks it as a component instance with a reference to the master.
 */
export function createComponentInstance(
  editor: Editor,
  definitionId: string,
  offsetX: number = 50,
  offsetY: number = 50
): TLShapeId | null {
  // Find the master shape
  const allShapes = [...editor.getCurrentPageShapes()];
  const masterShape = allShapes.find((shape) => {
    const meta = shape.meta as Record<string, unknown>;
    return (
      meta?.isComponentMaster === true &&
      meta?.componentDefinitionId === definitionId
    );
  });

  if (!masterShape) return null;

  editor.markHistoryStoppingPoint("create-instance");

  // Get master bounds for offset placement
  const masterBounds = editor.getShapePageBounds(masterShape);
  if (!masterBounds) return null;

  // Collect all descendants of the master group
  const childShapes = getGroupChildren(editor, masterShape.id);
  if (childShapes.length === 0) return null;

  // Build an ID mapping: old ID → new ID
  const idMap = new Map<TLShapeId, TLShapeId>();

  // Recursively map IDs for all descendants
  function mapIdsRecursive(parentId: TLShapeId): void {
    const children = editor.getSortedChildIdsForParent(parentId);
    for (const childId of children) {
      idMap.set(childId, createShapeId());
      mapIdsRecursive(childId);
    }
  }

  // Create new group ID
  const newGroupId = createShapeId();
  idMap.set(masterShape.id, newGroupId);
  mapIdsRecursive(masterShape.id);

  // Collect all shapes in the tree
  const allTreeShapes = collectShapeTree(editor, masterShape.id);

  // Clone all shapes with new IDs, adjusting parentId references
  const shapesToCreate: TLShape[] = [];

  for (const shape of allTreeShapes) {
    const newId = idMap.get(shape.id);
    if (!newId) continue;

    const newParentId =
      shape.id === masterShape.id
        ? editor.getCurrentPageId()
        : idMap.get(shape.parentId as TLShapeId) || editor.getCurrentPageId();

    const isRoot = shape.id === masterShape.id;

    const clonedMeta: Record<string, unknown> = isRoot
      ? {
          isComponentInstance: true,
          componentDefinitionId: definitionId,
          overrides: {},
        }
      : { ...deepCloneProps(shape.meta as Record<string, unknown>) };

    // Remove master-specific meta from children
    if (!isRoot) {
      delete clonedMeta.isComponentMaster;
      delete clonedMeta.componentDefinitionId;
    }

    shapesToCreate.push({
      ...shape,
      id: newId,
      parentId: newParentId,
      x: isRoot ? masterShape.x + offsetX : shape.x,
      y: isRoot ? masterShape.y + offsetY : shape.y,
      props: deepCloneProps(shape.props as Record<string, unknown>),
      meta: clonedMeta,
    } as TLShape);
  }

  // Create all shapes at once
  editor.createShapes(shapesToCreate);

  // Select the new instance
  editor.select(newGroupId);

  return newGroupId;
}

/**
 * Duplicate a component definition (creates a new master with new IDs)
 */
export function duplicateComponent(
  editor: Editor,
  definitionId: string
): ComponentDefinition | null {
  const allShapes = [...editor.getCurrentPageShapes()];
  const masterShape = allShapes.find((shape) => {
    const meta = shape.meta as Record<string, unknown>;
    return (
      meta?.isComponentMaster === true &&
      meta?.componentDefinitionId === definitionId
    );
  });

  if (!masterShape) return null;

  const newDefinitionId = generateId();

  editor.markHistoryStoppingPoint("duplicate-component");

  // Build ID mapping
  const idMap = new Map<TLShapeId, TLShapeId>();
  const newMasterId = createShapeId();
  idMap.set(masterShape.id, newMasterId);

  function mapIdsRecursive(parentId: TLShapeId): void {
    const children = editor.getSortedChildIdsForParent(parentId);
    for (const childId of children) {
      idMap.set(childId, createShapeId());
      mapIdsRecursive(childId);
    }
  }
  mapIdsRecursive(masterShape.id);

  const allTreeShapes = collectShapeTree(editor, masterShape.id);
  const shapesToCreate: TLShape[] = [];
  const masterMeta = masterShape.meta as Record<string, unknown>;

  for (const shape of allTreeShapes) {
    const newId = idMap.get(shape.id);
    if (!newId) continue;

    const newParentId =
      shape.id === masterShape.id
        ? editor.getCurrentPageId()
        : idMap.get(shape.parentId as TLShapeId) || editor.getCurrentPageId();

    const isRoot = shape.id === masterShape.id;

    const clonedMeta: Record<string, unknown> = isRoot
      ? {
          ...deepCloneProps(masterMeta),
          isComponentMaster: true,
          componentDefinitionId: newDefinitionId,
          componentName: `${masterMeta.componentName || "Component"} (Copy)`,
          componentCreatedAt: new Date().toISOString(),
          componentUpdatedAt: new Date().toISOString(),
        }
      : { ...deepCloneProps(shape.meta as Record<string, unknown>) };

    shapesToCreate.push({
      ...shape,
      id: newId,
      parentId: newParentId,
      x: isRoot ? masterShape.x + 100 : shape.x,
      y: isRoot ? masterShape.y + 100 : shape.y,
      props: deepCloneProps(shape.props as Record<string, unknown>),
      meta: clonedMeta,
    } as TLShape);
  }

  editor.createShapes(shapesToCreate);

  return {
    definitionId: newDefinitionId,
    name: `${masterMeta.componentName || "Component"} (Copy)`,
    description: (masterMeta.componentDescription as string) || "",
    masterShapeId: newMasterId,
    variantSetId: null,
    variantProperties: {},
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
}

/**
 * Detach an instance — convert it to regular editable shapes.
 * Removes the component link while preserving visual appearance.
 */
export function detachInstance(
  editor: Editor,
  instanceShapeId: TLShapeId
): boolean {
  const shape = editor.getShape(instanceShapeId);
  if (!shape) return false;

  const meta = shape.meta as Record<string, unknown>;
  if (!meta?.isComponentInstance) return false;

  editor.markHistoryStoppingPoint("detach-instance");

  // Remove instance metadata from the group and all children
  const allTreeShapes = collectShapeTree(editor, instanceShapeId);

  editor.updateShapes(
    allTreeShapes.map((s) => {
      const updatedMeta = { ...s.meta } as Record<string, unknown>;
      delete updatedMeta.isComponentInstance;
      delete updatedMeta.componentDefinitionId;
      delete updatedMeta.overrides;
      return {
        id: s.id,
        type: s.type,
        meta: updatedMeta,
      };
    }) as Parameters<typeof editor.updateShapes>[0]
  );

  return true;
}

/**
 * Propagate changes from a master component to all its instances.
 *
 * For each instance:
 *  - Remove existing children
 *  - Re-clone children from the master
 *  - Re-apply any per-instance overrides
 */
export function propagateMasterToInstances(
  editor: Editor,
  definitionId: string
): void {
  const allShapes = [...editor.getCurrentPageShapes()];

  // Find the master
  const masterShape = allShapes.find((shape) => {
    const meta = shape.meta as Record<string, unknown>;
    return (
      meta?.isComponentMaster === true &&
      meta?.componentDefinitionId === definitionId
    );
  });

  if (!masterShape) return;

  // Find all instances
  const instances = allShapes.filter((shape) => {
    const meta = shape.meta as Record<string, unknown>;
    return (
      meta?.isComponentInstance === true &&
      meta?.componentDefinitionId === definitionId
    );
  });

  if (instances.length === 0) return;

  // Get master's children
  const masterChildren = getGroupChildren(editor, masterShape.id);
  if (masterChildren.length === 0) return;

  for (const instance of instances) {
    const instanceMeta = instance.meta as Record<string, unknown>;
    const overrides = (instanceMeta.overrides as Record<string, unknown>) || {};

    // Remove existing instance children
    const existingChildren = getGroupChildren(editor, instance.id);
    if (existingChildren.length > 0) {
      editor.deleteShapes(existingChildren.map((c) => c.id));
    }

    // Build ID mapping for new children
    const idMap = new Map<TLShapeId, TLShapeId>();

    function mapChildIds(parentId: TLShapeId): void {
      const children = editor.getSortedChildIdsForParent(parentId);
      for (const childId of children) {
        idMap.set(childId, createShapeId());
        mapChildIds(childId);
      }
    }
    mapChildIds(masterShape.id);

    // Collect all descendant shapes of master (excluding master itself)
    const masterTree = collectShapeTree(editor, masterShape.id).filter(
      (s) => s.id !== masterShape.id
    );

    // Clone children into the instance
    const shapesToCreate: TLShape[] = [];

    for (const child of masterTree) {
      const newId = idMap.get(child.id);
      if (!newId) continue;

      // Re-parent: if child's parent is master, parent is the instance
      // Otherwise, map to the new cloned parent
      const newParentId =
        child.parentId === masterShape.id
          ? instance.id
          : idMap.get(child.parentId as TLShapeId) || instance.id;

      let clonedProps = deepCloneProps(child.props as Record<string, unknown>);

      // Apply per-instance overrides for this child
      const overrideKey = child.id; // Overrides keyed by original child ID
      if (overrides[overrideKey]) {
        const childOverrides = overrides[overrideKey] as Record<string, unknown>;
        clonedProps = { ...clonedProps, ...childOverrides };
      }

      const clonedMeta = deepCloneProps(child.meta as Record<string, unknown>);

      shapesToCreate.push({
        ...child,
        id: newId,
        parentId: newParentId,
        props: clonedProps,
        meta: clonedMeta,
      } as TLShape);
    }

    editor.createShapes(shapesToCreate);
  }
}

/**
 * Set an override on a specific instance.
 *
 * Overrides are stored in the instance's meta.overrides keyed by the
 * original child shape ID, so they survive master propagation.
 */
export function setInstanceOverride(
  editor: Editor,
  instanceShapeId: TLShapeId,
  childShapeId: TLShapeId,
  propKey: string,
  propValue: unknown
): void {
  const instance = editor.getShape(instanceShapeId);
  if (!instance) return;

  const meta = instance.meta as Record<string, unknown>;
  if (!meta?.isComponentInstance) return;

  editor.markHistoryStoppingPoint("set-instance-override");

  const overrides = { ...(meta.overrides as Record<string, Record<string, unknown>> || {}) };
  if (!overrides[childShapeId]) {
    overrides[childShapeId] = {};
  }
  overrides[childShapeId][propKey] = propValue;

  editor.updateShape({
    id: instance.id,
    type: instance.type,
    meta: {
      ...meta,
      overrides,
    },
  } as Parameters<typeof editor.updateShape>[0]);

  // Also update the actual child shape immediately
  const childShape = editor.getShape(childShapeId);
  if (childShape) {
    editor.updateShape({
      id: childShape.id,
      type: childShape.type,
      props: {
        ...(childShape.props as Record<string, unknown>),
        [propKey]: propValue,
      },
    });
  }
}

/**
 * Rename a component
 */
export function renameComponent(
  editor: Editor,
  definitionId: string,
  newName: string
): void {
  const allShapes = [...editor.getCurrentPageShapes()];
  const masterShape = allShapes.find((shape) => {
    const meta = shape.meta as Record<string, unknown>;
    return (
      meta?.isComponentMaster === true &&
      meta?.componentDefinitionId === definitionId
    );
  });

  if (!masterShape) return;

  editor.markHistoryStoppingPoint("rename-component");

  editor.updateShape({
    id: masterShape.id,
    type: masterShape.type,
    meta: {
      ...masterShape.meta,
      componentName: newName,
      componentUpdatedAt: new Date().toISOString(),
    },
  });
}

/**
 * Delete a component and optionally its instances
 */
export function deleteComponent(
  editor: Editor,
  definitionId: string,
  deleteInstances: boolean = false
): void {
  const allShapes = [...editor.getCurrentPageShapes()];

  const masterShape = allShapes.find((shape) => {
    const meta = shape.meta as Record<string, unknown>;
    return (
      meta?.isComponentMaster === true &&
      meta?.componentDefinitionId === definitionId
    );
  });

  editor.markHistoryStoppingPoint("delete-component");

  const shapesToDelete: TLShapeId[] = [];

  if (masterShape) {
    shapesToDelete.push(masterShape.id);
  }

  if (deleteInstances) {
    const instances = allShapes.filter((shape) => {
      const meta = shape.meta as Record<string, unknown>;
      return (
        meta?.isComponentInstance === true &&
        meta?.componentDefinitionId === definitionId
      );
    });
    shapesToDelete.push(...instances.map((i) => i.id));
  } else {
    // Detach instances instead of deleting them
    const instances = allShapes.filter((shape) => {
      const meta = shape.meta as Record<string, unknown>;
      return (
        meta?.isComponentInstance === true &&
        meta?.componentDefinitionId === definitionId
      );
    });
    if (instances.length > 0) {
      editor.updateShapes(
        instances.map((inst) => ({
          id: inst.id,
          type: inst.type,
          meta: {
            ...inst.meta,
            isComponentInstance: false,
            componentDefinitionId: undefined,
            overrides: undefined,
          },
        }))
      );
    }
  }

  if (shapesToDelete.length > 0) {
    editor.deleteShapes(shapesToDelete);
  }
}

// ─── Variant System ─────────────────────────────────────────────────────────

/**
 * Create a variant set from multiple component definitions.
 * Groups them under a shared variantSetId.
 */
export function createVariantSet(
  editor: Editor,
  definitionIds: string[],
  variantProperties: Record<string, string[]>
): string | null {
  if (definitionIds.length < 2) return null;

  const variantSetId = `varset_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;

  editor.markHistoryStoppingPoint("create-variant-set");

  const allShapes = [...editor.getCurrentPageShapes()];

  for (let i = 0; i < definitionIds.length; i++) {
    const defId = definitionIds[i];
    const masterShape = allShapes.find((shape) => {
      const meta = shape.meta as Record<string, unknown>;
      return (
        meta?.isComponentMaster === true &&
        meta?.componentDefinitionId === defId
      );
    });

    if (!masterShape) continue;

    // Assign variant properties to each component
    const props: Record<string, string> = {};
    for (const [key, values] of Object.entries(variantProperties)) {
      props[key] = values[i % values.length] || values[0];
    }

    editor.updateShape({
      id: masterShape.id,
      type: masterShape.type,
      meta: {
        ...masterShape.meta,
        variantSetId,
        variantProperties: props,
      },
    });
  }

  return variantSetId;
}

/**
 * Switch an instance from one variant to another within the same variant set
 */
export function switchInstanceVariant(
  editor: Editor,
  instanceShapeId: TLShapeId,
  targetDefinitionId: string
): boolean {
  const instance = editor.getShape(instanceShapeId);
  if (!instance) return false;

  const instanceMeta = instance.meta as Record<string, unknown>;
  if (!instanceMeta?.isComponentInstance) return false;

  const currentDefId = instanceMeta.componentDefinitionId as string;

  // Verify both are in the same variant set
  const allShapes = [...editor.getCurrentPageShapes()];
  const currentMaster = allShapes.find((s) => {
    const m = s.meta as Record<string, unknown>;
    return m?.isComponentMaster === true && m?.componentDefinitionId === currentDefId;
  });
  const targetMaster = allShapes.find((s) => {
    const m = s.meta as Record<string, unknown>;
    return m?.isComponentMaster === true && m?.componentDefinitionId === targetDefinitionId;
  });

  if (!currentMaster || !targetMaster) return false;

  const currentSetId = (currentMaster.meta as Record<string, unknown>).variantSetId;
  const targetSetId = (targetMaster.meta as Record<string, unknown>).variantSetId;

  if (!currentSetId || currentSetId !== targetSetId) return false;

  editor.markHistoryStoppingPoint("switch-variant");

  // Update instance to point to the new definition
  editor.updateShape({
    id: instance.id,
    type: instance.type,
    meta: {
      ...instanceMeta,
      componentDefinitionId: targetDefinitionId,
      overrides: instanceMeta.overrides || {},
    },
  } as unknown as Parameters<typeof editor.updateShape>[0]);

  // Re-propagate the new master's content into this instance
  // Remove existing children
  const existingChildren = getGroupChildren(editor, instance.id);
  if (existingChildren.length > 0) {
    editor.deleteShapes(existingChildren.map((c) => c.id));
  }

  // Clone target master's children
  const masterChildren = collectShapeTree(editor, targetMaster.id).filter(
    (s) => s.id !== targetMaster.id
  );

  const idMap = new Map<TLShapeId, TLShapeId>();
  for (const child of masterChildren) {
    idMap.set(child.id, createShapeId());
  }

  const shapesToCreate: TLShape[] = [];
  for (const child of masterChildren) {
    const newId = idMap.get(child.id);
    if (!newId) continue;

    const newParentId =
      child.parentId === targetMaster.id
        ? instance.id
        : idMap.get(child.parentId as TLShapeId) || instance.id;

    shapesToCreate.push({
      ...child,
      id: newId,
      parentId: newParentId,
      props: deepCloneProps(child.props as Record<string, unknown>),
      meta: deepCloneProps(child.meta as Record<string, unknown>),
    } as TLShape);
  }

  editor.createShapes(shapesToCreate);

  return true;
}

// ─── Nested Components ──────────────────────────────────────────────────────

/**
 * Check if adding a component instance would create a circular reference
 */
export function wouldCreateCircularReference(
  editor: Editor,
  parentShapeId: TLShapeId,
  componentDefinitionId: string
): boolean {
  // Walk up the parent chain from parentShapeId
  let current: TLShape | undefined = editor.getShape(parentShapeId);

  while (current) {
    const meta = current.meta as Record<string, unknown>;

    // If we find a master that IS the component we're trying to insert, it's circular
    if (
      meta?.isComponentMaster === true &&
      meta?.componentDefinitionId === componentDefinitionId
    ) {
      return true;
    }

    // If we find an instance of the component, also circular
    if (
      meta?.isComponentInstance === true &&
      meta?.componentDefinitionId === componentDefinitionId
    ) {
      return true;
    }

    // Move up to parent
    if (current.parentId && current.parentId !== editor.getCurrentPageId()) {
      current = editor.getShape(current.parentId as TLShapeId);
    } else {
      break;
    }
  }

  return false;
}

/**
 * Find the closest component instance ancestor of a shape (if any)
 */
export function findComponentInstanceAncestor(
  editor: Editor,
  shapeId: TLShapeId
): TLShape | null {
  let current: TLShape | undefined = editor.getShape(shapeId);

  while (current) {
    const meta = current.meta as Record<string, unknown>;
    if (meta?.isComponentInstance === true) return current;

    if (current.parentId && current.parentId !== editor.getCurrentPageId()) {
      current = editor.getShape(current.parentId as TLShapeId);
    } else {
      break;
    }
  }

  return null;
}

/**
 * Find the closest component master ancestor of a shape (if any)
 */
export function findComponentMasterAncestor(
  editor: Editor,
  shapeId: TLShapeId
): TLShape | null {
  let current: TLShape | undefined = editor.getShape(shapeId);

  while (current) {
    const meta = current.meta as Record<string, unknown>;
    if (meta?.isComponentMaster === true) return current;

    if (current.parentId && current.parentId !== editor.getCurrentPageId()) {
      current = editor.getShape(current.parentId as TLShapeId);
    } else {
      break;
    }
  }

  return null;
}
