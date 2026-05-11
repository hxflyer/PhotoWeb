import type { OverlayRenderContext, Tool, ToolContext, ToolPointerEvent } from './Tool';
import { registerTool } from './registry';
import { buildSelectionMask } from '../filters/selectionMask';
import {
    captureLayerRegion, createPixelHistoryAction, cropImageData,
} from '../core/history';

export type PatchMode = 'source' | 'destination';

export interface PatchOptions {
    mode: PatchMode;
}

let options: PatchOptions = {
    mode: 'source',
};

export function setPatchOptions(next: Partial<PatchOptions>): void {
    options = { ...options, ...next };
}

export function getPatchOptions(): PatchOptions {
    return { ...options };
}

interface DragState {
    active: boolean;
    start: { x: number; y: number } | null;
    current: { x: number; y: number } | null;
    layerId: string | null;
    selectionMask: ImageData | null;
    selectionBounds: { x: number; y: number; width: number; height: number } | null;
}

const drag: DragState = {
    active: false,
    start: null,
    current: null,
    layerId: null,
    selectionMask: null,
    selectionBounds: null,
};

function p(e: ToolPointerEvent) { return { x: e.canvasX, y: e.canvasY }; }

function computeMaskBounds(mask: ImageData): { x: number; y: number; width: number; height: number } | null {
    const { width, height, data } = mask;
    let minX = width, minY = height, maxX = -1, maxY = -1;
    for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
            const a = data[(y * width + x) * 4 + 3];
            if (a > 0) {
                if (x < minX) minX = x;
                if (y < minY) minY = y;
                if (x > maxX) maxX = x;
                if (y > maxY) maxY = y;
            }
        }
    }
    if (maxX < minX || maxY < minY) return null;
    return { x: minX, y: minY, width: maxX - minX + 1, height: maxY - minY + 1 };
}

/**
 * Source mode (per RET-05 spec): the original selection position is the source
 * of clean pixels; the dropped position (selection + dx, dy) is the destination
 * that gets healed using the original-position pixels as source.
 * Mean-shift heal preserves the source's texture but matches the surrounding
 * destination tone (sampled from a ring outside the destination region).
 */
