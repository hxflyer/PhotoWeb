import type { Tool, ToolPointerEvent } from './Tool';
import { registerTool } from './registry';
import { getBrushTip } from './brush';
import { captureLayerRegion, createPixelHistoryAction, createMaskPixelHistoryAction, cropImageData, expandStrokeBounds, makeStrokeBounds, strokeBoundsToRect, type StrokeBounds } from '../core/history';

export type EraserMode = 'brush' | 'pencil' | 'block';

interface EraserOptions {
    mode: EraserMode;
    // Spacing fraction-of-size for pencil and block modes.
    // 0.15 = nearly continuous, 1.0 = barely overlapping stamps.
    spacing: number;
}

const options: EraserOptions = { mode: 'brush', spacing: 0.4 };

export function setEraserOptions(next: Partial<EraserOptions>): void {
    Object.assign(options, next);
}

export function getEraserOptions(): EraserOptions {
    return { ...options };
}

interface S { last: { x: number; y: number } | null; layerId: string | null; leftover: number; before: ImageData | null; target: 'layer' | 'mask'; bounds: StrokeBounds }
const s: S = { last: null, layerId: null, leftover: 0, before: null, target: 'layer', bounds: makeStrokeBounds() };

let lastEraserPoint: { layerId: string; target: 'layer' | 'mask'; x: number; y: number } | null = null;

export function clearEraserLastPoint(): void { lastEraserPoint = null; }

function eraseSegment(
    lctx: CanvasRenderingContext2D,
    from: { x: number; y: number },
    to: { x: number; y: number },
    size: number,
    hardness: number,
    opacity: number,
    leftoverIn: number,
): number {
    const dx = to.x - from.x;
    const dy = to.y - from.y;
    const dist = Math.hypot(dx, dy);
    lctx.save();
    lctx.globalCompositeOperation = 'destination-out';
    lctx.globalAlpha = opacity;
    let leftoverOut = leftoverIn;
    if (options.mode === 'block') {
        const half = size / 2;
        const stepSize = Math.max(1, size * options.spacing);
        const steps = Math.max(1, Math.ceil(dist / stepSize));
        for (let step = 0; step <= steps; step++) {
            const t = step / steps;
            const x = from.x + dx * t;
            const y = from.y + dy * t;
            lctx.fillStyle = '#000';
            lctx.fillRect(Math.round(x - half), Math.round(y - half), Math.max(1, Math.round(size)), Math.max(1, Math.round(size)));
        }
    } else if (options.mode === 'pencil') {
        const radius = size / 2;
        const steps = Math.max(1, Math.ceil(dist / Math.max(1, size * options.spacing)));
        for (let i = 0; i <= steps; i++) {
            const t = i / steps;
            const x = from.x + dx * t;
            const y = from.y + dy * t;
            lctx.fillStyle = '#000';
            lctx.beginPath();
            lctx.arc(Math.round(x), Math.round(y), radius, 0, Math.PI * 2);
            lctx.fill();
        }
    } else {
        const tip = getBrushTip({ size, hardness, color: '#000' });
        const spacing = Math.max(1, size * 0.15);
        const start = spacing - leftoverIn;
        let i = start;
        while (i <= dist) {
            const x = from.x + (dx * i) / (dist || 1);
            const y = from.y + (dy * i) / (dist || 1);
            lctx.drawImage(tip, x - size / 2, y - size / 2);
            i += spacing;
        }
        const lastStamp = i - spacing;
        leftoverOut = lastStamp < start ? leftoverIn + dist : dist - lastStamp;
    }
    lctx.restore();
    return leftoverOut;
}

function targetCanvas(layer: import('../core/Layer').Layer, target: 'layer' | 'mask'): { canvas: HTMLCanvasElement; ctx: CanvasRenderingContext2D } {
    if (target === 'mask' && layer.mask) {
        return { canvas: layer.mask.canvas, ctx: layer.mask.ctx };
    }
    return { canvas: layer.canvas, ctx: layer.ctx };
}

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
        s.target = store.activeLayerEditTarget === 'mask' && layer.mask ? 'mask' : 'layer';
        if (s.target === 'layer' && layer.lockTransparency) return;
        const tgt = targetCanvas(layer, s.target);
        const click = p(e);
        const useLine = e.shift
            && lastEraserPoint
            && lastEraserPoint.layerId === layer.id
            && lastEraserPoint.target === s.target;
        s.last = useLine ? { x: lastEraserPoint!.x, y: lastEraserPoint!.y } : click;
        s.layerId = layer.id;
        s.leftover = 0;
        s.before = s.target === 'mask'
            ? tgt.ctx.getImageData(0, 0, tgt.canvas.width, tgt.canvas.height)
            : captureLayerRegion(layer, { x: 0, y: 0, width: layer.canvas.width, height: layer.canvas.height });
        s.bounds = makeStrokeBounds();
        const r0 = (store.brushSettings.size ?? 1) / 2 + 1;
        expandStrokeBounds(s.bounds, s.last.x, s.last.y, r0);
        if (useLine) {
            const { size, hardness, opacity } = store.brushSettings;
            s.leftover = eraseSegment(tgt.ctx, s.last, click, size, hardness, opacity, 0);
            expandStrokeBounds(s.bounds, click.x, click.y, r0);
            layer.markDirty(null);
            s.last = click;
        }
        lastEraserPoint = { layerId: layer.id, target: s.target, x: click.x, y: click.y };
    },
    onPointerMove: (e, ctx) => {
        if (!s.last || !s.layerId) return;
        const store = ctx.getStore();
        const layer = store.layers.find(l => l.id === s.layerId);
        if (!layer) return;
        const target = p(e);
        const { size, hardness, opacity } = store.brushSettings;
        const lctx = targetCanvas(layer, s.target).ctx;
        s.leftover = eraseSegment(lctx, s.last, target, size, hardness, opacity, s.leftover);
        const r = (size ?? 1) / 2 + 1;
        expandStrokeBounds(s.bounds, target.x, target.y, r);
        layer.markDirty(null);
        s.last = target;
        lastEraserPoint = { layerId: layer.id, target: s.target, x: target.x, y: target.y };
    },
    onPointerUp: (_e, ctx) => {
        if (s.layerId && s.before) {
            const store = ctx.getStore();
            const layer = store.layers.find(l => l.id === s.layerId);
            if (layer) {
                if (s.target === 'mask' && layer.mask) {
                    const after = layer.mask.ctx.getImageData(0, 0, layer.mask.canvas.width, layer.mask.canvas.height);
                    store.executeCommand(createMaskPixelHistoryAction(layer, s.before, after, 'Mask Eraser'));
                } else {
                    const rect = strokeBoundsToRect(s.bounds, layer.canvas.width, layer.canvas.height)
                        ?? { x: 0, y: 0, width: layer.canvas.width, height: layer.canvas.height };
                    const beforeCropped = cropImageData(s.before, rect.x, rect.y, rect.width, rect.height);
                    store.commitHistory(createPixelHistoryAction(layer, rect, beforeCropped, 'Eraser'));
                }
            }
        }
        s.last = null;
        s.layerId = null;
        s.leftover = 0;
        s.before = null;
        s.bounds = makeStrokeBounds();
    },
};

registerTool(eraserTool);
