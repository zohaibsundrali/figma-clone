/**
 * Auto Layout Engine
 *
 * Implements Figma-style auto layout calculations within tldraw.
 * Auto layout metadata is stored on group shapes via shape.meta so it
 * participates in tldraw's undo/redo and Liveblocks sync automatically.
 *
 * An auto-layout container is a group shape with meta.autoLayout = true.
 */

import type { Editor, TLShape, TLShapeId } from "tldraw";

// ─── Types ──────────────────────────────────────────────────────────────────

export type LayoutDirection = "horizontal" | "vertical";
export type LayoutAlignment = "start" | "center" | "end" | "stretch";
export type LayoutDistribution = "packed" | "space-between";
export type SizingMode = "fixed" | "hug" | "fill";

export interface AutoLayoutConfig {
  autoLayout: true;
  direction: LayoutDirection;
  gap: number;
  paddingTop: number;
  paddingRight: number;
  paddingBottom: number;
  paddingLeft: number;
  alignment: LayoutAlignment;
  distribution: LayoutDistribution;
  wrap: boolean;
  widthMode: SizingMode;
  heightMode: SizingMode;
}

export const DEFAULT_AUTO_LAYOUT: AutoLayoutConfig = {
  autoLayout: true,
  direction: "vertical",
  gap: 10,
  paddingTop: 10,
  paddingRight: 10,
  paddingBottom: 10,
  paddingLeft: 10,
  alignment: "start",
  distribution: "packed",
  wrap: false,
  widthMode: "hug",
  heightMode: "hug",
};

// ─── Helpers ────────────────────────────────────────────────────────────────

function getGroupChildren(editor: Editor, groupId: TLShapeId): TLShape[] {
  return editor
    .getSortedChildIdsForParent(groupId)
    .map((id) => editor.getShape(id))
    .filter((s): s is TLShape => s !== undefined);
}

function getShapeSize(
  editor: Editor,
  shape: TLShape
): { w: number; h: number } {
  const bounds = editor.getShapeGeometry(shape).bounds;
  return { w: bounds.w, h: bounds.h };
}

// ─── Public API ─────────────────────────────────────────────────────────────

/**
 * Check if a shape is an auto-layout container
 */
export function isAutoLayoutContainer(shape: TLShape): boolean {
  const meta = shape.meta as Record<string, unknown>;
  return meta?.autoLayout === true;
}

/**
 * Get auto layout config from a shape's metadata
 */
export function getAutoLayoutConfig(
  shape: TLShape
): AutoLayoutConfig | null {
  const meta = shape.meta as Record<string, unknown>;
  if (!meta?.autoLayout) return null;

  return {
    autoLayout: true,
    direction: (meta.direction as LayoutDirection) || "vertical",
    gap: (meta.gap as number) ?? 10,
    paddingTop: (meta.paddingTop as number) ?? 10,
    paddingRight: (meta.paddingRight as number) ?? 10,
    paddingBottom: (meta.paddingBottom as number) ?? 10,
    paddingLeft: (meta.paddingLeft as number) ?? 10,
    alignment: (meta.alignment as LayoutAlignment) || "start",
    distribution: (meta.distribution as LayoutDistribution) || "packed",
    wrap: (meta.wrap as boolean) ?? false,
    widthMode: (meta.widthMode as SizingMode) || "hug",
    heightMode: (meta.heightMode as SizingMode) || "hug",
  };
}

/**
 * Apply auto layout to a group shape.
 * Converts a regular group into an auto-layout container.
 */
export function applyAutoLayout(
  editor: Editor,
  groupShapeId: TLShapeId,
  config: Partial<AutoLayoutConfig> = {}
): void {
  const shape = editor.getShape(groupShapeId);
  if (!shape) return;

  editor.markHistoryStoppingPoint("apply-auto-layout");

  const fullConfig: AutoLayoutConfig = {
    ...DEFAULT_AUTO_LAYOUT,
    ...config,
  };

  editor.updateShape({
    id: shape.id,
    type: shape.type,
    meta: {
      ...shape.meta,
      ...fullConfig,
    },
  });

  // Immediately recalculate layout
  recalculateLayout(editor, groupShapeId);
}

/**
 * Remove auto layout from a group shape
 */
export function removeAutoLayout(
  editor: Editor,
  groupShapeId: TLShapeId
): void {
  const shape = editor.getShape(groupShapeId);
  if (!shape) return;

  editor.markHistoryStoppingPoint("remove-auto-layout");

  const meta = { ...shape.meta } as Record<string, unknown>;
  delete meta.autoLayout;
  delete meta.direction;
  delete meta.gap;
  delete meta.paddingTop;
  delete meta.paddingRight;
  delete meta.paddingBottom;
  delete meta.paddingLeft;
  delete meta.alignment;
  delete meta.distribution;
  delete meta.wrap;
  delete meta.widthMode;
  delete meta.heightMode;

  editor.updateShape({
    id: shape.id,
    type: shape.type,
    meta,
  } as Parameters<typeof editor.updateShape>[0]);
}

/**
 * Update auto layout config on a container
 */
