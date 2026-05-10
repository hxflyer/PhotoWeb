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

// ── Median ────────────────────────────────────────────────────────────────

export interface MedianParams { radius: number }

registerFilter<MedianParams>({
    id: 'noise-median',
    label: 'Median',
    defaultParams: { radius: 1 },
    apply({ radius }: MedianParams, { image, width, height }: FilterApplyContext): ImageData {
        const r = Math.max(1, Math.round(radius));
        const src = image.data;
        const out = new Uint8ClampedArray(width * height * 4);

        for (let y = 0; y < height; y++) {
            for (let x = 0; x < width; x++) {
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
