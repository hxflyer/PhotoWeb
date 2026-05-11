import type { Tool, ToolPointerEvent } from './Tool';
import { registerTool } from './registry';
import { buildSelectionMask } from '../filters/selectionMask';
import { blendModeToCompositeOp, applyBlendModeToImageData, type BlendModeId } from '../core/blendModes';
import { captureLayerRegion, createPixelHistoryAction } from '../core/history';
import { getPatternTile } from '../store/toolsSlice';

export type FillSource = 'foreground' | 'pattern';

export interface PaintBucketOptions {
    source: FillSource;
    tolerance: number;          // 0-255
    antiAlias: boolean;
    contiguous: boolean;
    sampleAllLayers: boolean;
    opacity: number;            // 0-1
    mode: BlendModeId;
}

let options: PaintBucketOptions = {
    source: 'foreground',
    tolerance: 32,
    antiAlias: true,
    contiguous: true,
    sampleAllLayers: false,
    opacity: 1,
    mode: 'normal',
};

export function setPaintBucketOptions(next: Partial<PaintBucketOptions>): void {
    options = { ...options, ...next };
}

export function getPaintBucketOptions(): PaintBucketOptions {
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
    // Max channel distance — same metric used by tolerance check
    return Math.max(
        Math.abs(data[di]     - ref[0]),
        Math.abs(data[di + 1] - ref[1]),
        Math.abs(data[di + 2] - ref[2]),
        Math.abs(data[di + 3] - ref[3]),
    );
}

function hexToRgba(color: string): { r: number; g: number; b: number; a: number } {
    if (color.startsWith('#')) {
        const r = parseInt(color.slice(1, 3), 16);
        const g = parseInt(color.slice(3, 5), 16);
        const b = parseInt(color.slice(5, 7), 16);
        return { r, g, b, a: 255 };
    }
    return { r: 0, g: 0, b: 0, a: 255 };
}

interface CompositedSource {
    width: number;
    height: number;
    data: Uint8ClampedArray;
}

function sampleAllVisibleLayers(layers: { visible: boolean; canvas: HTMLCanvasElement; opacity: number }[], width: number, height: number): CompositedSource {
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
 * Build a 0-255 fill alpha buffer marking which pixels should receive the fill.
 * Combines: tolerance match, contiguous flood, anti-alias edge, and selection mask.
 */
function buildFillAlphaMask(
    sample: CompositedSource,
    seedX: number,
    seedY: number,
    selectionMask: ImageData | null,
): Uint8ClampedArray {
    const { width: w, height: h, data: src } = sample;
    const N = w * h;
    const fillA = new Uint8ClampedArray(N);
    const selData = selectionMask?.data;

    if (seedX < 0 || seedX >= w || seedY < 0 || seedY >= h) return fillA;

    // If selection exists and seed is outside it (alpha < 1), still allow fill
    // anywhere matching within the selection — PS behavior is to clip to selection
    // regardless of seed position. Seed determines color, selection clips area.
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
            // selection clip
            if (selData && selData[di + 3] === 0) continue;
            visited[idx] = 1;
            // Pixel is filled. If selection is partial, weight by selection alpha.
            const selW = selData ? selData[di + 3] : 255;
            fillA[idx] = selW;
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
            fillA[i] = selW;
        }
    }

    if (options.antiAlias && tol > 0) {
        // Soften edges so the user does not see a 1-pixel "stair-step" or a
        // visible ring at low tolerance. Strategy: for every pixel within 1 px
        // of the boundary that is not yet filled, weight the alpha by color
        // distance using a smoothstep falloff over [tol, tol*1.5]. This
        // produces a continuous gradient rather than the previous abrupt ring.
        const softened = new Uint8ClampedArray(fillA);
        const upper = tol * 1.5;
        const span = Math.max(1, upper - tol);
        const smoothstep = (t: number) => {
            const u = Math.max(0, Math.min(1, t));
            return u * u * (3 - 2 * u);
        };
        for (let y = 0; y < h; y++) {
            for (let x = 0; x < w; x++) {
                const idx = y * w + x;
                if (fillA[idx]) continue;
                const di = idx * 4;
                if (selData && selData[di + 3] === 0) continue;
                let neighbors = 0;
                if (x > 0 && fillA[idx - 1]) neighbors++;
                if (x < w - 1 && fillA[idx + 1]) neighbors++;
                if (y > 0 && fillA[idx - w]) neighbors++;
                if (y < h - 1 && fillA[idx + w]) neighbors++;
                if (neighbors === 0) continue;
                const dist = colorDistance(src, di, ref);
                if (dist >= upper) continue;
                // dist in [0..tol] is already inside the tolerance-matched flood
                // (handled above). Here dist in (tol, upper). Smoothstep falloff.
                const t = 1 - smoothstep((dist - tol) / span);
                // Slightly weight by neighbor count (1-4) to bias the corner
                // pixels toward higher alpha — kills the perceived ring.
                const cornerBoost = Math.min(1, neighbors / 2);
                const selW = selData ? selData[di + 3] : 255;
                softened[idx] = Math.round(t * cornerBoost * selW);
            }
        }
        return softened;
    }

    return fillA;
}

