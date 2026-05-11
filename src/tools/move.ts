// Move tool — reference Tool migration. Pattern (followed by every other tool):
//   1. Tool defines pure behavior in onPointerDown / onPointerMove / onPointerUp /
//      onKeyDown. It NEVER mutates state directly — every change goes through
//      store actions (store.setPan, store.commitHistory, ...). Per-stroke local
//      state lives in module-level let bindings or closures, NOT in the store.
//   2. Tool registers itself in src/tools/registry.ts; the Viewport dispatches
//      pointer/key events to whichever Tool is active. The Viewport must stay
//      tool-agnostic — no `if (activeTool === 'move')` branches.
//   3. Pixel-mutating tools commit a {kind: 'pixel', beforeBuffer, afterBuffer,
//      dirtyRect} action via store.commitHistory before releasing the stroke.
//      Non-pixel tools (Move, Hand, selection tools that only change selection
//      state) commit a generic {apply, revert} action.
import type { Tool } from './Tool';
import type { Layer } from '../core/Layer';
import type { EditorStore, SelectionState, ShapeData } from '../store/types';
import { registerTool } from './registry';
import { commitTypeLayer, type TypeLayerData } from './type';
import { rerenderShapeLayer } from './shapeRender';
import { moveShapeTarget, cloneShapeData } from './shapeCommands';
import { rasterizeSelectionOperations } from '../utils/selectionUtils';
import {
    cloneSelectionOperation,
    cloneSelectionSnapshot,
    previewSelectionMove,
    restoreSelectionSnapshot,
    selectionContainsPoint,
    shiftedOperations,
    type SelectionSnapshot,
    type SelectionMoveAnchor,
} from './selectionMove';
import { buildSnapCandidates, snapPoint, type SnapTarget } from './snap';
import { useEditorStore } from '../store/editorStore';
import { getLayerContentBounds } from '../utils/canvasUtils';

const SNAP_HYSTERESIS = 6;

export type MoveAutoSelectScope = 'off' | 'layer' | 'group';

export interface MoveToolOptions {
    autoSelect: MoveAutoSelectScope;
    showTransformControls: boolean;
}

const moveOptions: MoveToolOptions = { autoSelect: 'off', showTransformControls: false };

export function setMoveOptions(next: Partial<MoveToolOptions>): void {
    Object.assign(moveOptions, next);
}

export function getMoveOptions(): MoveToolOptions {
    return { ...moveOptions };
}

function pickTopmostLayerAt(layers: Layer[], x: number, y: number): Layer | null {
    for (let i = layers.length - 1; i >= 0; i--) {
        const layer = layers[i];
        if (!layer.visible) continue;
        if (x < 0 || y < 0 || x >= layer.canvas.width || y >= layer.canvas.height) continue;
        try {
            const data = layer.ctx.getImageData(Math.floor(x), Math.floor(y), 1, 1).data;
            if (data[3] > 0) return layer;
        } catch {
            // Cross-origin or uninitialised canvas — skip.
        }
    }
    return null;
}

function findGroupAncestor(layer: Layer, layers: Layer[]): Layer | null {
    let cur = layer.parentId ? layers.find(l => l.id === layer.parentId) ?? null : null;
    while (cur && cur.parentId) {
        const parent = layers.find(l => l.id === cur!.parentId);
        if (!parent) break;
        cur = parent;
    }
    return cur;
}

function constrainAxis(dx: number, dy: number): { dx: number; dy: number } {
    if (dx === 0 && dy === 0) return { dx, dy };
    const ax = Math.abs(dx);
    const ay = Math.abs(dy);
    const angle = Math.atan2(dy, dx);
    // 8 axes: H / V / 45° diagonals. Snap to the nearest multiple of 45°.
    const step = Math.PI / 4;
    const snapped = Math.round(angle / step) * step;
    const magnitude = Math.max(ax, ay);
    return {
        dx: Math.round(Math.cos(snapped) * magnitude),
        dy: Math.round(Math.sin(snapped) * magnitude),
    };
}

function publishActiveSnapTargets(xSnap: SnapTarget | undefined, ySnap: SnapTarget | undefined): void {
    const targets: SnapTarget[] = [];
    if (xSnap) targets.push(xSnap);
    if (ySnap) targets.push(ySnap);
    useEditorStore.getState().setActiveSnapTargets(targets.length > 0 ? targets : null);
}

