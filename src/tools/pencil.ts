import type { Tool, ToolPointerEvent } from './Tool';
import { registerTool } from './registry';

interface PencilOptions {
    size: number;
    opacity: number;
    mode: GlobalCompositeOperation;
}

const options: PencilOptions = { size: 4, opacity: 1, mode: 'source-over' };

export function setPencilOptions(next: Partial<PencilOptions>): void {
    Object.assign(options, next);
}

interface State { last: { x: number; y: number } | null; layerId: string | null }
const state: State = { last: null, layerId: null };

function p(e: ToolPointerEvent) { return { x: e.canvasX, y: e.canvasY }; }

function stamp(ctx: CanvasRenderingContext2D, x: number, y: number, color: string): void {
    ctx.save();
    ctx.imageSmoothingEnabled = false;
    ctx.globalCompositeOperation = options.mode;
    ctx.globalAlpha = options.opacity;
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.arc(Math.round(x), Math.round(y), options.size / 2, 0, Math.PI * 2);
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
        stamp(layer.ctx, state.last.x, state.last.y, store.primaryColor);
        layer.markDirty(null);
    },
    onPointerMove: (e, ctx) => {
        if (!state.last || !state.layerId) return;
        const store = ctx.getStore();
        const layer = store.layers.find(l => l.id === state.layerId);
        if (!layer) return;
        const next = p(e);
        const dist = Math.hypot(next.x - state.last.x, next.y - state.last.y);
        const steps = Math.max(1, Math.ceil(dist / Math.max(1, options.size * 0.4)));
        for (let i = 1; i <= steps; i++) {
            const t = i / steps;
            const x = state.last.x + (next.x - state.last.x) * t;
            const y = state.last.y + (next.y - state.last.y) * t;
            stamp(layer.ctx, x, y, store.primaryColor);
        }
        layer.markDirty(null);
        state.last = next;
    },
    onPointerUp: () => {
        state.last = null;
        state.layerId = null;
    },
};

registerTool(pencilTool);
