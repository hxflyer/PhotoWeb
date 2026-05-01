import type { Adjustment } from './Adjustment';
import { registerAdjustment } from './registry';

export interface CurvePoint { x: number; y: number }
export interface CurvesParams extends Record<string, unknown> {
    rgb: CurvePoint[];
    r: CurvePoint[];
    g: CurvePoint[];
    b: CurvePoint[];
}

const linear = [{ x: 0, y: 0 }, { x: 255, y: 255 }];

function buildLut(points: CurvePoint[]): Uint8ClampedArray {
    const lut = new Uint8ClampedArray(256);
    const sorted = [...points].sort((a, b) => a.x - b.x);
    for (let x = 0; x < 256; x++) {
        if (x <= sorted[0].x) { lut[x] = sorted[0].y; continue; }
        if (x >= sorted[sorted.length - 1].x) { lut[x] = sorted[sorted.length - 1].y; continue; }
        for (let i = 0; i < sorted.length - 1; i++) {
            if (x >= sorted[i].x && x <= sorted[i + 1].x) {
                const t = (x - sorted[i].x) / Math.max(1, sorted[i + 1].x - sorted[i].x);
                lut[x] = Math.round(sorted[i].y + t * (sorted[i + 1].y - sorted[i].y));
                break;
            }
        }
    }
    return lut;
}

export const curves: Adjustment<CurvesParams> = {
    id: 'curves',
    label: 'Curves',
    defaultParams: { rgb: [...linear], r: [...linear], g: [...linear], b: [...linear] },
    apply: (p, { image }) => {
        const out = new ImageData(new Uint8ClampedArray(image.data), image.width, image.height);
        const lutRGB = buildLut(p.rgb);
        const lutR = buildLut(p.r);
        const lutG = buildLut(p.g);
        const lutB = buildLut(p.b);
        for (let i = 0; i < out.data.length; i += 4) {
            out.data[i] = lutR[lutRGB[image.data[i]]];
            out.data[i + 1] = lutG[lutRGB[image.data[i + 1]]];
            out.data[i + 2] = lutB[lutRGB[image.data[i + 2]]];
        }
        return out;
    },
};

registerAdjustment(curves);