function computeMoveAnchors(layer: Layer | undefined, fallback: { x: number; y: number }): { x: number; y: number }[] {
    if (!layer || !layer.canvas) return [fallback];
    const bounds = getLayerContentBounds(layer.canvas);
    if (!bounds) return [fallback];
    const left = bounds.x;
    const right = bounds.x + bounds.w;
    const top = bounds.y;
    const bottom = bounds.y + bounds.h;
    return [
        { x: left, y: top },
        { x: right, y: top },
        { x: left, y: bottom },
        { x: right, y: bottom },
        { x: (left + right) / 2, y: (top + bottom) / 2 },
    ];
}

/**
 * Run a drag delta through the snap candidates and return the snapped delta.
 * Anchors are layer bounding-box reference points (corners + center); we try
 * each, pick the smallest residual movement that lands on a candidate, and
 * publish the active targets so the Viewport can paint smart-guide cues.
 */
function snapMoveDelta(
    dx: number,
    dy: number,
    anchors: { x: number; y: number }[],
    candidates: SnapTarget[],
): { dx: number; dy: number } {
    let bestX: SnapTarget | undefined;
    let bestXAdjust = 0;
    let bestXDist = SNAP_HYSTERESIS + 1;
    let bestY: SnapTarget | undefined;
    let bestYAdjust = 0;
    let bestYDist = SNAP_HYSTERESIS + 1;
    for (const anchor of anchors) {
        const point = { x: anchor.x + dx, y: anchor.y + dy };
        const result = snapPoint(point, candidates, SNAP_HYSTERESIS);
        if (result.xSnap) {
            const adjust = result.x - point.x;
            const dist = Math.abs(adjust);
            if (dist < bestXDist) {
                bestX = result.xSnap;
                bestXAdjust = adjust;
                bestXDist = dist;
            }
        }
        if (result.ySnap) {
            const adjust = result.y - point.y;
            const dist = Math.abs(adjust);
            if (dist < bestYDist) {
                bestY = result.ySnap;
                bestYAdjust = adjust;
                bestYDist = dist;
            }
        }
    }
    publishActiveSnapTargets(bestX, bestY);
    return { dx: dx + bestXAdjust, dy: dy + bestYAdjust };
}

interface DragState {
    startCanvasX: number;
    startCanvasY: number;
    lastDx: number;
    lastDy: number;
    moved: boolean;
    targets: MoveTarget[];
    selectionMove: SelectionMoveAnchor | null;
    selectionBefore: SelectionSnapshot | null;
    snapCandidates: SnapTarget[];
    snapAnchors: { x: number; y: number }[];
}

interface MoveTarget {
    layer: Layer;
    layerId: string;
    name: string;
    canvas: HTMLCanvasElement;
    ctx: CanvasRenderingContext2D;
    before: ImageData;
    snapshotCanvas: HTMLCanvasElement;
    typeDataBefore: TypeLayerData | null;
    shapeDataBefore: ShapeData | null;
    selectedPixels?: SelectedPixelsDrag;
}

let drag: DragState | null = null;

interface SelectedPixelsDrag {
    base: ImageData;
    floatingCanvas: HTMLCanvasElement;
}

function cloneTypeData(data: TypeLayerData | null | undefined): TypeLayerData | null {
    if (!data) return null;
    if (typeof structuredClone === 'function') return structuredClone(data) as TypeLayerData;
    return JSON.parse(JSON.stringify(data)) as TypeLayerData;
}

function moveShapeTargetLive(target: MoveTarget, dx: number, dy: number): void {
    if (!target.shapeDataBefore || target.layer.kind !== 'shape') return;
    const next = moveShapeTarget(target.shapeDataBefore, dx, dy, 1, 1, 0);
    target.layer.shapeData = next;
    rerenderShapeLayer(target.layer);
}

function moveTypeTarget(target: MoveTarget, dx: number, dy: number): void {
    if (!target.typeDataBefore || target.layer.kind !== 'type') return;
    const next = cloneTypeData(target.typeDataBefore);
    if (!next) return;
    next.transform = {
        ...next.transform,
        x: target.typeDataBefore.transform.x + dx,
        y: target.typeDataBefore.transform.y + dy,
    };
    if (target.typeDataBefore.bounds) {
        next.bounds = {
            ...target.typeDataBefore.bounds,
            x: target.typeDataBefore.bounds.x + dx,
            y: target.typeDataBefore.bounds.y + dy,
        };
    }
    target.layer.typeData = next;
    commitTypeLayer(target.canvas, next);
    target.layer.markDirty(null);
}