function applySourceModePatch(
    layer: import('../core/Layer').Layer,
    mask: ImageData,
    dx: number,
    dy: number,
    bounds: { x: number; y: number; width: number; height: number },
): void {
    const w = layer.canvas.width;
    const h = layer.canvas.height;
    const full = layer.ctx.getImageData(0, 0, w, h);
    const data = full.data;
    const original = new Uint8ClampedArray(data);
    const md = mask.data;

    // Source mean: pixels at the original position (inside the mask).
    let sSumR = 0, sSumG = 0, sSumB = 0, sN = 0;
    for (let y = bounds.y; y < bounds.y + bounds.height; y++) {
        for (let x = bounds.x; x < bounds.x + bounds.width; x++) {
            const mi = (y * w + x) * 4 + 3;
            if (md[mi] === 0) continue;
            const si = (y * w + x) * 4;
            sSumR += original[si];
            sSumG += original[si + 1];
            sSumB += original[si + 2];
            sN++;
        }
    }
    // Destination mean: pixels OUTSIDE the dropped region but in a ring around it,
    // so solid-colour patches inherit the surrounding tone rather than the dirty
    // tone they are about to overwrite.
    const dropX = bounds.x + dx;
    const dropY = bounds.y + dy;
    const ringPad = Math.max(2, Math.floor(Math.max(bounds.width, bounds.height) * 0.25));
    const ringMinX = Math.max(0, dropX - ringPad);
    const ringMinY = Math.max(0, dropY - ringPad);
    const ringMaxX = Math.min(w - 1, dropX + bounds.width + ringPad - 1);
    const ringMaxY = Math.min(h - 1, dropY + bounds.height + ringPad - 1);
    let dSumR = 0, dSumG = 0, dSumB = 0, dN = 0;
    for (let y = ringMinY; y <= ringMaxY; y++) {
        for (let x = ringMinX; x <= ringMaxX; x++) {
            const inside = x >= dropX && x < dropX + bounds.width && y >= dropY && y < dropY + bounds.height;
            if (inside) continue;
            const i = (y * w + x) * 4;
            dSumR += original[i];
            dSumG += original[i + 1];
            dSumB += original[i + 2];
            dN++;
        }
    }
    if (sN === 0 || dN === 0) return;
    const shiftR = dSumR / dN - sSumR / sN;
    const shiftG = dSumG / dN - sSumG / sN;
    const shiftB = dSumB / dN - sSumB / sN;

    // Write (original-source + shift) into the dropped position (destination).
    for (let y = 0; y < h; y++) {
        for (let x = 0; x < w; x++) {
            const mi = (y * w + x) * 4 + 3;
            const selA = md[mi];
            if (selA === 0) continue;
            const tx = x + dx;
            const ty = y + dy;
            if (tx < 0 || tx >= w || ty < 0 || ty >= h) continue;
            const si = (y * w + x) * 4;
            const ti = (ty * w + tx) * 4;
            const sR = Math.max(0, Math.min(255, original[si]     + shiftR));
            const sG = Math.max(0, Math.min(255, original[si + 1] + shiftG));
            const sB = Math.max(0, Math.min(255, original[si + 2] + shiftB));
            const w0 = selA / 255;
            const w1 = 1 - w0;
            data[ti]     = Math.round(sR * w0 + original[ti]     * w1);
            data[ti + 1] = Math.round(sG * w0 + original[ti + 1] * w1);
            data[ti + 2] = Math.round(sB * w0 + original[ti + 2] * w1);
            const sA = original[si + 3];
            data[ti + 3] = Math.max(original[ti + 3], Math.round(sA * w0));
        }
    }
    layer.ctx.putImageData(full, 0, 0);
    layer.markDirty(null);
}

/**
 * Destination mode (per RET-05 spec): the pixels at the drop position are
 * stamped onto the original-position pixels. Direct copy — no mean-shift.
 */
function applyDestinationModePatch(
    layer: import('../core/Layer').Layer,
    mask: ImageData,
    dx: number,
    dy: number,
): void {
    const w = layer.canvas.width;
    const h = layer.canvas.height;
    const full = layer.ctx.getImageData(0, 0, w, h);
    const data = full.data;
    const original = new Uint8ClampedArray(data);
    const md = mask.data;

    for (let y = 0; y < h; y++) {
        for (let x = 0; x < w; x++) {
            const mi = (y * w + x) * 4 + 3;
            const selA = md[mi];
            if (selA === 0) continue;
            // Source pixel is at the drop position (x + dx, y + dy).
            // Destination pixel is the original (x, y).
            const sx = x + dx;
            const sy = y + dy;
            if (sx < 0 || sx >= w || sy < 0 || sy >= h) continue;
            const di = (y * w + x) * 4;
            const si = (sy * w + sx) * 4;
            const sR = original[si];
            const sG = original[si + 1];
            const sB = original[si + 2];
            const sA = original[si + 3];
            const w0 = selA / 255;
            const w1 = 1 - w0;
            data[di]     = Math.round(sR * w0 + original[di]     * w1);
            data[di + 1] = Math.round(sG * w0 + original[di + 1] * w1);
            data[di + 2] = Math.round(sB * w0 + original[di + 2] * w1);
            data[di + 3] = Math.max(original[di + 3], Math.round(sA * w0));
        }
    }
    layer.ctx.putImageData(full, 0, 0);
    layer.markDirty(null);
}

