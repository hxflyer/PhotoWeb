import type { Effect, EffectRenderContext, EffectRenderResult } from './Effect';
import { registerEffect } from './registry';

interface StrokeParams {
    size: number;     // px
    position: 'outside' | 'center' | 'inside';
    color: string;
    opacity: number;  // 0..1
    blendMode: GlobalCompositeOperation;
}

const defaultParams: StrokeParams = {
    size: 3,
    position: 'outside',
    color: '#000000',
    opacity: 1,
    blendMode: 'source-over',
};

function dilateAlpha(canvas: HTMLCanvasElement, radius: number): HTMLCanvasElement {
    const out = document.createElement('canvas');
    out.width = canvas.width;
    out.height = canvas.height;
    const ctx = out.getContext('2d');
    if (!ctx) return out;
    // Draw the alpha 8 times around the center, offset by `radius`. Cheap
    // approximation; not pixel-perfect but matches the visual feel of a stroke.
    const offsets = [
        [-radius, 0], [radius, 0], [0, -radius], [0, radius],
        [-radius, -radius], [radius, -radius], [-radius, radius], [radius, radius],
    ];
    for (const [dx, dy] of offsets) ctx.drawImage(canvas, dx, dy);
    return out;
}

export const strokeEffect: Effect = {
    kind: 'stroke',
    label: 'Stroke',
    defaultParams: defaultParams as unknown as Record<string, unknown>,
    apply(params, context: EffectRenderContext): EffectRenderResult | null {
        const p = { ...defaultParams, ...(params as Partial<StrokeParams>) };
        if (p.size <= 0) return null;
        const dilated = dilateAlpha(context.layerCanvas, p.size);

        const out = document.createElement('canvas');
        out.width = context.width;
        out.height = context.height;
        const ctx = out.getContext('2d');
        if (!ctx) return { canvas: out, placement: 'overlay', blendMode: p.blendMode, opacity: p.opacity };

        if (p.position === 'outside') {
            // Outside ring = dilated minus original alpha.
            ctx.drawImage(dilated, 0, 0);
            ctx.globalCompositeOperation = 'destination-out';
            ctx.drawImage(context.layerCanvas, 0, 0);
            ctx.globalCompositeOperation = 'source-in';
            ctx.fillStyle = p.color;
            ctx.fillRect(0, 0, out.width, out.height);
            return { canvas: out, placement: 'underlay', blendMode: p.blendMode, opacity: p.opacity };
        }
        if (p.position === 'inside') {
            // Inside ring = original alpha minus eroded alpha.
            // Erode by drawing original minus dilation-of-inverse — approximate with
            // original alpha clipped to dilated-inverse complement. Simpler: subtract
            // the dilated mask from the original alpha gives an inner ring.
            ctx.drawImage(context.layerCanvas, 0, 0);
            ctx.globalCompositeOperation = 'destination-out';
            const eroded = dilateAlpha(context.layerCanvas, -p.size);
            ctx.drawImage(eroded, 0, 0);
            ctx.globalCompositeOperation = 'source-in';
            ctx.fillStyle = p.color;
            ctx.fillRect(0, 0, out.width, out.height);
            return { canvas: out, placement: 'overlay', blendMode: p.blendMode, opacity: p.opacity };
        }
        // center: half outside, half inside.
        const r = Math.max(1, Math.round(p.size / 2));
        const outerRing = dilateAlpha(context.layerCanvas, r);
        ctx.drawImage(outerRing, 0, 0);
        ctx.globalCompositeOperation = 'destination-out';
        const innerRing = dilateAlpha(context.layerCanvas, -r);
        ctx.drawImage(innerRing, 0, 0);
        ctx.globalCompositeOperation = 'source-in';
        ctx.fillStyle = p.color;
        ctx.fillRect(0, 0, out.width, out.height);
        return { canvas: out, placement: 'overlay', blendMode: p.blendMode, opacity: p.opacity };
    },
};

registerEffect(strokeEffect);
