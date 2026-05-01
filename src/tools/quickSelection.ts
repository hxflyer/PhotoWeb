import type { Tool, ToolPointerEvent } from './Tool';
import { registerTool } from './registry';
import { buildMagicWandMask } from './magicWand';

export interface QuickSelectionOptions {
    size: number;
    autoEnhance: boolean;
}

const options: QuickSelectionOptions = { size: 30, autoEnhance: true };

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
}

const state: QSState = { mask: null, width: 0, height: 0, image: null, layerId: null };

function p(e: ToolPointerEvent) { return { x: Math.floor(e.canvasX), y: Math.floor(e.canvasY) }; }

function flushMaskToSelection(ctx: { getStore: () => { addSelectionOperation: (op: { mode: 'add' | 'sub'; path: { x: number; y: number }[]; type: 'rect' | 'circle' | 'lasso' | 'lasso-poly' }) => void; setHasSelection: (b: boolean) => void } }): void {
    if (!state.mask) return;
    const path: { x: number; y: number }[] = [];
    for (let y = 0; y < state.height; y++) {
        for (let x = 0; x < state.width; x++) {
            if (state.mask[y * state.width + x]) path.push({ x, y });
        }
    }
    if (!path.length) return;
    ctx.getStore().addSelectionOperation({ mode: 'add', path, type: 'lasso' });
    ctx.getStore().setHasSelection(true);
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
        const ictx = active.canvas.getContext('2d');
        if (!ictx) return;
        state.image = ictx.getImageData(0, 0, store.width, store.height);
        state.width = store.width;
        state.height = store.height;
        state.layerId = active.id;
        state.mask = new Uint8ClampedArray(state.width * state.height);
        const seed = p(e);
        const partial = buildMagicWandMask(state.image, seed.x, seed.y, {
            tolerance: 24,
            antiAlias: false,
            contiguous: true,
            sampleAllLayers: false,
        });
        for (let i = 0; i < partial.length; i++) {
            if (partial[i]) state.mask[i] = 255;
        }
    },
    onPointerMove: (e) => {
        if (!state.mask || !state.image) return;
        if (e.buttons === 0) return;
        const seed = p(e);
        if (seed.x < 0 || seed.x >= state.width || seed.y < 0 || seed.y >= state.height) return;
        const partial = buildMagicWandMask(state.image, seed.x, seed.y, {
            tolerance: 24,
            antiAlias: false,
            contiguous: true,
            sampleAllLayers: false,
        });
        for (let i = 0; i < partial.length; i++) {
            if (partial[i]) state.mask[i] = 255;
        }
    },
    onPointerUp: (_e, ctx) => {
        if (!state.mask) return;
        flushMaskToSelection(ctx);
        state.mask = null;
        state.image = null;
    },
};

registerTool(quickSelectionTool);
