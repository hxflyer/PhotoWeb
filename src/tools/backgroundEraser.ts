import type { Tool } from './Tool';
import { registerTool } from './registry';
import { buildSelectionMask } from '../filters/selectionMask';
import {
    captureLayerRegion, createPixelHistoryAction, cropImageData,
    expandStrokeBounds, makeStrokeBounds, strokeBoundsToRect, type StrokeBounds,
} from '../core/history';

export type BackgroundEraserSampling = 'continuous' | 'once' | 'background-swatch';
export type BackgroundEraserLimits = 'contiguous' | 'discontiguous' | 'find-edges';

export interface BackgroundEraserOptions {
    tolerance: number;                       // 0..255
    sampling: BackgroundEraserSampling;
    limits: BackgroundEraserLimits;
    opacity: number;                         // 0..1
}

let options: BackgroundEraserOptions = {
    tolerance: 51,                           // ~20%
    sampling: 'continuous',
    limits: 'contiguous',
    opacity: 1,
};

export function setBackgroundEraserOptions(next: Partial<BackgroundEraserOptions>): void {
    options = { ...options, ...next };
}

export function getBackgroundEraserOptions(): BackgroundEraserOptions {
    return { ...options };
}

type RGBA = [number, number, number, number];

function parseHexColor(hex: string): RGBA {
    let h = hex.trim();
    if (h.startsWith('#')) h = h.slice(1);
    if (h.length === 3) h = h.split('').map(c => c + c).join('');
    if (h.length === 6) h = h + 'ff';
    if (h.length !== 8) return [0, 0, 0, 255];
    return [
        parseInt(h.slice(0, 2), 16),
        parseInt(h.slice(2, 4), 16),
        parseInt(h.slice(4, 6), 16),
        parseInt(h.slice(6, 8), 16),
    ];
}

function sampleColorAt(data: Uint8ClampedArray, x: number, y: number, w: number): RGBA {
    const di = (y * w + x) * 4;
    return [data[di], data[di + 1], data[di + 2], data[di + 3]];
}

function colorDistance(data: Uint8ClampedArray, di: number, ref: RGBA): number {
    return Math.max(
        Math.abs(data[di]     - ref[0]),
        Math.abs(data[di + 1] - ref[1]),
        Math.abs(data[di + 2] - ref[2]),
        Math.abs(data[di + 3] - ref[3]),
    );
}

interface StrokeState {
    last: { x: number; y: number } | null;
    leftover: number;
    layerId: string | null;
    before: ImageData | null;
    sampledColor: RGBA | null;
    selectionMask: ImageData | null;
    bounds: StrokeBounds;
}

const stroke: StrokeState = {
    last: null,
    leftover: 0,
    layerId: null,
    before: null,
    sampledColor: null,
    selectionMask: null,
    bounds: makeStrokeBounds(),
};

/**
 * Resolve the reference color to use for a stamp.
 * - continuous: re-read the pixel directly under the crosshair on each stamp.
 * - once: use the color captured on pointer down.
 * - background-swatch: use the store's secondaryColor.
 */
function resolveSampleColor(
    cx: number,
    cy: number,
    layerData: Uint8ClampedArray,
    w: number,
    h: number,
    secondaryColor: string,
): RGBA | null {
    if (options.sampling === 'background-swatch') {
        return parseHexColor(secondaryColor);
    }
    if (options.sampling === 'once') {
        return stroke.sampledColor;
    }
    if (cx < 0 || cx >= w || cy < 0 || cy >= h) return null;
    return sampleColorAt(layerData, cx, cy, w);
}

/**
 * Build a 0-255 erase-alpha buffer for one stamp.
 * Bounded to a square footprint around (cx, cy) of radius r.
 * Combines: brush-tip mask × tolerance match × limits × selection.
 */