export function updateAutoLayoutConfig(
  editor: Editor,
  groupShapeId: TLShapeId,
  updates: Partial<AutoLayoutConfig>
): void {
  const shape = editor.getShape(groupShapeId);
  if (!shape) return;

  const meta = shape.meta as Record<string, unknown>;
  if (!meta?.autoLayout) return;

  editor.markHistoryStoppingPoint("update-auto-layout");

  editor.updateShape({
    id: shape.id,
    type: shape.type,
    meta: {
      ...meta,
      ...updates,
    },
  });

  recalculateLayout(editor, groupShapeId);
}

/**
 * Recalculate and apply layout positions for all children of an auto-layout container.
 *
 * This is the core layout algorithm. It positions children according to:
 * - direction (horizontal/vertical)
 * - gap between items
 * - padding (top/right/bottom/left)
 * - alignment (cross-axis positioning)
 * - distribution (packed vs space-between)
 * - wrapping (flow to next row/column)
 * - sizing modes (hug, fill, fixed)
 */
export function recalculateLayout(
  editor: Editor,
  groupShapeId: TLShapeId
): void {
  const container = editor.getShape(groupShapeId);
  if (!container) return;

  const config = getAutoLayoutConfig(container);
  if (!config) return;

  const children = getGroupChildren(editor, groupShapeId);
  if (children.length === 0) return;

  const {
    direction,
    gap,
    paddingTop,
    paddingRight,
    paddingBottom,
    paddingLeft,
    alignment,
    distribution,
    wrap,
    widthMode,
    heightMode,
  } = config;

  const isHorizontal = direction === "horizontal";

  // Measure each child's size
  const childSizes = children.map((child) => getShapeSize(editor, child));

  // Calculate the container size based on mode
  const containerBounds = editor.getShapeGeometry(container).bounds;
  const containerW = containerBounds.w;
  const containerH = containerBounds.h;

  // Available space inside padding
  const innerWidth = containerW - paddingLeft - paddingRight;
  const innerHeight = containerH - paddingTop - paddingBottom;

  // Handle fill-container children sizing
  const childMetas = children.map((c) => c.meta as Record<string, unknown>);
  const fillChildren = childMetas.map(
    (m) => (isHorizontal ? m?.childWidthMode : m?.childHeightMode) === "fill"
  );

  // Calculate total main-axis size of non-fill children
  let totalMainSize = 0;
  let fillCount = 0;

  for (let i = 0; i < children.length; i++) {
    if (fillChildren[i]) {
      fillCount++;
    } else {
      totalMainSize += isHorizontal
        ? childSizes[i].w
        : childSizes[i].h;
    }
  }

  const totalGap = gap * Math.max(0, children.length - 1);
  const availableMain = (isHorizontal ? innerWidth : innerHeight) - totalGap;
  const fillSize =
    fillCount > 0
      ? Math.max(0, (availableMain - totalMainSize) / fillCount)
      : 0;

  // Build effective sizes
  const effectiveSizes = childSizes.map((size, i) => {
    let w = size.w;
    let h = size.h;

    if (isHorizontal && fillChildren[i]) {
      w = fillSize;
    } else if (!isHorizontal && fillChildren[i]) {
      h = fillSize;
    }

    // Handle stretch alignment (cross-axis fill)
    if (alignment === "stretch") {
      if (isHorizontal) {
        h = innerHeight;
      } else {
        w = innerWidth;
      }
    }

    return { w, h };
  });

  // Position children
  const updates: Array<{ id: TLShapeId; type: string; x: number; y: number }> = [];

  if (!wrap) {
    // Simple non-wrapping layout
    let mainOffset = isHorizontal ? paddingLeft : paddingTop;

    // Handle space-between distribution
    let effectiveGap = gap;
    if (distribution === "space-between" && children.length > 1) {
      const totalChildMain = effectiveSizes.reduce(
        (sum, s) => sum + (isHorizontal ? s.w : s.h),
        0
      );
      effectiveGap =
        ((isHorizontal ? innerWidth : innerHeight) - totalChildMain) /
        (children.length - 1);
    }

    for (let i = 0; i < children.length; i++) {
      const child = children[i];
      const size = effectiveSizes[i];

      // Cross-axis alignment
      let crossOffset: number;
      const crossSpace = isHorizontal ? innerHeight : innerWidth;
      const childCrossSize = isHorizontal ? size.h : size.w;

      switch (alignment) {
        case "center":
          crossOffset =
            (isHorizontal ? paddingTop : paddingLeft) +
            (crossSpace - childCrossSize) / 2;
          break;
        case "end":
          crossOffset =
            (isHorizontal ? paddingTop : paddingLeft) +
            crossSpace -
            childCrossSize;
          break;
        case "stretch":
          crossOffset = isHorizontal ? paddingTop : paddingLeft;
          break;
        case "start":
        default:
          crossOffset = isHorizontal ? paddingTop : paddingLeft;
          break;
      }

      const x = isHorizontal ? mainOffset : crossOffset;
      const y = isHorizontal ? crossOffset : mainOffset;

      updates.push({
        id: child.id,
        type: child.type,
        x,
        y,
      });

      mainOffset +=
        (isHorizontal ? size.w : size.h) + effectiveGap;
    }
  } else {
    // Wrapping layout
    const maxMainSize = isHorizontal ? innerWidth : innerHeight;
    let mainOffset = isHorizontal ? paddingLeft : paddingTop;
    let crossOffset = isHorizontal ? paddingTop : paddingLeft;
    let rowMaxCross = 0;

    for (let i = 0; i < children.length; i++) {
      const child = children[i];
      const size = effectiveSizes[i];
      const mainSize = isHorizontal ? size.w : size.h;
      const crossSize = isHorizontal ? size.h : size.w;
      const startPad = isHorizontal ? paddingLeft : paddingTop;

      // Check if wrapping is needed
      if (
        i > 0 &&
        mainOffset - startPad + mainSize > maxMainSize
      ) {
        mainOffset = startPad;
        crossOffset += rowMaxCross + gap;
        rowMaxCross = 0;
      }

      const x = isHorizontal ? mainOffset : crossOffset;
      const y = isHorizontal ? crossOffset : mainOffset;

      updates.push({
        id: child.id,
        type: child.type,
        x,
        y,
      });

      mainOffset += mainSize + gap;
      rowMaxCross = Math.max(rowMaxCross, crossSize);
    }
  }

  // Apply position updates
  if (updates.length > 0) {
    editor.updateShapes(updates as Parameters<typeof editor.updateShapes>[0]);
  }

  // Resize the container if in "hug" mode
  if (widthMode === "hug" || heightMode === "hug") {
    const childBoundsAfter = children.map((child) => {
      const updatedChild = editor.getShape(child.id);
      if (!updatedChild) return { x: 0, y: 0, w: 0, h: 0 };
      const size = getShapeSize(editor, updatedChild);
      return { x: updatedChild.x, y: updatedChild.y, w: size.w, h: size.h };
    });

    let maxRight = 0;
    let maxBottom = 0;

    for (const cb of childBoundsAfter) {
      maxRight = Math.max(maxRight, cb.x + cb.w);
      maxBottom = Math.max(maxBottom, cb.y + cb.h);
    }

    const newWidth = maxRight + paddingRight;
    const newHeight = maxBottom + paddingBottom;

    // Only update if the container's props support w/h
    const props = container.props as Record<string, unknown>;
    const containerUpdate: Record<string, unknown> = {
      id: container.id,
      type: container.type,
    };

    if (widthMode === "hug" && "w" in props) {
      (containerUpdate as Record<string, unknown>).props = {
        ...((containerUpdate as Record<string, unknown>).props as Record<string, unknown> ?? {}),
        ...props,
        w: newWidth,
      };
    }
    if (heightMode === "hug" && "h" in props) {
      const existingProps =
        (containerUpdate as Record<string, unknown>).props || { ...props };
      (containerUpdate as Record<string, unknown>).props = {
        ...existingProps as Record<string, unknown>,
        h: newHeight,
      };
    }

    if ((containerUpdate as Record<string, unknown>).props) {
      editor.updateShapes([containerUpdate as Parameters<typeof editor.updateShapes>[0][0]]);
    }
  }
}