/**
 * Composite a solid-color fill (with per-pixel alpha mask) onto the layer using
 * the selected blend mode + opacity. Custom (non-native) blend modes are walked
 * per-pixel via applyBlendModeToImageData.
 */
function compositePatternFill(
    layerCtx: CanvasRenderingContext2D,
    width: number,
    height: number,
    patternTile: HTMLCanvasElement | null,
    primary: { r: number; g: number; b: number; a: number },
    secondary: { r: number; g: number; b: number; a: number },
    fillAlphaMask: Uint8ClampedArray,
): void {
    const fillCanvas = document.createElement('canvas');
    fillCanvas.width = width; fillCanvas.height = height;
    const fctx = fillCanvas.getContext('2d')!;
    if (patternTile) {
        const tileW = patternTile.width;
        const tileH = patternTile.height;
        const tileCtx = patternTile.getContext('2d')!;
        const tileImg = tileCtx.getImageData(0, 0, tileW, tileH);
        const td = tileImg.data;
        const fillImg = fctx.createImageData(width, height);
        const fd = fillImg.data;
        for (let i = 0; i < fillAlphaMask.length; i++) {
            const m = fillAlphaMask[i];
            if (m === 0) continue;
            const x = i % width;
            const y = (i / width) | 0;
            const tx = ((x % tileW) + tileW) % tileW;
            const ty = ((y % tileH) + tileH) % tileH;
            const ti = (ty * tileW + tx) * 4;
            const j = i * 4;
            fd[j]     = td[ti];
            fd[j + 1] = td[ti + 1];
            fd[j + 2] = td[ti + 2];
            fd[j + 3] = Math.round(td[ti + 3] * (m / 255));
        }
        fctx.putImageData(fillImg, 0, 0);
    } else {
        const fillImg = fctx.createImageData(width, height);
        const fd = fillImg.data;
        const tile = 8;
        for (let y = 0; y < height; y++) {
            for (let x = 0; x < width; x++) {
                const i = y * width + x;
                const m = fillAlphaMask[i];
                if (m === 0) continue;
                const useFg = (((x / tile) | 0) + ((y / tile) | 0)) % 2 === 0;
                const c = useFg ? primary : secondary;
                const j = i * 4;
                fd[j]     = c.r;
                fd[j + 1] = c.g;
                fd[j + 2] = c.b;
                fd[j + 3] = m;
            }
        }
        fctx.putImageData(fillImg, 0, 0);
    }

    const nativeOp = blendModeToCompositeOp(options.mode);
    if (nativeOp) {
        layerCtx.save();
        layerCtx.globalAlpha = options.opacity;
        layerCtx.globalCompositeOperation = nativeOp;
        layerCtx.drawImage(fillCanvas, 0, 0);
        layerCtx.restore();
    } else {
        const src = fctx.getImageData(0, 0, width, height);
        const dst = layerCtx.getImageData(0, 0, width, height);
        const blended = applyBlendModeToImageData(src, dst, options.mode);
        layerCtx.putImageData(blended, 0, 0);
    }
}

