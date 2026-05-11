import type { Tool, ToolPointerEvent } from './Tool';
import { registerTool } from './registry';
import { captureLayerRegion, createPixelHistoryAction, cropImageData, expandStrokeBounds, makeStrokeBounds, strokeBoundsToRect, type StrokeBounds } from '../core/history';

interface PencilOptions {
    spacing: number;
    mode: GlobalCompositeOperation;
}

const options: PencilOptions = { spacing: 0.4, mode: 'source-over' };

export function setPencilOptions(next: Partial<PencilOptions>): void {
    Object.assign(options, next);
}

export function getPencilOptions(): PencilOptions {
    return { ...options };
}

interface State { last: { x: number; y: number } | null; layerId: string | null; before: ImageData | null; bounds: StrokeBounds }
const state: State = { last: null, layerId: null, before: null, bounds: makeStrokeBounds() };

function p(e: ToolPointerEvent) { return { x: e.canvasX, y: e.canvasY }; }

function stamp(ctx: CanvasRenderingContext2D, x: number, y: number, size: number, opacity: number, color: string): void {
    ctx.save();
    ctx.imageSmoothingEnabled = false;
    ctx.globalCompositeOperation = options.mode;
    ctx.globalAlpha = opacity;
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.arc(Math.round(x), Math.round(y), size / 2, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
}

export const pencilTool: Tool = {
    id: 'pencil',
    label: 'Pencil',
    cursor: 'crosshair',
    onPointerDown: (e, ctx) => {
        if (e.button !== 0) return;
        const store = ctx.getStore();
        const layer = store.layers.find(l => l.id === store.activeLayerId);
        if (!layer) return;
        state.last = p(e);
        state.layerId = layer.id;
        state.before = captureLayerRegion(layer, { x: 0, y: 0, width: layer.canvas.width, height: layer.canvas.height });
        state.bounds = makeStrokeBounds();
        const { size, opacity } = store.brushSettings;
        stamp(layer.ctx, state.last.x, state.last.y, size, opacity, store.primaryColor);
        expandStrokeBounds(state.bounds, state.last.x, state.last.y, size / 2 + 1);
        layer.markDirty(null);
    },
    onPointerMove: (e, ctx) => {
        if (!state.last || !state.layerId) return;
        const store = ctx.getStore();
        const layer = store.layers.find(l => l.id === state.layerId);
        if (!layer) return;
        const next = p(e);
        const { size, opacity } = store.brushSettings;
        const dist = Math.hypot(next.x - state.last.x, next.y - state.last.y);
        const steps = Math.max(1, Math.ceil(dist / Math.max(1, size * options.spacing)));
        for (let i = 1; i <= steps; i++) {
            const t = i / steps;
            const x = state.last.x + (next.x - state.last.x) * t;
            const y = state.last.y + (next.y - state.last.y) * t;
            stamp(layer.ctx, x, y, size, opacity, store.primaryColor);
            expandStrokeBounds(state.bounds, x, y, size / 2 + 1);
        }
        layer.markDirty(null);
        state.last = next;
    },
    onPointerUp: (_e, ctx) => {
        if (state.layerId && state.before) {
            const store = ctx.getStore();
            const layer = store.layers.find(l => l.id === state.layerId);
            if (layer) {
                const rect = strokeBoundsToRect(state.bounds, layer.canvas.width, layer.canvas.height)
                    ?? { x: 0, y: 0, width: layer.canvas.width, height: layer.canvas.height };
                const beforeCropped = cropImageData(state.before, rect.x, rect.y, rect.width, rect.height);
                store.commitHistory(createPixelHistoryAction(layer, rect, beforeCropped, 'Pencil Stroke'));
            }
        }
        state.last = null;
        state.layerId = null;
        state.before = null;
        state.bounds = makeStrokeBounds();
    },
};

registerTool(pencilTool);
