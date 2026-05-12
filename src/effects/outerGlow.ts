import type { Effect, EffectRenderContext, EffectRenderResult } from './Effect';
import { registerEffect } from './registry';
import { applyContourAndNoise } from './dropShadow';
import { applyBevelContour, type ContourName } from './bevelEmboss';

export interface GradientStop { position: number; color: string }
export interface OpacityStop { position: number; opacity: number }

interface OuterGlowParams {
    color: string;
    opacity: number;     // 0..1
    spread: number;      // 0..1 — fraction of size expanded before blur
    size: number;        // blur radius px
    blendMode: GlobalCompositeOperation;
    technique: 'softer' | 'precise';
    contour: ContourName;
    contourAntiAliased: boolean;
    noise: number;       // 0..1
    range: number;       // 0..1 — slope range over which the contour applies
    jitter: number;      // 0..1 — random color scattering through gradient
    colorSource: 'solid' | 'gradient';
    gradient: {
        colorStops: GradientStop[];
        opacityStops: OpacityStop[];
    };
}

const defaultParams: OuterGlowParams = {
    color: '#ffff80',
    opacity: 0.75,
    spread: 0,
    size: 10,
    blendMode: 'screen',
    technique: 'softer',
    contour: 'linear',
    contourAntiAliased: true,
    noise: 0,
    range: 0.5,
    jitter: 0,
    colorSource: 'solid',
    gradient: {
        colorStops: [
            { position: 0, color: '#ffff80' },
            { position: 1, color: '#ff8000' },
        ],
        opacityStops: [
            { position: 0, opacity: 1 },
            { position: 1, opacity: 0 },
        ],
    },
};

function hexToRgb(hex: string): [number, number, number] {
    const m = /^#?([0-9a-f]{6})$/i.exec(hex.trim());
    if (!m) return [255, 255, 128];
    const n = parseInt(m[1], 16);
    return [(n >> 16) & 0xff, (n >> 8) & 0xff, n & 0xff];
}

