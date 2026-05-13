import type { Tool } from './Tool';
import { registerTool } from './registry';
import { buildSelectionMask } from '../filters/selectionMask';
import {
    captureLayerRegion, createPixelHistoryAction, cropImageData,
    expandStrokeBounds, makeStrokeBounds, strokeBoundsToRect, type StrokeBounds,
} from '../core/history';
import { applyBlendModeToImageData, blendModeToCompositeOp, drawCanvasWithBlendMode, type BlendModeId } from '../core/blendModes';

export type SpotHealingType = 'proximity-match' | 'create-texture' | 'content-aware';

export interface SpotHealingOptions {
    type: SpotHealingType;
    sampleAllLayers: boolean;
    mode: BlendModeId;
}

let options: SpotHealingOptions = {
    type: 'proximity-match',
    sampleAllLayers: false,
    mode: 'normal',
};

export function setSpotHealingOptions(next: Partial<SpotHealingOptions>): void {
    options = { ...options, ...next };
}

export function getSpotHealingOptions(): SpotHealingOptions {
    return { ...options };
}

interface CompositedSource {
    width: number;
    height: number;
    data: Uint8ClampedArray;
}

function sampleAllVisibleLayers(
    layers: { visible: boolean; canvas: HTMLCanvasElement; opacity: number; blendMode: BlendModeId }[],
    width: number,
    height: number,
): CompositedSource {
    const c = document.createElement('canvas');
    c.width = width;
    c.height = height;
    const cx = c.getContext('2d')!;
    layers.forEach(l => {
        if (!l.visible) return;
        drawCanvasWithBlendMode(cx, l.canvas, l.blendMode, l.opacity ?? 1);
    });
    cx.globalAlpha = 1;
    cx.globalCompositeOperation = 'source-over';
    const img = cx.getImageData(0, 0, width, height);
    return { width, height, data: img.data };
}

interface StrokeState {
    last: { x: number; y: number } | null;
    leftover: number;
    layerId: string | null;
    before: ImageData | null;
    selectionMask: ImageData | null;
    bounds: StrokeBounds;
}

const stroke: StrokeState = {
    last: null,
    leftover: 0,
    layerId: null,
    before: null,
    selectionMask: null,
    bounds: makeStrokeBounds(),
};

/**
 * Proximity-match healing: sample a ring of pixels just outside the brush
 * radius, compute a weighted (Gaussian-by-angular-bucket) average colour,
 * and write it into the footprint with brush hardness falloff.
 *
 * Deterministic: angles are sampled in fixed buckets so the same brush
 * position on the same source always produces the same result.
 */
function computeRingColor(
    source: CompositedSource,
    cx: number,
    cy: number,
    radius: number,
): [number, number, number, number] | null {
    const { width: w, height: h, data } = source;
    const inner = radius;
    const ringPad = Math.max(2, radius * 0.25);
    const buckets = 24;

    // Per-bucket accumulators.
    let sumR = 0;
    let sumG = 0;
    let sumB = 0;
    let sumA = 0;
    let totalWeight = 0;

    for (let b = 0; b < buckets; b++) {
        const theta = (b / buckets) * Math.PI * 2;
        const cosT = Math.cos(theta);
        const sinT = Math.sin(theta);
        let bSumR = 0, bSumG = 0, bSumB = 0, bSumA = 0, bW = 0;
        // Sample at a few radii inside the ring.
        const radiusSamples = 3;
        for (let s = 0; s <= radiusSamples; s++) {
            const t = s / radiusSamples;
            const rr = inner + ringPad * t;
            const sx = Math.round(cx + cosT * rr);
            const sy = Math.round(cy + sinT * rr);
            if (sx < 0 || sx >= w || sy < 0 || sy >= h) continue;
            const di = (sy * w + sx) * 4;
            if (data[di + 3] === 0) continue;
            // Gaussian weight by radial position from the inner edge: closer
            // to the rim of the brush gets more weight (samples nearest the
            // target carry more local-tone information).
            const radialT = t;
            const weight = Math.exp(-(radialT * radialT) * 2);
            bSumR += data[di]     * weight;
            bSumG += data[di + 1] * weight;
            bSumB += data[di + 2] * weight;
            bSumA += data[di + 3] * weight;
            bW += weight;
        }
        if (bW > 0) {
            sumR += bSumR / bW;
            sumG += bSumG / bW;
            sumB += bSumB / bW;
            sumA += bSumA / bW;
            totalWeight += 1;
        }
    }

    if (totalWeight === 0) return null;
    return [
        Math.round(sumR / totalWeight),
        Math.round(sumG / totalWeight),
        Math.round(sumB / totalWeight),
        Math.round(sumA / totalWeight),
    ];
}

