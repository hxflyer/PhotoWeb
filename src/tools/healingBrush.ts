import type { Tool, ToolPointerEvent } from './Tool';
import { registerTool } from './registry';
import { buildSelectionMask } from '../filters/selectionMask';
import {
    captureLayerRegion, createPixelHistoryAction, cropImageData,
    expandStrokeBounds, makeStrokeBounds, strokeBoundsToRect, type StrokeBounds,
} from '../core/history';
import { applyBlendModeToImageData, blendModeToCompositeOp, type BlendModeId } from '../core/blendModes';

export type HealingBrushSource = 'sampled' | 'pattern';

export interface HealingBrushOptions {
    aligned: boolean;
    mode: BlendModeId;
    sampleAllLayers: boolean;
    /**
     * Photoshop's Source picker. `sampled` = Alt-click sets the source
     * patch (current behavior). `pattern` = use the active pattern preset
     * as the source for each stamp.
     */
    source: HealingBrushSource;
    /**
     * Photoshop's Diffusion (1-7). Wider diffusion radius produces a softer,
     * more blended healed boundary. Currently informational; the heal blend
     * already feathers at the brush hardness edge, so larger values tighten
     * by scaling the spatial mean-shift sigma.
     */
    diffusion: number;
}

let options: HealingBrushOptions = {
    aligned: true,
    mode: 'normal',
    sampleAllLayers: false,
    source: 'sampled',
    diffusion: 5,
};

export function setHealingBrushOptions(next: Partial<HealingBrushOptions>): void {
    options = { ...options, ...next };
}

export function getHealingBrushOptions(): HealingBrushOptions {
    return { ...options };
}

interface CompositedSource {
    width: number;
    height: number;
    data: Uint8ClampedArray;
}

function sampleAllVisibleLayers(
    layers: { visible: boolean; canvas: HTMLCanvasElement; opacity: number; blendMode: GlobalCompositeOperation }[],
    width: number,
    height: number,
): CompositedSource {
    const c = document.createElement('canvas');
    c.width = width;
    c.height = height;
    const cx = c.getContext('2d')!;
    layers.forEach(l => {
        if (!l.visible) return;
        cx.save();
        cx.globalAlpha = l.opacity ?? 1;
        cx.globalCompositeOperation = l.blendMode;
        cx.drawImage(l.canvas, 0, 0);
        cx.restore();
    });
    cx.globalAlpha = 1;
    cx.globalCompositeOperation = 'source-over';
    const img = cx.getImageData(0, 0, width, height);
    return { width, height, data: img.data };
}

interface StrokeState {
    source: { x: number; y: number } | null;   // anchor sampled by Alt-click in canvas space
    anchor: { x: number; y: number } | null;   // destination anchor (first paint click)
    last: { x: number; y: number } | null;
    leftover: number;
    layerId: string | null;
    before: ImageData | null;
    selectionMask: ImageData | null;
    bounds: StrokeBounds;
}

const stroke: StrokeState = {
    source: null,
    anchor: null,
    last: null,
    leftover: 0,
    layerId: null,
    before: null,
    selectionMask: null,
    bounds: makeStrokeBounds(),
};

export function resetHealingBrushSource(): void {
    stroke.source = null;
    stroke.anchor = null;
    stroke.last = null;
}

function p(e: ToolPointerEvent) { return { x: e.canvasX, y: e.canvasY }; }

/**
 * Mean-shift heal stamp: extract a source patch, compute the per-channel mean
 * shift from source to destination, write source-pixel + (destMean - sourceMean)
 * into the layer with brush hardness falloff and selection clipping.
 *
 * This preserves the source patch's texture (high-frequency detail) while
 * matching the destination's average tone/color (low-frequency).
 */
