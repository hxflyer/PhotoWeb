import type { Tool, ToolPointerEvent } from './Tool';
import { registerTool } from './registry';
import { buildSelectionMask } from '../filters/selectionMask';
import { captureLayerRegion, createPixelHistoryAction } from '../core/history';

export interface MagicEraserOptions {
    tolerance: number;          // 0-255
    antiAlias: boolean;
    contiguous: boolean;
    sampleAllLayers: boolean;   // sample matches across all visible layers; write target is always the active layer
    opacity: number;            // 0-1
}

let options: MagicEraserOptions = {
    tolerance: 32,
    antiAlias: true,
    contiguous: true,
    sampleAllLayers: false,
    opacity: 1,
};

export function setMagicEraserOptions(next: Partial<MagicEraserOptions>): void {
    options = { ...options, ...next };
}

export function getMagicEraserOptions(): MagicEraserOptions {
    return { ...options };
}

function p(e: ToolPointerEvent) { return { x: Math.floor(e.canvasX), y: Math.floor(e.canvasY) }; }

function colorMatch(data: Uint8ClampedArray, di: number, ref: [number, number, number, number], t: number): boolean {
    return Math.abs(data[di]     - ref[0]) <= t
        && Math.abs(data[di + 1] - ref[1]) <= t
        && Math.abs(data[di + 2] - ref[2]) <= t
        && Math.abs(data[di + 3] - ref[3]) <= t;
}

function colorDistance(data: Uint8ClampedArray, di: number, ref: [number, number, number, number]): number {
    return Math.max(
        Math.abs(data[di]     - ref[0]),
        Math.abs(data[di + 1] - ref[1]),
        Math.abs(data[di + 2] - ref[2]),
        Math.abs(data[di + 3] - ref[3]),
    );
}

interface CompositedSource {
    width: number;
    height: number;
    data: Uint8ClampedArray;
}

function sampleAllVisibleLayers(
    layers: { visible: boolean; canvas: HTMLCanvasElement; opacity: number }[],
    width: number,
    height: number,
): CompositedSource {
    const c = document.createElement('canvas');
    c.width = width; c.height = height;
    const cx = c.getContext('2d')!;
    layers.forEach(l => {
        if (l.visible) {
            cx.globalAlpha = l.opacity ?? 1;
            cx.drawImage(l.canvas, 0, 0);
        }
    });
    cx.globalAlpha = 1;
    const img = cx.getImageData(0, 0, width, height);
    return { width, height, data: img.data };
}

/**
 * Build a 0-255 erase-alpha buffer. Same shape as Paint Bucket's
 * buildFillAlphaMask: tolerance match, contiguous flood, anti-alias edge,
 * and selection clip combined. The output is used as a destination-out mask
 * against the active layer.
 */
