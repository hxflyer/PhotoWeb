import type { Effect, EffectRenderContext, EffectRenderResult } from './Effect';
import { registerEffect } from './registry';
import { getPatternTile } from '../store/toolsSlice';

interface GradientStop { position: number; color: string }
interface OpacityStop { position: number; opacity: number }

interface StrokeGradient {
    colorStops: GradientStop[];
    opacityStops: OpacityStop[];
    type: 'linear' | 'radial' | 'angle' | 'reflected' | 'diamond';
    angle: number;       // degrees
    scale: number;       // 0..300 (%)
}

interface StrokePattern {
    patternId: string;
    scale: number;       // 0..300 (%)
    link: boolean;
}

interface StrokeParams {
    size: number;     // px
    position: 'outside' | 'center' | 'inside';
    color: string;
    opacity: number;  // 0..1
    blendMode: GlobalCompositeOperation;
    fillType: 'color' | 'gradient' | 'pattern';
    gradient: StrokeGradient;
    pattern: StrokePattern;
}

const defaultParams: StrokeParams = {
    size: 3,
    position: 'outside',
    color: '#000000',
    opacity: 1,
    blendMode: 'source-over',
    fillType: 'color',
    gradient: {
        colorStops: [
            { position: 0, color: '#000000' },
            { position: 1, color: '#ffffff' },
        ],
        opacityStops: [
            { position: 0, opacity: 1 },
            { position: 1, opacity: 1 },
        ],
        type: 'linear',
        angle: 0,
        scale: 100,
    },
    pattern: {
        patternId: '',
        scale: 100,
        link: true,
    },
};

function hexToRgb(hex: string): [number, number, number] {
    const m = /^#?([0-9a-f]{6})$/i.exec(hex.trim());
    if (!m) return [0, 0, 0];
    const n = parseInt(m[1], 16);
    return [(n >> 16) & 0xff, (n >> 8) & 0xff, n & 0xff];
}

function sampleGradient(
    colorStops: GradientStop[],
    opacityStops: OpacityStop[],
    t: number,
): { r: number; g: number; b: number; a: number } {
    const tc = Math.max(0, Math.min(1, t));
    const cs = [...colorStops].sort((a, b) => a.position - b.position);
    let cLow = cs[0], cHigh = cs[cs.length - 1];
    for (let i = 0; i < cs.length - 1; i++) {
        if (cs[i].position <= tc && cs[i + 1].position >= tc) {
            cLow = cs[i]; cHigh = cs[i + 1]; break;
        }
    }
    const cT = cHigh.position === cLow.position ? 0 : (tc - cLow.position) / (cHigh.position - cLow.position);
    const [r1, g1, b1] = hexToRgb(cLow.color);
    const [r2, g2, b2] = hexToRgb(cHigh.color);
    const os = [...opacityStops].sort((a, b) => a.position - b.position);
    let oLow = os[0], oHigh = os[os.length - 1];
    for (let i = 0; i < os.length - 1; i++) {
        if (os[i].position <= tc && os[i + 1].position >= tc) {
            oLow = os[i]; oHigh = os[i + 1]; break;
        }
    }
    const oT = oHigh.position === oLow.position ? 0 : (tc - oLow.position) / (oHigh.position - oLow.position);
    return {
        r: Math.round(r1 * (1 - cT) + r2 * cT),
        g: Math.round(g1 * (1 - cT) + g2 * cT),
        b: Math.round(b1 * (1 - cT) + b2 * cT),
        a: oLow.opacity * (1 - oT) + oHigh.opacity * oT,
    };
}

function paintGradient(
    target: HTMLCanvasElement,
    grad: StrokeGradient,
): void {
    const ctx = target.getContext('2d');
    if (!ctx) return;
    const w = target.width;
    const h = target.height;
    const angleRad = (grad.angle * Math.PI) / 180;
    const cx = w / 2;
    const cy = h / 2;
    const scale = Math.max(0.01, grad.scale / 100);
    // Linear axis direction.
    const dx = Math.cos(angleRad);
    const dy = Math.sin(angleRad);
    const halfDim = Math.max(w, h) * 0.5 * scale;
    const img = ctx.createImageData(w, h);
    for (let y = 0; y < h; y++) {
        for (let x = 0; x < w; x++) {
            const rx = x - cx;
            const ry = y - cy;
            let t: number;
            switch (grad.type) {
                case 'linear': {
                    const proj = (rx * dx + ry * dy) / (halfDim * 2);
                    t = 0.5 + proj;
                    break;
                }
                case 'reflected': {
                    const proj = Math.abs(rx * dx + ry * dy) / halfDim;
                    t = proj;
                    break;
                }
                case 'radial': {
                    t = Math.sqrt(rx * rx + ry * ry) / halfDim;
                    break;
                }
                case 'angle': {
                    const a = Math.atan2(ry, rx) - angleRad;
                    t = (((a % (2 * Math.PI)) + 2 * Math.PI) % (2 * Math.PI)) / (2 * Math.PI);
                    break;
                }
                case 'diamond': {
                    t = (Math.abs(rx * dx + ry * dy) + Math.abs(rx * -dy + ry * dx)) / halfDim;
                    break;
                }
            }
            const sample = sampleGradient(grad.colorStops, grad.opacityStops, t);
            const idx = (y * w + x) * 4;
            img.data[idx] = sample.r;
            img.data[idx + 1] = sample.g;
            img.data[idx + 2] = sample.b;
            img.data[idx + 3] = Math.round(sample.a * 255);
        }
    }
    ctx.putImageData(img, 0, 0);
}

