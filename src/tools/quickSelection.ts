import type { Tool, ToolPointerEvent } from './Tool';
import { registerTool } from './registry';
import { buildMagicWandMask, sampleSourceImageData } from './magicWand';
import { commitSelectionOperation, resolveSelectionOp, type SelectionOp } from './selectionModifiers';

export interface QuickSelectionOptions {
    size: number;
    sampleAllLayers: boolean;
    autoEnhance: boolean;
}

const options: QuickSelectionOptions = { size: 30, sampleAllLayers: false, autoEnhance: true };

export function setQuickSelectionOptions(next: Partial<QuickSelectionOptions>): void {
    Object.assign(options, next);
}

export function getQuickSelectionOptions(): QuickSelectionOptions {
    return { ...options };
}

interface QSState {
    mask: Uint8ClampedArray | null;
    width: number;
    height: number;
    image: ImageData | null;
    layerId: string | null;
    op: SelectionOp;
}

const state: QSState = { mask: null, width: 0, height: 0, image: null, layerId: null, op: 'new' };

function p(e: ToolPointerEvent) { return { x: Math.floor(e.canvasX), y: Math.floor(e.canvasY) }; }

function mergeMask(target: Uint8ClampedArray, partial: Uint8ClampedArray): void {
    for (let i = 0; i < partial.length; i++) {
        if (partial[i] > target[i]) target[i] = partial[i];
    }
}

function enhanceMask(mask: Uint8ClampedArray, width: number, height: number): Uint8ClampedArray {
    const next = new Uint8ClampedArray(mask);
    const selectedNeighborCount = (x: number, y: number) => {
        let count = 0;
        for (let yy = y - 1; yy <= y + 1; yy++) {
            for (let xx = x - 1; xx <= x + 1; xx++) {
                if (xx === x && yy === y) continue;
                if (xx < 0 || yy < 0 || xx >= width || yy >= height) continue;
                if (mask[yy * width + xx]) count++;
            }
        }
        return count;
    };

    for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
            const idx = y * width + x;
            if (mask[idx] && selectedNeighborCount(x, y) <= 1) next[idx] = 0;
            if (!mask[idx] && selectedNeighborCount(x, y) >= 6) next[idx] = 255;
        }
    }

    return next;
}

function addBrushSelection(seed: { x: number; y: number }): void {
    if (!state.mask || !state.image) return;
    const radius = Math.max(1, Math.floor(options.size / 2));
    const step = Math.max(1, Math.floor(radius / 2));
    const seeds: { x: number; y: number }[] = [seed];

    for (let dy = -radius; dy <= radius; dy += step) {
        for (let dx = -radius; dx <= radius; dx += step) {
            if ((dx * dx) + (dy * dy) > radius * radius) continue;
            const x = seed.x + dx;
            const y = seed.y + dy;
            if (x < 0 || x >= state.width || y < 0 || y >= state.height) continue;
            seeds.push({ x, y });
        }
    }

    for (const s of seeds) {
        const partial = buildMagicWandMask(state.image, s.x, s.y, {
            tolerance: 24,
            antiAlias: options.autoEnhance,
            contiguous: true,
            sampleAllLayers: false,
        });
        mergeMask(state.mask, partial);
    }
}

function flushMaskToSelection(ctx: Parameters<NonNullable<Tool['onPointerUp']>>[1]): void {
    if (!state.mask) return;
    const mask = options.autoEnhance ? enhanceMask(state.mask, state.width, state.height) : state.mask;
    if (!mask.some(Boolean)) return;
    commitSelectionOperation(ctx.getStore(), {
        path: [],
        type: 'lasso',
        mask: { data: mask, width: state.width, height: state.height },
    }, state.op);
}

export const quickSelectionTool: Tool = {
    id: 'quick-selection',
    label: 'Quick Selection',
    cursor: 'crosshair',
    onPointerDown: (e, ctx) => {
        if (e.button !== 0) return;
        const store = ctx.getStore();
        const active = store.layers.find(l => l.id === store.activeLayerId);
        if (!active) return;
        state.image = sampleSourceImageData(store.layers, store.width, store.height, options.sampleAllLayers, active.canvas);
        if (!state.image) return;
        state.width = store.width;
        state.height = store.height;
        state.layerId = active.id;
        state.op = resolveSelectionOp(e.shift, e.alt || e.meta || e.ctrl);
        state.mask = new Uint8ClampedArray(state.width * state.height);
        addBrushSelection(p(e));
    },
    onPointerMove: (e) => {
        if (!state.mask || !state.image) return;
        if (e.buttons === 0) return;
        const seed = p(e);
        if (seed.x < 0 || seed.x >= state.width || seed.y < 0 || seed.y >= state.height) return;
        addBrushSelection(seed);
    },
    onPointerUp: (_e, ctx) => {
        if (!state.mask) return;
        flushMaskToSelection(ctx);
        state.mask = null;
        state.image = null;
    },
};

registerTool(quickSelectionTool);
