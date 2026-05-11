import { registerFilter } from './registry';
import type { FilterApplyContext } from './Filter';

// ── helpers ────────────────────────────────────────────────────────────────

function clamp(v: number): number {
    return v < 0 ? 0 : v > 255 ? 255 : v;
}

function gaussianKernel(sigma: number): Float32Array {
    const radius = Math.ceil(sigma * 3);
    const size = radius * 2 + 1;
    const k = new Float32Array(size);
    let sum = 0;
    for (let i = 0; i < size; i++) {
        const x = i - radius;
        k[i] = Math.exp(-(x * x) / (2 * sigma * sigma));
        sum += k[i];
    }
    for (let i = 0; i < size; i++) k[i] /= sum;
    return k;
}

interface RectBounds { x0: number; y0: number; x1: number; y1: number }

function rectBounds(
    width: number,
    height: number,
    dirty: { x: number; y: number; width: number; height: number } | null,
): RectBounds {
    if (!dirty) return { x0: 0, y0: 0, x1: width, y1: height };
    const x0 = Math.max(0, Math.floor(dirty.x));
    const y0 = Math.max(0, Math.floor(dirty.y));
    const x1 = Math.min(width, Math.ceil(dirty.x + dirty.width));
    const y1 = Math.min(height, Math.ceil(dirty.y + dirty.height));
    return { x0, y0, x1, y1 };
}

/**
 * Separable convolution that, when given a dirty rect, only writes output
 * pixels inside the rect. The horizontal pass walks an extended row range
 * (dirty rows ± kernelV-radius) so the vertical pass sees correct neighbors;
 * similarly the horizontal pass walks an extended column range (± kernelH-
 * radius) for the same reason. Pixels outside the dirty rect are copied
 * straight from `src` to `out` unchanged.
 */
function separableConvolve(
    src: Uint8ClampedArray,
    width: number,
    height: number,
    kernelH: Float32Array,
    kernelV: Float32Array,
    dirty: { x: number; y: number; width: number; height: number } | null = null,
): Uint8ClampedArray {
    const out = new Uint8ClampedArray(src);
    const rH = (kernelH.length - 1) >> 1;
    const rV = (kernelV.length - 1) >> 1;
    const b = rectBounds(width, height, dirty);

    // The vertical pass reads tmp at rows [y0 - rV, y1 + rV); make sure the
    // horizontal pass populated tmp across that extended range.
    const tmpY0 = Math.max(0, b.y0 - rV);
    const tmpY1 = Math.min(height, b.y1 + rV);
    // Likewise the horizontal pass reads src at cols [x0 - rH, x1 + rH); walk
    // tmp columns across that range so the vertical pass can mix them.
    const tmpX0 = Math.max(0, b.x0 - rH);
    const tmpX1 = Math.min(width, b.x1 + rH);

    const tmp = new Float32Array((tmpY1 - tmpY0) * (tmpX1 - tmpX0) * 4);
    const tmpW = tmpX1 - tmpX0;

    // horizontal pass — extended rows, extended cols
    for (let y = tmpY0; y < tmpY1; y++) {
        for (let x = tmpX0; x < tmpX1; x++) {
            let r = 0, g = 0, bl = 0, a = 0;
            for (let k = 0; k < kernelH.length; k++) {
                const sx = Math.max(0, Math.min(width - 1, x + k - rH));
                const idx = (y * width + sx) * 4;
                const w = kernelH[k];
                r += src[idx]     * w;
                g += src[idx + 1] * w;
                bl += src[idx + 2] * w;
                a += src[idx + 3] * w;
            }
            const oi = ((y - tmpY0) * tmpW + (x - tmpX0)) * 4;
            tmp[oi] = r; tmp[oi + 1] = g; tmp[oi + 2] = bl; tmp[oi + 3] = a;
        }
    }

    // vertical pass — only writes dirty rect
    for (let y = b.y0; y < b.y1; y++) {
        for (let x = b.x0; x < b.x1; x++) {
            let r = 0, g = 0, bl = 0, a = 0;
            for (let k = 0; k < kernelV.length; k++) {
                const sy = Math.max(0, Math.min(height - 1, y + k - rV));
                // sy should always be inside [tmpY0, tmpY1) by construction.
                const ti = ((sy - tmpY0) * tmpW + (x - tmpX0)) * 4;
                const w = kernelV[k];
                r += tmp[ti]     * w;
                g += tmp[ti + 1] * w;
                bl += tmp[ti + 2] * w;
                a += tmp[ti + 3] * w;
            }
            const oi = (y * width + x) * 4;
            out[oi]     = clamp(r);
            out[oi + 1] = clamp(g);
            out[oi + 2] = clamp(bl);
            out[oi + 3] = clamp(a);
        }
    }
    return out;
}

