import type { Tool, ToolPointerEvent } from './Tool';
import type { EditorStore } from '../store/types';
import { registerTool } from './registry';
import { captureLayerRegion, createPixelHistoryAction, createMaskPixelHistoryAction, cropImageData, expandStrokeBounds, makeStrokeBounds, strokeBoundsToRect, type StrokeBounds } from '../core/history';

export interface BrushOptions {
    smoothing: number;
    spacing: number;
    mode: GlobalCompositeOperation | 'clear';
    pressureSize: boolean;
    pressureOpacity: boolean;
}

const options: BrushOptions = {
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
    before: ImageData | null;
    target: 'layer' | 'mask';
    bounds: StrokeBounds;
}

const stroke: StrokeState = { last: null, leftover: 0, layerId: null, smoothPoint: null, before: null, target: 'layer', bounds: makeStrokeBounds() };

// Remembers the last stamped point per layer/target so Shift+click can paint a
// straight line from there to the new click. Cleared when a non-Shift stroke
// starts, when the layer changes, or when the user explicitly clears it.
let lastStampedPoint: { layerId: string; target: 'layer' | 'mask'; x: number; y: number } | null = null;

export function getBrushLastStampedPoint(): { layerId: string; target: 'layer' | 'mask'; x: number; y: number } | null {
    return lastStampedPoint;
}

export function clearBrushLastStampedPoint(): void {
    lastStampedPoint = null;
}

function p(e: ToolPointerEvent) { return { x: e.canvasX, y: e.canvasY }; }

function targetCanvas(layer: import('../core/Layer').Layer, target: 'layer' | 'mask'): { canvas: HTMLCanvasElement; ctx: CanvasRenderingContext2D } {
    if (target === 'mask' && layer.mask) {
        return { canvas: layer.mask.canvas, ctx: layer.mask.ctx };
    }
    return { canvas: layer.canvas, ctx: layer.ctx };
}

function maskColorFromPrimary(primary: string): string {
    if (!primary.startsWith('#') || primary.length < 7) return primary;
    const r = parseInt(primary.slice(1, 3), 16);
    const g = parseInt(primary.slice(3, 5), 16);
    const b = parseInt(primary.slice(5, 7), 16);
    const luma = Math.round(0.299 * r + 0.587 * g + 0.114 * b);
    const hex = luma.toString(16).padStart(2, '0');
    return `#${hex}${hex}${hex}`;
}

