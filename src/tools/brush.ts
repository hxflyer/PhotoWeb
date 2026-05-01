import type { Tool, ToolPointerEvent } from './Tool';
import { registerTool } from './registry';

export interface BrushOptions {
    size: number;
    hardness: number;
    opacity: number;
    flow: number;
    smoothing: number;
    spacing: number;
    mode: GlobalCompositeOperation;
    pressureSize: boolean;
    pressureOpacity: boolean;
}

const options: BrushOptions = {
    size: 20,
    hardness: 1,
    opacity: 1,
    flow: 1,
    smoothing: 0,
    spacing: 0.15,
    mode: 'source-over',
    pressureSize: true,
    pressureOpacity: false,
};

export function setBrushOptions(next: Partial<BrushOptions>): void {
    Object.assign(options, next);
}

export function getBrushOptions(): BrushOptions {
    return { ...options };
}

interface BrushTipParams {
    size: number;
    hardness: number;
    color: string;
}

let cachedTip: { params: BrushTipParams; canvas: HTMLCanvasElement } | null = null;

export function getBrushTip(params: BrushTipParams): HTMLCanvasElement {
    if (cachedTip
        && cachedTip.params.size === params.size
        && cachedTip.params.hardness === params.hardness
        && cachedTip.params.color === params.color) {
        return cachedTip.canvas;
    }
    const canvas = document.createElement('canvas');
    canvas.width = Math.max(1, Math.ceil(params.size));
    canvas.height = Math.max(1, Math.ceil(params.size));
    const ctx = canvas.getContext('2d');
    if (ctx) {
        const r = params.size / 2;
        if (params.hardness >= 0.98) {
            ctx.fillStyle = params.color;
            ctx.beginPath();
            ctx.arc(r, r, r, 0, Math.PI * 2);
            ctx.fill();
        } else {
            const grad = ctx.createRadialGradient(r, r, r * params.hardness, r, r, r);
            grad.addColorStop(0, params.color);
            grad.addColorStop(1, 'rgba(0,0,0,0)');
            ctx.fillStyle = grad;
            ctx.fillRect(0, 0, canvas.width, canvas.height);
        }
    }
    cachedTip = { params: { ...params }, canvas };
    return canvas;
}

interface StrokeState {
    last: { x: number; y: number } | null;
    leftover: number;
    layerId: string | null;
    smoothPoint: { x: number; y: number } | null;
}

const stroke: StrokeState = { last: null, leftover: 0, layerId: null, smoothPoint: null };

function p(e: ToolPointerEvent) { return { x: e.canvasX, y: e.canvasY }; }

export const brushTool: Tool = {
    id: 'brush',
    label: 'Brush',
    cursor: 'crosshair',
    onPointerDown: (e, ctx) => {
        if (e.button !== 0) return;
        const store = ctx.getStore();
        const layer = store.layers.find(l => l.id === store.activeLayerId);
        if (!layer) return;
        stroke.last = p(e);
        stroke.smoothPoint = stroke.last;
        stroke.leftover = 0;
        stroke.layerId = layer.id;
    },
    onPointerMove: (e, ctx) => {
        if (!stroke.last || !stroke.layerId) return;
        const store = ctx.getStore();
        const layer = store.layers.find(l => l.id === stroke.layerId);
        if (!layer) return;
        const target = p(e);
        const point = options.smoothing > 0
            ? smooth(stroke.smoothPoint ?? target, target, options.smoothing)
            : target;
        stroke.smoothPoint = point;
        stampStroke(layer.ctx, stroke.last, point, e.pressure, store.primaryColor);
        layer.markDirty(null);
        stroke.last = point;
    },
    onPointerUp: () => {
        stroke.last = null;
        stroke.layerId = null;
        stroke.smoothPoint = null;
    },
    onKeyDown: (e) => {
        if (e.key === '[') options.size = Math.max(1, options.size - 2);
        if (e.key === ']') options.size = Math.min(2000, options.size + 2);
    },
};

function smooth(prev: { x: number; y: number }, next: { x: number; y: number }, t: number) {
    const k = 1 - t;
    return { x: prev.x * t + next.x * k, y: prev.y * t + next.y * k };
}

function stampStroke(
    ctx: CanvasRenderingContext2D,
    from: { x: number; y: number },
    to: { x: number; y: number },
    pressure: number,
    color: string,
): void {
    const sizeFactor = options.pressureSize ? Math.max(0.05, pressure || 0.5) : 1;
    const opacityFactor = options.pressureOpacity ? Math.max(0.05, pressure || 0.5) : 1;
    const size = options.size * sizeFactor;
    const tip = getBrushTip({ size, hardness: options.hardness, color });
    const dx = to.x - from.x;
    const dy = to.y - from.y;
    const dist = Math.hypot(dx, dy);
    const spacing = Math.max(1, size * options.spacing);
    const start = spacing - stroke.leftover;
    let i = start;
    ctx.save();
    ctx.globalCompositeOperation = options.mode;
    ctx.globalAlpha = options.opacity * opacityFactor;
    while (i <= dist) {
        const x = from.x + (dx * i) / (dist || 1);
        const y = from.y + (dy * i) / (dist || 1);
        ctx.drawImage(tip, x - size / 2, y - size / 2);
        i += spacing;
    }
    const lastStamp = i - spacing;
    stroke.leftover = lastStamp < start ? stroke.leftover + dist : dist - lastStamp;
    ctx.restore();
}

registerTool(brushTool);