function buildSelectionMask(selection: SelectionState, width: number, height: number): Uint8ClampedArray {
    if (selection.operations.length > 0) {
        return rasterizeSelectionOperations(selection.operations, width, height);
    }
    if (!selection.hasSelection || selection.path.length < 2) {
        return new Uint8ClampedArray(width * height);
    }
    return rasterizeSelectionOperations([
        { mode: 'add', type: selection.mode, path: selection.path },
    ], width, height);
}

function createSelectedPixelsDrag(before: ImageData, mask: Uint8ClampedArray): SelectedPixelsDrag | null {
    const { width, height, data } = before;
    const base = new ImageData(new Uint8ClampedArray(data), width, height);
    const floating = new ImageData(width, height);
    let hasPixels = false;

    for (let i = 0; i < mask.length; i++) {
        const maskAlpha = mask[i] / 255;
        if (maskAlpha <= 0) continue;
        const pixel = i * 4;
        const originalAlpha = data[pixel + 3];
        if (originalAlpha <= 0) continue;
        hasPixels = true;

        floating.data[pixel] = data[pixel];
        floating.data[pixel + 1] = data[pixel + 1];
        floating.data[pixel + 2] = data[pixel + 2];
        floating.data[pixel + 3] = Math.round(originalAlpha * maskAlpha);

        base.data[pixel + 3] = Math.round(originalAlpha * (1 - maskAlpha));
        if (base.data[pixel + 3] === 0) {
            base.data[pixel] = 0;
            base.data[pixel + 1] = 0;
            base.data[pixel + 2] = 0;
        }
    }

    if (!hasPixels) return null;

    const floatingCanvas = document.createElement('canvas');
    floatingCanvas.width = width;
    floatingCanvas.height = height;
    const floatingCtx = floatingCanvas.getContext('2d');
    if (!floatingCtx) return null;
    floatingCtx.putImageData(floating, 0, 0);
    return { base, floatingCanvas };
}

function renderSelectedPixelsTarget(target: MoveTarget, dx: number, dy: number): void {
    if (!target.selectedPixels) return;
    target.ctx.putImageData(target.selectedPixels.base, 0, 0);
    target.ctx.drawImage(target.selectedPixels.floatingCanvas, dx, dy);
    target.layer.markDirty(null);
}

export function moveSelectedPixelsBy(dx: number, dy: number, store: EditorStore): boolean {
    const { layers, activeLayerId, selection } = store;
    const activeLayer = layers.find(layer => layer.id === activeLayerId);
    if (!activeLayer || activeLayer.kind === 'type' || activeLayer.lockPosition || activeLayer.locks.all || !selection.hasSelection) {
        return false;
    }
    const before = activeLayer.ctx.getImageData(0, 0, activeLayer.canvas.width, activeLayer.canvas.height);
    const selectedPixels = createSelectedPixelsDrag(
        before,
        buildSelectionMask(selection, activeLayer.canvas.width, activeLayer.canvas.height),
    );
    if (!selectedPixels) return false;
    const selectionBefore = cloneSelectionSnapshot(selection);
    const selectionAfter: SelectionSnapshot = {
        hasSelection: true,
        path: selectionBefore.path.map(point => ({ x: point.x + dx, y: point.y + dy })),
        operations: shiftedOperations(selectionBefore.operations, dx, dy),
    };

    activeLayer.ctx.putImageData(selectedPixels.base, 0, 0);
    activeLayer.ctx.drawImage(selectedPixels.floatingCanvas, dx, dy);
    activeLayer.markDirty(null);
    restoreSelectionSnapshot(selectionAfter);
    const after = activeLayer.ctx.getImageData(0, 0, activeLayer.canvas.width, activeLayer.canvas.height);

    store.commitHistory({
        kind: 'transform',
        label: 'Nudge Selected Pixels',
        layerId: activeLayer.id,
        affectedIds: [activeLayer.id, 'selection'],
        timestamp: Date.now(),
        apply: () => {
            restoreSelectionSnapshot(selectionAfter);
            activeLayer.ctx.putImageData(after, 0, 0);
            activeLayer.markDirty(null);
        },
        revert: () => {
            restoreSelectionSnapshot(selectionBefore);
            activeLayer.ctx.putImageData(before, 0, 0);
            activeLayer.markDirty(null);
        },
    });
    return true;
}