// ── Gaussian Blur ──────────────────────────────────────────────────────────

export interface GaussianBlurParams { radius: number }

registerFilter<GaussianBlurParams>({
    id: 'blur-gaussian',
    label: 'Gaussian Blur',
    defaultParams: { radius: 2 },
    apply({ radius }: GaussianBlurParams, { image, width, height, dirtyRect }: FilterApplyContext): ImageData {
        const sigma = Math.max(0.1, radius);
        const k = gaussianKernel(sigma);
        const data = separableConvolve(image.data, width, height, k, k, dirtyRect);
        return new ImageData(new Uint8ClampedArray(data), width, height);
    },
    renderUI(params, onChange) {
        const p = params as GaussianBlurParams;
        return (
            <>
                <label style={{ fontSize: '12px' }}>Radius: {p.radius}px</label>
                <input type="range" min={0} max={100} value={p.radius}
                    onChange={e => onChange({ ...p, radius: Number(e.target.value) })}
                    style={{ width: '100%' }} />
            </>
        );
    },
});

// ── Box Blur ───────────────────────────────────────────────────────────────

export interface BoxBlurParams { radius: number }

registerFilter<BoxBlurParams>({
    id: 'blur-box',
    label: 'Box Blur',
    defaultParams: { radius: 3 },
    apply({ radius }: BoxBlurParams, { image, width, height, dirtyRect }: FilterApplyContext): ImageData {
        const r = Math.max(0, Math.round(radius));
        const size = r * 2 + 1;
        const k = new Float32Array(size).fill(1 / size);
        const data = separableConvolve(image.data, width, height, k, k, dirtyRect);
        return new ImageData(new Uint8ClampedArray(data), width, height);
    },
    renderUI(params, onChange) {
        const p = params as BoxBlurParams;
        return (
            <>
                <label style={{ fontSize: '12px' }}>Radius: {p.radius}px</label>
                <input type="range" min={0} max={50} value={p.radius}
                    onChange={e => onChange({ ...p, radius: Number(e.target.value) })}
                    style={{ width: '100%' }} />
            </>
        );
    },
});

// ── Motion Blur ────────────────────────────────────────────────────────────

export interface MotionBlurParams { distance: number; angle: number }

registerFilter<MotionBlurParams>({
    id: 'blur-motion',
    label: 'Motion Blur',
    defaultParams: { distance: 20, angle: 0 },
    apply({ distance, angle }: MotionBlurParams, { image, width, height }: FilterApplyContext): ImageData {
        const d = Math.max(1, Math.round(distance));
        const rad = (angle * Math.PI) / 180;
        const dx = Math.cos(rad);
        const dy = Math.sin(rad);
        const out = new Uint8ClampedArray(width * height * 4);
        const src = image.data;

        for (let y = 0; y < height; y++) {
            for (let x = 0; x < width; x++) {
                let r = 0, g = 0, b = 0, a = 0;
                for (let t = 0; t < d; t++) {
                    const sx = Math.round(x + dx * (t - d / 2));
                    const sy = Math.round(y + dy * (t - d / 2));
                    const cx = Math.max(0, Math.min(width - 1, sx));
                    const cy = Math.max(0, Math.min(height - 1, sy));
                    const idx = (cy * width + cx) * 4;
                    r += src[idx]; g += src[idx + 1]; b += src[idx + 2]; a += src[idx + 3];
                }
                const oi = (y * width + x) * 4;
                out[oi]     = clamp(r / d);
                out[oi + 1] = clamp(g / d);
                out[oi + 2] = clamp(b / d);
                out[oi + 3] = clamp(a / d);
            }
        }
        return new ImageData(out, width, height);
    },
    renderUI(params, onChange) {
        const p = params as MotionBlurParams;
        return (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <div>
                    <label style={{ fontSize: '12px' }}>Distance: {p.distance}px</label>
                    <input type="range" min={1} max={200} value={p.distance}
                        onChange={e => onChange({ ...p, distance: Number(e.target.value) })}
                        style={{ width: '100%' }} />
                </div>
                <div>
                    <label style={{ fontSize: '12px' }}>Angle: {p.angle}°</label>
                    <input type="range" min={-180} max={180} value={p.angle}
                        onChange={e => onChange({ ...p, angle: Number(e.target.value) })}
                        style={{ width: '100%' }} />
                </div>
            </div>
        );
    },
});

