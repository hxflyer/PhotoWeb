import type { Tool, ToolPointerEvent } from './Tool';
import { registerTool } from './registry';
import { getBrushTip } from './brush';

export type ToneRange = 'shadows' | 'midtones' | 'highlights';

export interface ToneToolOptions {
    size: number;
    hardness: number;
    exposure: number;
    range: ToneRange;
}

const dodge: ToneToolOptions = { size: 60, hardness: 0.5, exposure: 0.5, range: 'midtones' };
const burn: ToneToolOptions = { size: 60, hardness: 0.5, exposure: 0.5, range: 'midtones' };
const sponge = { size: 60, hardness: 0.5, flow: 0.5, mode: 'desaturate' as 'desaturate' | 'saturate', vibrance: true };

export function setDodgeOptions(next: Partial<ToneToolOptions>): void { Object.assign(dodge, next); }
export function setBurnOptions(next: Partial<ToneToolOptions>): void { Object.assign(burn, next); }
export function setSpongeOptions(next: Partial<typeof sponge>): void { Object.assign(sponge, next); }

interface S { last: { x: number; y: number } | null; layerId: string | null }
const dodgeState: S = { last: null, layerId: null };
const burnState: S = { last: null, layerId: null };
const spongeState: S = { last: null, layerId: null };

function p(e: ToolPointerEvent) { return { x: e.canvasX, y: e.canvasY }; }

function rangeWeight(luma: number, range: ToneRange): number {
    if (range === 'shadows') return Math.max(0, 1 - luma / 0.4);
    if (range === 'highlights') return Math.max(0, (luma - 0.6) / 0.4);
    return 1 - Math.abs(luma - 0.5) * 2;
}

function applyDodgeBurn(
    layerCtx: CanvasRenderingContext2D,
    centerX: number, centerY: number, size: number, exposure: number, range: ToneRange, mode: 'dodge' | 'burn',
): void {
    const r = size / 2;
    const x0 = Math.max(0, Math.floor(centerX - r));
    const y0 = Math.max(0, Math.floor(centerY - r));
    const x1 = Math.min(layerCtx.canvas.width, Math.ceil(centerX + r));
    const y1 = Math.min(layerCtx.canvas.height, Math.ceil(centerY + r));
    const w = x1 - x0;
    const h = y1 - y0;
    if (w <= 0 || h <= 0) return;
    const img = layerCtx.getImageData(x0, y0, w, h);
    const d = img.data;
    for (let y = 0; y < h; y++) {
        for (let x = 0; x < w; x++) {
            const dx = x + x0 - centerX;
            const dy = y + y0 - centerY;
            const dist = Math.hypot(dx, dy);
            if (dist > r) continue;
            const fall = 1 - dist / r;
            const idx = (y * w + x) * 4;
            const luma = (0.299 * d[idx] + 0.587 * d[idx + 1] + 0.114 * d[idx + 2]) / 255;
            const weight = rangeWeight(luma, range) * fall * exposure;
            const direction = mode === 'dodge' ? 1 : -1;
            d[idx] = clamp(d[idx] + direction * 64 * weight);
            d[idx + 1] = clamp(d[idx + 1] + direction * 64 * weight);
            d[idx + 2] = clamp(d[idx + 2] + direction * 64 * weight);
        }
    }
    layerCtx.putImageData(img, x0, y0);
}

