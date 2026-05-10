import { registerFilter } from './registry';
import type { FilterApplyContext } from './Filter';

function clamp(v: number): number { return v < 0 ? 0 : v > 255 ? 255 : v; }

// ── Find Edges ────────────────────────────────────────────────────────────
// Sobel edge detection, result inverted (white background, dark edges).

registerFilter({
    id: 'stylize-find-edges',
    label: 'Find Edges',
    defaultParams: {},
    apply(_params, { image, width, height }: FilterApplyContext): ImageData {
        const src = image.data;
        const out = new Uint8ClampedArray(width * height * 4);

        const gray = (i: number) => (src[i] * 0.299 + src[i + 1] * 0.587 + src[i + 2] * 0.114);
        const px = (x: number, y: number) => gray(
            (Math.max(0, Math.min(height - 1, y)) * width + Math.max(0, Math.min(width - 1, x))) * 4
        );

        for (let y = 0; y < height; y++) {
            for (let x = 0; x < width; x++) {
                const gx = -px(x - 1, y - 1) - 2 * px(x - 1, y) - px(x - 1, y + 1)
                         +  px(x + 1, y - 1) + 2 * px(x + 1, y) + px(x + 1, y + 1);
                const gy = -px(x - 1, y - 1) - 2 * px(x, y - 1) - px(x + 1, y - 1)
                         +  px(x - 1, y + 1) + 2 * px(x, y + 1) + px(x + 1, y + 1);
                const mag = clamp(255 - Math.sqrt(gx * gx + gy * gy));
                const oi = (y * width + x) * 4;
                out[oi] = out[oi + 1] = out[oi + 2] = mag;
                out[oi + 3] = src[oi + 3];
            }
        }
        return new ImageData(out, width, height);
    },
});

// ── Emboss ─────────────────────────────────────────────────────────────────

export interface EmbossParams { angle: number; height: number; amount: number }

registerFilter<EmbossParams>({
    id: 'stylize-emboss',
    label: 'Emboss',
    defaultParams: { angle: -45, height: 1, amount: 100 },
    apply({ angle, height: h, amount }: EmbossParams, { image, width, height }: FilterApplyContext): ImageData {
        const src = image.data;
        const out = new Uint8ClampedArray(width * height * 4);
        const rad = (angle * Math.PI) / 180;
        const dx = Math.round(Math.cos(rad) * h);
        const dy = Math.round(Math.sin(rad) * h);
        const scale = amount / 100;

        const gray = (i: number) => src[i] * 0.299 + src[i + 1] * 0.587 + src[i + 2] * 0.114;
        const pxGray = (x: number, y: number) => gray(
            (Math.max(0, Math.min(height - 1, y)) * width + Math.max(0, Math.min(width - 1, x))) * 4
        );

        for (let y = 0; y < height; y++) {
            for (let x = 0; x < width; x++) {
                const diff = pxGray(x, y) - pxGray(x + dx, y + dy);
                const val = clamp(128 + diff * scale);
                const oi = (y * width + x) * 4;
                out[oi] = out[oi + 1] = out[oi + 2] = val;
                out[oi + 3] = src[oi + 3];
            }
        }
        return new ImageData(out, width, height);
    },
    renderUI(params, onChange) {
        const p = params as EmbossParams;
        return (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <div>
                    <label style={{ fontSize: '12px' }}>Angle: {p.angle}°</label>
                    <input type="range" min={-180} max={180} value={p.angle}
                        onChange={e => onChange({ ...p, angle: Number(e.target.value) })} style={{ width: '100%' }} />
                </div>
                <div>
                    <label style={{ fontSize: '12px' }}>Height: {p.height}</label>
                    <input type="range" min={1} max={10} value={p.height}
                        onChange={e => onChange({ ...p, height: Number(e.target.value) })} style={{ width: '100%' }} />
                </div>
                <div>
                    <label style={{ fontSize: '12px' }}>Amount: {p.amount}%</label>
                    <input type="range" min={1} max={500} value={p.amount}
                        onChange={e => onChange({ ...p, amount: Number(e.target.value) })} style={{ width: '100%' }} />
                </div>
            </div>
        );
    },
});
