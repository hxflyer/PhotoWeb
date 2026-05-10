import { registerFilter } from './registry';
import type { FilterApplyContext } from './Filter';

function clamp(v: number): number { return v < 0 ? 0 : v > 255 ? 255 : v; }

function bilinearSample(src: Uint8ClampedArray, width: number, height: number, sx: number, sy: number, ch: number): number {
    const x0 = Math.floor(sx); const y0 = Math.floor(sy);
    const x1 = Math.min(x0 + 1, width - 1); const y1 = Math.min(y0 + 1, height - 1);
    const fx = sx - x0; const fy = sy - y0;
    const cx0 = Math.max(0, Math.min(width - 1, x0));
    const cy0 = Math.max(0, Math.min(height - 1, y0));
    const v00 = src[(cy0 * width + cx0) * 4 + ch];
    const v10 = src[(cy0 * width + x1) * 4 + ch];
    const v01 = src[(y1 * width + cx0) * 4 + ch];
    const v11 = src[(y1 * width + x1) * 4 + ch];
    return v00 * (1 - fx) * (1 - fy) + v10 * fx * (1 - fy) + v01 * (1 - fx) * fy + v11 * fx * fy;
}

// ── Pinch ─────────────────────────────────────────────────────────────────

export interface PinchParams { amount: number }

registerFilter<PinchParams>({
    id: 'distort-pinch',
    label: 'Pinch',
    defaultParams: { amount: 50 },
    apply({ amount }: PinchParams, { image, width, height }: FilterApplyContext): ImageData {
        const src = image.data;
        const out = new Uint8ClampedArray(width * height * 4);
        const cx = width / 2; const cy = height / 2;
        const maxR = Math.sqrt(cx * cx + cy * cy);
        const strength = amount / 100;

        for (let y = 0; y < height; y++) {
            for (let x = 0; x < width; x++) {
                const dx = x - cx; const dy = y - cy;
                const r = Math.sqrt(dx * dx + dy * dy);
                const norm = r / maxR;
                const pinch = Math.pow(norm, 1 + strength);
                const sx = norm > 0 ? cx + (dx / norm) * pinch : x;
                const sy = norm > 0 ? cy + (dy / norm) * pinch : y;
                const oi = (y * width + x) * 4;
                for (let c = 0; c < 4; c++) out[oi + c] = clamp(bilinearSample(src, width, height, sx, sy, c));
            }
        }
        return new ImageData(out, width, height);
    },
    renderUI(params, onChange) {
        const p = params as PinchParams;
        return (
            <>
                <label style={{ fontSize: '12px' }}>Amount: {p.amount}%</label>
                <input type="range" min={-100} max={100} value={p.amount}
                    onChange={e => onChange({ ...p, amount: Number(e.target.value) })} style={{ width: '100%' }} />
            </>
        );
    },
});

// ── Spherize ─────────────────────────────────────────────────────────────

export interface SpherizeParams { amount: number }

registerFilter<SpherizeParams>({
    id: 'distort-spherize',
    label: 'Spherize',
    defaultParams: { amount: 100 },
    apply({ amount }: SpherizeParams, { image, width, height }: FilterApplyContext): ImageData {
        const src = image.data;
        const out = new Uint8ClampedArray(width * height * 4);
        const cx = width / 2; const cy = height / 2;
        const r = Math.min(cx, cy);
        const scale = amount / 100;

        for (let y = 0; y < height; y++) {
            for (let x = 0; x < width; x++) {
                const nx = (x - cx) / r; const ny = (y - cy) / r;
                const dist = Math.sqrt(nx * nx + ny * ny);
                let sx = x; let sy = y;
                if (dist < 1) {
                    const z = Math.sqrt(1 - dist * dist);
                    const sphX = nx / (z + 1 - scale * (1 - z));
                    const sphY = ny / (z + 1 - scale * (1 - z));
                    sx = cx + sphX * r;
                    sy = cy + sphY * r;
                }
                const oi = (y * width + x) * 4;
                for (let c = 0; c < 4; c++) out[oi + c] = clamp(bilinearSample(src, width, height, sx, sy, c));
            }
        }
        return new ImageData(out, width, height);
    },
    renderUI(params, onChange) {
        const p = params as SpherizeParams;
        return (
            <>
                <label style={{ fontSize: '12px' }}>Amount: {p.amount}%</label>
                <input type="range" min={-100} max={100} value={p.amount}
                    onChange={e => onChange({ ...p, amount: Number(e.target.value) })} style={{ width: '100%' }} />
            </>
        );
    },
});
