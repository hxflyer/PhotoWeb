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

        // Spread (0..1) hardens the shadow edge by dilating the silhouette by
        // `spread * size` pixels, then blurring by the remaining `(1 - spread) *
        // size` budget. At spread=0 the shadow is a soft Gaussian; at spread=1
        // it's a hard, slightly-grown silhouette. This mirrors Photoshop's
        // semantics: "Spread" enlarges the matte boundaries of the shadow
        // before the Size blur is applied.
        const rad = (p.angle * Math.PI) / 180;
        const dx = Math.cos(rad) * p.distance;
        const dy = Math.sin(rad) * p.distance;
        const sizePx = Math.max(0, p.size);
        const spreadFrac = Math.max(0, Math.min(1, p.spread));
        const dilatePx = Math.round(spreadFrac * sizePx);
        const blurPx = Math.max(0, sizePx - dilatePx);

        // Dilate by stamping the tinted silhouette at small radial offsets so
        // every pixel within `dilatePx` of an opaque pixel becomes opaque too.
        // 8 cardinal/diagonal stamps approximate a circular dilation.
        const dilated = document.createElement('canvas');
        dilated.width = out.width;
        dilated.height = out.height;
        const dctx = dilated.getContext('2d');
        if (!dctx) return { canvas: out, placement: 'underlay', blendMode: p.blendMode, opacity: p.opacity };
        dctx.drawImage(out, 0, 0);
        if (dilatePx > 0) {
            const offsets: Array<[number, number]> = [
                [dilatePx, 0], [-dilatePx, 0], [0, dilatePx], [0, -dilatePx],
                [dilatePx, dilatePx], [-dilatePx, dilatePx], [dilatePx, -dilatePx], [-dilatePx, -dilatePx],
            ];
            for (const [ox, oy] of offsets) dctx.drawImage(out, ox, oy);
        }

        // Blur the (possibly dilated) silhouette by the remaining size budget.
        const blurred = document.createElement('canvas');
        blurred.width = out.width;
        blurred.height = out.height;
        const bctx = blurred.getContext('2d');
        if (!bctx) return { canvas: dilated, placement: 'underlay', blendMode: p.blendMode, opacity: p.opacity };
        if (blurPx > 0) {
            bctx.filter = `blur(${blurPx}px)`;
            bctx.drawImage(dilated, 0, 0);
            bctx.filter = 'none';
        } else {
            bctx.drawImage(dilated, 0, 0);
        }

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
