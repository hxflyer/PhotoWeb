import type { Effect, EffectRenderContext, EffectRenderResult } from './Effect';
import { registerEffect } from './registry';

interface InnerGlowParams {
    color: string;
    opacity: number;     // 0..1
    choke: number;       // 0..1 — sharpens the inner glow edge
    size: number;        // blur radius px
    blendMode: GlobalCompositeOperation;
}

const defaultParams: InnerGlowParams = {
    color: '#ffff80',
    opacity: 0.75,
    choke: 0,
    size: 10,
    blendMode: 'screen',
};

function erodeAlpha(canvas: HTMLCanvasElement, radius: number): HTMLCanvasElement {
    const out = document.createElement('canvas');
    out.width = canvas.width;
    out.height = canvas.height;
    const ctx = out.getContext('2d');
    if (!ctx || radius <= 0) {
        if (ctx) ctx.drawImage(canvas, 0, 0);
        return out;
    }
    // Erosion = intersection of the alpha with neighbour-shifted alphas. Start
    // with the original, then for each cardinal/diagonal offset use
    // destination-in against the shifted copy so only pixels covered by ALL
    // shifts (i.e. far enough from any edge) survive.
    ctx.drawImage(canvas, 0, 0);
    const offsets = [
        [-radius, 0], [radius, 0], [0, -radius], [0, radius],
        [-radius, -radius], [radius, -radius], [-radius, radius], [radius, radius],
    ];
    const shift = document.createElement('canvas');
    shift.width = canvas.width;
    shift.height = canvas.height;
    const sctx = shift.getContext('2d');
    if (!sctx) return out;
    for (const [dx, dy] of offsets) {
        sctx.clearRect(0, 0, shift.width, shift.height);
        sctx.drawImage(canvas, dx, dy);
        ctx.globalCompositeOperation = 'destination-in';
        ctx.drawImage(shift, 0, 0);
    }
    ctx.globalCompositeOperation = 'source-over';
    return out;
}

export const innerGlowEffect: Effect = {
    kind: 'inner-glow',
    label: 'Inner Glow',
    defaultParams: defaultParams as unknown as Record<string, unknown>,
    apply(params, context: EffectRenderContext): EffectRenderResult | null {
        const p = { ...defaultParams, ...(params as Partial<InnerGlowParams>) };
        const w = context.width;
        const h = context.height;
        if (p.size <= 0 && p.choke <= 0) return null;

        // Inner Glow emanates inward from the alpha edge. Algorithm:
        //   1. Erode the layer alpha by `choke * size` BEFORE the blur. Choke
        //      pulls the bright edge inward so a high choke produces a tight,
        //      sharp inner band rather than a soft uniform glow.
        //   2. Build the "rim mask" = original alpha MINUS the eroded alpha
        //      (so it's the band the glow fades from). At choke=0 we still
        //      need a finite rim, so the floor erode is at least 1 px.
        //   3. Blur the rim mask by `(1 - choke) * size` so a higher choke
        //      keeps the band crisp and a lower choke spreads it inward.
        //   4. Tint, clip to original alpha → only paints inside.
        const empty: EffectRenderResult = {
            canvas: document.createElement('canvas'),
            placement: 'overlay',
            blendMode: p.blendMode,
            opacity: p.opacity,
        };
        empty.canvas.width = w;
        empty.canvas.height = h;

        const chokeFrac = Math.max(0, Math.min(1, p.choke));
        // Choke modulates the rim BEFORE blur. The floor of 1px guarantees a
        // non-empty band at choke=0 so the glow has something to bleed in from.
        const rimErodePx = Math.max(1, Math.round(chokeFrac * Math.max(1, p.size)));
        const eroded = erodeAlpha(context.layerCanvas, rimErodePx);
        const blurPx = Math.max(0, p.size * (1 - chokeFrac));

        // Punch eroded silhouette out of the original alpha → band along the edge.
        const band = document.createElement('canvas');
        band.width = w; band.height = h;
        const ictx = band.getContext('2d');
        if (!ictx) return empty;
        ictx.drawImage(context.layerCanvas, 0, 0);
        ictx.globalCompositeOperation = 'destination-out';
        ictx.drawImage(eroded, 0, 0);
        ictx.globalCompositeOperation = 'source-over';

        // Blur the band so it falls off into the interior. With high choke the
        // band is wider and the blur is small → crisp; with low choke the band
        // is the floor (1px) and the blur is large → soft, spread-out glow.
        const blurred = document.createElement('canvas');
        blurred.width = w; blurred.height = h;
        const bctx = blurred.getContext('2d');
        if (!bctx) return empty;
        if (blurPx > 0) {
            bctx.filter = `blur(${blurPx}px)`;
            bctx.drawImage(band, 0, 0);
            bctx.filter = 'none';
        } else {
            bctx.drawImage(band, 0, 0);
        }

        // Tint to the glow color.
        bctx.globalCompositeOperation = 'source-in';
        bctx.fillStyle = p.color;
        bctx.fillRect(0, 0, w, h);
        bctx.globalCompositeOperation = 'source-over';

        // Clip to the layer alpha so the glow only paints INSIDE the silhouette.
        const out = document.createElement('canvas');
        out.width = w; out.height = h;
        const octx = out.getContext('2d');
        if (!octx) return empty;
        octx.drawImage(context.layerCanvas, 0, 0);
        octx.globalCompositeOperation = 'source-in';
        octx.drawImage(blurred, 0, 0);

        return { canvas: out, placement: 'overlay', blendMode: p.blendMode, opacity: p.opacity };
    },
};

registerEffect(innerGlowEffect);