function paintPattern(
    target: HTMLCanvasElement,
    pattern: StrokePattern,
): void {
    const ctx = target.getContext('2d');
    if (!ctx) return;
    const tile = getPatternTile(pattern.patternId);
    if (!tile) {
        ctx.fillStyle = '#808080';
        ctx.fillRect(0, 0, target.width, target.height);
        return;
    }
    const scale = Math.max(0.01, pattern.scale / 100);
    const scaled = document.createElement('canvas');
    scaled.width = Math.max(1, Math.round(tile.width * scale));
    scaled.height = Math.max(1, Math.round(tile.height * scale));
    const sctx = scaled.getContext('2d');
    if (!sctx) return;
    sctx.drawImage(tile, 0, 0, scaled.width, scaled.height);
    const pat = ctx.createPattern(scaled, 'repeat');
    if (!pat) return;
    ctx.fillStyle = pat;
    ctx.fillRect(0, 0, target.width, target.height);
}

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

// Paint the current ring (the destination of `ctx` already has the ring mask
// as alpha; we use source-in to fill it with the chosen colour / gradient /
// pattern).
function fillRingWithType(
    ctx: CanvasRenderingContext2D,
    w: number,
    h: number,
    p: StrokeParams,
): void {
    if (p.fillType === 'color') {
        ctx.globalCompositeOperation = 'source-in';
        ctx.fillStyle = p.color;
        ctx.fillRect(0, 0, w, h);
        return;
    }
    if (p.fillType === 'gradient') {
        const gradCanvas = document.createElement('canvas');
        gradCanvas.width = w; gradCanvas.height = h;
        paintGradient(gradCanvas, p.gradient);
        ctx.globalCompositeOperation = 'source-in';
        ctx.drawImage(gradCanvas, 0, 0);
        return;
    }
    // pattern
    const patCanvas = document.createElement('canvas');
    patCanvas.width = w; patCanvas.height = h;
    paintPattern(patCanvas, p.pattern);
    ctx.globalCompositeOperation = 'source-in';
    ctx.drawImage(patCanvas, 0, 0);
}

export const strokeEffect: Effect = {
    kind: 'stroke',
    label: 'Stroke',
    defaultParams: defaultParams as unknown as Record<string, unknown>,
    apply(params, context: EffectRenderContext): EffectRenderResult | null {
        const incoming = (params ?? {}) as Partial<StrokeParams>;
        const p: StrokeParams = {
            ...defaultParams,
            ...incoming,
            gradient: { ...defaultParams.gradient, ...(incoming.gradient ?? {}) },
            pattern: { ...defaultParams.pattern, ...(incoming.pattern ?? {}) },
        };
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
            fillRingWithType(ctx, out.width, out.height, p);
            return { canvas: out, placement: 'underlay', blendMode: p.blendMode, opacity: p.opacity };
        }
        if (p.position === 'inside') {
            // Inside ring = original alpha minus eroded alpha.
            ctx.drawImage(context.layerCanvas, 0, 0);
            ctx.globalCompositeOperation = 'destination-out';
            const eroded = dilateAlpha(context.layerCanvas, -p.size);
            ctx.drawImage(eroded, 0, 0);
            fillRingWithType(ctx, out.width, out.height, p);
            return { canvas: out, placement: 'overlay', blendMode: p.blendMode, opacity: p.opacity };
        }
        // center: half outside, half inside.
        const r = Math.max(1, Math.round(p.size / 2));
        const outerRing = dilateAlpha(context.layerCanvas, r);
        ctx.drawImage(outerRing, 0, 0);
        ctx.globalCompositeOperation = 'destination-out';
        const innerRing = dilateAlpha(context.layerCanvas, -r);
        ctx.drawImage(innerRing, 0, 0);
        fillRingWithType(ctx, out.width, out.height, p);
        return { canvas: out, placement: 'overlay', blendMode: p.blendMode, opacity: p.opacity };
    },
};

registerEffect(strokeEffect);
