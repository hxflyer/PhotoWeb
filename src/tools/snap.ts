/**
 * Shared snap-point math used by every drag interaction that wants to honor
 * Photoshop's Snap / Smart Guides behavior:
 *   - Move tool layer drag (src/tools/move.ts)
 *   - Selected-pixel drag and selection-border drag (src/tools/move.ts,
 *     src/tools/selectionMove.ts callers)
 *   - Live shape drawing (src/tools/shapes.ts)
 *   - Free Transform handles (src/components/Canvas/FreeTransformOverlay.tsx)
 *
 * The contract is intentionally tiny: a consumer gathers candidates once per
 * drag-start via `buildSnapCandidates(store)`, then on every pointer-move
 * passes the unsnapped point through `snapPoint(point, candidates, hysteresis)`
 * and uses the returned `{x, y}` as the effective drag location. The
 * `xSnap` / `ySnap` fields are published to `viewSlice.activeSnapTargets`
 * so the Viewport can render smart-guide cues.
 */
import { getLayerContentBounds } from '../utils/canvasUtils';
import type { EditorStore } from '../store/types';

export type SnapSource = 'document' | 'grid' | 'guide' | 'layer-edge' | 'layer-center';

export interface SnapTarget {
    axis: 'x' | 'y';
    value: number;
    source: SnapSource;
}

export interface SnapResult {
    x: number;
    y: number;
    xSnap?: SnapTarget;
    ySnap?: SnapTarget;
}

export function snapPoint(
    point: { x: number; y: number },
    candidates: SnapTarget[],
    hysteresis: number,
): SnapResult {
    let bestX: SnapTarget | undefined;
    let bestXDist = hysteresis + 1;
    let bestY: SnapTarget | undefined;
    let bestYDist = hysteresis + 1;
    for (const c of candidates) {
        if (c.axis === 'x') {
            const d = Math.abs(point.x - c.value);
            if (d <= hysteresis && d < bestXDist) {
                bestX = c;
                bestXDist = d;
            }
        } else {
            const d = Math.abs(point.y - c.value);
            if (d <= hysteresis && d < bestYDist) {
                bestY = c;
                bestYDist = d;
            }
        }
    }
    return {
        x: bestX ? bestX.value : point.x,
        y: bestY ? bestY.value : point.y,
        xSnap: bestX,
        ySnap: bestY,
    };
}

/**
 * Enumerates every snap candidate the current document state exposes:
 *   - Document bounds: left/right edges, top/bottom edges, and the two
 *     centerline midpoints.
 *   - Grid: every multiple of `gridSize` along each axis, gated on
 *     `showGrid && snapEnabled`.
 *   - Guides: each entry in `guides`, gated on `showGuides && snapEnabled`.
 *   - Layer edges/centers: for every visible non-active layer with a
 *     non-empty bounding box, emit left/right/centerX (x-axis) and
 *     top/bottom/centerY (y-axis) candidates.
 * Caller decides whether snapping is on at all by checking `snapEnabled`
 * before invoking; this helper is safe to call regardless.
 */
export function buildSnapCandidates(store: EditorStore): SnapTarget[] {
    const out: SnapTarget[] = [];
    const { width, height } = store;

    out.push({ axis: 'x', value: 0, source: 'document' });
    out.push({ axis: 'x', value: width, source: 'document' });
    out.push({ axis: 'x', value: width / 2, source: 'document' });
    out.push({ axis: 'y', value: 0, source: 'document' });
    out.push({ axis: 'y', value: height, source: 'document' });
    out.push({ axis: 'y', value: height / 2, source: 'document' });

    if (store.snapEnabled && store.showGrid && store.gridSize > 0) {
        for (let gx = 0; gx <= width; gx += store.gridSize) {
            out.push({ axis: 'x', value: gx, source: 'grid' });
        }
        for (let gy = 0; gy <= height; gy += store.gridSize) {
            out.push({ axis: 'y', value: gy, source: 'grid' });
        }
    }

    if (store.snapEnabled && store.showGuides) {
        for (const g of store.guides) {
            if (g.orientation === 'vertical') {
                out.push({ axis: 'x', value: g.position, source: 'guide' });
            } else {
                out.push({ axis: 'y', value: g.position, source: 'guide' });
            }
        }
    }

    const activeId = store.activeLayerId;
    for (const layer of store.layers) {
        if (!layer.visible) continue;
        if (layer.id === activeId) continue;
        if (!layer.canvas) continue;
        const bounds = getLayerContentBounds(layer.canvas);
        if (!bounds) continue;
        const left = bounds.x;
        const right = bounds.x + bounds.w;
        const top = bounds.y;
        const bottom = bounds.y + bounds.h;
        out.push({ axis: 'x', value: left, source: 'layer-edge' });
        out.push({ axis: 'x', value: right, source: 'layer-edge' });
        out.push({ axis: 'x', value: (left + right) / 2, source: 'layer-center' });
        out.push({ axis: 'y', value: top, source: 'layer-edge' });
        out.push({ axis: 'y', value: bottom, source: 'layer-edge' });
        out.push({ axis: 'y', value: (top + bottom) / 2, source: 'layer-center' });
    }

    return out;
}
