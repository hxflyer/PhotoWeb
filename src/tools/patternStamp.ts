/**
 * Pattern Stamp — paints with the active pattern preset as a tile, similar
 * to Clone Stamp but with a pattern source instead of an Alt-sampled patch.
 *
 * Photoshop options:
 *   - Mode: blend mode
 *   - Opacity / Flow: standard brush sliders (read from store.brushSettings)
 *   - Aligned: when on, the pattern tile origin stays in the document and
 *              successive strokes line up; when off, each stroke restarts
 *              the tile at the click point.
 *   - Sample All Layers: deferred (matches paintBucket behavior).
 *   - Impressionist: optional artsy mode that paints with the tile's
 *                    average color rather than the tile bitmap — defer.
 */
import type { Tool, ToolPointerEvent } from './Tool';
import { registerTool } from './registry';
import { getBrushTip } from './brush';
import { getPatternTile } from '../store/toolsSlice';
import {
    captureLayerRegion, createPixelHistoryAction, cropImageData,
    expandStrokeBounds, makeStrokeBounds, strokeBoundsToRect, type StrokeBounds,
} from '../core/history';

export interface PatternStampOptions {
    aligned: boolean;
    mode: GlobalCompositeOperation;
}

let options: PatternStampOptions = { aligned: true, mode: 'source-over' };

export function setPatternStampOptions(next: Partial<PatternStampOptions>): void {
    options = { ...options, ...next };
}

export function getPatternStampOptions(): PatternStampOptions {
    return { ...options };
}

interface State {
    last: { x: number; y: number } | null;
    layerId: string | null;
    before: ImageData | null;
    bounds: StrokeBounds;
    /** Origin point that the pattern tile is anchored to. Re-used across
     *  strokes when `aligned` is true. */
    tileOrigin: { x: number; y: number } | null;
    leftover: number;
}

const state: State = { last: null, layerId: null, before: null, bounds: makeStrokeBounds(), tileOrigin: null, leftover: 0 };

function p(e: ToolPointerEvent) { return { x: e.canvasX, y: e.canvasY }; }

function getActivePatternTile(activeId: string | null): HTMLCanvasElement | null {
    if (!activeId) return null;
    return getPatternTile(activeId);
}

function stampTile(
    layerCtx: CanvasRenderingContext2D,
    tile: HTMLCanvasElement,
    cx: number, cy: number,
    size: number, hardness: number, opacity: number,
    tileOrigin: { x: number; y: number },
): void {
    // Brush tip = soft circular mask. We draw the pattern tile through the
    // brush mask by clipping to the tip, offset so the tile lines up with
    // the global tileOrigin (so successive stamps align when `aligned` is
    // true).
    const r = size / 2;
    const tipMask = getBrushTip({ size, hardness, color: '#ffffff' });
    const intermediate = document.createElement('canvas');
    intermediate.width = Math.max(1, Math.ceil(size));
    intermediate.height = Math.max(1, Math.ceil(size));
    const ictx = intermediate.getContext('2d');
    if (!ictx) return;
    // 1. Stamp the tile into the intermediate, repeating to cover the brush
    //    footprint with the global tile origin alignment.
    const tx = ((cx - r - tileOrigin.x) % tile.width + tile.width) % tile.width;
    const ty = ((cy - r - tileOrigin.y) % tile.height + tile.height) % tile.height;
    for (let py = -ty; py < intermediate.height; py += tile.height) {
        for (let px = -tx; px < intermediate.width; px += tile.width) {
            ictx.drawImage(tile, px, py);
        }
    }
    // 2. Multiply by the brush tip's alpha to get a soft round stamp.
    ictx.globalCompositeOperation = 'destination-in';
    ictx.drawImage(tipMask, 0, 0);
    // 3. Composite the result onto the target layer with the chosen mode.
    layerCtx.save();
    layerCtx.globalAlpha = opacity;
    layerCtx.globalCompositeOperation = options.mode;
    layerCtx.drawImage(intermediate, cx - r, cy - r);
    layerCtx.restore();
}

export const patternStampTool: Tool = {
    id: 'pattern-stamp',
    label: 'Pattern Stamp',
    cursor: 'crosshair',
    onPointerDown: (e, ctx) => {
        if (e.button !== 0) return;
        const store = ctx.getStore();
        const layer = store.layers.find(l => l.id === store.activeLayerId);
        if (!layer) return;
        const tile = getActivePatternTile(store.activePatternId);
        if (!tile) return;
        state.last = p(e);
        state.layerId = layer.id;
        state.before = captureLayerRegion(layer, { x: 0, y: 0, width: layer.canvas.width, height: layer.canvas.height });
        state.bounds = makeStrokeBounds();
        state.leftover = 0;
        // Tile origin: when Aligned is off OR there's no remembered origin,
        // reset to the click point so the tile starts here.
        if (!options.aligned || !state.tileOrigin) {
            state.tileOrigin = { x: state.last.x, y: state.last.y };
        }
        const { size, hardness, opacity } = store.brushSettings;
        stampTile(layer.ctx, tile, state.last.x, state.last.y, size, hardness, opacity, state.tileOrigin);
        expandStrokeBounds(state.bounds, state.last.x, state.last.y, size / 2 + 1);
        layer.markDirty(null);
    },
    onPointerMove: (e, ctx) => {
        if (!state.last || !state.layerId) return;
        const store = ctx.getStore();
        const layer = store.layers.find(l => l.id === state.layerId);
        if (!layer) return;
        const tile = getActivePatternTile(store.activePatternId);
        if (!tile || !state.tileOrigin) return;
        const next = p(e);
        const { size, hardness, opacity } = store.brushSettings;
        const dx = next.x - state.last.x;
        const dy = next.y - state.last.y;
        const dist = Math.hypot(dx, dy);
        const spacing = Math.max(1, size * 0.15);
        const start = spacing - state.leftover;
        let i = start;
        while (i <= dist) {
            const sx = state.last.x + (dx * i) / (dist || 1);
            const sy = state.last.y + (dy * i) / (dist || 1);
            stampTile(layer.ctx, tile, sx, sy, size, hardness, opacity, state.tileOrigin);
            expandStrokeBounds(state.bounds, sx, sy, size / 2 + 1);
            i += spacing;
        }
        const lastStamp = i - spacing;
        state.leftover = lastStamp < start ? state.leftover + dist : dist - lastStamp;
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
                store.commitHistory(createPixelHistoryAction(layer, rect, beforeCropped, 'Pattern Stamp'));
            }
        }
        state.last = null;
        state.layerId = null;
        state.before = null;
        state.bounds = makeStrokeBounds();
        state.leftover = 0;
    },
};

registerTool(patternStampTool);
