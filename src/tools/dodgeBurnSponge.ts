import type { Tool, ToolPointerEvent } from './Tool';
import type { EditorStore } from '../store/types';
import { registerTool } from './registry';
import { getBrushTip } from './brush';
import {
    captureLayerRegion,
    createPixelHistoryAction,
    cropImageData,
    expandStrokeBounds,
    makeStrokeBounds,
    strokeBoundsToRect,
    type StrokeBounds,
} from '../core/history';

export type ToneRange = 'shadows' | 'midtones' | 'highlights';

export interface ToneToolOptions {
    exposure: number;
    range: ToneRange;
}

export type SpongeMode = 'desaturate' | 'saturate';
export interface SpongeOptions {
    mode: SpongeMode;
    vibrance: boolean;
}

const dodge: ToneToolOptions = { exposure: 0.5, range: 'midtones' };
const burn: ToneToolOptions = { exposure: 0.5, range: 'midtones' };
const sponge: SpongeOptions = { mode: 'desaturate', vibrance: false };

export function setDodgeOptions(next: Partial<ToneToolOptions>): void { Object.assign(dodge, next); }
export function setBurnOptions(next: Partial<ToneToolOptions>): void { Object.assign(burn, next); }
export function setSpongeOptions(next: Partial<SpongeOptions>): void { Object.assign(sponge, next); }
export function getDodgeOptions(): ToneToolOptions { return { ...dodge }; }
export function getBurnOptions(): ToneToolOptions { return { ...burn }; }
export function getSpongeOptions(): SpongeOptions { return { ...sponge }; }

interface S {
    last: { x: number; y: number } | null;
    layerId: string | null;
    before: ImageData | null;
    bounds: StrokeBounds;
}
const dodgeState: S = { last: null, layerId: null, before: null, bounds: makeStrokeBounds() };
const burnState: S = { last: null, layerId: null, before: null, bounds: makeStrokeBounds() };
const spongeState: S = { last: null, layerId: null, before: null, bounds: makeStrokeBounds() };

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
    centerX: number, centerY: number, size: number, flow: number, mode: SpongeMode, vibrance: boolean,
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
            const max = Math.max(r0, g0, b0);
            const min = Math.min(r0, g0, b0);
            const sat = max === 0 ? 0 : (max - min) / max;
            const protectFactor = vibrance ? 1 - sat : 1;
            const change = fall * flow * protectFactor;
            const factor = mode === 'saturate' ? 1 + change : 1 - change;
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

function makeToneTool(id: string, label: string, state: S, opts: ToneToolOptions, baseMode: 'dodge' | 'burn'): Tool {
    // Alt held while painting flips the operation (Dodge ⇄ Burn) without
    // committing the swap — matches Photoshop's "temporary opposite" modifier.
    const resolveMode = (alt: boolean): 'dodge' | 'burn' => (
        alt ? (baseMode === 'dodge' ? 'burn' : 'dodge') : baseMode
    );
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
            state.before = captureLayerRegion(layer, { x: 0, y: 0, width: layer.canvas.width, height: layer.canvas.height });
            state.bounds = makeStrokeBounds();
            const { size } = store.brushSettings;
            applyDodgeBurn(layer.ctx, state.last.x, state.last.y, size, opts.exposure, opts.range, resolveMode(e.alt));
            expandStrokeBounds(state.bounds, state.last.x, state.last.y, size / 2 + 1);
            layer.markDirty(null);
        },
        onPointerMove: (e, ctx) => {
            if (!state.last || !state.layerId) return;
            const store = ctx.getStore();
            const layer = store.layers.find(l => l.id === state.layerId);
            if (!layer) return;
            const next = p(e);
            const { size, hardness } = store.brushSettings;
            const mode = resolveMode(e.alt);
            const dist = Math.hypot(next.x - state.last.x, next.y - state.last.y);
            const steps = Math.max(1, Math.ceil(dist / Math.max(1, size * 0.25)));
            for (let i = 1; i <= steps; i++) {
                const t = i / steps;
                const x = state.last.x + (next.x - state.last.x) * t;
                const y = state.last.y + (next.y - state.last.y) * t;
                applyDodgeBurn(layer.ctx, x, y, size, opts.exposure, opts.range, mode);
                expandStrokeBounds(state.bounds, x, y, size / 2 + 1);
            }
            void getBrushTip({ size, hardness, color: '#ffffff' });
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
                    store.commitHistory(createPixelHistoryAction(layer, rect, beforeCropped, label === 'Dodge' ? 'Dodge' : 'Burn'));
                }
            }
            state.last = null;
            state.layerId = null;
            state.before = null;
            state.bounds = makeStrokeBounds();
        },
    };
}

export const dodgeTool = makeToneTool('dodge', 'Dodge', dodgeState, dodge, 'dodge');
export const burnTool = makeToneTool('burn', 'Burn', burnState, burn, 'burn');

function spongeStep(store: EditorStore, x: number, y: number): void {
    const layer = store.layers.find(l => l.id === spongeState.layerId);
    if (!layer) return;
    const { size, flow } = store.brushSettings;
    applySponge(layer.ctx, x, y, size, flow, sponge.mode, sponge.vibrance);
    expandStrokeBounds(spongeState.bounds, x, y, size / 2 + 1);
    layer.markDirty(null);
}

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
        spongeState.before = captureLayerRegion(layer, { x: 0, y: 0, width: layer.canvas.width, height: layer.canvas.height });
        spongeState.bounds = makeStrokeBounds();
        spongeStep(store, spongeState.last.x, spongeState.last.y);
    },
    onPointerMove: (e, ctx) => {
        if (!spongeState.last || !spongeState.layerId) return;
        const store = ctx.getStore();
        const next = p(e);
        spongeStep(store, next.x, next.y);
        spongeState.last = next;
    },
    onPointerUp: (_e, ctx) => {
        if (spongeState.layerId && spongeState.before) {
            const store = ctx.getStore();
            const layer = store.layers.find(l => l.id === spongeState.layerId);
            if (layer) {
                const rect = strokeBoundsToRect(spongeState.bounds, layer.canvas.width, layer.canvas.height)
                    ?? { x: 0, y: 0, width: layer.canvas.width, height: layer.canvas.height };
                const beforeCropped = cropImageData(spongeState.before, rect.x, rect.y, rect.width, rect.height);
                store.commitHistory(createPixelHistoryAction(layer, rect, beforeCropped, 'Sponge'));
            }
        }
        spongeState.last = null;
        spongeState.layerId = null;
        spongeState.before = null;
        spongeState.bounds = makeStrokeBounds();
    },
};

registerTool(dodgeTool);
registerTool(burnTool);
registerTool(spongeTool);
