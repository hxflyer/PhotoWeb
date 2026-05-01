import type { Tool, ToolPointerEvent } from './Tool';
import { registerTool } from './registry';
import { getBrushTip } from './brush';

interface CloneStampOptions {
    size: number;
    hardness: number;
    opacity: number;
    aligned: boolean;
    sampleAllLayers: boolean;
}

const options: CloneStampOptions = {
    size: 40,
    hardness: 0.5,
    opacity: 1,
    aligned: true,
    sampleAllLayers: false,
};

export function setCloneStampOptions(next: Partial<CloneStampOptions>): void {
    Object.assign(options, next);
}

interface State {
    source: { x: number; y: number } | null;
    anchor: { x: number; y: number } | null;
    layerId: string | null;
    last: { x: number; y: number } | null;
}

const state: State = { source: null, anchor: null, layerId: null, last: null };

function p(e: ToolPointerEvent) { return { x: e.canvasX, y: e.canvasY }; }

function sampleSourceCanvas(layers: { visible: boolean; canvas: HTMLCanvasElement }[], width: number, height: number): HTMLCanvasElement {
    const merged = document.createElement('canvas');
    merged.width = width;
    merged.height = height;
    const ctx = merged.getContext('2d');
    if (!ctx) return merged;
    layers.forEach(l => { if (l.visible) ctx.drawImage(l.canvas, 0, 0); });
    return merged;
}

export const cloneStampTool: Tool = {
    id: 'clone-stamp',
    label: 'Clone Stamp',
    cursor: 'crosshair',
    onPointerDown: (e, ctx) => {
        if (e.button !== 0) return;
        if (e.alt) {
            state.source = p(e);
            state.anchor = null;
            return;
        }
        if (!state.source) return;
        const store = ctx.getStore();
        const layer = store.layers.find(l => l.id === store.activeLayerId);
        if (!layer) return;
        const point = p(e);
        if (!state.anchor || !options.aligned) state.anchor = point;
        state.layerId = layer.id;
        state.last = point;
    },
    onPointerMove: (e, ctx) => {
        if (!state.source || !state.anchor || !state.last || !state.layerId) return;
        const store = ctx.getStore();
        const layer = store.layers.find(l => l.id === state.layerId);
        if (!layer) return;
        const sourceCanvas = options.sampleAllLayers
            ? sampleSourceCanvas(store.layers, store.width, store.height)
            : layer.canvas;
        const point = p(e);
        const offsetX = state.source.x - state.anchor.x;
        const offsetY = state.source.y - state.anchor.y;
        const dx = point.x - state.last.x;
        const dy = point.y - state.last.y;
        const dist = Math.hypot(dx, dy);
        const spacing = Math.max(1, options.size * 0.1);
        const tip = getBrushTip({ size: options.size, hardness: options.hardness, color: '#000' });
        const lctx = layer.ctx;
        let i = spacing;
        while (i <= dist) {
            const x = state.last.x + (dx * i) / (dist || 1);
            const y = state.last.y + (dy * i) / (dist || 1);
            const sx = x + offsetX;
            const sy = y + offsetY;
            const stampCanvas = document.createElement('canvas');
            stampCanvas.width = options.size;
            stampCanvas.height = options.size;
            const sctx = stampCanvas.getContext('2d');
            if (!sctx) break;
            sctx.drawImage(
                sourceCanvas,
                sx - options.size / 2,
                sy - options.size / 2,
                options.size,
                options.size,
                0,
                0,
                options.size,
                options.size,
            );
            sctx.globalCompositeOperation = 'destination-in';
            sctx.drawImage(tip, 0, 0, options.size, options.size);
            lctx.save();
            lctx.globalAlpha = options.opacity;
            lctx.drawImage(stampCanvas, x - options.size / 2, y - options.size / 2);
            lctx.restore();
            i += spacing;
        }
        layer.markDirty(null);
        state.last = point;
    },
    onPointerUp: () => {
        state.last = null;
        if (!options.aligned) state.anchor = null;
    },
};

registerTool(cloneStampTool);
