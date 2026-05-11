import type { Effect, EffectRenderContext, EffectRenderResult } from './Effect';
import { registerEffect } from './registry';

type BevelStyle = 'inner-bevel' | 'outer-bevel' | 'emboss' | 'pillow-emboss';

interface BevelEmbossParams {
    style: BevelStyle;
    depth: number;                  // 0..1000 (%) scales the gradient amplitude
    direction: 'up' | 'down';       // 'down' inverts highlight/shadow swap
    size: number;                   // px — distance the bevel extends from the edge
    soften: number;                 // px — final blur of the bevel result
    angle: number;                  // deg — light source rotation
    altitude: number;               // deg — light source elevation
    highlightColor: string;
    highlightOpacity: number;       // 0..1
    highlightBlendMode: GlobalCompositeOperation;
    shadowColor: string;
    shadowOpacity: number;          // 0..1
    shadowBlendMode: GlobalCompositeOperation;
}

const defaultParams: BevelEmbossParams = {
    style: 'inner-bevel',
    depth: 100,
    direction: 'up',
    size: 5,
    soften: 0,
    angle: 135,
    altitude: 30,
    highlightColor: '#ffffff',
    highlightOpacity: 0.75,
    highlightBlendMode: 'screen',
    shadowColor: '#000000',
    shadowOpacity: 0.75,
    shadowBlendMode: 'multiply',
};

// Build a height field from the layer alpha. For 'inner-bevel' the height is
// the distance from each interior pixel to the nearest edge (clamped to size).
// For 'outer-bevel' it's the distance from each exterior pixel to the nearest
// alpha-covered pixel. 'emboss' combines both (positive inside, negative
// outside). 'pillow-emboss' uses the inverse — peak at the edge, valleys
// in/out — which is enough to give a pinched look.
function buildHeightField(
    layerCanvas: HTMLCanvasElement,
    width: number,
    height: number,
    style: BevelStyle,
    sizePx: number,
): Float32Array {
    const ctx = layerCanvas.getContext('2d');
    if (!ctx) return new Float32Array(width * height);
    const img = ctx.getImageData(0, 0, width, height);
    const alpha = new Uint8Array(width * height);
    for (let i = 0; i < alpha.length; i++) alpha[i] = img.data[i * 4 + 3];

    const insideDist = distanceTransform(alpha, width, height, /*inside*/ true, sizePx);
    const outsideDist = distanceTransform(alpha, width, height, /*inside*/ false, sizePx);

    const height_ = new Float32Array(width * height);
    const radius = Math.max(1, sizePx);

    for (let i = 0; i < height_.length; i++) {
        const din = insideDist[i] / radius;          // 0 at edge, 1 deep inside (clamped)
        const dout = outsideDist[i] / radius;
        switch (style) {
            case 'inner-bevel':
                // Ramp from 0 at the edge to 1 at "size" inside; 0 outside.
                height_[i] = Math.min(1, din);
                break;
            case 'outer-bevel':
                // Ramp from 0 at the edge to 1 at "size" outside; 0 inside.
                height_[i] = Math.min(1, dout);
                break;
            case 'emboss':
                // Symmetric ramp around the edge: positive inside, negative outside.
                if (din > 0) height_[i] = Math.min(1, din);
                else height_[i] = -Math.min(1, dout);
                break;
            case 'pillow-emboss':
                // Peak at the edge: 1 - distance both ways. Inside near edge AND
                // outside near edge ramp up to 1 at the boundary.
                if (din > 0) height_[i] = 1 - Math.min(1, din);
                else if (dout > 0) height_[i] = -(1 - Math.min(1, dout));
                break;
        }
    }
    return height_;
}

// Cheap "distance" via repeated cardinal/diagonal min-passes. Not Euclidean,
// but monotonic and bounded by `maxRadius` which is what the bevel needs.
function distanceTransform(alpha: Uint8Array, w: number, h: number, inside: boolean, maxRadius: number): Float32Array {
    const INF = 1e9;
    const d = new Float32Array(w * h);
    for (let i = 0; i < d.length; i++) {
        const inHere = alpha[i] > 127;
        const counts = inside ? inHere : !inHere;
        d[i] = counts ? INF : 0;
    }
    const maxSteps = Math.max(1, Math.ceil(maxRadius));
    // Forward pass.
    for (let y = 0; y < h; y++) {
        for (let x = 0; x < w; x++) {
            const i = y * w + x;
            if (d[i] === 0) continue;
            if (x > 0) d[i] = Math.min(d[i], d[i - 1] + 1);
            if (y > 0) d[i] = Math.min(d[i], d[i - w] + 1);
            if (x > 0 && y > 0) d[i] = Math.min(d[i], d[i - w - 1] + 1.4);
            if (x + 1 < w && y > 0) d[i] = Math.min(d[i], d[i - w + 1] + 1.4);
        }
    }
    // Backward pass.
    for (let y = h - 1; y >= 0; y--) {
        for (let x = w - 1; x >= 0; x--) {
            const i = y * w + x;
            if (d[i] === 0) continue;
            if (x + 1 < w) d[i] = Math.min(d[i], d[i + 1] + 1);
            if (y + 1 < h) d[i] = Math.min(d[i], d[i + w] + 1);
            if (x + 1 < w && y + 1 < h) d[i] = Math.min(d[i], d[i + w + 1] + 1.4);
            if (x > 0 && y + 1 < h) d[i] = Math.min(d[i], d[i + w - 1] + 1.4);
        }
    }
    for (let i = 0; i < d.length; i++) {
        if (d[i] >= INF) d[i] = maxSteps;
        if (d[i] > maxSteps) d[i] = maxSteps;
    }
    return d;
}

