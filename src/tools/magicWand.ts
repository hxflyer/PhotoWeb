import type { Tool, ToolPointerEvent } from './Tool';
import { registerTool } from './registry';

export interface MagicWandOptions {
    tolerance: number;
    antiAlias: boolean;
    contiguous: boolean;
    sampleAllLayers: boolean;
}

export const defaultMagicWandOptions: MagicWandOptions = {
    tolerance: 32,
    antiAlias: true,
    contiguous: true,
    sampleAllLayers: false,
};

let options: MagicWandOptions = { ...defaultMagicWandOptions };

export function setMagicWandOptions(next: Partial<MagicWandOptions>): void {
    options = { ...options, ...next };
}

export function getMagicWandOptions(): MagicWandOptions {
    return { ...options };
}

function sampleSourceImageData(
    layers: { visible: boolean; canvas: HTMLCanvasElement }[],
    width: number,
    height: number,
    sampleAll: boolean,
    activeCanvas: HTMLCanvasElement,
): ImageData | null {
    if (sampleAll) {
        const merged = document.createElement('canvas');
        merged.width = width;
        merged.height = height;
        const ctx = merged.getContext('2d');
        if (!ctx) return null;
        layers.forEach(l => {
            if (l.visible) ctx.drawImage(l.canvas, 0, 0);
        });
        return ctx.getImageData(0, 0, width, height);
    }
    const ctx = activeCanvas.getContext('2d');
    if (!ctx) return null;
    return ctx.getImageData(0, 0, width, height);
}

function colorMatch(a: Uint8ClampedArray, ai: number, b: Uint8ClampedArray, bi: number, tolerance: number): boolean {
    return (
        Math.abs(a[ai] - b[bi]) <= tolerance &&
        Math.abs(a[ai + 1] - b[bi + 1]) <= tolerance &&
        Math.abs(a[ai + 2] - b[bi + 2]) <= tolerance &&
        Math.abs(a[ai + 3] - b[bi + 3]) <= tolerance
    );
}

export function buildMagicWandMask(
    image: ImageData,
    seedX: number,
    seedY: number,
    opt: MagicWandOptions,
): Uint8ClampedArray {
    const { width, height, data } = image;
    const mask = new Uint8ClampedArray(width * height);
    const seed = (seedY * width + seedX) * 4;
    if (opt.contiguous) {
        const stack: number[] = [seedX, seedY];
        while (stack.length) {
            const y = stack.pop()!;
            const x = stack.pop()!;
            if (x < 0 || x >= width || y < 0 || y >= height) continue;
            const idx = (y * width + x);
            if (mask[idx]) continue;
            const di = idx * 4;
            if (!colorMatch(data, di, data, seed, opt.tolerance)) continue;
            mask[idx] = 255;
            stack.push(x + 1, y);
            stack.push(x - 1, y);
            stack.push(x, y + 1);
            stack.push(x, y - 1);
        }
    } else {
        for (let y = 0; y < height; y++) {
            for (let x = 0; x < width; x++) {
                const idx = (y * width + x);
                if (colorMatch(data, idx * 4, data, seed, opt.tolerance)) {
                    mask[idx] = 255;
                }
            }
        }
    }
    return mask;
}

function p(e: ToolPointerEvent) { return { x: Math.floor(e.canvasX), y: Math.floor(e.canvasY) }; }

export const magicWandTool: Tool = {
    id: 'magic-wand',
    label: 'Magic Wand',
    cursor: 'crosshair',
    onPointerDown: (e, ctx) => {
        if (e.button !== 0) return;
        const store = ctx.getStore();
        const { layers, activeLayerId, width, height } = store;
        const active = layers.find(l => l.id === activeLayerId);
        if (!active) return;
        const image = sampleSourceImageData(layers, width, height, options.sampleAllLayers, active.canvas);
        if (!image) return;
        const seed = p(e);
        const mask = buildMagicWandMask(image, seed.x, seed.y, options);

        const path: { x: number; y: number }[] = [];
        for (let y = 0; y < height; y++) {
            for (let x = 0; x < width; x++) {
                if (mask[y * width + x]) {
                    path.push({ x, y });
                }
            }
        }
        if (path.length === 0) return;
        const op = e.shift ? 'add' : e.alt ? 'sub' : 'add';
        store.addSelectionOperation({ mode: op as 'add' | 'sub', path, type: 'lasso' });
        store.setHasSelection(true);
    },
};

registerTool(magicWandTool);