function commitPatch(ctx: ToolContext): void {
    if (!drag.active || !drag.start || !drag.current || !drag.layerId || !drag.selectionMask) return;
    const store = ctx.getStore();
    const layer = store.layers.find(l => l.id === drag.layerId);
    if (!layer) return;
    const dx = Math.round(drag.current.x - drag.start.x);
    const dy = Math.round(drag.current.y - drag.start.y);
    if (dx === 0 && dy === 0) return;
    const w = layer.canvas.width;
    const h = layer.canvas.height;
    const before = captureLayerRegion(layer, { x: 0, y: 0, width: w, height: h });

    const sb = drag.selectionBounds;
    if (!sb) return;
    if (options.mode === 'source') {
        applySourceModePatch(layer, drag.selectionMask, dx, dy, sb);
    } else {
        applyDestinationModePatch(layer, drag.selectionMask, dx, dy);
    }

    // Stroke-bbox-tight history: union of selection bounds and translated bounds.
    const minX = Math.max(0, Math.min(sb.x, sb.x + dx));
    const minY = Math.max(0, Math.min(sb.y, sb.y + dy));
    const maxX = Math.min(w, Math.max(sb.x + sb.width, sb.x + sb.width + dx));
    const maxY = Math.min(h, Math.max(sb.y + sb.height, sb.y + sb.height + dy));
    const rect = { x: minX, y: minY, width: Math.max(1, maxX - minX), height: Math.max(1, maxY - minY) };
    const beforeCropped = cropImageData(before, rect.x, rect.y, rect.width, rect.height);
    store.commitHistory(createPixelHistoryAction(layer, rect, beforeCropped, options.mode === 'source' ? 'Patch (Source)' : 'Patch (Destination)'));
}

export const patchTool: Tool = {
    id: 'patch',
    label: 'Patch',
    cursor: 'crosshair',
    onPointerDown: (e, ctx) => {
        if (e.button !== 0) return;
        const store = ctx.getStore();
        if (!store.selection.hasSelection) return;
        const layer = store.layers.find(l => l.id === store.activeLayerId);
        if (!layer) return;
        const w = layer.canvas.width;
        const h = layer.canvas.height;
        const mask = buildSelectionMask(store.selection, w, h);
        if (!mask) return;
        drag.active = true;
        drag.start = p(e);
        drag.current = p(e);
        drag.layerId = layer.id;
        drag.selectionMask = mask;
        drag.selectionBounds = computeMaskBounds(mask);
    },
    onPointerMove: (e, ctx) => {
        if (!drag.active) return;
        drag.current = p(e);
        ctx.requestRender();
    },
    onPointerUp: (_e, ctx) => {
        commitPatch(ctx);
        drag.active = false;
        drag.start = null;
        drag.current = null;
        drag.layerId = null;
        drag.selectionMask = null;
        drag.selectionBounds = null;
        ctx.requestRender();
    },
    renderOverlay: (overlay) => {
        if (!drag.active || !drag.start || !drag.current || !drag.selectionMask) return;
        const dx = drag.current.x - drag.start.x;
        const dy = drag.current.y - drag.start.y;
        if (dx === 0 && dy === 0) return;
        renderPatchPreview(overlay, drag.selectionMask, dx, dy);
    },
};

function renderPatchPreview(overlay: OverlayRenderContext, mask: ImageData, dx: number, dy: number): void {
    // Render a translucent ghost of the selection shape translated by (dx,dy).
    const tmp = document.createElement('canvas');
    tmp.width = mask.width;
    tmp.height = mask.height;
    const tctx = tmp.getContext('2d');
    if (!tctx) return;
    const img = tctx.createImageData(mask.width, mask.height);
    for (let i = 0; i < mask.data.length; i += 4) {
        const a = mask.data[i + 3];
        if (a === 0) continue;
        img.data[i]     = 30;
        img.data[i + 1] = 144;
        img.data[i + 2] = 255;
        img.data[i + 3] = Math.round(a * 0.35);
    }
    tctx.putImageData(img, 0, 0);
    overlay.ctx.save();
    overlay.ctx.drawImage(tmp, dx, dy);
    overlay.ctx.restore();
}

registerTool(patchTool);
