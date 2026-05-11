import type { Effect, EffectRenderContext, EffectRenderResult } from './Effect';
import { registerEffect } from './registry';

interface DropShadowParams {
    color: string;
    opacity: number;     // 0..1
    angle: number;       // degrees
    distance: number;    // px
    spread: number;      // 0..1 — fraction of size that is hardened (no blur)
    size: number;        // blur radius px
    blendMode: GlobalCompositeOperation;
}

const defaultParams: DropShadowParams = {
    color: '#000000',
    opacity: 0.5,
    angle: 135,
    distance: 5,
    spread: 0,
    size: 8,
    blendMode: 'source-over',
};

export const dropShadowEffect: Effect = {
    kind: 'drop-shadow',
    label: 'Drop Shadow',
    defaultParams: defaultParams as unknown as Record<string, unknown>,
    apply(params, context: EffectRenderContext): EffectRenderResult {
        const p = { ...defaultParams, ...(params as Partial<DropShadowParams>) };
        const out = document.createElement('canvas');
        out.width = context.width;
        out.height = context.height;
        const ctx = out.getContext('2d');
        if (!ctx) return { canvas: out, placement: 'underlay', blendMode: p.blendMode, opacity: p.opacity };

        // Tint the layer's alpha to the shadow color: source-over the layer,
        // then source-in fill with the chosen color.
        ctx.drawImage(context.layerCanvas, 0, 0);
        ctx.globalCompositeOperation = 'source-in';
        ctx.fillStyle = p.color;
        ctx.fillRect(0, 0, out.width, out.height);
        ctx.globalCompositeOperation = 'source-over';

        // Blur with a spread by drawing the silhouette multiple times to bake
        // in the hardened core, then a final blurred pass.
        const blurred = document.createElement('canvas');
        blurred.width = out.width;
        blurred.height = out.height;
        const bctx = blurred.getContext('2d');
        if (!bctx) return { canvas: out, placement: 'underlay', blendMode: p.blendMode, opacity: p.opacity };
        const rad = (p.angle * Math.PI) / 180;
        const dx = Math.cos(rad) * p.distance;
        const dy = Math.sin(rad) * p.distance;
        // Pre-blur "spread" intensifies opaque core; we approximate by drawing the
        // tinted silhouette N times where N grows with spread.
        const spreadPasses = 1 + Math.round(p.spread * 8);
        for (let i = 0; i < spreadPasses; i++) bctx.drawImage(out, 0, 0);
        bctx.filter = `blur(${Math.max(0, p.size)}px)`;
        bctx.drawImage(out, 0, 0);
        bctx.filter = 'none';

        // Place the blurred silhouette at the offset.
        const placed = document.createElement('canvas');
        placed.width = out.width;
        placed.height = out.height;
        const pctx = placed.getContext('2d');
        if (!pctx) return { canvas: blurred, placement: 'underlay', blendMode: p.blendMode, opacity: p.opacity };
        pctx.drawImage(blurred, dx, dy);

        return { canvas: placed, placement: 'underlay', blendMode: p.blendMode, opacity: p.opacity };
    },
};

registerEffect(dropShadowEffect);