/**
 * Reorder a child within an auto-layout container.
 * Moves child from one index to another and recalculates layout.
 */
export function reorderChild(
  editor: Editor,
  groupShapeId: TLShapeId,
  childShapeId: TLShapeId,
  newIndex: number
): void {
  const container = editor.getShape(groupShapeId);
  if (!container || !isAutoLayoutContainer(container)) return;

  editor.markHistoryStoppingPoint("reorder-auto-layout-child");

  const childIds = editor.getSortedChildIdsForParent(groupShapeId);
  const currentIndex = childIds.indexOf(childShapeId);
  if (currentIndex === -1 || currentIndex === newIndex) return;

  // Use tldraw's reorder mechanism
  const targetIndex = Math.max(0, Math.min(childIds.length - 1, newIndex));

  if (targetIndex > currentIndex) {
    // Move forward (bring forward)
    for (let i = currentIndex; i < targetIndex; i++) {
      editor.bringForward([childShapeId]);
    }
  } else {
    // Move backward (send backward)
    for (let i = currentIndex; i > targetIndex; i--) {
      editor.sendBackward([childShapeId]);
    }
  }

  // Recalculate layout after reorder
  recalculateLayout(editor, groupShapeId);
}

/**
 * Find and recalculate all auto-layout containers that are ancestors of a shape.
 * Call this when a child shape changes (added, removed, resized).
 */
export function recalculateAncestorLayouts(
  editor: Editor,
  shapeId: TLShapeId
): void {
  let current: TLShape | undefined = editor.getShape(shapeId);

  while (current) {
    if (
      current.parentId &&
      current.parentId !== editor.getCurrentPageId()
    ) {
      const parent = editor.getShape(current.parentId as TLShapeId);
      if (parent && isAutoLayoutContainer(parent)) {
        recalculateLayout(editor, parent.id);
      }
      current = parent;
    } else {
      break;
    }
  }
}
