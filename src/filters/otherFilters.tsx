import { registerFilter } from './registry';
import type { FilterApplyContext } from './Filter';

function clamp(v: number): number { return v < 0 ? 0 : v > 255 ? 255 : v; }

// ── High Pass ─────────────────────────────────────────────────────────────
// Subtracts a Gaussian-blurred version, then shifts to 128-neutral grey.
// Commonly used for sharpening when combined with Overlay blend mode.

export interface HighPassParams { radius: number }

registerFilter<HighPassParams>({
    id: 'other-high-pass',
    label: 'High Pass',
    defaultParams: { radius: 10 },
    apply({ radius }: HighPassParams, { image, width, height }: FilterApplyContext): ImageData {
        const sigma = Math.max(0.1, radius);
        const r = Math.ceil(sigma * 3);
        const size = r * 2 + 1;
        const k = new Float32Array(size);
        let sum = 0;
        for (let i = 0; i < size; i++) { const x = i - r; k[i] = Math.exp(-(x * x) / (2 * sigma * sigma)); sum += k[i]; }
        for (let i = 0; i < size; i++) k[i] /= sum;

        const src = image.data;
        // Premultiply RGB by alpha so the blur of partially-transparent regions
        // doesn't pull in the zero-RGB of fully-transparent neighbors (which
        // would darken edges and corrupt the High Pass + Overlay sharpening
        // recipe). After the blur we un-premultiply by the blurred alpha.
        const tmp = new Float32Array(width * height * 4);
        const blurred = new Float32Array(width * height * 4);
        const pre = new Float32Array(width * height * 4);
        for (let i = 0; i < src.length; i += 4) {
            const a = src[i + 3] / 255;
            pre[i]     = src[i]     * a;
            pre[i + 1] = src[i + 1] * a;
            pre[i + 2] = src[i + 2] * a;
            pre[i + 3] = src[i + 3];
        }

        for (let y = 0; y < height; y++) {
            for (let x = 0; x < width; x++) {
                let ar = 0, ag = 0, ab = 0, aa = 0;
                for (let ki = 0; ki < size; ki++) {
                    const sx = Math.max(0, Math.min(width - 1, x + ki - r));
                    const idx = (y * width + sx) * 4;
                    ar += pre[idx] * k[ki]; ag += pre[idx + 1] * k[ki];
                    ab += pre[idx + 2] * k[ki]; aa += pre[idx + 3] * k[ki];
                }
                const oi = (y * width + x) * 4;
                tmp[oi] = ar; tmp[oi + 1] = ag; tmp[oi + 2] = ab; tmp[oi + 3] = aa;
            }
        }
        for (let y = 0; y < height; y++) {
            for (let x = 0; x < width; x++) {
                let ar = 0, ag = 0, ab = 0, aa = 0;
                for (let ki = 0; ki < size; ki++) {
                    const sy = Math.max(0, Math.min(height - 1, y + ki - r));
                    const idx = (sy * width + x) * 4;
                    ar += tmp[idx] * k[ki]; ag += tmp[idx + 1] * k[ki];
                    ab += tmp[idx + 2] * k[ki]; aa += tmp[idx + 3] * k[ki];
                }
                const oi = (y * width + x) * 4;
                blurred[oi] = ar; blurred[oi + 1] = ag; blurred[oi + 2] = ab; blurred[oi + 3] = aa;
            }
        }

        const out = new Uint8ClampedArray(width * height * 4);
        for (let i = 0; i < src.length; i += 4) {
            const blurredA = blurred[i + 3] > 0 ? blurred[i + 3] / 255 : 1;
            const br = blurred[i]     / blurredA;
            const bg = blurred[i + 1] / blurredA;
            const bb = blurred[i + 2] / blurredA;
            out[i]     = clamp(src[i]     - br + 128);
            out[i + 1] = clamp(src[i + 1] - bg + 128);
            out[i + 2] = clamp(src[i + 2] - bb + 128);
            out[i + 3] = src[i + 3];
        }
        return new ImageData(out, width, height);
    },
    renderUI(params, onChange) {
        const p = params as HighPassParams;
        return (
            <>
                <label style={{ fontSize: '12px' }}>Radius: {p.radius}px</label>
                <input type="range" min={0.1} max={500} step={0.1} value={p.radius}
                    onChange={e => onChange({ ...p, radius: Number(e.target.value) })} style={{ width: '100%' }} />
            </>
        );
    },
});