function buildStampEraseMask(
    layerData: Uint8ClampedArray,
    w: number,
    h: number,
    cx: number,
    cy: number,
    radius: number,
    hardness: number,
    ref: RGBA,
    selectionMask: ImageData | null,
): { mask: Uint8ClampedArray; minX: number; minY: number; width: number; height: number } | null {
    const r = Math.max(0.5, radius);
    const minX = Math.max(0, Math.floor(cx - r));
    const minY = Math.max(0, Math.floor(cy - r));
    const maxX = Math.min(w - 1, Math.ceil(cx + r));
    const maxY = Math.min(h - 1, Math.ceil(cy + r));
    const bw = maxX - minX + 1;
    const bh = maxY - minY + 1;
    if (bw <= 0 || bh <= 0) return null;

    const mask = new Uint8ClampedArray(bw * bh);
    const tol = options.tolerance;
    const sel = selectionMask?.data;

    const hardRadius = r * Math.max(0, Math.min(1, hardness));
    const fadeBand = Math.max(0.001, r - hardRadius);

    // 1) Brush footprint × tolerance × selection.
    for (let y = minY; y <= maxY; y++) {
        for (let x = minX; x <= maxX; x++) {
            const dx = x - cx;
            const dy = y - cy;
            const d = Math.hypot(dx, dy);
            if (d > r) continue;

            const di = (y * w + x) * 4;

            let withinTolerance = false;
            const dist = colorDistance(layerData, di, ref);

            if (options.limits === 'find-edges') {
                // Tighter threshold for find-edges so high-frequency edges are
                // preserved. Stamp pixel passes tolerance only if BOTH it and
                // a neighbour both fit; otherwise we treat it as an edge.
                if (dist <= tol) {
                    // Edge detect by max neighbour delta.
                    let neighborMaxDelta = 0;
                    for (const [ox, oy] of [[-1, 0], [1, 0], [0, -1], [0, 1]] as const) {
                        const nx = x + ox;
                        const ny = y + oy;
                        if (nx < 0 || nx >= w || ny < 0 || ny >= h) continue;
                        const ni = (ny * w + nx) * 4;
                        const nd = Math.max(
                            Math.abs(layerData[di]     - layerData[ni]),
                            Math.abs(layerData[di + 1] - layerData[ni + 1]),
                            Math.abs(layerData[di + 2] - layerData[ni + 2]),
                        );
                        if (nd > neighborMaxDelta) neighborMaxDelta = nd;
                    }
                    // If a neighbour is much farther from the sample colour than
                    // tolerance allows, we're at an edge — preserve it.
                    const localUpper = Math.max(tol * 0.5, tol - neighborMaxDelta * 0.5);
                    withinTolerance = dist <= localUpper;
                }
            } else {
                withinTolerance = dist <= tol;
            }

            if (!withinTolerance) continue;

            // Brush hardness falloff.
            let alpha = 1;
            if (d > hardRadius) {
                alpha = Math.max(0, 1 - (d - hardRadius) / fadeBand);
            }
            const baseA = Math.round(alpha * 255);
            if (baseA === 0) continue;

            // Selection clip.
            let selA = 255;
            if (sel) {
                selA = sel[di + 3];
                if (selA === 0) continue;
            }

            const mIdx = (y - minY) * bw + (x - minX);
            // Combine selection weight with brush alpha.
            mask[mIdx] = Math.round((baseA * selA) / 255);
        }
    }

    // 2) Contiguous limit — restrict to the connected component containing the
    //    crosshair. Skip if the crosshair is outside the canvas or has 0 mask.
    if (options.limits === 'contiguous' || options.limits === 'find-edges') {
        const cxLocal = cx - minX;
        const cyLocal = cy - minY;
        if (
            cxLocal < 0 || cxLocal >= bw
            || cyLocal < 0 || cyLocal >= bh
            || mask[cyLocal * bw + cxLocal] === 0
        ) {
            // Crosshair outside footprint mask — but we still need to attempt
            // a flood from the seed pixel's color match. If the seed itself
            // failed (e.g., outside r or selection clip), drop the stamp.
            return null;
        }

        const visited = new Uint8Array(bw * bh);
        const queue: number[] = [cxLocal, cyLocal];
        const keep = new Uint8ClampedArray(bw * bh);
        while (queue.length) {
            const py = queue.pop()!;
            const px = queue.pop()!;
            if (px < 0 || px >= bw || py < 0 || py >= bh) continue;
            const idx = py * bw + px;
            if (visited[idx]) continue;
            visited[idx] = 1;
            if (mask[idx] === 0) continue;
            keep[idx] = mask[idx];
            queue.push(px + 1, py);
            queue.push(px - 1, py);
            queue.push(px, py + 1);
            queue.push(px, py - 1);
        }
        return { mask: keep, minX, minY, width: bw, height: bh };
    }

    return { mask, minX, minY, width: bw, height: bh };
}

function applyStampErase(
    layerCtx: CanvasRenderingContext2D,
    stamp: { mask: Uint8ClampedArray; minX: number; minY: number; width: number; height: number },
): void {
    const { mask, minX, minY, width, height } = stamp;
    const maskCanvas = document.createElement('canvas');
    maskCanvas.width = width;
    maskCanvas.height = height;
    const mctx = maskCanvas.getContext('2d');
    if (!mctx) return;
    const img = mctx.createImageData(width, height);
    const d = img.data;
    for (let i = 0, j = 0; i < mask.length; i++, j += 4) {
        const m = mask[i];
        if (m === 0) continue;
        d[j]     = 0;
        d[j + 1] = 0;
        d[j + 2] = 0;
        d[j + 3] = m;
    }
    mctx.putImageData(img, 0, 0);

    layerCtx.save();
    layerCtx.globalAlpha = options.opacity;
    layerCtx.globalCompositeOperation = 'destination-out';
    layerCtx.drawImage(maskCanvas, minX, minY);
    layerCtx.restore();
}

