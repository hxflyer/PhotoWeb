import type { Tool, ToolPointerEvent } from './Tool';
import { registerTool } from './registry';
import { buildSelectionMask } from '../filters/selectionMask';
import {
    captureLayerRegion, createPixelHistoryAction, cropImageData,
} from '../core/history';

export interface RedEyeOptions {
    pupilSize: number;    // 0-100 (% of click radius)
    darkenAmount: number; // 0-100
}

let options: RedEyeOptions = {
    pupilSize: 50,
    darkenAmount: 50,
};

export function setRedEyeOptions(next: Partial<RedEyeOptions>): void {
    options = { ...options, ...next };
}

export function getRedEyeOptions(): RedEyeOptions {
    return { ...options };
}

function p(e: ToolPointerEvent) { return { x: Math.round(e.canvasX), y: Math.round(e.canvasY) }; }

function isRedEyePixel(r: number, g: number, b: number, a: number): boolean {
    if (a === 0) return false;
    return r > g + 30 && r > b + 30 && r > 100;
}

/**
 * Red-eye correction: within a soft-edged disc of pupilSize radius around the
 * click, find pixels that match red-eye criteria (r > g+30 && r > b+30 && r > 100)
 * and replace them with a desaturated, darkened version.
 *
 * For natural pupils, we set saturation to 0 (grey) by collapsing R/G/B to
 * the luminance value, then scale that luminance by (1 - darkenAmount/100).
 * A soft disc mask feathers the edge.
 */
function applyRedEye(
    layer: import('../core/Layer').Layer,
    cx: number,
    cy: number,
    radius: number,
    selectionMask: ImageData | null,
): { rect: { x: number; y: number; width: number; height: number } | null } {
    const w = layer.canvas.width;
    const h = layer.canvas.height;
    const r = Math.max(1, radius);
    const minX = Math.max(0, Math.floor(cx - r));
    const minY = Math.max(0, Math.floor(cy - r));
    const maxX = Math.min(w - 1, Math.ceil(cx + r));
    const maxY = Math.min(h - 1, Math.ceil(cy + r));
    const bw = maxX - minX + 1;
    const bh = maxY - minY + 1;
    if (bw <= 0 || bh <= 0) return { rect: null };

    const img = layer.ctx.getImageData(minX, minY, bw, bh);
    const data = img.data;
    const sel = selectionMask?.data;
    const darken = 1 - Math.max(0, Math.min(100, options.darkenAmount)) / 100;
    const softInner = r * 0.7;
    const fade = Math.max(0.001, r - softInner);

    let touched = 0;
    for (let yy = 0; yy < bh; yy++) {
        for (let xx = 0; xx < bw; xx++) {
            const x = minX + xx;
            const y = minY + yy;
            const dx = x - cx;
            const dy = y - cy;
            const d = Math.hypot(dx, dy);
            if (d > r) continue;
            if (sel) {
                const gi = (y * w + x) * 4;
                if (sel[gi + 3] === 0) continue;
            }
            const fi = (yy * bw + xx) * 4;
            const rr = data[fi];
            const gg = data[fi + 1];
            const bb = data[fi + 2];
            const aa = data[fi + 3];
            if (!isRedEyePixel(rr, gg, bb, aa)) continue;
            let alpha = 1;
            if (d > softInner) {
                alpha = Math.max(0, 1 - (d - softInner) / fade);
            }
            if (alpha <= 0) continue;
            // Luminance (Rec. 709 weights), then darken.
            const lum = 0.2126 * rr + 0.7152 * gg + 0.0722 * bb;
            const grey = Math.max(0, Math.min(255, Math.round(lum * darken)));
            data[fi]     = Math.round(grey * alpha + rr * (1 - alpha));
            data[fi + 1] = Math.round(grey * alpha + gg * (1 - alpha));
            data[fi + 2] = Math.round(grey * alpha + bb * (1 - alpha));
            touched++;
        }
    }
    if (touched === 0) return { rect: null };
    layer.ctx.putImageData(img, minX, minY);
    layer.markDirty(null);
    return { rect: { x: minX, y: minY, width: bw, height: bh } };
}

export const redEyeTool: Tool = {
    id: 'red-eye',
    label: 'Red Eye',
    cursor: 'crosshair',
    onPointerDown: (e, ctx) => {
        if (e.button !== 0) return;
        const store = ctx.getStore();
        const layer = store.layers.find(l => l.id === store.activeLayerId);
        if (!layer) return;
        const point = p(e);
        const w = layer.canvas.width;
        const h = layer.canvas.height;
        const before = captureLayerRegion(layer, { x: 0, y: 0, width: w, height: h });
        const baseRadius = Math.max(4, store.brushSettings.size / 2);
        const radius = baseRadius * Math.max(0.05, Math.min(1, options.pupilSize / 100)) * 2;
        // pupilSize 100% = full base radius diameter; 50% = half.
        const selectionMask = buildSelectionMask(store.selection, w, h);

        const { rect } = applyRedEye(layer, point.x, point.y, radius, selectionMask);
        if (!rect) return;
        const beforeCropped = cropImageData(before, rect.x, rect.y, rect.width, rect.height);
        store.commitHistory(createPixelHistoryAction(layer, rect, beforeCropped, 'Red Eye'));
    },
};

registerTool(redEyeTool);