// ── Offset ────────────────────────────────────────────────────────────────
// Moves pixels by a signed offset. Wrap Around is the pattern-tile workhorse
// used to check seams by pushing center content into the corners.

export interface OffsetParams {
    horizontal: number;
    vertical: number;
    undefinedAreas: 'wrap' | 'transparent' | 'repeat-edge';
}

registerFilter<OffsetParams>({
    id: 'other-offset',
    label: 'Offset',
    defaultParams: { horizontal: 0, vertical: 0, undefinedAreas: 'wrap' },
    apply({ horizontal, vertical, undefinedAreas }: OffsetParams, { image, width, height }: FilterApplyContext): ImageData {
        const dx = Math.round(horizontal);
        const dy = Math.round(vertical);
        const out = new ImageData(width, height);
        const src = image.data;
        const dst = out.data;

        for (let y = 0; y < height; y++) {
            for (let x = 0; x < width; x++) {
                let sx = x - dx;
                let sy = y - dy;
                if (undefinedAreas === 'wrap') {
                    sx = ((sx % width) + width) % width;
                    sy = ((sy % height) + height) % height;
                } else if (undefinedAreas === 'repeat-edge') {
                    sx = Math.max(0, Math.min(width - 1, sx));
                    sy = Math.max(0, Math.min(height - 1, sy));
                } else if (sx < 0 || sx >= width || sy < 0 || sy >= height) {
                    continue;
                }
                const si = (sy * width + sx) * 4;
                const di = (y * width + x) * 4;
                dst[di] = src[si];
                dst[di + 1] = src[si + 1];
                dst[di + 2] = src[si + 2];
                dst[di + 3] = src[si + 3];
            }
        }
        return out;
    },
    renderUI(params, onChange) {
        const p = params as OffsetParams;
        const update = (next: Partial<OffsetParams>) => onChange({ ...p, ...next });
        const inputStyle = {
            width: 88,
            background: 'rgba(0,0,0,0.2)',
            color: '#f4f4f4',
            border: '1px solid #777',
            padding: '4px 6px',
        };
        return (
            <div style={{ display: 'grid', gap: 12 }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <span style={{ width: 96 }}>Horizontal</span>
                    <input
                        data-testid="offset-horizontal"
                        type="number"
                        value={p.horizontal}
                        onChange={e => update({ horizontal: Number(e.target.value) })}
                        style={inputStyle}
                    />
                    <span>pixels</span>
                </label>
                <label style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <span style={{ width: 96 }}>Vertical</span>
                    <input
                        data-testid="offset-vertical"
                        type="number"
                        value={p.vertical}
                        onChange={e => update({ vertical: Number(e.target.value) })}
                        style={inputStyle}
                    />
                    <span>pixels</span>
                </label>
                <fieldset style={{ border: '1px solid #777', padding: 10 }}>
                    <legend>Undefined Areas</legend>
                    <label style={{ display: 'block', marginBottom: 6 }}>
                        <input
                            data-testid="offset-wrap"
                            type="radio"
                            checked={p.undefinedAreas === 'wrap'}
                            onChange={() => update({ undefinedAreas: 'wrap' })}
                        /> Wrap Around
                    </label>
                    <label style={{ display: 'block', marginBottom: 6 }}>
                        <input
                            type="radio"
                            checked={p.undefinedAreas === 'repeat-edge'}
                            onChange={() => update({ undefinedAreas: 'repeat-edge' })}
                        /> Repeat Edge Pixels
                    </label>
                    <label style={{ display: 'block' }}>
                        <input
                            type="radio"
                            checked={p.undefinedAreas === 'transparent'}
                            onChange={() => update({ undefinedAreas: 'transparent' })}
                        /> Set to Transparent
                    </label>
                </fieldset>
            </div>
        );
    },
});