export const moveTool: Tool = {
    id: 'move',
    label: 'Move',
    cursor: 'move',
    onPointerDown: (e, ctx) => {
        if (e.button !== 0) return;
        const store = ctx.getStore();
        const { selection } = store;
        let { layers, activeLayerId } = store;

        // Auto-Select (or temporary Cmd-click auto-select) picks the topmost
        // non-transparent layer under the cursor. Cmd/Ctrl forces the lookup
        // even when the option is off.
        const wantsAutoSelect = moveOptions.autoSelect !== 'off' || e.meta || e.ctrl;
        if (wantsAutoSelect) {
            const hit = pickTopmostLayerAt(layers, e.canvasX, e.canvasY);
            if (hit) {
                const target = moveOptions.autoSelect === 'group'
                    ? (findGroupAncestor(hit, layers) ?? hit)
                    : hit;
                if (target.id !== activeLayerId) {
                    store.setActiveLayer(target.id);
                    // Re-read store so activeLayer pickup below honors the selection.
                    const refreshed = ctx.getStore();
                    layers = refreshed.layers;
                    activeLayerId = refreshed.activeLayerId;
                }
            }
        }

        let activeLayer = layers.find(layer => layer.id === activeLayerId);
        if (!activeLayer || activeLayer.lockPosition || activeLayer.locks.all) return;

        // Alt-drag duplicates the active layer first, then operates on the
        // duplicate so the original is preserved.
        if (e.alt) {
            store.duplicateLayer(activeLayer.id);
            const refreshed = ctx.getStore();
            const newActive = refreshed.layers.find(l => l.id === refreshed.activeLayerId);
            if (newActive) {
                activeLayer = newActive;
                layers = refreshed.layers;
            }
        }

        const before = activeLayer.ctx.getImageData(0, 0, activeLayer.canvas.width, activeLayer.canvas.height);
        const typeDataBefore = activeLayer.kind === 'type'
            ? cloneTypeData(activeLayer.typeData as TypeLayerData | null)
            : null;
        const shapeDataBefore = activeLayer.kind === 'shape' && activeLayer.shapeData
            ? cloneShapeData(activeLayer.shapeData as ShapeData)
            : null;
        const snapshotCanvas = document.createElement('canvas');
        snapshotCanvas.width = activeLayer.canvas.width;
        snapshotCanvas.height = activeLayer.canvas.height;
        const snapshotCtx = snapshotCanvas.getContext('2d');
        if (!snapshotCtx) return;
        snapshotCtx.putImageData(before, 0, 0);
        const shouldMoveSelectedPixels = activeLayer.kind !== 'type'
            && activeLayer.kind !== 'shape'
            && selection.hasSelection
            && selectionContainsPoint(selection, e.canvasX, e.canvasY);
        const selectedPixels = shouldMoveSelectedPixels
            ? createSelectedPixelsDrag(
                before,
                buildSelectionMask(selection, activeLayer.canvas.width, activeLayer.canvas.height),
            )
            : null;

        const storeSnapshot = ctx.getStore();
        const snapCandidates = storeSnapshot.snapEnabled ? buildSnapCandidates(storeSnapshot) : [];
        const snapAnchors = computeMoveAnchors(activeLayer, { x: e.canvasX, y: e.canvasY });

        drag = {
            startCanvasX: e.canvasX,
            startCanvasY: e.canvasY,
            lastDx: 0,
            lastDy: 0,
            moved: false,
            selectionMove: selectedPixels ? {
                anchor: { x: e.canvasX, y: e.canvasY },
                path: selection.path.map(point => ({ ...point })),
                operations: selection.operations.map(cloneSelectionOperation),
            } : null,
            selectionBefore: selectedPixels ? cloneSelectionSnapshot(selection) : null,
            targets: [{
                layer: activeLayer,
                layerId: activeLayer.id,
                name: activeLayer.name,
                canvas: activeLayer.canvas,
                ctx: activeLayer.ctx,
                before,
                snapshotCanvas,
                typeDataBefore,
                shapeDataBefore,
                selectedPixels: selectedPixels ?? undefined,
            }],
            snapCandidates,
            snapAnchors,
        };
        e.rawEvent.preventDefault();
    },
    onPointerMove: (e, ctx) => {
        if (!drag) return;
        let rawDx = e.canvasX - drag.startCanvasX;
        let rawDy = e.canvasY - drag.startCanvasY;
        if (e.shift) {
            const constrained = constrainAxis(rawDx, rawDy);
            rawDx = constrained.dx;
            rawDy = constrained.dy;
        }
        if (drag.snapCandidates.length > 0) {
            const snapped = snapMoveDelta(rawDx, rawDy, drag.snapAnchors, drag.snapCandidates);
            rawDx = snapped.dx;
            rawDy = snapped.dy;
        } else {
            publishActiveSnapTargets(undefined, undefined);
        }
        const dx = Math.round(rawDx);
        const dy = Math.round(rawDy);
        if (dx === drag.lastDx && dy === drag.lastDy) return;
        drag.lastDx = dx;
        drag.lastDy = dy;
        drag.moved = drag.moved || dx !== 0 || dy !== 0;

        for (const target of drag.targets) {
            if (target.selectedPixels) {
                renderSelectedPixelsTarget(target, dx, dy);
            } else if (target.typeDataBefore && target.layer.kind === 'type') {
                moveTypeTarget(target, dx, dy);
            } else if (target.shapeDataBefore && target.layer.kind === 'shape') {
                moveShapeTargetLive(target, dx, dy);
            } else {
                target.ctx.clearRect(0, 0, target.canvas.width, target.canvas.height);
                target.ctx.drawImage(target.snapshotCanvas, dx, dy);
                target.layer.markDirty(null);
            }
        }
        if (drag.selectionMove) {
            previewSelectionMove(drag.selectionMove, dx, dy);
        }
        ctx.requestRender();
    },
    onPointerUp: (_e, ctx) => {
        if (drag?.moved && drag.targets.length > 0) {
            const selectionBefore = drag.selectionBefore;
            const selectionAfter = selectionBefore ? cloneSelectionSnapshot(ctx.getStore().selection) : null;
            const targets = drag.targets.map(target => ({
                layerId: target.layerId,
                name: target.name,
                layer: target.layer,
                ctx: target.ctx,
                canvas: target.canvas,
                before: target.before,
                after: target.ctx.getImageData(0, 0, target.canvas.width, target.canvas.height),
                movedSelectedPixels: !!target.selectedPixels,
                typeDataBefore: target.typeDataBefore,
                typeDataAfter: target.layer.kind === 'type'
                    ? cloneTypeData(target.layer.typeData as TypeLayerData | null)
                    : null,
                shapeDataBefore: target.shapeDataBefore,
                shapeDataAfter: target.layer.kind === 'shape' && target.layer.shapeData
                    ? cloneShapeData(target.layer.shapeData as ShapeData)
                    : null,
            }));
            ctx.getStore().commitHistory({
                kind: 'transform',
                label: targets.some(target => target.movedSelectedPixels)
                    ? 'Move Selected Pixels'
                    : targets.some(target => target.shapeDataBefore)
                        ? (targets.length === 1 ? `Move Shape Layer` : `Move ${targets.length} Layers`)
                        : targets.length === 1 ? `Move ${targets[0].name}` : `Move ${targets.length} Layers`,
                timestamp: Date.now(),
                apply: () => {
                    if (selectionAfter) restoreSelectionSnapshot(selectionAfter);
                    for (const target of targets) {
                        if (target.typeDataAfter) target.layer.typeData = cloneTypeData(target.typeDataAfter);
                        if (target.shapeDataAfter) {
                            target.layer.shapeData = cloneShapeData(target.shapeDataAfter);
                            rerenderShapeLayer(target.layer);
                        } else {
                            target.ctx.putImageData(target.after, 0, 0);
                            target.layer.markDirty(null);
                        }
                    }
                },
                revert: () => {
                    if (selectionBefore) restoreSelectionSnapshot(selectionBefore);
                    for (const target of targets) {
                        if (target.typeDataBefore) target.layer.typeData = cloneTypeData(target.typeDataBefore);
                        if (target.shapeDataBefore) {
                            target.layer.shapeData = cloneShapeData(target.shapeDataBefore);
                            rerenderShapeLayer(target.layer);
                        } else {
                            target.ctx.putImageData(target.before, 0, 0);
                            target.layer.markDirty(null);
                        }
                    }
                },
            });
        }
        drag = null;
        publishActiveSnapTargets(undefined, undefined);
        ctx.requestRender();
    },
};

registerTool(moveTool);