function applyHealStamp(
    layer: import('../core/Layer').Layer,
    source: CompositedSource,
    dstX: number,
    dstY: number,
    srcX: number,
    srcY: number,
    radius: number,
    hardness: number,
    selectionMask: ImageData | null,
): void {
    const w = layer.canvas.width;
    const h = layer.canvas.height;
    const r = Math.max(0.5, radius);
    const minX = Math.max(0, Math.floor(dstX - r));
    const minY = Math.max(0, Math.floor(dstY - r));
    const maxX = Math.min(w - 1, Math.ceil(dstX + r));
    const maxY = Math.min(h - 1, Math.ceil(dstY + r));
    const bw = maxX - minX + 1;
    const bh = maxY - minY + 1;
    if (bw <= 0 || bh <= 0) return;

    const hardRadius = r * Math.max(0, Math.min(1, hardness));
    const fadeBand = Math.max(0.001, r - hardRadius);

    const dstImg = layer.ctx.getImageData(minX, minY, bw, bh);
    const dstData = dstImg.data;
    const sel = selectionMask?.data;

    // Build source patch (raw, in source canvas coords).
    const srcMinX = Math.floor(srcX - r);
    const srcMinY = Math.floor(srcY - r);
    const srcPatch = new Uint8ClampedArray(bw * bh * 4);
    const sourceW = source.width;
    const sourceH = source.height;
    const sd = source.data;
    for (let yy = 0; yy < bh; yy++) {
        for (let xx = 0; xx < bw; xx++) {
            const sx = srcMinX + xx;
            const sy = srcMinY + yy;
            const li = (yy * bw + xx) * 4;
            if (sx < 0 || sx >= sourceW || sy < 0 || sy >= sourceH) {
                srcPatch[li] = 0; srcPatch[li + 1] = 0; srcPatch[li + 2] = 0; srcPatch[li + 3] = 0;
                continue;
            }
            const si = (sy * sourceW + sx) * 4;
            srcPatch[li]     = sd[si];
            srcPatch[li + 1] = sd[si + 1];
            srcPatch[li + 2] = sd[si + 2];
            srcPatch[li + 3] = sd[si + 3];
        }
    }

    // Compute mean RGB of destination footprint and source patch (limited to
    // the brush disc and selection clip — same support).
    let dstSumR = 0, dstSumG = 0, dstSumB = 0;
    let srcSumR = 0, srcSumG = 0, srcSumB = 0;
    let nFootprint = 0;
    for (let yy = 0; yy < bh; yy++) {
        for (let xx = 0; xx < bw; xx++) {
            const x = minX + xx;
            const y = minY + yy;
            const dx = x - dstX;
            const dy = y - dstY;
            const d = Math.hypot(dx, dy);
            if (d > r) continue;
            const fi = (yy * bw + xx) * 4;
            if (sel) {
                const gi = (y * w + x) * 4;
                if (sel[gi + 3] === 0) continue;
            }
            dstSumR += dstData[fi];
            dstSumG += dstData[fi + 1];
            dstSumB += dstData[fi + 2];
            srcSumR += srcPatch[fi];
            srcSumG += srcPatch[fi + 1];
            srcSumB += srcPatch[fi + 2];
            nFootprint++;
        }
    }
    if (nFootprint === 0) return;
    const dMeanR = dstSumR / nFootprint;
    const dMeanG = dstSumG / nFootprint;
    const dMeanB = dstSumB / nFootprint;
    const sMeanR = srcSumR / nFootprint;
    const sMeanG = srcSumG / nFootprint;
    const sMeanB = srcSumB / nFootprint;
    const shiftR = dMeanR - sMeanR;
    const shiftG = dMeanG - sMeanG;
    const shiftB = dMeanB - sMeanB;

    // Build the corrected source patch image with brush footprint alpha.
    const srcImg = new ImageData(bw, bh);
    const sData = srcImg.data;
    for (let yy = 0; yy < bh; yy++) {
        for (let xx = 0; xx < bw; xx++) {
            const x = minX + xx;
            const y = minY + yy;
            const dx = x - dstX;
            const dy = y - dstY;
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
                const gi = (y * w + x) * 4;
                selA = sel[gi + 3];
                if (selA === 0) continue;
            }

            const fi = (yy * bw + xx) * 4;
            const sr = Math.max(0, Math.min(255, srcPatch[fi]     + shiftR));
            const sg = Math.max(0, Math.min(255, srcPatch[fi + 1] + shiftG));
            const sb = Math.max(0, Math.min(255, srcPatch[fi + 2] + shiftB));
            sData[fi]     = Math.round(sr);
            sData[fi + 1] = Math.round(sg);
            sData[fi + 2] = Math.round(sb);
            sData[fi + 3] = Math.round((baseA * selA) / 255);
        }
    }

    // Compose into the destination using the requested blend mode.
    const nativeOp = blendModeToCompositeOp(options.mode);
    if (nativeOp) {
        const tmp = document.createElement('canvas');
        tmp.width = bw;
        tmp.height = bh;
        const tctx = tmp.getContext('2d');
        if (!tctx) return;
        tctx.putImageData(srcImg, 0, 0);
        layer.ctx.save();
        layer.ctx.globalCompositeOperation = nativeOp;
        layer.ctx.drawImage(tmp, minX, minY);
        layer.ctx.restore();
    } else {
        const blended = applyBlendModeToImageData(srcImg, dstImg, options.mode);
        const out = new ImageData(bw, bh);
        const o = out.data;
        const a = blended.data;
        const b = dstData;
        const sa = sData;
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
    offset: { x: number; y: number },
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
        applyHealStamp(
            layer,
            source,
            pos.x, pos.y,
            pos.x + offset.x, pos.y + offset.y,
            radius, hardness, stroke.selectionMask,
        );
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

export const healingBrushTool: Tool = {
    id: 'healing-brush',
    label: 'Healing Brush',
    cursor: 'crosshair',
    onPointerDown: (e, ctx) => {
        if (e.button !== 0) return;
        const store = ctx.getStore();
        const layer = store.layers.find(l => l.id === store.activeLayerId);
        if (!layer) return;
        const w = layer.canvas.width;
        const h = layer.canvas.height;

        // Alt/Option-click: set the source sample anchor.
        if (e.alt) {
            stroke.source = p(e);
            stroke.anchor = null;
            stroke.last = null;
            stroke.leftover = 0;
            return;
        }

        if (!stroke.source) return;

        const start = p(e);
        // Aligned: keep the (source - anchor) offset across pointer-ups. If
        // not aligned, the anchor resets each pointer-down so the source
        // restarts from the recorded sample position.
        if (!stroke.anchor || !options.aligned) stroke.anchor = start;

        stroke.last = start;
        stroke.leftover = 0;
        stroke.layerId = layer.id;
        stroke.before = captureLayerRegion(layer, { x: 0, y: 0, width: w, height: h });
        stroke.bounds = makeStrokeBounds();
        stroke.selectionMask = buildSelectionMask(store.selection, w, h);

        const offset = { x: stroke.source.x - stroke.anchor.x, y: stroke.source.y - stroke.anchor.y };
        const source = buildSource(store, layer, w, h);
        const size = store.brushSettings.size;
        const hardness = store.brushSettings.hardness;
        expandStrokeBounds(stroke.bounds, start.x, start.y, size / 2);
        stampSegment(layer, source, start, start, offset, size, hardness);
    },
    onPointerMove: (e, ctx) => {
        if (!stroke.last || !stroke.layerId || !stroke.source || !stroke.anchor) return;
        const store = ctx.getStore();
        const layer = store.layers.find(l => l.id === stroke.layerId);
        if (!layer) return;
        const target = p(e);
        const offset = { x: stroke.source.x - stroke.anchor.x, y: stroke.source.y - stroke.anchor.y };
        const source = buildSource(store, layer, layer.canvas.width, layer.canvas.height);
        const size = store.brushSettings.size;
        const hardness = store.brushSettings.hardness;
        stampSegment(layer, source, stroke.last, target, offset, size, hardness);
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
                store.commitHistory(createPixelHistoryAction(layer, rect, beforeCropped, 'Healing Brush'));
            }
        }
        stroke.last = null;
        stroke.layerId = null;
        stroke.leftover = 0;
        stroke.before = null;
        stroke.selectionMask = null;
        stroke.bounds = makeStrokeBounds();
        // When aligned is off, reset the anchor on next pointer-down by clearing it now.
        if (!options.aligned) stroke.anchor = null;
    },
};

registerTool(healingBrushTool);
