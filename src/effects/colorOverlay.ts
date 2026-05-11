import type { Effect, EffectRenderContext, EffectRenderResult } from './Effect';
import { registerEffect } from './registry';

interface ColorOverlayParams {
    color: string;
    opacity: number; // 0..1
    blendMode: GlobalCompositeOperation;
}

const defaultParams: ColorOverlayParams = {
    color: '#ff0000',
    opacity: 1,
    blendMode: 'source-over',
};

export const colorOverlayEffect: Effect = {
    kind: 'color-overlay',
    label: 'Color Overlay',
    defaultParams: defaultParams as unknown as Record<string, unknown>,
    apply(params, context: EffectRenderContext): EffectRenderResult {
        const p = { ...defaultParams, ...(params as Partial<ColorOverlayParams>) };
        const out = document.createElement('canvas');
        out.width = context.width;
        out.height = context.height;
        const ctx = out.getContext('2d');
        if (!ctx) return { canvas: out, placement: 'overlay', blendMode: p.blendMode, opacity: p.opacity };
        ctx.drawImage(context.layerCanvas, 0, 0);
        ctx.globalCompositeOperation = 'source-in';
        ctx.fillStyle = p.color;
        ctx.fillRect(0, 0, out.width, out.height);
        return { canvas: out, placement: 'overlay', blendMode: p.blendMode, opacity: p.opacity };
    },
};

registerEffect(colorOverlayEffect);
