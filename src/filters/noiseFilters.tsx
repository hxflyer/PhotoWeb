import { registerFilter } from './registry';
import type { FilterApplyContext } from './Filter';

function clamp(v: number): number { return v < 0 ? 0 : v > 255 ? 255 : v; }

// ── Add Noise ──────────────────────────────────────────────────────────────

export interface AddNoiseParams { amount: number; monochromatic: boolean }

registerFilter<AddNoiseParams>({
    id: 'noise-add',
    label: 'Add Noise',
    defaultParams: { amount: 25, monochromatic: false },
    apply({ amount, monochromatic }: AddNoiseParams, { image, width, height }: FilterApplyContext): ImageData {
        const src = image.data;
        const out = new Uint8ClampedArray(src);
        const scale = amount * 2.55;

        for (let i = 0; i < out.length; i += 4) {
            if (monochromatic) {
                const n = (Math.random() - 0.5) * scale;
                out[i]     = clamp(out[i]     + n);
                out[i + 1] = clamp(out[i + 1] + n);
                out[i + 2] = clamp(out[i + 2] + n);
            } else {
                out[i]     = clamp(out[i]     + (Math.random() - 0.5) * scale);
                out[i + 1] = clamp(out[i + 1] + (Math.random() - 0.5) * scale);
                out[i + 2] = clamp(out[i + 2] + (Math.random() - 0.5) * scale);
            }
        }
        return new ImageData(out, width, height);
    },
    renderUI(params, onChange) {
        const p = params as AddNoiseParams;
        return (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <div>
                    <label style={{ fontSize: '12px' }}>Amount: {p.amount}%</label>
                    <input type="range" min={0} max={100} value={p.amount}
                        onChange={e => onChange({ ...p, amount: Number(e.target.value) })} style={{ width: '100%' }} />
                </div>
                <label style={{ fontSize: '12px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <input type="checkbox" checked={p.monochromatic}
                        onChange={e => onChange({ ...p, monochromatic: e.target.checked })} />
                    Monochromatic
                </label>
            </div>
        );
    },
});

// ── Reduce Noise ───────────────────────────────────────────────────────────
// Simple mean-shift style: average neighbours where tonal diff < strength

export interface ReduceNoiseParams { strength: number; sharpness: number }

registerFilter<ReduceNoiseParams>({
    id: 'noise-reduce',
    label: 'Reduce Noise',
    defaultParams: { strength: 6, sharpness: 25 },
    apply({ strength, sharpness }: ReduceNoiseParams, { image, width, height }: FilterApplyContext): ImageData {
        const radius = 1;
        const threshold = strength * 10;
        const blendBack = sharpness / 100;
        const src = image.data;
        const out = new Uint8ClampedArray(width * height * 4);

        for (let y = 0; y < height; y++) {
            for (let x = 0; x < width; x++) {
                const ci = (y * width + x) * 4;
                let sumR = 0, sumG = 0, sumB = 0, sumA = 0, n = 0;
                for (let sy = Math.max(0, y - radius); sy <= Math.min(height - 1, y + radius); sy++) {
                    for (let sx = Math.max(0, x - radius); sx <= Math.min(width - 1, x + radius); sx++) {
                        const si = (sy * width + sx) * 4;
                        const dr = src[si] - src[ci];
                        const dg = src[si + 1] - src[ci + 1];
                        const db = src[si + 2] - src[ci + 2];
                        if (Math.abs(dr) + Math.abs(dg) + Math.abs(db) <= threshold) {
                            sumR += src[si]; sumG += src[si + 1]; sumB += src[si + 2]; sumA += src[si + 3]; n++;
                        }
                    }
                }
                const oi = (y * width + x) * 4;
                const avgR = n > 0 ? sumR / n : src[ci];
                const avgG = n > 0 ? sumG / n : src[ci + 1];
                const avgB = n > 0 ? sumB / n : src[ci + 2];
                const avgA = n > 0 ? sumA / n : src[ci + 3];
                out[oi]     = clamp(avgR + (src[ci]     - avgR) * blendBack);
                out[oi + 1] = clamp(avgG + (src[ci + 1] - avgG) * blendBack);
                out[oi + 2] = clamp(avgB + (src[ci + 2] - avgB) * blendBack);
                out[oi + 3] = clamp(avgA);
            }
        }
        return new ImageData(out, width, height);
    },
    renderUI(params, onChange) {
        const p = params as ReduceNoiseParams;
        return (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <div>
                    <label style={{ fontSize: '12px' }}>Strength: {p.strength}</label>
                    <input type="range" min={0} max={10} value={p.strength}
                        onChange={e => onChange({ ...p, strength: Number(e.target.value) })} style={{ width: '100%' }} />
                </div>
                <div>
                    <label style={{ fontSize: '12px' }}>Preserve Details: {p.sharpness}%</label>
                    <input type="range" min={0} max={100} value={p.sharpness}
                        onChange={e => onChange({ ...p, sharpness: Number(e.target.value) })} style={{ width: '100%' }} />
                </div>
            </div>
        );
    },
});

// ── Dust & Scratches ─────────────────────────────────────────────────────
// Selective median: replace a pixel with the local median ONLY when the
// original differs from the median by more than `threshold`. Removes small
// specks (dust, scratches) while preserving real edges.

export interface DustScratchesParams { radius: number; threshold: number }

registerFilter<DustScratchesParams>({
    id: 'noise-dust-scratches',
    label: 'Dust & Scratches',
    defaultParams: { radius: 4, threshold: 30 },
    apply({ radius, threshold }: DustScratchesParams, { image, width, height }: FilterApplyContext): ImageData {
        const r = Math.max(1, Math.min(16, Math.round(radius)));
        const t = Math.max(0, Math.min(255, Math.round(threshold)));
        const src = image.data;
        const out = new Uint8ClampedArray(src);

        for (let y = 0; y < height; y++) {
            for (let x = 0; x < width; x++) {
                const ci = (y * width + x) * 4;
                const rs: number[] = [], gs: number[] = [], bs: number[] = [];
                for (let sy = Math.max(0, y - r); sy <= Math.min(height - 1, y + r); sy++) {
                    for (let sx = Math.max(0, x - r); sx <= Math.min(width - 1, x + r); sx++) {
                        const si = (sy * width + sx) * 4;
                        rs.push(src[si]); gs.push(src[si + 1]); bs.push(src[si + 2]);
                    }
                }
                rs.sort((a, b) => a - b); gs.sort((a, b) => a - b); bs.sort((a, b) => a - b);
                const mid = Math.floor(rs.length / 2);
                const medR = rs[mid], medG = gs[mid], medB = bs[mid];
                const dr = Math.abs(src[ci]     - medR);
                const dg = Math.abs(src[ci + 1] - medG);
                const db = Math.abs(src[ci + 2] - medB);
                if (Math.max(dr, dg, db) > t) {
                    out[ci]     = medR;
                    out[ci + 1] = medG;
                    out[ci + 2] = medB;
                }
            }
        }
        return new ImageData(out, width, height);
    },
    renderUI(params, onChange) {
        const p = params as DustScratchesParams;
        return (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <div>
                    <label style={{ fontSize: '12px' }}>Radius: {p.radius}px</label>
                    <input type="range" min={1} max={16} value={p.radius}
                        onChange={e => onChange({ ...p, radius: Number(e.target.value) })} style={{ width: '100%' }} />
                </div>
                <div>
                    <label style={{ fontSize: '12px' }}>Threshold: {p.threshold}</label>
                    <input type="range" min={0} max={255} value={p.threshold}
                        onChange={e => onChange({ ...p, threshold: Number(e.target.value) })} style={{ width: '100%' }} />
                </div>
            </div>
        );
    },
});

// ── Despeckle ────────────────────────────────────────────────────────────
// One-click noise smoother: 3×3 median ONLY where the neighborhood standard
// deviation is low. Flat regions get smoothed; edges (high variance) are
// preserved unchanged.

export type DespeckleParams = Record<string, never>;

registerFilter<DespeckleParams>({
    id: 'noise-despeckle',
    label: 'Despeckle',
    defaultParams: {},
    apply(_p: DespeckleParams, { image, width, height }: FilterApplyContext): ImageData {
        const src = image.data;
        const out = new Uint8ClampedArray(src);
        // Edge detection uses the std-dev of the 3×3 neighborhood EXCLUDING
        // the center pixel — so an isolated noise spike does not look like
        // a real edge to itself. A high cutoff (≈ 24 luma units) means a
        // hard black/white boundary is preserved while a mostly-flat patch
        // containing a single speck is smoothed.
        const edgeStdCutoff = 24;

        for (let y = 0; y < height; y++) {
            for (let x = 0; x < width; x++) {
                const ci = (y * width + x) * 4;
                const rs: number[] = [], gs: number[] = [], bs: number[] = [];
                let sumL = 0, sumL2 = 0, n = 0;
                for (let sy = Math.max(0, y - 1); sy <= Math.min(height - 1, y + 1); sy++) {
                    for (let sx = Math.max(0, x - 1); sx <= Math.min(width - 1, x + 1); sx++) {
                        const si = (sy * width + sx) * 4;
                        rs.push(src[si]); gs.push(src[si + 1]); bs.push(src[si + 2]);
                        if (sx === x && sy === y) continue;
                        const lum = 0.299 * src[si] + 0.587 * src[si + 1] + 0.114 * src[si + 2];
                        sumL += lum; sumL2 += lum * lum; n++;
                    }
                }
                const mean = n > 0 ? sumL / n : 0;
                const variance = n > 0 ? Math.max(0, sumL2 / n - mean * mean) : 0;
                const std = Math.sqrt(variance);
                if (std > edgeStdCutoff) continue;
                rs.sort((a, b) => a - b); gs.sort((a, b) => a - b); bs.sort((a, b) => a - b);
                const mid = Math.floor(rs.length / 2);
                out[ci]     = rs[mid];
                out[ci + 1] = gs[mid];
                out[ci + 2] = bs[mid];
            }
        }
        return new ImageData(out, width, height);
    },
});

// ── Median ────────────────────────────────────────────────────────────────

export interface MedianParams { radius: number }

registerFilter<MedianParams>({
    id: 'noise-median',
    label: 'Median',
    defaultParams: { radius: 1 },
    apply({ radius }: MedianParams, { image, width, height, dirtyRect }: FilterApplyContext): ImageData {
        const r = Math.max(1, Math.round(radius));
        const src = image.data;
        // Start from src so pixels outside the dirty rect pass through unchanged.
        const out = new Uint8ClampedArray(src);

        const x0 = dirtyRect ? Math.max(0, Math.floor(dirtyRect.x)) : 0;
        const y0 = dirtyRect ? Math.max(0, Math.floor(dirtyRect.y)) : 0;
        const x1 = dirtyRect ? Math.min(width, Math.ceil(dirtyRect.x + dirtyRect.width)) : width;
        const y1 = dirtyRect ? Math.min(height, Math.ceil(dirtyRect.y + dirtyRect.height)) : height;

        for (let y = y0; y < y1; y++) {
            for (let x = x0; x < x1; x++) {
                const rs: number[] = [], gs: number[] = [], bs: number[] = [], as_: number[] = [];
                for (let sy = Math.max(0, y - r); sy <= Math.min(height - 1, y + r); sy++) {
                    for (let sx = Math.max(0, x - r); sx <= Math.min(width - 1, x + r); sx++) {
                        const si = (sy * width + sx) * 4;
                        rs.push(src[si]); gs.push(src[si + 1]); bs.push(src[si + 2]); as_.push(src[si + 3]);
                    }
                }
                rs.sort((a, b) => a - b); gs.sort((a, b) => a - b);
                bs.sort((a, b) => a - b); as_.sort((a, b) => a - b);
                const mid = Math.floor(rs.length / 2);
                const oi = (y * width + x) * 4;
                out[oi] = rs[mid]; out[oi + 1] = gs[mid]; out[oi + 2] = bs[mid]; out[oi + 3] = as_[mid];
            }
        }
        return new ImageData(out, width, height);
    },
    renderUI(params, onChange) {
        const p = params as MedianParams;
        return (
            <>
                <label style={{ fontSize: '12px' }}>Radius: {p.radius}px</label>
                <input type="range" min={1} max={16} value={p.radius}
                    onChange={e => onChange({ ...p, radius: Number(e.target.value) })} style={{ width: '100%' }} />
            </>
        );
    },
});
