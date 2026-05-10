import type { Adjustment } from './Adjustment';
import { registerAdjustment } from './registry';
import { clampByte, mergeDefaults } from './utils';

export interface CurvePoint { x: number; y: number }
export interface CurvesParams extends Record<string, unknown> {
    rgb: CurvePoint[];
    r: CurvePoint[];
    g: CurvePoint[];
    b: CurvePoint[];
}

const linear = [{ x: 0, y: 0 }, { x: 255, y: 255 }];
const defaults: CurvesParams = { rgb: [...linear], r: [...linear], g: [...linear], b: [...linear] };

function buildLut(points: CurvePoint[]): Uint8ClampedArray {
    const lut = new Uint8ClampedArray(256);
    const safePoints = Array.isArray(points) && points.length > 0 ? points : linear;
    const sortedWithDuplicates = safePoints
        .map(point => ({
            x: clampByte(Number(point?.x)),
            y: clampByte(Number(point?.y)),
        }))
        .filter(point => Number.isFinite(point.x) && Number.isFinite(point.y))
        .sort((a, b) => a.x - b.x);
    const sorted = sortedWithDuplicates.filter((point, index, arr) => index === 0 || point.x !== arr[index - 1].x);
    if (sorted.length === 0) return buildLut(linear);
    for (let x = 0; x < 256; x++) {
        if (x <= sorted[0].x) { lut[x] = sorted[0].y; continue; }
        if (x >= sorted[sorted.length - 1].x) { lut[x] = sorted[sorted.length - 1].y; continue; }
        for (let i = 0; i < sorted.length - 1; i++) {
            if (x >= sorted[i].x && x <= sorted[i + 1].x) {
                if (sorted.length <= 2) {
                    const t = (x - sorted[i].x) / Math.max(1, sorted[i + 1].x - sorted[i].x);
                    lut[x] = clampByte(sorted[i].y + t * (sorted[i + 1].y - sorted[i].y));
                    break;
                }
                const p0 = sorted[Math.max(0, i - 1)];
                const p1 = sorted[i];
                const p2 = sorted[i + 1];
                const p3 = sorted[Math.min(sorted.length - 1, i + 2)];
                const t = (x - p1.x) / Math.max(1, p2.x - p1.x);
                const t2 = t * t;
                const t3 = t2 * t;
                // Catmull-Rom interpolation gives Photoshop-like smooth tonal curves from simple control points.
                lut[x] = clampByte(0.5 * (
                    (2 * p1.y)
                    + (-p0.y + p2.y) * t
                    + (2 * p0.y - 5 * p1.y + 4 * p2.y - p3.y) * t2
                    + (-p0.y + 3 * p1.y - 3 * p2.y + p3.y) * t3
                ));
                break;
            }
        }
    }
    return lut;
}

export const curves: Adjustment<CurvesParams> = {
    id: 'curves',
    label: 'Curves',
    defaultParams: defaults,
    apply: (p, { image }) => {
        const params = mergeDefaults(defaults, p);
        const out = new ImageData(new Uint8ClampedArray(image.data), image.width, image.height);
        const lutRGB = buildLut(params.rgb);
        const lutR = buildLut(params.r);
        const lutG = buildLut(params.g);
        const lutB = buildLut(params.b);
        for (let i = 0; i < out.data.length; i += 4) {
            out.data[i] = lutR[lutRGB[image.data[i]]];
            out.data[i + 1] = lutG[lutRGB[image.data[i + 1]]];
            out.data[i + 2] = lutB[lutRGB[image.data[i + 2]]];
        }
        return out;
    },
};

registerAdjustment(curves);
