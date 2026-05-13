/**
 * Shared "click-inside-to-drag, click-outside-to-dismiss" behavior for every
 * selection tool. The marquee tool used to own this logic; this module hosts
 * the common pieces so lasso, polygonal lasso, magic wand, and quick selection
 * pick up the same UX without duplicating point-in-mask math.
 */

import { useEditorStore } from '../store/editorStore';
import type { SelectionOperation, SelectionState } from '../store/types';
import { snapPoint, type SnapTarget } from './snap';
import type { SelectionOp } from './selectionModifiers';

const SELECTION_SNAP_HYSTERESIS = 6;

export interface SelectionMoveAnchor {
    anchor: { x: number; y: number };
    path: SelectionState['path'];
    operations: SelectionOperation[];
}

export interface SelectionSnapshot {
    hasSelection: boolean;
    path: SelectionState['path'];
    operations: SelectionOperation[];
}

export type BeginInteractionResult =
    | { kind: 'move'; move: SelectionMoveAnchor }
    | { kind: 'cleared'; previous: SelectionMoveAnchor }
    | { kind: 'shift-add' }
    | { kind: 'none' };

export function cloneSelectionOperation(op: SelectionOperation): SelectionOperation {
    return {
        ...op,
        path: op.path.map(point => ({ ...point })),
        mask: op.mask ? {
            width: op.mask.width,
            height: op.mask.height,
            data: new Uint8ClampedArray(op.mask.data),
        } : undefined,
    };
}

function pathContainsPoint(path: SelectionOperation['path'], type: SelectionOperation['type'], x: number, y: number): boolean {
    if (path.length < 2) return false;
    if (type === 'rect') {
        const minX = Math.min(path[0].x, path[1].x);
        const maxX = Math.max(path[0].x, path[1].x);
        const minY = Math.min(path[0].y, path[1].y);
        const maxY = Math.max(path[0].y, path[1].y);
        return x >= minX && x <= maxX && y >= minY && y <= maxY;
    }
    if (type === 'circle') {
        const cx = (path[0].x + path[1].x) / 2;
        const cy = (path[0].y + path[1].y) / 2;
        const rx = Math.abs(path[1].x - path[0].x) / 2;
        const ry = Math.abs(path[1].y - path[0].y) / 2;
        if (rx <= 0 || ry <= 0) return false;
        return ((x - cx) / rx) ** 2 + ((y - cy) / ry) ** 2 <= 1;
    }
    let inside = false;
    for (let i = 0, j = path.length - 1; i < path.length; j = i++) {
        const a = path[i];
        const b = path[j];
        const intersects = (a.y > y) !== (b.y > y)
            && x < ((b.x - a.x) * (y - a.y)) / ((b.y - a.y) || 1) + a.x;
        if (intersects) inside = !inside;
    }
    return inside;
}

function operationContainsPoint(op: SelectionOperation, x: number, y: number): boolean {
    if (op.mask) {
        const ix = Math.floor(x);
        const iy = Math.floor(y);
        if (ix < 0 || iy < 0 || ix >= op.mask.width || iy >= op.mask.height) return false;
        return op.mask.data[iy * op.mask.width + ix] > 0;
    }
    return pathContainsPoint(op.path, op.type, x, y);
}

export function selectionContainsPoint(selection: SelectionState, x: number, y: number): boolean {
    if (!selection.hasSelection) return false;
    if (selection.operations.length === 0) {
        return pathContainsPoint(selection.path, selection.mode, x, y);
    }
    let selected = false;
    for (const op of selection.operations) {
        if (!operationContainsPoint(op, x, y)) continue;
        selected = op.mode === 'add';
    }
    return selected;
}

function shiftMask(mask: NonNullable<SelectionOperation['mask']>, dx: number, dy: number): NonNullable<SelectionOperation['mask']> {
    const data = new Uint8ClampedArray(mask.data.length);
    const sx = Math.round(dx);
    const sy = Math.round(dy);
    for (let y = 0; y < mask.height; y++) {
        for (let x = 0; x < mask.width; x++) {
            const srcX = x - sx;
            const srcY = y - sy;
            if (srcX < 0 || srcY < 0 || srcX >= mask.width || srcY >= mask.height) continue;
            data[y * mask.width + x] = mask.data[srcY * mask.width + srcX];
        }
    }
    return { width: mask.width, height: mask.height, data };
}

function shiftPath(path: SelectionOperation['path'], dx: number, dy: number): SelectionOperation['path'] {
    return path.map(point => ({ x: point.x + dx, y: point.y + dy }));
}

export function shiftedOperations(ops: SelectionOperation[], dx: number, dy: number): SelectionOperation[] {
    return ops.map(op => ({
        ...op,
        path: shiftPath(op.path, dx, dy),
        mask: op.mask ? shiftMask(op.mask, dx, dy) : undefined,
    }));
}

export function cloneSelectionSnapshot(selection: SelectionState): SelectionSnapshot {
    return {
        hasSelection: selection.hasSelection,
        path: selection.path.map(point => ({ ...point })),
        operations: selection.operations.map(cloneSelectionOperation),
    };
}

export function restoreSelectionSnapshot(snapshot: SelectionSnapshot): void {
    useEditorStore.setState(state => ({
        selection: {
            ...state.selection,
            hasSelection: snapshot.hasSelection,
            path: snapshot.path.map(point => ({ ...point })),
            operations: snapshot.operations.map(cloneSelectionOperation),
        },
    }));
}

