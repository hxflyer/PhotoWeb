import type { Effect, EffectRenderContext, EffectRenderResult } from './Effect';
import { registerEffect } from './registry';
import { getPatternTile } from '../store/toolsSlice';

interface PatternOverlayParams {
    patternId: string;
    scale: number;        // 0..200, percent
    opacity: number;      // 0..1
    blendMode: GlobalCompositeOperation;
}

const defaultParams: PatternOverlayParams = {
    patternId: '',
    scale: 100,
    opacity: 1,
    blendMode: 'source-over',
};

function scaleTile(tile: HTMLCanvasElement, scalePct: number): HTMLCanvasElement {
    const factor = Math.max(0.01, scalePct / 100);
    if (Math.abs(factor - 1) < 1e-3) return tile;
    // Round to integer dimensions so the wrap modulo aligns exactly at the
    // canvas seam (a fractional tile width would leave a 1px gap between
    // the last column and the wrap back to column 0).
    const out = document.createElement('canvas');
    out.width = Math.max(1, Math.round(tile.width * factor));
    out.height = Math.max(1, Math.round(tile.height * factor));
    const ctx = out.getContext('2d');
    if (!ctx) return tile;
    ctx.imageSmoothingEnabled = factor < 1;
    ctx.drawImage(tile, 0, 0, out.width, out.height);
    return out;
}

export const patternOverlayEffect: Effect = {
    kind: 'pattern-overlay',
    label: 'Pattern Overlay',
    defaultParams: defaultParams as unknown as Record<string, unknown>,
    apply(params, context: EffectRenderContext): EffectRenderResult | null {
        const p = { ...defaultParams, ...(params as Partial<PatternOverlayParams>) };
        const w = context.width;
        const h = context.height;
        const empty: EffectRenderResult = {
            canvas: document.createElement('canvas'),
            placement: 'overlay',
            blendMode: p.blendMode,
            opacity: p.opacity,
        };
        empty.canvas.width = w;
        empty.canvas.height = h;

        if (!p.patternId) return null;
        const baseTile = getPatternTile(p.patternId);
        if (!baseTile) return null;
        const tile = scaleTile(baseTile, p.scale);
        const tileW = tile.width;
        const tileH = tile.height;
        if (tileW === 0 || tileH === 0) return null;

        // Tile the pattern across the layer dimensions via getImageData /
        // putImageData. We sample with modulo from (0,0) so the wrap aligns
        // at the canvas seam exactly: pixel (tileW-1) and pixel (0 + tileW)
        // both map to tile column 0, guaranteeing seamless tiling regardless
        // of the scale percentage.
        const out = document.createElement('canvas');
        out.width = w; out.height = h;
        const octx = out.getContext('2d');
        if (!octx) return empty;
        const tileCtx = tile.getContext('2d');
        if (!tileCtx) return empty;
        const tileImg = tileCtx.getImageData(0, 0, tileW, tileH);
        const td = tileImg.data;
        const fillImg = octx.createImageData(w, h);
        const fd = fillImg.data;
        for (let y = 0; y < h; y++) {
            const ty = ((y % tileH) + tileH) % tileH;
            const rowBase = ty * tileW;
            for (let x = 0; x < w; x++) {
                const tx = ((x % tileW) + tileW) % tileW;
                const ti = (rowBase + tx) * 4;
                const j = (y * w + x) * 4;
                fd[j]     = td[ti];
                fd[j + 1] = td[ti + 1];
                fd[j + 2] = td[ti + 2];
                fd[j + 3] = td[ti + 3];
            }
        }
        octx.putImageData(fillImg, 0, 0);

        // Clip to layer alpha (source-in) so the pattern only paints inside.
        octx.globalCompositeOperation = 'destination-in';
        octx.drawImage(context.layerCanvas, 0, 0);
        octx.globalCompositeOperation = 'source-over';

        return { canvas: out, placement: 'overlay', blendMode: p.blendMode, opacity: p.opacity };
    },
};

registerEffect(patternOverlayEffect);
