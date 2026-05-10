import { registerFilter } from './registry';
import type { FilterApplyContext } from './Filter';

function clamp(v: number): number { return v < 0 ? 0 : v > 255 ? 255 : v; }

// ── Lens Flare ────────────────────────────────────────────────────────────

export interface LensFlareParams {
    x: number;
    y: number;
    brightness: number;
    lensType: '50-300mm' | '35mm' | '105mm' | 'movie-prime'
}

registerFilter<LensFlareParams>({
    id: 'render-lens-flare',
    label: 'Lens Flare',
    defaultParams: { x: 50, y: 50, brightness: 100, lensType: '50-300mm' },
    apply({ x, y, brightness, lensType }: LensFlareParams, { image, width, height }: FilterApplyContext): ImageData {
        const out = new Uint8ClampedArray(image.data);
        const srcX = (x / 100) * width;
        const srcY = (y / 100) * height;
        const scale = brightness / 100;

        // Number of flare rings by lens type
        const rings: { r: number; alpha: number; color: [number, number, number] }[] = [];
        if (lensType === '50-300mm') {
            rings.push({ r: 0.15 * Math.min(width, height), alpha: 0.9 * scale, color: [255, 240, 200] });
            rings.push({ r: 0.08 * Math.min(width, height), alpha: 0.5 * scale, color: [200, 220, 255] });
            rings.push({ r: 0.04 * Math.min(width, height), alpha: 0.7 * scale, color: [255, 255, 255] });
        } else if (lensType === '35mm') {
            rings.push({ r: 0.2 * Math.min(width, height), alpha: 0.6 * scale, color: [255, 200, 100] });
        } else if (lensType === '105mm') {
            rings.push({ r: 0.12 * Math.min(width, height), alpha: 0.8 * scale, color: [255, 255, 230] });
            rings.push({ r: 0.06 * Math.min(width, height), alpha: 0.4 * scale, color: [255, 180, 50] });
        } else {
            rings.push({ r: 0.25 * Math.min(width, height), alpha: 0.5 * scale, color: [200, 200, 255] });
            rings.push({ r: 0.05 * Math.min(width, height), alpha: 0.9 * scale, color: [255, 255, 255] });
        }

        for (let py = 0; py < height; py++) {
            for (let px2 = 0; px2 < width; px2++) {
                const oi = (py * width + px2) * 4;
                let addR = 0, addG = 0, addB = 0;
                for (const ring of rings) {
                    const dx = px2 - srcX; const dy = py - srcY;
                    const dist = Math.sqrt(dx * dx + dy * dy);
                    const falloff = Math.max(0, 1 - dist / ring.r);
                    const w = falloff * falloff * ring.alpha;
                    addR += ring.color[0] * w;
                    addG += ring.color[1] * w;
                    addB += ring.color[2] * w;
                }
                out[oi]     = clamp(out[oi]     + addR);
                out[oi + 1] = clamp(out[oi + 1] + addG);
                out[oi + 2] = clamp(out[oi + 2] + addB);
            }
        }
        return new ImageData(out, width, height);
    },
    renderUI(params, onChange) {
        const p = params as LensFlareParams;
        return (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <div>
                    <label style={{ fontSize: '12px' }}>Lens Type</label>
                    <select value={p.lensType}
                        onChange={e => onChange({ ...p, lensType: e.target.value as LensFlareParams['lensType'] })}
                        style={{ width: '100%', padding: '4px', background: 'hsl(var(--bg-input))', color: 'hsl(var(--text-main))', border: '1px solid hsl(var(--border-light))', borderRadius: '4px' }}>
                        <option value="50-300mm">50-300mm Zoom</option>
                        <option value="35mm">35mm Prime</option>
                        <option value="105mm">105mm Prime</option>
                        <option value="movie-prime">Movie Prime</option>
                    </select>
                </div>
                <div>
                    <label style={{ fontSize: '12px' }}>Brightness: {p.brightness}%</label>
                    <input type="range" min={10} max={300} value={p.brightness}
                        onChange={e => onChange({ ...p, brightness: Number(e.target.value) })} style={{ width: '100%' }} />
                </div>
                <div style={{ display: 'flex', gap: '8px' }}>
                    <div style={{ flex: 1 }}>
                        <label style={{ fontSize: '12px' }}>X: {p.x}%</label>
                        <input type="range" min={0} max={100} value={p.x}
                            onChange={e => onChange({ ...p, x: Number(e.target.value) })} style={{ width: '100%' }} />
                    </div>
                    <div style={{ flex: 1 }}>
                        <label style={{ fontSize: '12px' }}>Y: {p.y}%</label>
                        <input type="range" min={0} max={100} value={p.y}
                            onChange={e => onChange({ ...p, y: Number(e.target.value) })} style={{ width: '100%' }} />
                    </div>
                </div>
            </div>
        );
    },
});
