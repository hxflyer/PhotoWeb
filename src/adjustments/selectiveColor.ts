import type { Adjustment } from './Adjustment';
import { registerAdjustment } from './registry';
import { clamp01, clampByte, mergeDefaults, numberParam, stringParam } from './utils';

export type SelectiveColorRange =
    | 'reds'
    | 'yellows'
    | 'greens'
    | 'cyans'
    | 'blues'
    | 'magentas'
    | 'whites'
    | 'neutrals'
    | 'blacks';

export type SelectiveColorMethod = 'relative' | 'absolute';

export interface SelectiveColorParams extends Record<string, unknown> {
    range: SelectiveColorRange;
    cyan: number;
    magenta: number;
    yellow: number;
    black: number;
    method: SelectiveColorMethod;
}

const defaults: SelectiveColorParams = {
    range: 'reds',
    cyan: 0,
    magenta: 0,
    yellow: 0,
    black: 0,
    method: 'relative',
};

const VALID_RANGES: SelectiveColorRange[] = [
    'reds', 'yellows', 'greens', 'cyans', 'blues', 'magentas', 'whites', 'neutrals', 'blacks',
];

function parseRange(value: unknown): SelectiveColorRange {
    return (VALID_RANGES as string[]).includes(value as string)
        ? (value as SelectiveColorRange)
        : defaults.range;
}

function parseMethod(value: unknown): SelectiveColorMethod {
    return value === 'absolute' ? 'absolute' : 'relative';
}

// Hue (degrees, 0..360) centered on the six chromatic primaries.
const CHROMA_CENTERS: Record<Exclude<SelectiveColorRange, 'whites' | 'neutrals' | 'blacks'>, number> = {
    reds: 0,
    yellows: 60,
    greens: 120,
    cyans: 180,
    blues: 240,
    magentas: 300,
};

function rgbToHsl(r: number, g: number, b: number): { h: number; s: number; l: number } {
    const rn = r / 255;
    const gn = g / 255;
    const bn = b / 255;
    const max = Math.max(rn, gn, bn);
    const min = Math.min(rn, gn, bn);
    const l = (max + min) / 2;
    let h = 0;
    let s = 0;
    if (max !== min) {
        const d = max - min;
        s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
        if (max === rn) h = ((gn - bn) / d + (gn < bn ? 6 : 0));
        else if (max === gn) h = ((bn - rn) / d + 2);
        else h = ((rn - gn) / d + 4);
        h = (h * 60) % 360;
        if (h < 0) h += 360;
    }
    return { h, s, l };
}

function angularDistance(a: number, b: number): number {
    const d = Math.abs(a - b) % 360;
    return d > 180 ? 360 - d : d;
}

function chromaWeight(hue: number, saturation: number, center: number): number {
    // Photoshop-like 60° angular window around the center hue, soft falloff.
    const dist = angularDistance(hue, center);
    if (dist >= 60) return 0;
    const hueWeight = 1 - dist / 60;
    // Scale by saturation so very desaturated pixels aren't shifted as "reds".
    return hueWeight * Math.min(1, saturation * 2);
}

function lightnessWeight(lightness: number, range: 'whites' | 'neutrals' | 'blacks'): number {
    if (range === 'whites') {
        if (lightness <= 0.5) return 0;
        return Math.min(1, (lightness - 0.5) * 2);
    }
    if (range === 'blacks') {
        if (lightness >= 0.5) return 0;
        return Math.min(1, (0.5 - lightness) * 2);
    }
    // neutrals: tent around 0.5
    return Math.max(0, 1 - Math.abs(lightness - 0.5) * 2);
}

function rgbToCmyk(r: number, g: number, b: number): { c: number; m: number; y: number; k: number } {
    const rn = r / 255;
    const gn = g / 255;
    const bn = b / 255;
    const k = 1 - Math.max(rn, gn, bn);
    if (k >= 1 - 1e-6) return { c: 0, m: 0, y: 0, k: 1 };
    const denom = 1 - k;
    return {
        c: (1 - rn - k) / denom,
        m: (1 - gn - k) / denom,
        y: (1 - bn - k) / denom,
        k,
    };
}

function cmykToRgb(c: number, m: number, y: number, k: number): { r: number; g: number; b: number } {
    const cc = clamp01(c);
    const mm = clamp01(m);
    const yy = clamp01(y);
    const kk = clamp01(k);
    const r = (1 - cc) * (1 - kk);
    const g = (1 - mm) * (1 - kk);
    const b = (1 - yy) * (1 - kk);
    return { r: r * 255, g: g * 255, b: b * 255 };
}

function applyChannelShift(channel: number, delta: number, method: SelectiveColorMethod): number {
    if (method === 'absolute') return clamp01(channel + delta);
    // Relative: scale the existing value, like Photoshop's "Relative" mode.
    // Positive delta increases the ink amount proportional to (1 - channel) room left;
    // negative delta scales down by (1 + delta) factor.
    if (delta >= 0) return clamp01(channel + (1 - channel) * delta);
    return clamp01(channel * (1 + delta));
}

export const selectiveColor: Adjustment<SelectiveColorParams> = {
    id: 'selective-color',
    label: 'Selective Color',
    defaultParams: defaults,
    apply: (p, { image }) => {
        const params = mergeDefaults(defaults, p);
        const range = parseRange(params.range);
        const cyan = numberParam(params, 'cyan', defaults.cyan, -100, 100) / 100;
        const magenta = numberParam(params, 'magenta', defaults.magenta, -100, 100) / 100;
        const yellow = numberParam(params, 'yellow', defaults.yellow, -100, 100) / 100;
        const black = numberParam(params, 'black', defaults.black, -100, 100) / 100;
        const method = parseMethod(stringParam(params, 'method', defaults.method));
        const out = new ImageData(new Uint8ClampedArray(image.data), image.width, image.height);

        const isLightnessRange = range === 'whites' || range === 'neutrals' || range === 'blacks';

        for (let i = 0; i < out.data.length; i += 4) {
            const r = image.data[i];
            const g = image.data[i + 1];
            const b = image.data[i + 2];
            const { h, s, l } = rgbToHsl(r, g, b);
            const w = isLightnessRange
                ? lightnessWeight(l, range)
                : chromaWeight(h, s, CHROMA_CENTERS[range as Exclude<SelectiveColorRange, 'whites' | 'neutrals' | 'blacks'>]);
            if (w <= 0) {
                out.data[i] = r;
                out.data[i + 1] = g;
                out.data[i + 2] = b;
                continue;
            }
            const cmyk = rgbToCmyk(r, g, b);
            const wC = applyChannelShift(cmyk.c, cyan * w, method);
            const wM = applyChannelShift(cmyk.m, magenta * w, method);
            const wY = applyChannelShift(cmyk.y, yellow * w, method);
            const wK = applyChannelShift(cmyk.k, black * w, method);
            const rgb = cmykToRgb(wC, wM, wY, wK);
            out.data[i] = clampByte(rgb.r);
            out.data[i + 1] = clampByte(rgb.g);
            out.data[i + 2] = clampByte(rgb.b);
        }
        return out;
    },
};

registerAdjustment(selectiveColor);
