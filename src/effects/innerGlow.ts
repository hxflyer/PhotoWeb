import type { Effect, EffectRenderContext, EffectRenderResult } from './Effect';
import { registerEffect } from './registry';
import { applyBevelContour, type ContourName } from './bevelEmboss';

interface GradientStop { position: number; color: string }
interface OpacityStop { position: number; opacity: number }

interface InnerGlowParams {
    color: string;
    opacity: number;     // 0..1
    choke: number;       // 0..1 — sharpens the inner glow edge
    size: number;        // blur radius px
    blendMode: GlobalCompositeOperation;
    technique: 'softer' | 'precise';
    source: 'center' | 'edge';
    contour: ContourName;
    contourAntiAliased: boolean;
    noise: number;       // 0..1
    range: number;       // 0..1
    jitter: number;      // 0..1
    colorSource: 'solid' | 'gradient';
    gradient: {
        colorStops: GradientStop[];
        opacityStops: OpacityStop[];
    };
}

const defaultParams: InnerGlowParams = {
    color: '#ffff80',
    opacity: 0.75,
    choke: 0,
    size: 10,
    blendMode: 'screen',
    technique: 'softer',
    source: 'edge',
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
        const incoming = (params ?? {}) as Partial<InnerGlowParams>;
        const p: InnerGlowParams = {
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
        const blurPx = Math.max(0, p.size * (1 - chokeFrac) * (p.technique === 'precise' ? 0.6 : 1));

        // Source: 'edge' (default) emanates from the silhouette edge inward;
        // 'center' fills the silhouette from the center outward by inverting
        // the band — interior gets the bright core.
        const band = document.createElement('canvas');
        band.width = w; band.height = h;
        const ictx = band.getContext('2d');
        if (!ictx) return empty;
        if (p.source === 'edge') {
            ictx.drawImage(context.layerCanvas, 0, 0);
            ictx.globalCompositeOperation = 'destination-out';
            ictx.drawImage(eroded, 0, 0);
            ictx.globalCompositeOperation = 'source-over';
        } else {
            // 'center' source: use the eroded silhouette as the bright core.
            ictx.drawImage(eroded, 0, 0);
        }

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

        // Tint solid color first; gradient mode replaces RGB in the pixel loop.
        if (p.colorSource === 'solid') {
            bctx.globalCompositeOperation = 'source-in';
            bctx.fillStyle = p.color;
            bctx.fillRect(0, 0, w, h);
            bctx.globalCompositeOperation = 'source-over';
        }

        // Contour + range + jitter + noise pass.
        const range = Math.max(0.01, Math.min(1, p.range));
        const jitter = Math.max(0, Math.min(1, p.jitter));
        const img = bctx.getImageData(0, 0, w, h);
        for (let i = 0; i < img.data.length; i += 4) {
            const a0 = img.data[i + 3] / 255;
            if (a0 <= 0) continue;
            const t = Math.min(1, a0 / range);
            const shaped = applyBevelContour(t, p.contour);
            const aShapedRaw = p.contourAntiAliased ? shaped : (shaped >= 0.5 ? 1 : 0);
            const aShaped = a0 >= range ? aShapedRaw : aShapedRaw * (a0 / range);
            if (p.colorSource === 'gradient') {
                const tGrad = 1 - a0;
                const sample = sampleGradient(p.gradient.colorStops, p.gradient.opacityStops, tGrad);
                img.data[i] = sample.r;
                img.data[i + 1] = sample.g;
                img.data[i + 2] = sample.b;
                img.data[i + 3] = Math.round(aShaped * sample.a * 255);
            } else {
                img.data[i + 3] = Math.round(aShaped * 255);
            }
            if (jitter > 0) {
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