export const brushTool: Tool = {
    id: 'brush',
    label: 'Brush',
    cursor: 'crosshair',
    onPointerDown: (e, ctx) => {
        if (e.button !== 0) return;
        const store = ctx.getStore();
        const layer = store.layers.find(l => l.id === store.activeLayerId);
        if (!layer) return;
        stroke.target = store.activeLayerEditTarget === 'mask' && layer.mask ? 'mask' : 'layer';
        const target = targetCanvas(layer, stroke.target);
        const click = p(e);
        // Shift+click with a remembered point on the same layer paints a
        // straight line from the last stamp before the new stroke begins.
        const useLine = e.shift
            && lastStampedPoint
            && lastStampedPoint.layerId === layer.id
            && lastStampedPoint.target === stroke.target;
        stroke.last = useLine ? { x: lastStampedPoint!.x, y: lastStampedPoint!.y } : click;
        stroke.smoothPoint = stroke.last;
        stroke.leftover = 0;
        stroke.layerId = layer.id;
        stroke.bounds = makeStrokeBounds();
        const r0 = (store.brushSettings.size ?? 1) / 2;
        expandStrokeBounds(stroke.bounds, stroke.last.x, stroke.last.y, r0);
        if (stroke.target === 'mask') {
            stroke.before = target.ctx.getImageData(0, 0, target.canvas.width, target.canvas.height);
        } else {
            stroke.before = captureLayerRegion(layer, { x: 0, y: 0, width: layer.canvas.width, height: layer.canvas.height });
        }
        if (useLine) {
            // Stamp the straight segment from the remembered point to the
            // click as part of the same stroke; the rest of the stroke
            // continues normally from the click point.
            const color = stroke.target === 'mask'
                ? maskColorFromPrimary(store.primaryColor)
                : store.primaryColor;
            stampStroke(store, target.ctx, stroke.last, click, e.pressure, color);
            const r = ((store.brushSettings.size ?? 1) * (options.pressureSize ? Math.max(0.1, e.pressure) : 1)) / 2 + 1;
            expandStrokeBounds(stroke.bounds, click.x, click.y, r);
            layer.markDirty(null);
            stroke.last = click;
            stroke.smoothPoint = click;
        }
        lastStampedPoint = { layerId: layer.id, target: stroke.target, x: click.x, y: click.y };
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
        const { ctx: drawCtx } = targetCanvas(layer, stroke.target);
        const color = stroke.target === 'mask'
            ? maskColorFromPrimary(store.primaryColor)
            : store.primaryColor;
        stampStroke(store, drawCtx, stroke.last, point, e.pressure, color);
        const r = ((store.brushSettings.size ?? 1) * (options.pressureSize ? Math.max(0.1, e.pressure) : 1)) / 2 + 1;
        expandStrokeBounds(stroke.bounds, point.x, point.y, r);
        layer.markDirty(null);
        stroke.last = point;
        lastStampedPoint = { layerId: layer.id, target: stroke.target, x: point.x, y: point.y };
    },
    onPointerUp: (_e, ctx) => {
        if (stroke.layerId && stroke.before) {
            const store = ctx.getStore();
            const layer = store.layers.find(l => l.id === stroke.layerId);
            if (layer) {
                if (stroke.target === 'mask' && layer.mask) {
                    const after = layer.mask.ctx.getImageData(0, 0, layer.mask.canvas.width, layer.mask.canvas.height);
                    store.executeCommand(createMaskPixelHistoryAction(layer, stroke.before, after, 'Mask Brush Stroke'));
                } else {
                    const rect = strokeBoundsToRect(stroke.bounds, layer.canvas.width, layer.canvas.height)
                        ?? { x: 0, y: 0, width: layer.canvas.width, height: layer.canvas.height };
                    const beforeCropped = cropImageData(stroke.before, rect.x, rect.y, rect.width, rect.height);
                    store.commitHistory(createPixelHistoryAction(layer, rect, beforeCropped, 'Brush Stroke'));
                }
            }
        }
        stroke.last = null;
        stroke.layerId = null;
        stroke.smoothPoint = null;
        stroke.before = null;
        stroke.bounds = makeStrokeBounds();
    },
};

function smooth(prev: { x: number; y: number }, next: { x: number; y: number }, t: number) {
    const k = 1 - t;
    return { x: prev.x * t + next.x * k, y: prev.y * t + next.y * k };
}

function stampStroke(
    store: EditorStore,
    ctx: CanvasRenderingContext2D,
    from: { x: number; y: number },
    to: { x: number; y: number },
    pressure: number,
    color: string,
): void {
    const { size: baseSize, hardness, opacity } = store.brushSettings;
    const sizeFactor = options.pressureSize ? Math.max(0.05, pressure || 0.5) : 1;
    const opacityFactor = options.pressureOpacity ? Math.max(0.05, pressure || 0.5) : 1;
    const size = baseSize * sizeFactor;
    const tip = getBrushTip({ size, hardness, color });
    const dx = to.x - from.x;
    const dy = to.y - from.y;
    const dist = Math.hypot(dx, dy);
    const spacing = Math.max(1, size * options.spacing);
    const start = spacing - stroke.leftover;
    let i = start;
    ctx.save();
    ctx.globalCompositeOperation = options.mode === 'clear' ? 'destination-out' : options.mode;
    ctx.globalAlpha = opacity * opacityFactor;
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
