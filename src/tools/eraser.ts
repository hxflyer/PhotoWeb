import type { Tool, ToolPointerEvent } from './Tool';
import { registerTool } from './registry';
import { getBrushTip } from './brush';

interface EraserOptions {
    size: number;
    hardness: number;
    opacity: number;
    flow: number;
    mode: 'brush' | 'pencil' | 'block';
}

const options: EraserOptions = { size: 30, hardness: 0.9, opacity: 1, flow: 1, mode: 'brush' };

export function setEraserOptions(next: Partial<EraserOptions>): void {
    Object.assign(options, next);
}

interface S { last: { x: number; y: number } | null; layerId: string | null; leftover: number }
const s: S = { last: null, layerId: null, leftover: 0 };

function p(e: ToolPointerEvent) { return { x: e.canvasX, y: e.canvasY }; }

export const eraserTool: Tool = {
    id: 'eraser',
    label: 'Eraser',
    cursor: 'crosshair',
    onPointerDown: (e, ctx) => {
        if (e.button !== 0) return;
        const store = ctx.getStore();
        const layer = store.layers.find(l => l.id === store.activeLayerId);
        if (!layer) return;
        s.last = p(e);
        s.layerId = layer.id;
        s.leftover = 0;
    },
    onPointerMove: (e, ctx) => {
        if (!s.last || !s.layerId) return;
        const store = ctx.getStore();
        const layer = store.layers.find(l => l.id === s.layerId);
        if (!layer) return;
        const target = p(e);
        const tip = getBrushTip({ size: options.size, hardness: options.hardness, color: '#000' });
        const dx = target.x - s.last.x;
        const dy = target.y - s.last.y;
        const dist = Math.hypot(dx, dy);
        const spacing = Math.max(1, options.size * 0.15);
        const start = spacing - s.leftover;
        let i = start;
        const lctx = layer.ctx;
        lctx.save();
        lctx.globalCompositeOperation = 'destination-out';
        lctx.globalAlpha = options.opacity;
        while (i <= dist) {
            const x = s.last.x + (dx * i) / (dist || 1);
            const y = s.last.y + (dy * i) / (dist || 1);
            lctx.drawImage(tip, x - options.size / 2, y - options.size / 2);
            i += spacing;
        }
        lctx.restore();
        const lastStamp = i - spacing;
        s.leftover = lastStamp < start ? s.leftover + dist : dist - lastStamp;
        layer.markDirty(null);
        s.last = target;
    },
    onPointerUp: () => {
        s.last = null;
        s.layerId = null;
        s.leftover = 0;
    },
};

registerTool(eraserTool);