export function nudgeSelectionBorderBy(dx: number, dy: number): boolean {
    const store = useEditorStore.getState();
    if (!store.selection.hasSelection) return false;
    const before = cloneSelectionSnapshot(store.selection);
    const after: SelectionSnapshot = {
        hasSelection: true,
        path: shiftPath(before.path, dx, dy),
        operations: shiftedOperations(before.operations, dx, dy),
    };
    restoreSelectionSnapshot(after);
    store.commitHistory({
        kind: 'selection',
        label: 'Nudge Selection',
        affectedIds: ['selection'],
        timestamp: Date.now(),
        apply: () => restoreSelectionSnapshot(after),
        revert: () => restoreSelectionSnapshot(before),
    });
    return true;
}

export function previewSelectionMove(move: SelectionMoveAnchor, dx: number, dy: number): void {
    useEditorStore.setState(store => ({
        selection: {
            ...store.selection,
            path: shiftPath(move.path, dx, dy),
            operations: shiftedOperations(move.operations, dx, dy),
            hasSelection: store.selection.hasSelection,
        },
    }));
}

function publishSelectionSnapTargets(xSnap: SnapTarget | undefined, ySnap: SnapTarget | undefined): void {
    const targets: SnapTarget[] = [];
    if (xSnap) targets.push(xSnap);
    if (ySnap) targets.push(ySnap);
    useEditorStore.getState().setActiveSnapTargets(targets.length > 0 ? targets : null);
}

/**
 * Selection-border-drag snap entry point. Picks the smallest residual from
 * each reference anchor (selection-bounds corners + center) against the
 * provided snap candidates, publishes the active targets, and returns the
 * snapped {dx, dy}. Pass `[]` for candidates to disable snapping.
 */
export function snapSelectionDelta(
    dx: number,
    dy: number,
    anchors: { x: number; y: number }[],
    candidates: SnapTarget[],
): { dx: number; dy: number } {
    if (candidates.length === 0 || anchors.length === 0) {
        publishSelectionSnapTargets(undefined, undefined);
        return { dx, dy };
    }
    let bestX: SnapTarget | undefined;
    let bestXAdjust = 0;
    let bestXDist = SELECTION_SNAP_HYSTERESIS + 1;
    let bestY: SnapTarget | undefined;
    let bestYAdjust = 0;
    let bestYDist = SELECTION_SNAP_HYSTERESIS + 1;
    for (const a of anchors) {
        const result = snapPoint({ x: a.x + dx, y: a.y + dy }, candidates, SELECTION_SNAP_HYSTERESIS);
        if (result.xSnap) {
            const adjust = result.x - (a.x + dx);
            if (Math.abs(adjust) < bestXDist) {
                bestX = result.xSnap;
                bestXAdjust = adjust;
                bestXDist = Math.abs(adjust);
            }
        }
        if (result.ySnap) {
            const adjust = result.y - (a.y + dy);
            if (Math.abs(adjust) < bestYDist) {
                bestY = result.ySnap;
                bestYAdjust = adjust;
                bestYDist = Math.abs(adjust);
            }
        }
    }
    publishSelectionSnapTargets(bestX, bestY);
    return { dx: dx + bestXAdjust, dy: dy + bestYAdjust };
}

/**
 * Convenience helper: snap the dx/dy first, then preview-move. Selection
 * tools and the Move tool's selection-pixel branch use this to share the
 * snap-and-publish pipeline.
 */
export function previewSelectionMoveSnapped(
    move: SelectionMoveAnchor,
    dx: number,
    dy: number,
    anchors: { x: number; y: number }[],
    candidates: SnapTarget[],
): { dx: number; dy: number } {
    const snapped = snapSelectionDelta(dx, dy, anchors, candidates);
    previewSelectionMove(move, snapped.dx, snapped.dy);
    return snapped;
}

/**
 * Common "what should this pointer-down do?" decision for every selection tool.
 * - If the user has an existing selection and clicks inside it without modifiers,
 *   start a move-by-drag (the tool should not start a new path).
 * - If they click outside without modifiers, dismiss the existing selection so
 *   the tool can start fresh on the empty canvas.
 * - Modifier-held clicks (shift/alt/cmd) are a "shift-add"-type interaction,
 *   so the tool keeps the existing selection and proceeds normally.
 */
export function beginSelectionInteraction(
    e: { canvasX: number; canvasY: number; shift: boolean; alt: boolean; meta: boolean; ctrl: boolean },
    selection: SelectionState,
    clearSelection: () => void,
    op: SelectionOp = 'new',
): BeginInteractionResult {
    const point = { x: e.canvasX, y: e.canvasY };
    const hasModifier = e.shift || e.alt || e.meta || e.ctrl;
    if (!selection.hasSelection) return { kind: 'none' };
    if (op !== 'new') return { kind: 'shift-add' };
    if (hasModifier) return { kind: 'shift-add' };
    if (selectionContainsPoint(selection, point.x, point.y)) {
        return {
            kind: 'move',
            move: {
                anchor: point,
                path: selection.path.map(item => ({ ...item })),
                operations: selection.operations.map(cloneSelectionOperation),
            },
        };
    }
    const previous = {
        anchor: point,
        path: selection.path.map(item => ({ ...item })),
        operations: selection.operations.map(cloneSelectionOperation),
    };
    clearSelection();
    return { kind: 'cleared', previous };
}