function softenBlur(field: Float32Array, w: number, h: number, radius: number): Float32Array {
    if (radius <= 0) return field;
    const r = Math.max(1, Math.round(radius));
    const tmp = new Float32Array(field.length);
    const out = new Float32Array(field.length);
    // Horizontal box.
    for (let y = 0; y < h; y++) {
        let sum = 0;
        for (let k = -r; k <= r; k++) {
            const x = Math.min(w - 1, Math.max(0, k));
            sum += field[y * w + x];
        }
        const N = 2 * r + 1;
        for (let x = 0; x < w; x++) {
            tmp[y * w + x] = sum / N;
            const xRem = Math.max(0, x - r);
            const xAdd = Math.min(w - 1, x + r + 1);
            sum += field[y * w + xAdd] - field[y * w + xRem];
        }
    }
    // Vertical box.
    for (let x = 0; x < w; x++) {
        let sum = 0;
        for (let k = -r; k <= r; k++) {
            const y = Math.min(h - 1, Math.max(0, k));
            sum += tmp[y * w + x];
        }
        const N = 2 * r + 1;
        for (let y = 0; y < h; y++) {
            out[y * w + x] = sum / N;
            const yRem = Math.max(0, y - r);
            const yAdd = Math.min(h - 1, y + r + 1);
            sum += tmp[yAdd * w + x] - tmp[yRem * w + x];
        }
    }
    return out;
}

function hexToRgb(hex: string): [number, number, number] {
    const m = /^#?([0-9a-f]{6})$/i.exec(hex.trim());
    if (!m) return [255, 255, 255];
    const n = parseInt(m[1], 16);
    return [(n >> 16) & 0xff, (n >> 8) & 0xff, n & 0xff];
}

