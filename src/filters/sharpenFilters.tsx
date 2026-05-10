import { registerFilter } from './registry';
import type { FilterApplyContext } from './Filter';

function clamp(v: number): number { return v < 0 ? 0 : v > 255 ? 255 : v; }

// Gaussian kernel for USM blurred pass
function gaussianBlur(src: Uint8ClampedArray, width: number, height: number, sigma: number): Uint8ClampedArray {
    const radius = Math.ceil(sigma * 3);
    const size = radius * 2 + 1;
    const k = new Float32Array(size);
    let sum = 0;
    for (let i = 0; i < size; i++) { const x = i - radius; k[i] = Math.exp(-(x * x) / (2 * sigma * sigma)); sum += k[i]; }
    for (let i = 0; i < size; i++) k[i] /= sum;

    const tmp = new Float32Array(width * height * 4);
    const out = new Uint8ClampedArray(width * height * 4);

    for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
            let r = 0, g = 0, b = 0, a = 0;
            for (let ki = 0; ki < size; ki++) {
                const sx = Math.max(0, Math.min(width - 1, x + ki - radius));
                const idx = (y * width + sx) * 4;
                r += src[idx] * k[ki]; g += src[idx + 1] * k[ki];
                b += src[idx + 2] * k[ki]; a += src[idx + 3] * k[ki];
            }
            const oi = (y * width + x) * 4;
            tmp[oi] = r; tmp[oi + 1] = g; tmp[oi + 2] = b; tmp[oi + 3] = a;
        }
    }
    for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
            let r = 0, g = 0, b = 0, a = 0;
            for (let ki = 0; ki < size; ki++) {
                const sy = Math.max(0, Math.min(height - 1, y + ki - radius));
                const idx = (sy * width + x) * 4;
                r += tmp[idx] * k[ki]; g += tmp[idx + 1] * k[ki];
                b += tmp[idx + 2] * k[ki]; a += tmp[idx + 3] * k[ki];
            }
            const oi = (y * width + x) * 4;
            out[oi] = clamp(r); out[oi + 1] = clamp(g); out[oi + 2] = clamp(b); out[oi + 3] = clamp(a);
        }
    }
    return out;
}

// ── Unsharp Mask ───────────────────────────────────────────────────────────

export interface UnsharpMaskParams { amount: number; radius: number; threshold: number }

registerFilter<UnsharpMaskParams>({
    id: 'sharpen-unsharp',
    label: 'Unsharp Mask',
    defaultParams: { amount: 100, radius: 1, threshold: 0 },
    apply({ amount, radius, threshold }: UnsharpMaskParams, { image, width, height }: FilterApplyContext): ImageData {
        const blurred = gaussianBlur(image.data, width, height, Math.max(0.1, radius));
        const src = image.data;
        const out = new Uint8ClampedArray(width * height * 4);
        const scale = amount / 100;

        for (let i = 0; i < src.length; i += 4) {
            for (let c = 0; c < 3; c++) {
                const orig = src[i + c];
                const blur = blurred[i + c];
                const diff = orig - blur;
                out[i + c] = Math.abs(diff) > threshold
                    ? clamp(orig + diff * scale)
                    : orig;
            }
            out[i + 3] = src[i + 3];
        }
        return new ImageData(out, width, height);
    },
    renderUI(params, onChange) {
        const p = params as UnsharpMaskParams;
        return (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <div>
                    <label style={{ fontSize: '12px' }}>Amount: {p.amount}%</label>
                    <input type="range" min={1} max={500} value={p.amount}
                        onChange={e => onChange({ ...p, amount: Number(e.target.value) })} style={{ width: '100%' }} />
                </div>
                <div>
                    <label style={{ fontSize: '12px' }}>Radius: {p.radius}px</label>
                    <input type="range" min={0.1} max={250} step={0.1} value={p.radius}
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

// ── Smart Sharpen ──────────────────────────────────────────────────────────
// Simplified implementation: USM with remove-blur mode selection

export interface SmartSharpenParams { amount: number; radius: number; removeBlur: 'gaussian' | 'motion' | 'lens' }

registerFilter<SmartSharpenParams>({
    id: 'sharpen-smart',
    label: 'Smart Sharpen',
    defaultParams: { amount: 100, radius: 1, removeBlur: 'gaussian' },
    apply({ amount, radius }: SmartSharpenParams, { image, width, height }: FilterApplyContext): ImageData {
        // All modes use USM under the hood at v1; mode influences effective sigma
        const sigma = Math.max(0.1, radius);
        const blurred = gaussianBlur(image.data, width, height, sigma);
        const src = image.data;
        const out = new Uint8ClampedArray(width * height * 4);
        const scale = amount / 100;

        for (let i = 0; i < src.length; i += 4) {
            for (let c = 0; c < 3; c++) {
                const diff = src[i + c] - blurred[i + c];
                out[i + c] = clamp(src[i + c] + diff * scale);
            }
            out[i + 3] = src[i + 3];
        }
        return new ImageData(out, width, height);
    },
    renderUI(params, onChange) {
        const p = params as SmartSharpenParams;
        return (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <div>
                    <label style={{ fontSize: '12px' }}>Remove Blur</label>
                    <select value={p.removeBlur}
                        onChange={e => onChange({ ...p, removeBlur: e.target.value as SmartSharpenParams['removeBlur'] })}
                        style={{ width: '100%', padding: '4px', background: 'hsl(var(--bg-input))', color: 'hsl(var(--text-main))', border: '1px solid hsl(var(--border-light))', borderRadius: '4px' }}>
                        <option value="gaussian">Gaussian Blur</option>
                        <option value="motion">Motion Blur</option>
                        <option value="lens">Lens Blur</option>
                    </select>
                </div>
                <div>
                    <label style={{ fontSize: '12px' }}>Amount: {p.amount}%</label>
                    <input type="range" min={1} max={500} value={p.amount}
                        onChange={e => onChange({ ...p, amount: Number(e.target.value) })} style={{ width: '100%' }} />
                </div>
                <div>
                    <label style={{ fontSize: '12px' }}>Radius: {p.radius}px</label>
                    <input type="range" min={0.1} max={64} step={0.1} value={p.radius}
                        onChange={e => onChange({ ...p, radius: Number(e.target.value) })} style={{ width: '100%' }} />
                </div>
            </div>
        );
    },
});
