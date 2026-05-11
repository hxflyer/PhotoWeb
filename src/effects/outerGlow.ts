import type { Effect, EffectRenderContext, EffectRenderResult } from './Effect';
import { registerEffect } from './registry';

interface OuterGlowParams {
    color: string;
    opacity: number;     // 0..1
    spread: number;      // 0..1 — fraction of size expanded before blur
    size: number;        // blur radius px
    blendMode: GlobalCompositeOperation;
}

const defaultParams: OuterGlowParams = {
    color: '#ffff80',
    opacity: 0.75,
    spread: 0,
    size: 10,
    blendMode: 'screen',
};

function dilateAlpha(canvas: HTMLCanvasElement, radius: number): HTMLCanvasElement {
    const out = document.createElement('canvas');
    out.width = canvas.width;
    out.height = canvas.height;
    const ctx = out.getContext('2d');
    if (!ctx || radius <= 0) {
        if (ctx) ctx.drawImage(canvas, 0, 0);
        return out;
    }
    const offsets = [
        [-radius, 0], [radius, 0], [0, -radius], [0, radius],
        [-radius, -radius], [radius, -radius], [-radius, radius], [radius, radius],
    ];
    ctx.drawImage(canvas, 0, 0);
    for (const [dx, dy] of offsets) ctx.drawImage(canvas, dx, dy);
    return out;
}

export const outerGlowEffect: Effect = {
    kind: 'outer-glow',
    label: 'Outer Glow',
    defaultParams: defaultParams as unknown as Record<string, unknown>,
    apply(params, context: EffectRenderContext): EffectRenderResult | null {
        const p = { ...defaultParams, ...(params as Partial<OuterGlowParams>) };
        const w = context.width;
        const h = context.height;
        if (p.size <= 0 && p.spread <= 0) return null;

        // Expand the alpha by the spread amount (a fraction of size). This
        // gives the glow a denser, harder core before the blur fades it out.
        const spreadPx = Math.max(0, Math.round(Math.max(0, Math.min(1, p.spread)) * p.size));
        const dilated = spreadPx > 0 ? dilateAlpha(context.layerCanvas, spreadPx) : context.layerCanvas;

        // Tint the (dilated) silhouette to the glow color, then blur it.
        const tinted = document.createElement('canvas');
        tinted.width = w; tinted.height = h;
        const tctx = tinted.getContext('2d');
        const empty: EffectRenderResult = {
            canvas: tinted,
            placement: 'underlay',
            blendMode: p.blendMode,
            opacity: p.opacity,
        };
        if (!tctx) return empty;
        tctx.drawImage(dilated, 0, 0);
        tctx.globalCompositeOperation = 'source-in';
        tctx.fillStyle = p.color;
        tctx.fillRect(0, 0, w, h);
        tctx.globalCompositeOperation = 'source-over';

        const blurred = document.createElement('canvas');
        blurred.width = w; blurred.height = h;
        const bctx = blurred.getContext('2d');
        if (!bctx) return empty;
        if (p.size > 0) {
            bctx.filter = `blur(${Math.max(0, p.size)}px)`;
            bctx.drawImage(tinted, 0, 0);
            bctx.filter = 'none';
        } else {
            bctx.drawImage(tinted, 0, 0);
        }

        // Punch the original layer alpha out of the blurred glow so the glow
        // only contributes OUTSIDE the layer — the layer pixels themselves
        // will cover the center when the compositor draws the underlay.
        bctx.globalCompositeOperation = 'destination-out';
        bctx.drawImage(context.layerCanvas, 0, 0);
        bctx.globalCompositeOperation = 'source-over';

        return { canvas: blurred, placement: 'underlay', blendMode: p.blendMode, opacity: p.opacity };
    },
};

registerEffect(outerGlowEffect);