// ── Surface Blur ───────────────────────────────────────────────────────────
// Preserves edges by weighting samples by both spatial and tonal proximity (bilateral-like).

export interface SurfaceBlurParams { radius: number; threshold: number }

registerFilter<SurfaceBlurParams>({
    id: 'blur-surface',
    label: 'Surface Blur',
    defaultParams: { radius: 5, threshold: 15 },
    apply({ radius, threshold }: SurfaceBlurParams, { image, width, height, dirtyRect }: FilterApplyContext): ImageData {
        const r = Math.max(1, Math.round(radius));
        const t = Math.max(1, threshold);
        const src = image.data;
        // Start from src so pixels outside the dirty rect pass through unchanged.
        const out = new Uint8ClampedArray(src);
        const b = rectBounds(width, height, dirtyRect ?? null);

        for (let y = b.y0; y < b.y1; y++) {
            for (let x = b.x0; x < b.x1; x++) {
                const ci = (y * width + x) * 4;
                let sumR = 0, sumG = 0, sumB = 0, sumA = 0, sumW = 0;
                const cr = src[ci], cg = src[ci + 1], cb = src[ci + 2];

                for (let sy = Math.max(0, y - r); sy <= Math.min(height - 1, y + r); sy++) {
                    for (let sx = Math.max(0, x - r); sx <= Math.min(width - 1, x + r); sx++) {
                        const si = (sy * width + sx) * 4;
                        const dr = src[si] - cr;
                        const dg = src[si + 1] - cg;
                        const db = src[si + 2] - cb;
                        const tonal = Math.sqrt(dr * dr + dg * dg + db * db);
                        if (tonal > t) continue;
                        const w = 1 - tonal / t;
                        sumR += src[si]     * w;
                        sumG += src[si + 1] * w;
                        sumB += src[si + 2] * w;
                        sumA += src[si + 3] * w;
                        sumW += w;
                    }
                }
                const oi = (y * width + x) * 4;
                if (sumW > 0) {
                    out[oi]     = clamp(sumR / sumW);
                    out[oi + 1] = clamp(sumG / sumW);
                    out[oi + 2] = clamp(sumB / sumW);
                    out[oi + 3] = clamp(sumA / sumW);
                } else {
                    out[oi] = src[ci]; out[oi + 1] = src[ci + 1];
                    out[oi + 2] = src[ci + 2]; out[oi + 3] = src[ci + 3];
                }
            }
        }
        return new ImageData(out, width, height);
    },
    renderUI(params, onChange) {
        const p = params as SurfaceBlurParams;
        return (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <div>
                    <label style={{ fontSize: '12px' }}>Radius: {p.radius}px</label>
                    <input type="range" min={1} max={50} value={p.radius}
                        onChange={e => onChange({ ...p, radius: Number(e.target.value) })}
                        style={{ width: '100%' }} />
                </div>
                <div>
                    <label style={{ fontSize: '12px' }}>Threshold: {p.threshold}</label>
                    <input type="range" min={1} max={255} value={p.threshold}
                        onChange={e => onChange({ ...p, threshold: Number(e.target.value) })}
                        style={{ width: '100%' }} />
                </div>
            </div>
        );
    },
});