function applySponge(
    layerCtx: CanvasRenderingContext2D,
    centerX: number, centerY: number, size: number, flow: number, mode: 'desaturate' | 'saturate',
): void {
    const r = size / 2;
    const x0 = Math.max(0, Math.floor(centerX - r));
    const y0 = Math.max(0, Math.floor(centerY - r));
    const x1 = Math.min(layerCtx.canvas.width, Math.ceil(centerX + r));
    const y1 = Math.min(layerCtx.canvas.height, Math.ceil(centerY + r));
    const w = x1 - x0;
    const h = y1 - y0;
    if (w <= 0 || h <= 0) return;
    const img = layerCtx.getImageData(x0, y0, w, h);
    const d = img.data;
    for (let y = 0; y < h; y++) {
        for (let x = 0; x < w; x++) {
            const dx = x + x0 - centerX;
            const dy = y + y0 - centerY;
            const dist = Math.hypot(dx, dy);
            if (dist > r) continue;
            const fall = 1 - dist / r;
            const idx = (y * w + x) * 4;
            const r0 = d[idx], g0 = d[idx + 1], b0 = d[idx + 2];
            const luma = 0.299 * r0 + 0.587 * g0 + 0.114 * b0;
            const factor = mode === 'saturate' ? 1 + fall * flow : 1 - fall * flow;
            d[idx] = clamp(luma + (r0 - luma) * factor);
            d[idx + 1] = clamp(luma + (g0 - luma) * factor);
            d[idx + 2] = clamp(luma + (b0 - luma) * factor);
        }
    }
    layerCtx.putImageData(img, x0, y0);
}

function clamp(v: number): number {
    return Math.max(0, Math.min(255, Math.round(v)));
}

function makeToneTool(id: string, label: string, state: S, opts: ToneToolOptions, mode: 'dodge' | 'burn'): Tool {
    return {
        id,
        label,
        cursor: 'crosshair',
        onPointerDown: (e, ctx) => {
            if (e.button !== 0) return;
            const store = ctx.getStore();
            const layer = store.layers.find(l => l.id === store.activeLayerId);
            if (!layer) return;
            state.last = p(e);
            state.layerId = layer.id;
            applyDodgeBurn(layer.ctx, state.last.x, state.last.y, opts.size, opts.exposure, opts.range, mode);
            layer.markDirty(null);
        },
        onPointerMove: (e, ctx) => {
            if (!state.last || !state.layerId) return;
            const store = ctx.getStore();
            const layer = store.layers.find(l => l.id === state.layerId);
            if (!layer) return;
            const next = p(e);
            const dist = Math.hypot(next.x - state.last.x, next.y - state.last.y);
            const steps = Math.max(1, Math.ceil(dist / Math.max(1, opts.size * 0.25)));
            for (let i = 1; i <= steps; i++) {
                const t = i / steps;
                const x = state.last.x + (next.x - state.last.x) * t;
                const y = state.last.y + (next.y - state.last.y) * t;
                applyDodgeBurn(layer.ctx, x, y, opts.size, opts.exposure, opts.range, mode);
            }
            // Use brush tip cache to keep params warm for option panels.
            void getBrushTip({ size: opts.size, hardness: opts.hardness, color: '#ffffff' });
            layer.markDirty(null);
            state.last = next;
        },
        onPointerUp: () => { state.last = null; state.layerId = null; },
    };
}

export const dodgeTool = makeToneTool('dodge', 'Dodge', dodgeState, dodge, 'dodge');
export const burnTool = makeToneTool('burn', 'Burn', burnState, burn, 'burn');
export const spongeTool: Tool = {
    id: 'sponge',
    label: 'Sponge',
    cursor: 'crosshair',
    onPointerDown: (e, ctx) => {
        if (e.button !== 0) return;
        const store = ctx.getStore();
        const layer = store.layers.find(l => l.id === store.activeLayerId);
        if (!layer) return;
        spongeState.last = p(e);
        spongeState.layerId = layer.id;
        applySponge(layer.ctx, spongeState.last.x, spongeState.last.y, sponge.size, sponge.flow, sponge.mode);
        layer.markDirty(null);
    },
    onPointerMove: (e, ctx) => {
        if (!spongeState.last || !spongeState.layerId) return;
        const store = ctx.getStore();
        const layer = store.layers.find(l => l.id === spongeState.layerId);
        if (!layer) return;
        const next = p(e);
        applySponge(layer.ctx, next.x, next.y, sponge.size, sponge.flow, sponge.mode);
        layer.markDirty(null);
        spongeState.last = next;
    },
    onPointerUp: () => { spongeState.last = null; spongeState.layerId = null; },
};

registerTool(dodgeTool);
registerTool(burnTool);
registerTool(spongeTool);