function applyHealStamp(
    layer: import('../core/Layer').Layer,
    source: CompositedSource,
    cx: number,
    cy: number,
    radius: number,
    hardness: number,
    selectionMask: ImageData | null,
): void {
    const w = layer.canvas.width;
    const h = layer.canvas.height;
    const r = Math.max(0.5, radius);
    const minX = Math.max(0, Math.floor(cx - r));
    const minY = Math.max(0, Math.floor(cy - r));
    const maxX = Math.min(w - 1, Math.ceil(cx + r));
    const maxY = Math.min(h - 1, Math.ceil(cy + r));
    const bw = maxX - minX + 1;
    const bh = maxY - minY + 1;
    if (bw <= 0 || bh <= 0) return;

    const ringColor = computeRingColor(source, cx, cy, r);
    if (!ringColor) return;

    const sel = selectionMask?.data;
    const hardRadius = r * Math.max(0, Math.min(1, hardness));
    const fadeBand = Math.max(0.001, r - hardRadius);

    // Read existing layer pixels (the destination).
    const dstImg = layer.ctx.getImageData(minX, minY, bw, bh);
    const dstData = dstImg.data;

    // Build the "source patch" that we'll write — a constant ring colour, with
    // alpha modulated by brush footprint + selection.
    const srcPatch = new ImageData(bw, bh);
    const srcData = srcPatch.data;

    for (let y = minY; y <= maxY; y++) {
        for (let x = minX; x <= maxX; x++) {
            const dx = x - cx;
            const dy = y - cy;
            const d = Math.hypot(dx, dy);
            if (d > r) continue;
            let alpha = 1;
            if (d > hardRadius) {
                alpha = Math.max(0, 1 - (d - hardRadius) / fadeBand);
            }
            const baseA = Math.round(alpha * 255);
            if (baseA === 0) continue;

            let selA = 255;
            if (sel) {
                const di = (y * w + x) * 4;
                selA = sel[di + 3];
                if (selA === 0) continue;
            }

            const localIdx = ((y - minY) * bw + (x - minX)) * 4;
            srcData[localIdx]     = ringColor[0];
            srcData[localIdx + 1] = ringColor[1];
            srcData[localIdx + 2] = ringColor[2];
            srcData[localIdx + 3] = Math.round((baseA * selA) / 255);
        }
    }

    // For non-native blend modes, compute pixels manually.
    const nativeOp = blendModeToCompositeOp(options.mode);
    if (nativeOp) {
        const tmp = document.createElement('canvas');
        tmp.width = bw;
        tmp.height = bh;
        const tctx = tmp.getContext('2d');
        if (!tctx) return;
        tctx.putImageData(srcPatch, 0, 0);
        layer.ctx.save();
        layer.ctx.globalCompositeOperation = nativeOp;
        layer.ctx.drawImage(tmp, minX, minY);
        layer.ctx.restore();
    } else {
        const blended = applyBlendModeToImageData(srcPatch, dstImg, options.mode);
        // Compose blended back over the destination weighted by srcPatch alpha
        // (so feathered edges of the brush fall off cleanly).
        const out = new ImageData(bw, bh);
        const o = out.data;
        const a = blended.data;
        const b = dstData;
        const sa = srcData;
        for (let i = 0; i < o.length; i += 4) {
            const w0 = sa[i + 3] / 255;
            const w1 = 1 - w0;
            o[i]     = Math.round(a[i]     * w0 + b[i]     * w1);
            o[i + 1] = Math.round(a[i + 1] * w0 + b[i + 1] * w1);
            o[i + 2] = Math.round(a[i + 2] * w0 + b[i + 2] * w1);
            o[i + 3] = Math.round(a[i + 3] * w0 + b[i + 3] * w1);
        }
        layer.ctx.putImageData(out, minX, minY);
    }
    layer.markDirty(null);
}

