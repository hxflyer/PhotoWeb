import { registerFilter } from './registry';
import type { FilterApplyContext } from './Filter';

export interface MosaicParams {
    cellSize: number;
}

registerFilter<MosaicParams>({
    id: 'pixelate-mosaic',
    label: 'Mosaic',
    defaultParams: { cellSize: 16 },
    apply({ cellSize }: MosaicParams, { image, width, height }: FilterApplyContext): ImageData {
        const size = Math.max(1, Math.round(cellSize));
        const src = image.data;
        const out = new Uint8ClampedArray(src);

        for (let y = 0; y < height; y += size) {
            for (let x = 0; x < width; x += size) {
                const x2 = Math.min(width, x + size);
                const y2 = Math.min(height, y + size);
                let r = 0;
                let g = 0;
                let b = 0;
                let a = 0;
                let count = 0;
                for (let py = y; py < y2; py++) {
                    for (let px = x; px < x2; px++) {
                        const i = (py * width + px) * 4;
                        r += src[i];
                        g += src[i + 1];
                        b += src[i + 2];
                        a += src[i + 3];
                        count++;
                    }
                }
                const cr = Math.round(r / count);
                const cg = Math.round(g / count);
                const cb = Math.round(b / count);
                const ca = Math.round(a / count);
                for (let py = y; py < y2; py++) {
                    for (let px = x; px < x2; px++) {
                        const i = (py * width + px) * 4;
                        out[i] = cr;
                        out[i + 1] = cg;
                        out[i + 2] = cb;
                        out[i + 3] = ca;
                    }
                }
            }
        }

        return new ImageData(out, width, height);
    },
    renderUI(params, onChange) {
        const p = params as MosaicParams;
        const cellSize = Math.max(1, Math.round(p.cellSize ?? 16));
        return (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <div>
                    <label style={{ fontSize: '12px' }}>Cell Size: {cellSize} square</label>
                    <input
                        data-testid="mosaic-cell-size"
                        type="range"
                        min={1}
                        max={200}
                        value={cellSize}
                        onChange={e => onChange({ ...p, cellSize: Number(e.target.value) })}
                        style={{ width: '100%' }}
                    />
                </div>
                <input
                    data-testid="mosaic-cell-size-input"
                    type="number"
                    min={1}
                    max={200}
                    value={cellSize}
                    onChange={e => onChange({ ...p, cellSize: Number(e.target.value) })}
                    style={{
                        width: 80,
                        padding: 4,
                        background: 'hsl(var(--bg-input))',
                        color: 'hsl(var(--text-main))',
                        border: '1px solid hsl(var(--border-light))',
                        borderRadius: 4,
                    }}
                />
            </div>
        );
    },
});