function stampSegment(
    layer: import('../core/Layer').Layer,
    from: { x: number; y: number },
    to: { x: number; y: number },
    size: number,
    hardness: number,
    secondaryColor: string,
): void {
    const w = layer.canvas.width;
    const h = layer.canvas.height;
    const radius = Math.max(0.5, size / 2);
    const spacing = Math.max(1, size * 0.25);
    const dx = to.x - from.x;
    const dy = to.y - from.y;
    const dist = Math.hypot(dx, dy);

    const positions: { x: number; y: number }[] = [];
    if (dist === 0) {
        positions.push({ x: from.x, y: from.y });
    } else {
        const start = spacing - stroke.leftover;
        let i = Math.max(0, start);
        while (i <= dist) {
            positions.push({
                x: from.x + (dx * i) / dist,
                y: from.y + (dy * i) / dist,
            });
            i += spacing;
        }
        const lastStamp = i - spacing;
        stroke.leftover = lastStamp < (spacing - stroke.leftover) ? stroke.leftover + dist : dist - lastStamp;
    }

    for (const pos of positions) {
        // Re-read the (potentially already partially erased) layer data per stamp
        // so 'continuous' sampling reflects what the eraser is currently exposing.
        const img = layer.ctx.getImageData(0, 0, w, h);
        const data = img.data;
        const cx = Math.floor(pos.x);
        const cy = Math.floor(pos.y);
        const ref = resolveSampleColor(cx, cy, data, w, h, secondaryColor);
        if (!ref) continue;
        // Skip stamps whose center pixel is already fully transparent in
        // continuous mode — there's nothing to sample.
        if (options.sampling === 'continuous' && ref[3] === 0) continue;

        const stamp = buildStampEraseMask(data, w, h, cx, cy, radius, hardness, ref, stroke.selectionMask);
        if (!stamp) continue;
        applyStampErase(layer.ctx, stamp);
        expandStrokeBounds(stroke.bounds, pos.x, pos.y, radius);
        layer.markDirty(null);
    }
}

export const backgroundEraserTool: Tool = {
    id: 'background-eraser',
    label: 'Background Eraser',
    cursor: 'crosshair',
    onPointerDown: (e, ctx) => {
        if (e.button !== 0) return;
        const store = ctx.getStore();
        const layer = store.layers.find(l => l.id === store.activeLayerId);
        if (!layer) return;
        const w = layer.canvas.width;
        const h = layer.canvas.height;
        const start = { x: e.canvasX, y: e.canvasY };
        const cx = Math.floor(start.x);
        const cy = Math.floor(start.y);

        stroke.last = start;
        stroke.leftover = 0;
        stroke.layerId = layer.id;
        stroke.before = captureLayerRegion(layer, { x: 0, y: 0, width: w, height: h });
        stroke.bounds = makeStrokeBounds();
        stroke.selectionMask = buildSelectionMask(store.selection, w, h);

        // Pre-sample the color for 'once'.
        const img = layer.ctx.getImageData(0, 0, w, h);
        if (options.sampling === 'once') {
            if (cx >= 0 && cx < w && cy >= 0 && cy < h) {
                stroke.sampledColor = sampleColorAt(img.data, cx, cy, w);
            } else {
                stroke.sampledColor = null;
            }
        } else {
            stroke.sampledColor = null;
        }

        const size = store.brushSettings.size;
        const hardness = store.brushSettings.hardness;
        expandStrokeBounds(stroke.bounds, start.x, start.y, size / 2);
        stampSegment(layer, start, start, size, hardness, store.secondaryColor);
    },
    onPointerMove: (e, ctx) => {
        if (!stroke.last || !stroke.layerId) return;
        const store = ctx.getStore();
        const layer = store.layers.find(l => l.id === stroke.layerId);
        if (!layer) return;
        const target = { x: e.canvasX, y: e.canvasY };
        const size = store.brushSettings.size;
        const hardness = store.brushSettings.hardness;
        stampSegment(layer, stroke.last, target, size, hardness, store.secondaryColor);
        stroke.last = target;
    },
    onPointerUp: (_e, ctx) => {
        if (stroke.layerId && stroke.before) {
            const store = ctx.getStore();
            const layer = store.layers.find(l => l.id === stroke.layerId);
            if (layer) {
                const rect = strokeBoundsToRect(stroke.bounds, layer.canvas.width, layer.canvas.height)
                    ?? { x: 0, y: 0, width: layer.canvas.width, height: layer.canvas.height };
                const beforeCropped = cropImageData(stroke.before, rect.x, rect.y, rect.width, rect.height);
                store.commitHistory(createPixelHistoryAction(layer, rect, beforeCropped, 'Background Eraser'));
            }
        }
        stroke.last = null;
        stroke.layerId = null;
        stroke.leftover = 0;
        stroke.before = null;
        stroke.sampledColor = null;
        stroke.selectionMask = null;
        stroke.bounds = makeStrokeBounds();
    },
};

registerTool(backgroundEraserTool);