function sampleGradient(
    colorStops: GradientStop[],
    opacityStops: OpacityStop[],
    t: number,
): { r: number; g: number; b: number; a: number } {
    const tc = Math.max(0, Math.min(1, t));
    // Find bracket stops for color.
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
    const r = Math.round(r1 * (1 - cT) + r2 * cT);
    const g = Math.round(g1 * (1 - cT) + g2 * cT);
    const b = Math.round(b1 * (1 - cT) + b2 * cT);

    const os = [...opacityStops].sort((a, b) => a.position - b.position);
    let oLow = os[0], oHigh = os[os.length - 1];
    for (let i = 0; i < os.length - 1; i++) {
        if (os[i].position <= tc && os[i + 1].position >= tc) {
            oLow = os[i]; oHigh = os[i + 1]; break;
        }
    }
    const oT = oHigh.position === oLow.position ? 0 : (tc - oLow.position) / (oHigh.position - oLow.position);
    const a = oLow.opacity * (1 - oT) + oHigh.opacity * oT;
    return { r, g, b, a };
}

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
        const incoming = (params ?? {}) as Partial<OuterGlowParams>;
        const p: OuterGlowParams = {
            ...defaultParams,
            ...incoming,
            gradient: incoming.gradient
                ? {
                    colorStops: incoming.gradient.colorStops ?? defaultParams.gradient.colorStops,
                    opacityStops: incoming.gradient.opacityStops ?? defaultParams.gradient.opacityStops,
                }
                : defaultParams.gradient,
        };
        const w = context.width;
        const h = context.height;
        if (p.size <= 0 && p.spread <= 0) return null;

        // Expand the alpha by the spread amount. The "precise" technique uses
        // an extra dilation step before the blur so the glow keeps a sharp,
        // crisp edge (matches Photoshop's faster but harder result). "Softer"
        // is the default soft-feather behaviour.
        const spreadPx = Math.max(0, Math.round(Math.max(0, Math.min(1, p.spread)) * p.size));
        const precisePadding = p.technique === 'precise' ? Math.max(1, Math.round(p.size * 0.25)) : 0;
        const totalDilate = spreadPx + precisePadding;
        const dilated = totalDilate > 0 ? dilateAlpha(context.layerCanvas, totalDilate) : context.layerCanvas;

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
        if (p.colorSource === 'solid') {
            tctx.globalCompositeOperation = 'source-in';
            tctx.fillStyle = p.color;
            tctx.fillRect(0, 0, w, h);
            tctx.globalCompositeOperation = 'source-over';
        } else {
            // Gradient color source: skip the solid tint here; we paint the
            // gradient AFTER the blur so the alpha falloff drives the t coord.
        }

        const blurred = document.createElement('canvas');
        blurred.width = w; blurred.height = h;
        const bctx = blurred.getContext('2d');
        if (!bctx) return empty;
        if (p.size > 0) {
            bctx.filter = `blur(${p.technique === 'precise' ? p.size * 0.6 : p.size}px)`;
            bctx.drawImage(tinted, 0, 0);
            bctx.filter = 'none';
        } else {
            bctx.drawImage(tinted, 0, 0);
        }

        // Range narrows the band of the contour onto a subset of the slope.
        const range = Math.max(0.01, Math.min(1, p.range));

        // Read pixels back and apply: gradient color (if enabled), contour
        // reshape, jitter, noise. For 'solid', the tint colour is already in
        // RGB and we only adjust alpha. For 'gradient' we recompute RGB from
        // the gradient at parameter t = alpha (alpha indicates depth into the
        // glow falloff).
        const img = bctx.getImageData(0, 0, w, h);
        const jitter = Math.max(0, Math.min(1, p.jitter));
        for (let i = 0; i < img.data.length; i += 4) {
            const a0 = img.data[i + 3] / 255;
            if (a0 <= 0) continue;
            const t = Math.min(1, a0 / range);
            const shaped = applyBevelContour(t, p.contour);
            const aShapedRaw = p.contourAntiAliased
                ? shaped
                : (shaped >= 0.5 ? 1 : 0);
            // Photoshop's "Range" defines the slice of the silhouette the
            // contour covers; outside the range the alpha falls to 0.
            const aShaped = a0 >= range ? aShapedRaw : aShapedRaw * (a0 / range);
            if (p.colorSource === 'gradient') {
                const tGrad = 1 - a0; // outside-most pixels are tGrad ≈ 1
                const sample = sampleGradient(p.gradient.colorStops, p.gradient.opacityStops, tGrad);
                img.data[i] = sample.r;
                img.data[i + 1] = sample.g;
                img.data[i + 2] = sample.b;
                img.data[i + 3] = Math.round(aShaped * sample.a * 255);
            } else {
                img.data[i + 3] = Math.round(aShaped * 255);
            }
            if (jitter > 0) {
                // Scatter the brightness slightly to break up gradient banding.
                const j = 1 - Math.random() * jitter;
                img.data[i] = Math.round(img.data[i] * j);
                img.data[i + 1] = Math.round(img.data[i + 1] * j);
                img.data[i + 2] = Math.round(img.data[i + 2] * j);
            }
            if (p.noise > 0) {
                const n = 1 - Math.random() * Math.max(0, Math.min(1, p.noise));
                img.data[i + 3] = Math.round(img.data[i + 3] * n);
            }
        }
        bctx.putImageData(img, 0, 0);

        // Punch the original layer alpha out of the blurred glow so the glow
        // only contributes OUTSIDE the layer — the layer pixels themselves
        // will cover the center when the compositor draws the underlay.
        bctx.globalCompositeOperation = 'destination-out';
        bctx.drawImage(context.layerCanvas, 0, 0);
        bctx.globalCompositeOperation = 'source-over';

        return { canvas: blurred, placement: 'underlay', blendMode: p.blendMode, opacity: p.opacity };
    },
};

// Keep applyContourAndNoise + ContourName imports referenced even if unused
// directly — the inner-shadow + drop-shadow share the helper.
void applyContourAndNoise;

registerEffect(outerGlowEffect);
