import type { Effect, EffectRenderContext, EffectRenderResult } from './Effect';
import { registerEffect } from './registry';
import { renderGradientCanvas, type GradientStop, type GradientType } from '../tools/gradient';
import type { GradientColorStop, GradientOpacityStop } from '../store/types';

interface GradientOverlayParams {
    colorStops: GradientColorStop[];
    opacityStops: GradientOpacityStop[];
    gradientType: GradientType;
    angle: number;        // degrees
    scale: number;        // 0..200, percent
    reverse: boolean;
    opacity: number;      // 0..1
    blendMode: GlobalCompositeOperation;
}

const defaultParams: GradientOverlayParams = {
    colorStops: [
        { position: 0, color: '#000000' },
        { position: 1, color: '#ffffff' },
    ],
    opacityStops: [
        { position: 0, opacity: 1 },
        { position: 1, opacity: 1 },
    ],
    gradientType: 'linear',
    angle: 0,
    scale: 100,
    reverse: false,
    opacity: 1,
    blendMode: 'source-over',
};

function interpolateOpacity(stops: GradientOpacityStop[], t: number): number {
    if (stops.length === 0) return 1;
    const sorted = [...stops].sort((a, b) => a.position - b.position);
    if (t <= sorted[0].position) return sorted[0].opacity;
    if (t >= sorted[sorted.length - 1].position) return sorted[sorted.length - 1].opacity;
    let lo = sorted[0]; let hi = sorted[sorted.length - 1];
    for (let i = 0; i < sorted.length - 1; i++) {
        if (t >= sorted[i].position && t <= sorted[i + 1].position) {
            lo = sorted[i]; hi = sorted[i + 1]; break;
        }
    }
    const span = hi.position - lo.position || 1;
    const k = (t - lo.position) / span;
    return lo.opacity + (hi.opacity - lo.opacity) * k;
}

function mergeStops(colorStops: GradientColorStop[], opacityStops: GradientOpacityStop[]): GradientStop[] {
    const cs = [...colorStops].sort((a, b) => a.position - b.position);
    return cs.map(s => ({
        position: s.position,
        color: s.color,
        opacity: interpolateOpacity(opacityStops, s.position),
    }));
}

export const gradientOverlayEffect: Effect = {
    kind: 'gradient-overlay',
    label: 'Gradient Overlay',
    defaultParams: defaultParams as unknown as Record<string, unknown>,
    apply(params, context: EffectRenderContext): EffectRenderResult | null {
        const p = { ...defaultParams, ...(params as Partial<GradientOverlayParams>) };
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

        if (!p.colorStops || p.colorStops.length === 0) return null;

        // Build merged GradientStop[] (color + interpolated opacity) and apply
        // the optional reverse flag by mirroring positions.
        let stops = mergeStops(p.colorStops, p.opacityStops ?? []);
        if (p.reverse) {
            stops = stops.map(s => ({ ...s, position: 1 - s.position })).sort((a, b) => a.position - b.position);
        }

        // Compute the gradient endpoints from the layer bounding box, the angle,
        // and the scale (100% = exactly spans the box across the chosen angle).
        const cx = w / 2;
        const cy = h / 2;
        const rad = (p.angle * Math.PI) / 180;
        const scale = Math.max(0, p.scale) / 100;
        const half = Math.max(w, h) * 0.5 * Math.max(0.0001, scale);
        const start = { x: cx - Math.cos(rad) * half, y: cy - Math.sin(rad) * half };
        const end =   { x: cx + Math.cos(rad) * half, y: cy + Math.sin(rad) * half };

        // Render gradient into a buffer the size of the layer.
        const gradient = renderGradientCanvas(w, h, p.gradientType, start, end, stops, false, 'classic');

        // Clip to the layer's alpha (source-in).
        const gctx = gradient.getContext('2d');
        if (!gctx) return empty;
        gctx.globalCompositeOperation = 'destination-in';
        gctx.drawImage(context.layerCanvas, 0, 0);
        gctx.globalCompositeOperation = 'source-over';

        return { canvas: gradient, placement: 'overlay', blendMode: p.blendMode, opacity: p.opacity };
    },
};

registerEffect(gradientOverlayEffect);
