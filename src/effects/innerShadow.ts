import type { Effect, EffectRenderContext, EffectRenderResult } from './Effect';
import { registerEffect } from './registry';

interface InnerShadowParams {
    color: string;
    opacity: number;     // 0..1
    angle: number;       // degrees
    distance: number;    // px
    choke: number;       // 0..1 — sharpens the inner edge (analogous to spread)
    size: number;        // blur radius px
    blendMode: GlobalCompositeOperation;
}

const defaultParams: InnerShadowParams = {
    color: '#000000',
    opacity: 0.5,
    angle: 135,
    distance: 5,
    choke: 0,
    size: 8,
    blendMode: 'multiply',
};

export const innerShadowEffect: Effect = {
    kind: 'inner-shadow',
    label: 'Inner Shadow',
    defaultParams: defaultParams as unknown as Record<string, unknown>,
    apply(params, context: EffectRenderContext): EffectRenderResult {
        const p = { ...defaultParams, ...(params as Partial<InnerShadowParams>) };
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

        // Invert the layer alpha into a silhouette. Painting opaque over the
        // whole frame and erasing the layer's alpha yields a canvas that is
        // opaque OUTSIDE the layer and transparent INSIDE.
        const inverted = document.createElement('canvas');
        inverted.width = w; inverted.height = h;
        const ictx = inverted.getContext('2d');
        if (!ictx) return empty;
        ictx.fillStyle = '#000000';
        ictx.fillRect(0, 0, w, h);
        ictx.globalCompositeOperation = 'destination-out';
        ictx.drawImage(context.layerCanvas, 0, 0);
        ictx.globalCompositeOperation = 'source-over';

        // Offset the inverted silhouette and blur it. The choke parameter
        // intensifies the opaque core by stamping the silhouette multiple
        // times before the blur, sharpening the resulting edge.
        const rad = (p.angle * Math.PI) / 180;
        const dx = Math.cos(rad) * p.distance;
        const dy = Math.sin(rad) * p.distance;
        const chokePasses = 1 + Math.round(Math.max(0, Math.min(1, p.choke)) * 8);

        const shifted = document.createElement('canvas');
        shifted.width = w; shifted.height = h;
        const sctx = shifted.getContext('2d');
        if (!sctx) return empty;
        for (let i = 0; i < chokePasses; i++) sctx.drawImage(inverted, dx, dy);
        if (p.size > 0) {
            const blurred = document.createElement('canvas');
            blurred.width = w; blurred.height = h;
            const bctx = blurred.getContext('2d');
            if (!bctx) return empty;
            bctx.filter = `blur(${Math.max(0, p.size)}px)`;
            bctx.drawImage(shifted, 0, 0);
            bctx.filter = 'none';
            sctx.clearRect(0, 0, w, h);
            sctx.drawImage(blurred, 0, 0);
        }

        // Tint the silhouette to the shadow color.
        sctx.globalCompositeOperation = 'source-in';
        sctx.fillStyle = p.color;
        sctx.fillRect(0, 0, w, h);
        sctx.globalCompositeOperation = 'source-over';

        // Clip the tinted shadow to the layer's alpha so it only paints INSIDE
        // the layer (the cutout illusion).
        const out = document.createElement('canvas');
        out.width = w; out.height = h;
        const octx = out.getContext('2d');
        if (!octx) return empty;
        octx.drawImage(context.layerCanvas, 0, 0);
        octx.globalCompositeOperation = 'source-in';
        octx.drawImage(shifted, 0, 0);

        return { canvas: out, placement: 'overlay', blendMode: p.blendMode, opacity: p.opacity };
    },
};

registerEffect(innerShadowEffect);
