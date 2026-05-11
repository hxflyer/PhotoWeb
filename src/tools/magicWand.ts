import type { Tool, ToolPointerEvent } from './Tool';
import { registerTool } from './registry';
import { commitSelectionOperation, resolveSelectionOp } from './selectionModifiers';
import { beginSelectionInteraction, previewSelectionMove, type SelectionMoveAnchor } from './selectionMove';

const DRAG_THRESHOLD = 3;
const wandState: { move: SelectionMoveAnchor | null } = { move: null };

export type MagicWandSampleSize = 'point' | '3x3' | '5x5' | '11x11' | '31x31' | '51x51' | '101x101';

export interface MagicWandOptions {
    tolerance: number;
    antiAlias: boolean;
    contiguous: boolean;
    sampleAllLayers: boolean;
    /**
     * Photoshop's "Sample Size" picker. `point` reads a single pixel; the
     * NxN variants average a square window centered on the seed before
     * comparing colors. Shared semantics with the eyedropper.
     */
    sampleSize: MagicWandSampleSize;
}

export const defaultMagicWandOptions: MagicWandOptions = {
    tolerance: 32,
    antiAlias: true,
    contiguous: true,
    sampleAllLayers: false,
    sampleSize: 'point',
};

function sampleSizePixels(s: MagicWandSampleSize): number {
    switch (s) {
        case 'point': return 1;
        case '3x3': return 3;
        case '5x5': return 5;
        case '11x11': return 11;
        case '31x31': return 31;
        case '51x51': return 51;
        case '101x101': return 101;
    }
}

function averageSeedColor(
    data: Uint8ClampedArray,
    width: number,
    height: number,
    seedX: number,
    seedY: number,
    size: number,
): { r: number; g: number; b: number; a: number } {
    if (size <= 1) {
        const i = (seedY * width + seedX) * 4;
        return { r: data[i], g: data[i + 1], b: data[i + 2], a: data[i + 3] };
    }
    const half = (size - 1) / 2;
    let r = 0, g = 0, b = 0, a = 0, n = 0;
    for (let dy = -half; dy <= half; dy++) {
        const y = seedY + dy;
        if (y < 0 || y >= height) continue;
        for (let dx = -half; dx <= half; dx++) {
            const x = seedX + dx;
            if (x < 0 || x >= width) continue;
            const i = (y * width + x) * 4;
            r += data[i]; g += data[i + 1]; b += data[i + 2]; a += data[i + 3];
            n++;
        }
    }
    if (n === 0) {
        const i = (seedY * width + seedX) * 4;
        return { r: data[i], g: data[i + 1], b: data[i + 2], a: data[i + 3] };
    }
    return { r: r / n, g: g / n, b: b / n, a: a / n };
}

let options: MagicWandOptions = { ...defaultMagicWandOptions };

export function setMagicWandOptions(next: Partial<MagicWandOptions>): void {
    options = { ...options, ...next };
}

export function getMagicWandOptions(): MagicWandOptions {
    return { ...options };
}

export function sampleSourceImageData(
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

function applyAntiAlias(mask: Uint8ClampedArray, width: number, height: number): Uint8ClampedArray {
    const next = new Uint8ClampedArray(mask);
    const isSelected = (x: number, y: number) => x >= 0 && y >= 0 && x < width && y < height && mask[y * width + x] === 255;

    for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
            const idx = y * width + x;
            if (mask[idx]) continue;
            if (isSelected(x - 1, y) || isSelected(x + 1, y) || isSelected(x, y - 1) || isSelected(x, y + 1)) {
                next[idx] = 96;
            }
        }
    }

    return next;
}

function colorMatchToSeed(
    data: Uint8ClampedArray,
    pi: number,
    seedR: number,
    seedG: number,
    seedB: number,
    seedA: number,
    tolerance: number,
): boolean {
    // Photoshop compares RGB only — alpha is bucketed into opaque-vs-clear
    // so semi-transparent and fully-opaque red still match each other, but
    // opaque red and fully-transparent pixels do not.
    const pixelOpaque = data[pi + 3] > 0;
    const seedOpaque = seedA > 0;
    if (pixelOpaque !== seedOpaque) return false;
    return (
        Math.abs(data[pi] - seedR) <= tolerance &&
        Math.abs(data[pi + 1] - seedG) <= tolerance &&
        Math.abs(data[pi + 2] - seedB) <= tolerance
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
    if (seedX < 0 || seedX >= width || seedY < 0 || seedY >= height) return mask;
    const seedSize = sampleSizePixels(opt.sampleSize);
    const seedColor = averageSeedColor(data, width, height, seedX, seedY, seedSize);
    const { r: sr, g: sg, b: sb, a: sa } = seedColor;
    if (opt.contiguous) {
        const stack: number[] = [seedX, seedY];
        while (stack.length) {
            const y = stack.pop()!;
            const x = stack.pop()!;
            if (x < 0 || x >= width || y < 0 || y >= height) continue;
            const idx = (y * width + x);
            if (mask[idx]) continue;
            const di = idx * 4;
            if (!colorMatchToSeed(data, di, sr, sg, sb, sa, opt.tolerance)) continue;
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
                if (colorMatchToSeed(data, idx * 4, sr, sg, sb, sa, opt.tolerance)) {
                    mask[idx] = 255;
                }
            }
        }
    }
    return opt.antiAlias ? applyAntiAlias(mask, width, height) : mask;
}

function p(e: ToolPointerEvent) { return { x: Math.floor(e.canvasX), y: Math.floor(e.canvasY) }; }

export const magicWandTool: Tool = {
    id: 'magic-wand',
    label: 'Magic Wand',
    cursor: 'crosshair',
    onPointerDown: (e, ctx) => {
        if (e.button !== 0) return;
        const store = ctx.getStore();
        wandState.move = null;
        const decision = beginSelectionInteraction(e, store.selection, () => store.clearSelection());
        if (decision.kind === 'move') {
            wandState.move = decision.move;
            return;
        }
        const { layers, activeLayerId, width, height } = store;
        const active = layers.find(l => l.id === activeLayerId);
        if (!active) return;
        const image = sampleSourceImageData(layers, width, height, options.sampleAllLayers, active.canvas);
        if (!image) return;
        const seed = p(e);
        const mask = buildMagicWandMask(image, seed.x, seed.y, options);
        if (!mask.some(Boolean)) return;

        const op = resolveSelectionOp(e.shift, e.alt || e.meta || e.ctrl);
        commitSelectionOperation(store, {
            path: [],
            type: 'lasso',
            mask: { data: mask, width, height },
        }, op);
    },
    onPointerMove: (e) => {
        if (!wandState.move) return;
        const dx = e.canvasX - wandState.move.anchor.x;
        const dy = e.canvasY - wandState.move.anchor.y;
        if (Math.hypot(dx, dy) < DRAG_THRESHOLD) return;
        previewSelectionMove(wandState.move, dx, dy);
    },
    onPointerUp: (e) => {
        if (!wandState.move) return;
        const dx = e.canvasX - wandState.move.anchor.x;
        const dy = e.canvasY - wandState.move.anchor.y;
        if (Math.hypot(dx, dy) >= DRAG_THRESHOLD) previewSelectionMove(wandState.move, dx, dy);
        wandState.move = null;
    },
};

registerTool(magicWandTool);