function compositeFill(
    layerCtx: CanvasRenderingContext2D,
    width: number,
    height: number,
    fillRgba: { r: number; g: number; b: number; a: number },
    fillAlphaMask: Uint8ClampedArray,
): void {
    // Build a fill canvas with the chosen color where fillAlphaMask > 0.
    const fillCanvas = document.createElement('canvas');
    fillCanvas.width = width; fillCanvas.height = height;
    const fctx = fillCanvas.getContext('2d')!;
    const fillImg = fctx.createImageData(width, height);
    const fd = fillImg.data;
    for (let i = 0, j = 0; i < fillAlphaMask.length; i++, j += 4) {
        const m = fillAlphaMask[i];
        if (m === 0) continue;
        fd[j]     = fillRgba.r;
        fd[j + 1] = fillRgba.g;
        fd[j + 2] = fillRgba.b;
        fd[j + 3] = m;  // 0-255
    }
    fctx.putImageData(fillImg, 0, 0);

    const nativeOp = blendModeToCompositeOp(options.mode);
    if (nativeOp) {
        layerCtx.save();
        layerCtx.globalAlpha = options.opacity;
        layerCtx.globalCompositeOperation = nativeOp;
        layerCtx.drawImage(fillCanvas, 0, 0);
        layerCtx.restore();
    } else {
        // Custom blend mode: walk pixels.
        const dst = layerCtx.getImageData(0, 0, width, height);
        const blended = applyBlendModeToImageData(fillImg, dst, options.mode);
        // Blend by fillAlphaMask × opacity (combined alpha) onto dst.
        const op = options.opacity;
        const out = blended.data;
        const od = dst.data;
        for (let i = 0, j = 0; i < fillAlphaMask.length; i++, j += 4) {
            const w = (fillAlphaMask[i] / 255) * op;
            if (w === 0) continue;
            out[j]     = Math.round(od[j]     * (1 - w) + out[j]     * w);
            out[j + 1] = Math.round(od[j + 1] * (1 - w) + out[j + 1] * w);
            out[j + 2] = Math.round(od[j + 2] * (1 - w) + out[j + 2] * w);
            out[j + 3] = Math.round(od[j + 3] * (1 - w) + out[j + 3] * w);
        }
        layerCtx.putImageData(new ImageData(out, dst.width, dst.height), 0, 0);
    }
}

export const paintBucketTool: Tool = {
    id: 'fill',
    label: 'Paint Bucket',
    cursor: 'cell',
    onPointerDown: (e, ctx) => {
        if (e.button !== 0) return;
        const store = ctx.getStore();
        const layer = store.layers.find(l => l.id === store.activeLayerId);
        if (!layer) return;
        const point = p(e);
        const w = layer.canvas.width;
        const h = layer.canvas.height;
        const before = captureLayerRegion(layer, { x: 0, y: 0, width: w, height: h });

        // Sample source: active layer or all visible layers.
        let sample: CompositedSource;
        if (options.sampleAllLayers) {
            sample = sampleAllVisibleLayers(store.layers, w, h);
        } else {
            const img = layer.ctx.getImageData(0, 0, w, h);
            sample = { width: w, height: h, data: img.data };
        }

        // Selection mask (null = no selection → fill whole layer / connected region).
        const selectionMask = buildSelectionMask(store.selection, w, h);

        const fillAlpha = buildFillAlphaMask(sample, point.x, point.y, selectionMask);
        // If mask is empty, nothing to do.
        let any = false;
        for (let i = 0; i < fillAlpha.length; i++) if (fillAlpha[i]) { any = true; break; }
        if (!any) return;

        if (options.source === 'pattern') {
            const tile = store.activePatternId ? getPatternTile(store.activePatternId) : null;
            compositePatternFill(layer.ctx, w, h, tile, hexToRgba(store.primaryColor), hexToRgba(store.secondaryColor), fillAlpha);
        } else {
            const fillRgba = hexToRgba(store.primaryColor);
            compositeFill(layer.ctx, w, h, fillRgba, fillAlpha);
        }
        layer.markDirty(null);
        store.commitHistory(createPixelHistoryAction(layer, { x: 0, y: 0, width: w, height: h }, before, 'Paint Bucket'));
    },
};

registerTool(paintBucketTool);
