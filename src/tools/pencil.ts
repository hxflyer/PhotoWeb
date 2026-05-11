import type { Tool, ToolPointerEvent } from './Tool';
import { registerTool } from './registry';
import { captureLayerRegion, createPixelHistoryAction, cropImageData, expandStrokeBounds, makeStrokeBounds, strokeBoundsToRect, type StrokeBounds } from '../core/history';

interface PencilOptions {
    spacing: number;
    mode: GlobalCompositeOperation;
    pressureSize: boolean;
    pressureOpacity: boolean;
}

const options: PencilOptions = { spacing: 0.4, mode: 'source-over', pressureSize: false, pressureOpacity: false };

export function setPencilOptions(next: Partial<PencilOptions>): void {
    Object.assign(options, next);
}

export function getPencilOptions(): PencilOptions {
    return { ...options };
}

interface State { last: { x: number; y: number } | null; layerId: string | null; before: ImageData | null; bounds: StrokeBounds }
const state: State = { last: null, layerId: null, before: null, bounds: makeStrokeBounds() };

let lastPencilPoint: { layerId: string; x: number; y: number } | null = null;

export function clearPencilLastPoint(): void { lastPencilPoint = null; }

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
        const click = p(e);
        state.layerId = layer.id;
        state.before = captureLayerRegion(layer, { x: 0, y: 0, width: layer.canvas.width, height: layer.canvas.height });
        state.bounds = makeStrokeBounds();
        const { size: baseSize, opacity: baseOpacity } = store.brushSettings;
        const sizeFactor = options.pressureSize ? Math.max(0.05, e.pressure || 0.5) : 1;
        const opacityFactor = options.pressureOpacity ? Math.max(0.05, e.pressure || 0.5) : 1;
        const size = baseSize * sizeFactor;
        const opacity = baseOpacity * opacityFactor;
        // Shift+click: stamp the segment from the last remembered point to
        // the click before starting the normal stroke.
        if (e.shift && lastPencilPoint && lastPencilPoint.layerId === layer.id) {
            const from = { x: lastPencilPoint.x, y: lastPencilPoint.y };
            const dist = Math.hypot(click.x - from.x, click.y - from.y);
            const steps = Math.max(1, Math.ceil(dist / Math.max(1, size * options.spacing)));
            for (let i = 0; i <= steps; i++) {
                const t = i / steps;
                const x = from.x + (click.x - from.x) * t;
                const y = from.y + (click.y - from.y) * t;
                stamp(layer.ctx, x, y, size, opacity, store.primaryColor);
                expandStrokeBounds(state.bounds, x, y, size / 2 + 1);
            }
        } else {
            stamp(layer.ctx, click.x, click.y, size, opacity, store.primaryColor);
            expandStrokeBounds(state.bounds, click.x, click.y, size / 2 + 1);
        }
        state.last = click;
        layer.markDirty(null);
        lastPencilPoint = { layerId: layer.id, x: click.x, y: click.y };
    },
    onPointerMove: (e, ctx) => {
        if (!state.last || !state.layerId) return;
        const store = ctx.getStore();
        const layer = store.layers.find(l => l.id === state.layerId);
        if (!layer) return;
        const next = p(e);
        const { size: baseSize, opacity: baseOpacity } = store.brushSettings;
        const sizeFactor = options.pressureSize ? Math.max(0.05, e.pressure || 0.5) : 1;
        const opacityFactor = options.pressureOpacity ? Math.max(0.05, e.pressure || 0.5) : 1;
        const size = baseSize * sizeFactor;
        const opacity = baseOpacity * opacityFactor;
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
        lastPencilPoint = { layerId: layer.id, x: next.x, y: next.y };
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
