import type { Tool, ToolPointerEvent } from './Tool';
import { registerTool } from './registry';

export interface PaintBucketOptions {
    tolerance: number;
    antiAlias: boolean;
    contiguous: boolean;
    sampleAllLayers: boolean;
    opacity: number;
    mode: GlobalCompositeOperation;
}

const options: PaintBucketOptions = {
    tolerance: 32,
    antiAlias: true,
    contiguous: true,
    sampleAllLayers: false,
    opacity: 1,
    mode: 'source-over',
};

export function setPaintBucketOptions(next: Partial<PaintBucketOptions>): void {
    Object.assign(options, next);
}

function p(e: ToolPointerEvent) { return { x: Math.floor(e.canvasX), y: Math.floor(e.canvasY) }; }

function colorMatch(a: Uint8ClampedArray, ai: number, b: Uint8ClampedArray, bi: number, t: number): boolean {
    return Math.abs(a[ai] - b[bi]) <= t
        && Math.abs(a[ai + 1] - b[bi + 1]) <= t
        && Math.abs(a[ai + 2] - b[bi + 2]) <= t
        && Math.abs(a[ai + 3] - b[bi + 3]) <= t;
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
        const lctx = layer.ctx;
        const w = layer.canvas.width;
        const h = layer.canvas.height;
        const image = lctx.getImageData(0, 0, w, h);
        const data = image.data;
        const seed = (point.y * w + point.x) * 4;
        const fill = hexToRgba(store.primaryColor);

        if (options.contiguous) {
            const visited = new Uint8Array(w * h);
            const stack = [point.x, point.y];
            while (stack.length) {
                const y = stack.pop()!;
                const x = stack.pop()!;
                if (x < 0 || x >= w || y < 0 || y >= h) continue;
                const idx = y * w + x;
                if (visited[idx]) continue;
                const di = idx * 4;
                if (!colorMatch(data, di, data, seed, options.tolerance)) continue;
                visited[idx] = 1;
                data[di] = fill.r;
                data[di + 1] = fill.g;
                data[di + 2] = fill.b;
                data[di + 3] = Math.round(fill.a * options.opacity);
                stack.push(x + 1, y);
                stack.push(x - 1, y);
                stack.push(x, y + 1);
                stack.push(x, y - 1);
            }
        } else {
            for (let y = 0; y < h; y++) {
                for (let x = 0; x < w; x++) {
                    const di = (y * w + x) * 4;
                    if (colorMatch(data, di, data, seed, options.tolerance)) {
                        data[di] = fill.r;
                        data[di + 1] = fill.g;
                        data[di + 2] = fill.b;
                        data[di + 3] = Math.round(fill.a * options.opacity);
                    }
                }
            }
        }
        lctx.putImageData(image, 0, 0);
        layer.markDirty(null);
    },
};

registerTool(paintBucketTool);