function stampSegment(
    layer: import('../core/Layer').Layer,
    source: CompositedSource,
    from: { x: number; y: number },
    to: { x: number; y: number },
    size: number,
    hardness: number,
): void {
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
        applyHealStamp(layer, source, pos.x, pos.y, radius, hardness, stroke.selectionMask);
        expandStrokeBounds(stroke.bounds, pos.x, pos.y, radius);
    }
}

function buildSource(store: import('../store/types').EditorStore, layer: import('../core/Layer').Layer, w: number, h: number): CompositedSource {
    if (options.sampleAllLayers) {
        return sampleAllVisibleLayers(store.layers, w, h);
    }
    const img = layer.ctx.getImageData(0, 0, w, h);
    return { width: w, height: h, data: img.data };
}

export const spotHealingTool: Tool = {
    id: 'spot-healing',
    label: 'Spot Healing Brush',
    cursor: 'crosshair',
    onPointerDown: (e, ctx) => {
        if (e.button !== 0) return;
        const store = ctx.getStore();
        const layer = store.layers.find(l => l.id === store.activeLayerId);
        if (!layer) return;
        const w = layer.canvas.width;
        const h = layer.canvas.height;
        const start = { x: e.canvasX, y: e.canvasY };
        stroke.last = start;
        stroke.leftover = 0;
        stroke.layerId = layer.id;
        stroke.before = captureLayerRegion(layer, { x: 0, y: 0, width: w, height: h });
        stroke.bounds = makeStrokeBounds();
        stroke.selectionMask = buildSelectionMask(store.selection, w, h);

        // Snapshot the source *before* the first stamp so subsequent stamps in
        // the same stroke all draw from the unaltered source (sample-all builds
        // a composite of the visible stack; current-layer reads from a snapshot
        // captured below).
        const source = buildSource(store, layer, w, h);

        const size = store.brushSettings.size;
        const hardness = store.brushSettings.hardness;
        expandStrokeBounds(stroke.bounds, start.x, start.y, size / 2);
        if (options.type === 'proximity-match') {
            stampSegment(layer, source, start, start, size, hardness);
        }
    },
    onPointerMove: (e, ctx) => {
        if (!stroke.last || !stroke.layerId) return;
        const store = ctx.getStore();
        const layer = store.layers.find(l => l.id === stroke.layerId);
        if (!layer) return;
        const target = { x: e.canvasX, y: e.canvasY };
        if (options.type === 'proximity-match') {
            // Re-read the source each move segment so ring samples reflect any
            // healing already done earlier in the stroke — same convention as
            // Clone Stamp's continuous source.
            const source = buildSource(store, layer, layer.canvas.width, layer.canvas.height);
            const size = store.brushSettings.size;
            const hardness = store.brushSettings.hardness;
            stampSegment(layer, source, stroke.last, target, size, hardness);
        }
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
                store.commitHistory(createPixelHistoryAction(layer, rect, beforeCropped, 'Spot Healing Brush'));
            }
        }
        stroke.last = null;
        stroke.layerId = null;
        stroke.leftover = 0;
        stroke.before = null;
        stroke.selectionMask = null;
        stroke.bounds = makeStrokeBounds();
    },
};

registerTool(spotHealingTool);