function buildEraseAlphaMask(
    sample: CompositedSource,
    seedX: number,
    seedY: number,
    selectionMask: ImageData | null,
): Uint8ClampedArray {
    const { width: w, height: h, data: src } = sample;
    const N = w * h;
    const eraseA = new Uint8ClampedArray(N);
    const selData = selectionMask?.data;

    if (seedX < 0 || seedX >= w || seedY < 0 || seedY >= h) return eraseA;

    const seedIdx = (seedY * w + seedX) * 4;
    const ref: [number, number, number, number] = [src[seedIdx], src[seedIdx + 1], src[seedIdx + 2], src[seedIdx + 3]];
    const tol = options.tolerance;

    if (options.contiguous) {
        const visited = new Uint8Array(N);
        const stack: number[] = [seedX, seedY];
        while (stack.length) {
            const y = stack.pop()!;
            const x = stack.pop()!;
            if (x < 0 || x >= w || y < 0 || y >= h) continue;
            const idx = y * w + x;
            if (visited[idx]) continue;
            const di = idx * 4;
            if (!colorMatch(src, di, ref, tol)) continue;
            if (selData && selData[di + 3] === 0) continue;
            visited[idx] = 1;
            const selW = selData ? selData[di + 3] : 255;
            eraseA[idx] = selW;
            stack.push(x + 1, y);
            stack.push(x - 1, y);
            stack.push(x, y + 1);
            stack.push(x, y - 1);
        }
    } else {
        for (let i = 0; i < N; i++) {
            const di = i * 4;
            if (!colorMatch(src, di, ref, tol)) continue;
            if (selData && selData[di + 3] === 0) continue;
            const selW = selData ? selData[di + 3] : 255;
            eraseA[i] = selW;
        }
    }

    if (options.antiAlias && tol > 0) {
        const softened = new Uint8ClampedArray(eraseA);
        const upper = tol * 1.5;
        const span = Math.max(1, upper - tol);
        const smoothstep = (t: number) => {
            const u = Math.max(0, Math.min(1, t));
            return u * u * (3 - 2 * u);
        };
        // BUG-14 parallel fix for Magic Eraser: at very low tolerance the AA
        // ring becomes brighter than the surrounding erase. Damp by tol/8
        // and pre-feather the selection edge by 0.5 so the AA never
        // produces a bright stripe.
        const aaStrength = Math.min(1, tol / 8);
        for (let y = 0; y < h; y++) {
            for (let x = 0; x < w; x++) {
                const idx = y * w + x;
                if (eraseA[idx]) continue;
                const di = idx * 4;
                if (selData && selData[di + 3] === 0) continue;
                let neighbors = 0;
                if (x > 0 && eraseA[idx - 1]) neighbors++;
                if (x < w - 1 && eraseA[idx + 1]) neighbors++;
                if (y > 0 && eraseA[idx - w]) neighbors++;
                if (y < h - 1 && eraseA[idx + w]) neighbors++;
                if (neighbors === 0) continue;
                const dist = colorDistance(src, di, ref);
                if (dist >= upper) continue;
                const t = 1 - smoothstep((dist - tol) / span);
                const cornerBoost = Math.min(1, neighbors / 2);
                let edgeFeather = 1;
                if (selData) {
                    const own = selData[di + 3];
                    let near = own;
                    if (x > 0) near = Math.min(near, selData[di - 4 + 3]);
                    if (x < w - 1) near = Math.min(near, selData[di + 4 + 3]);
                    if (y > 0) near = Math.min(near, selData[di - w * 4 + 3]);
                    if (y < h - 1) near = Math.min(near, selData[di + w * 4 + 3]);
                    if (near < own) edgeFeather = 0.5;
                }
                const selW = selData ? selData[di + 3] : 255;
                softened[idx] = Math.round(t * cornerBoost * aaStrength * edgeFeather * selW);
            }
        }
        return softened;
    }

    return eraseA;
}

function compositeErase(
    layerCtx: CanvasRenderingContext2D,
    width: number,
    height: number,
    eraseAlphaMask: Uint8ClampedArray,
): void {
    const maskCanvas = document.createElement('canvas');
    maskCanvas.width = width; maskCanvas.height = height;
    const mctx = maskCanvas.getContext('2d')!;
    const img = mctx.createImageData(width, height);
    const d = img.data;
    for (let i = 0, j = 0; i < eraseAlphaMask.length; i++, j += 4) {
        const m = eraseAlphaMask[i];
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
    layerCtx.drawImage(maskCanvas, 0, 0);
    layerCtx.restore();
}

export const magicEraserTool: Tool = {
    id: 'magic-eraser',
    label: 'Magic Eraser',
    cursor: 'crosshair',
    onPointerDown: (e, ctx) => {
        if (e.button !== 0) return;
        const store = ctx.getStore();
        const layer = store.layers.find(l => l.id === store.activeLayerId);
        if (!layer) return;
        if (layer.lockTransparency) return;
        const point = p(e);
        const w = layer.canvas.width;
        const h = layer.canvas.height;
        const before = captureLayerRegion(layer, { x: 0, y: 0, width: w, height: h });

        let sample: CompositedSource;
        if (options.sampleAllLayers) {
            sample = sampleAllVisibleLayers(store.layers, w, h);
        } else {
            const img = layer.ctx.getImageData(0, 0, w, h);
            sample = { width: w, height: h, data: img.data };
        }

        const selectionMask = buildSelectionMask(store.selection, w, h);
        const eraseAlpha = buildEraseAlphaMask(sample, point.x, point.y, selectionMask);

        let any = false;
        for (let i = 0; i < eraseAlpha.length; i++) if (eraseAlpha[i]) { any = true; break; }
        if (!any) return;

        compositeErase(layer.ctx, w, h, eraseAlpha);
        layer.markDirty(null);
        store.commitHistory(createPixelHistoryAction(layer, { x: 0, y: 0, width: w, height: h }, before, 'Magic Eraser'));
    },
};

registerTool(magicEraserTool);