export const bevelEmbossEffect: Effect = {
    kind: 'bevel-emboss',
    label: 'Bevel & Emboss',
    defaultParams: defaultParams as unknown as Record<string, unknown>,
    apply(params, context: EffectRenderContext): EffectRenderResult | null {
        const p = { ...defaultParams, ...(params as Partial<BevelEmbossParams>) };
        const w = context.width;
        const h = context.height;

        const empty: EffectRenderResult = {
            canvas: document.createElement('canvas'),
            placement: 'overlay',
            blendMode: 'source-over',
            opacity: 1,
        };
        empty.canvas.width = w;
        empty.canvas.height = h;

        const sizePx = Math.max(1, p.size);
        const heightField = buildHeightField(context.layerCanvas, w, h, p.style, sizePx);
        const field = softenBlur(heightField, w, h, p.soften);

        // Light direction (right-handed, +x right, +y down, +z out of screen).
        // Clamp altitude with a small epsilon away from 0° and 90° to avoid
        // degenerate lighting: at exactly 0° the contribution `dot - lz`
        // saturates the highlight everywhere; at exactly 90° lz=1 collapses
        // highlight + shadow to identical near-zero values which produces
        // banding/NaN-adjacent artifacts in downstream blends.
        const aRad = (p.angle * Math.PI) / 180;
        const ALT_EPS_DEG = 0.5;
        const clampedAltitudeDeg = Math.max(ALT_EPS_DEG, Math.min(90 - ALT_EPS_DEG, p.altitude));
        const altRad = (clampedAltitudeDeg * Math.PI) / 180;
        const cosAlt = Math.cos(altRad);
        const lx = Math.cos(aRad) * cosAlt;
        const ly = -Math.sin(aRad) * cosAlt; // screen y grows downward
        const lz = Math.sin(altRad);
        const dirSign = p.direction === 'up' ? 1 : -1;

        // depth scales the gradient amplitude.
        const depthScale = (p.depth / 100);

        const [hr, hg, hb] = hexToRgb(p.highlightColor);
        const [sr, sg, sb] = hexToRgb(p.shadowColor);

        // Build TWO separate canvases: a highlight buffer (light contribution)
        // and a shadow buffer (dark contribution). Both share the same shape,
        // differ only in which lit pixels they fill.
        const hi = document.createElement('canvas');
        const sh = document.createElement('canvas');
        hi.width = w; hi.height = h;
        sh.width = w; sh.height = h;
        const hctx = hi.getContext('2d');
        const sctx = sh.getContext('2d');
        if (!hctx || !sctx) return empty;
        const hImg = hctx.createImageData(w, h);
        const sImg = sctx.createImageData(w, h);

        for (let y = 0; y < h; y++) {
            for (let x = 0; x < w; x++) {
                const xm = Math.max(0, x - 1), xp = Math.min(w - 1, x + 1);
                const ym = Math.max(0, y - 1), yp = Math.min(h - 1, y + 1);
                const gx = (
                    -field[ym * w + xm] + field[ym * w + xp]
                    + -2 * field[y * w + xm] + 2 * field[y * w + xp]
                    + -field[yp * w + xm] + field[yp * w + xp]
                ) * 0.25 * depthScale * dirSign;
                const gy = (
                    -field[ym * w + xm] - 2 * field[ym * w + x] - field[ym * w + xp]
                    + field[yp * w + xm] + 2 * field[yp * w + x] + field[yp * w + xp]
                ) * 0.25 * depthScale * dirSign;
                const nLen = Math.sqrt(gx * gx + gy * gy + 1);
                const nx = -gx / nLen;
                const ny = -gy / nLen;
                const nz = 1 / nLen;
                const dot = nx * lx + ny * ly + nz * lz;
                const highlight = Math.max(0, dot - lz);
                const shadow = Math.max(0, -(dot - lz));

                const hRaw = Math.min(1, highlight * 4) * p.highlightOpacity;
                const sRaw = Math.min(1, shadow * 4) * p.shadowOpacity;
                const hA = Number.isFinite(hRaw) ? Math.max(0, Math.min(1, hRaw)) : 0;
                const sA = Number.isFinite(sRaw) ? Math.max(0, Math.min(1, sRaw)) : 0;
                const idx = (y * w + x) * 4;
                hImg.data[idx] = hr;
                hImg.data[idx + 1] = hg;
                hImg.data[idx + 2] = hb;
                hImg.data[idx + 3] = Math.round(hA * 255);
                sImg.data[idx] = sr;
                sImg.data[idx + 1] = sg;
                sImg.data[idx + 2] = sb;
                sImg.data[idx + 3] = Math.round(sA * 255);
            }
        }
        hctx.putImageData(hImg, 0, 0);
        sctx.putImageData(sImg, 0, 0);

        // Composite both onto a single output canvas using the configured blend
        // modes. We use a 2-pass approach: paint shadow first, then highlight
        // on top. This is a single-canvas result that the compositor places
        // as overlay (clipped to the layer alpha by the compositor).
        const out = document.createElement('canvas');
        out.width = w; out.height = h;
        const octx = out.getContext('2d');
        if (!octx) return empty;
        octx.globalCompositeOperation = p.shadowBlendMode;
        octx.drawImage(sh, 0, 0);
        octx.globalCompositeOperation = p.highlightBlendMode;
        octx.drawImage(hi, 0, 0);
        octx.globalCompositeOperation = 'source-over';

        // For outer-bevel the effect lives outside the layer alpha; route the
        // unclipped output as an underlay so the compositor's "draw layer over
        // underlays" pass paints the layer on top without erasing the outer
        // ring.
        if (p.style === 'outer-bevel') {
            const outer = document.createElement('canvas');
            outer.width = w; outer.height = h;
            const cctx = outer.getContext('2d');
            if (!cctx) return empty;
            cctx.drawImage(out, 0, 0);
            // Erase pixels INSIDE the layer alpha so only the outer ring remains.
            cctx.globalCompositeOperation = 'destination-out';
            cctx.drawImage(context.layerCanvas, 0, 0);
            cctx.globalCompositeOperation = 'source-over';
            return { canvas: outer, placement: 'underlay', blendMode: 'source-over', opacity: 1 };
        }

        // inner-bevel, emboss, pillow-emboss → overlay clipped to layer alpha.
        const clipped = document.createElement('canvas');
        clipped.width = w; clipped.height = h;
        const cctx = clipped.getContext('2d');
        if (!cctx) return empty;
        cctx.drawImage(context.layerCanvas, 0, 0);
        cctx.globalCompositeOperation = 'source-in';
        cctx.drawImage(out, 0, 0);
        return { canvas: clipped, placement: 'overlay', blendMode: 'source-over', opacity: 1 };
    },
};

registerEffect(bevelEmbossEffect);
