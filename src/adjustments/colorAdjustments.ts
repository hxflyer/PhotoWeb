import type { Adjustment } from './Adjustment';
import { registerAdjustment } from './registry';
import { booleanParam, clamp01, clampByte, mergeDefaults, numberParam, parseHexColor, stringParam } from './utils';

const wrap01 = (v: number) => ((v % 1) + 1) % 1;

function rgb2hsl(r: number, g: number, b: number): [number, number, number] {
    r /= 255; g /= 255; b /= 255;
    const max = Math.max(r, g, b);
    const min = Math.min(r, g, b);
    let h = 0; let s = 0;
    const l = (max + min) / 2;
    if (max !== min) {
        const d = max - min;
        s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
        if (max === r) h = ((g - b) / d + (g < b ? 6 : 0));
        else if (max === g) h = ((b - r) / d + 2);
        else h = ((r - g) / d + 4);
        h /= 6;
    }
    return [h, s, l];
}

function hsl2rgb(h: number, s: number, l: number): [number, number, number] {
    let r: number, g: number, b: number;
    if (s === 0) { r = g = b = l; }
    else {
        const f = (p: number, q: number, t: number) => {
            if (t < 0) t += 1; if (t > 1) t -= 1;
            if (t < 1 / 6) return p + (q - p) * 6 * t;
            if (t < 1 / 2) return q;
            if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6;
            return p;
        };
        const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
        const p = 2 * l - q;
        r = f(p, q, h + 1 / 3);
        g = f(p, q, h);
        b = f(p, q, h - 1 / 3);
    }
    return [r * 255, g * 255, b * 255];
}

export interface VibranceParams extends Record<string, unknown> { vibrance: number; saturation: number }
const vibranceDefaults: VibranceParams = { vibrance: 0, saturation: 0 };

export const vibrance: Adjustment<VibranceParams> = {
    id: 'vibrance',
    label: 'Vibrance',
    defaultParams: vibranceDefaults,
    apply: (p, { image }) => {
        const params = mergeDefaults(vibranceDefaults, p);
        const out = new ImageData(new Uint8ClampedArray(image.data), image.width, image.height);
        const vibAmt = numberParam(params, 'vibrance', vibranceDefaults.vibrance, -100, 100) / 100;
        const satAmt = numberParam(params, 'saturation', vibranceDefaults.saturation, -100, 100) / 100;
        for (let i = 0; i < out.data.length; i += 4) {
            const [h, s, l] = rgb2hsl(image.data[i], image.data[i + 1], image.data[i + 2]);
            const vibBoost = vibAmt * (1 - s);
            const newS = clamp01(s + vibBoost + satAmt);
            const [r, g, b] = hsl2rgb(h, newS, l);
            out.data[i] = clampByte(r);
            out.data[i + 1] = clampByte(g);
            out.data[i + 2] = clampByte(b);
        }
        return out;
    },
};

export type HueSaturationRange = 'master' | 'reds' | 'yellows' | 'greens' | 'cyans' | 'blues' | 'magentas';

export interface HueSaturationParams extends Record<string, unknown> {
    hue: number;
    saturation: number;
    lightness: number;
    colorize: boolean;
    range: HueSaturationRange;
}
const hueSaturationDefaults: HueSaturationParams = { hue: 0, saturation: 0, lightness: 0, colorize: false, range: 'master' };

// Hue centers (degrees, 0..360) for the six chromatic ranges.
const HUE_SAT_CENTERS: Record<Exclude<HueSaturationRange, 'master'>, number> = {
    reds: 0,
    yellows: 60,
    greens: 120,
    cyans: 180,
    blues: 240,
    magentas: 300,
};

function angularDistance(a: number, b: number): number {
    const d = Math.abs(a - b) % 360;
    return d > 180 ? 360 - d : d;
}

// Photoshop-like 60° core window with feathered transitions to 30° on each side
// (full window: 120°). Mirrors the selective-color logic but parameterized by
// the explicit center.
function hueWindowWeight(hueDegrees: number, center: number): number {
    const dist = angularDistance(hueDegrees, center);
    if (dist <= 30) return 1;
    if (dist >= 90) return 0;
    return 1 - (dist - 30) / 60;
}

function parseRange(value: unknown): HueSaturationRange {
    return value === 'reds' || value === 'yellows' || value === 'greens'
        || value === 'cyans' || value === 'blues' || value === 'magentas'
        ? value
        : 'master';
}

export const hueSaturation: Adjustment<HueSaturationParams> = {
    id: 'hue-saturation',
    label: 'Hue/Saturation',
    defaultParams: hueSaturationDefaults,
    apply: (p, { image }) => {
        const params = mergeDefaults(hueSaturationDefaults, p);
        const hue = numberParam(params, 'hue', hueSaturationDefaults.hue, -360, 360);
        const saturation = numberParam(params, 'saturation', hueSaturationDefaults.saturation, -100, 100);
        const lightness = numberParam(params, 'lightness', hueSaturationDefaults.lightness, -100, 100);
        const colorize = booleanParam(params, 'colorize', hueSaturationDefaults.colorize);
        const range = parseRange(params.range);
        const out = new ImageData(new Uint8ClampedArray(image.data), image.width, image.height);
        const hueShift = hue / 360;
        const satAmt = saturation / 100;
        const lightAmt = lightness / 100;
        const rangeCenter = range !== 'master' ? HUE_SAT_CENTERS[range] : null;
        for (let i = 0; i < out.data.length; i += 4) {
            const [h, s, l] = rgb2hsl(image.data[i], image.data[i + 1], image.data[i + 2]);
            const weight = rangeCenter !== null
                ? hueWindowWeight(h * 360, rangeCenter) * Math.min(1, s * 2)
                : 1;
            if (weight === 0) {
                out.data[i] = image.data[i];
                out.data[i + 1] = image.data[i + 1];
                out.data[i + 2] = image.data[i + 2];
                continue;
            }
            const newH = colorize ? wrap01(hueShift) : wrap01(h + hueShift * weight);
            let newS = colorize ? clamp01(saturation / 100) : s + satAmt * weight;
            let newL = l + lightAmt * weight;
            newS = clamp01(newS);
            newL = clamp01(newL);
            const [r, g, b] = hsl2rgb(newH, newS, newL);
            out.data[i] = clampByte(r);
            out.data[i + 1] = clampByte(g);
            out.data[i + 2] = clampByte(b);
        }
        return out;
    },
};

export interface ColorBalanceParams extends Record<string, unknown> {
    cyanRed: number;
    magentaGreen: number;
    yellowBlue: number;
    range: 'shadows' | 'midtones' | 'highlights';
    preserveLuminosity: boolean;
}
const colorBalanceDefaults: ColorBalanceParams = {
    cyanRed: 0,
    magentaGreen: 0,
    yellowBlue: 0,
    range: 'midtones',
    preserveLuminosity: true,
};

function rangeWeight(luma: number, range: 'shadows' | 'midtones' | 'highlights'): number {
    if (range === 'shadows') return Math.max(0, 1 - luma * 2.5);
    if (range === 'highlights') return Math.max(0, (luma - 0.6) * 2.5);
    return 1 - Math.abs(luma - 0.5) * 2;
}

export const colorBalance: Adjustment<ColorBalanceParams> = {
    id: 'color-balance',
    label: 'Color Balance',
    defaultParams: colorBalanceDefaults,
    apply: (p, { image }) => {
        const params = mergeDefaults(colorBalanceDefaults, p);
        const cyanRed = numberParam(params, 'cyanRed', colorBalanceDefaults.cyanRed, -255, 255);
        const magentaGreen = numberParam(params, 'magentaGreen', colorBalanceDefaults.magentaGreen, -255, 255);
        const yellowBlue = numberParam(params, 'yellowBlue', colorBalanceDefaults.yellowBlue, -255, 255);
        const rangeValue = stringParam(params, 'range', colorBalanceDefaults.range);
        const range = rangeValue === 'shadows' || rangeValue === 'highlights' ? rangeValue : 'midtones';
        const preserveLuminosity = booleanParam(params, 'preserveLuminosity', colorBalanceDefaults.preserveLuminosity);
        const out = new ImageData(new Uint8ClampedArray(image.data), image.width, image.height);
        for (let i = 0; i < out.data.length; i += 4) {
            const r = image.data[i];
            const g = image.data[i + 1];
            const b = image.data[i + 2];
            const luma = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
            const w = rangeWeight(luma, range);
            let nr = r + cyanRed * w;
            let ng = g + magentaGreen * w;
            let nb = b + yellowBlue * w;
            if (preserveLuminosity) {
                const newLuma = 0.299 * nr + 0.587 * ng + 0.114 * nb;
                const correction = Math.max(-255, Math.min(255, luma * 255 - newLuma));
                nr += correction;
                ng += correction;
                nb += correction;
            }
            out.data[i] = clampByte(nr);
            out.data[i + 1] = clampByte(ng);
            out.data[i + 2] = clampByte(nb);
        }
        return out;
    },
};

export interface BlackAndWhiteParams extends Record<string, unknown> {
    reds: number; yellows: number; greens: number; cyans: number; blues: number; magentas: number; tint: boolean; tintColor: string;
}
const blackAndWhiteDefaults: BlackAndWhiteParams = {
    reds: 40,
    yellows: 60,
    greens: 40,
    cyans: 60,
    blues: 20,
    magentas: 80,
    tint: false,
    tintColor: '#ddc080',
};

export const blackAndWhite: Adjustment<BlackAndWhiteParams> = {
    id: 'black-and-white',
    label: 'Black & White',
    defaultParams: blackAndWhiteDefaults,
    apply: (p, { image }) => {
        const params = mergeDefaults(blackAndWhiteDefaults, p);
        const reds = numberParam(params, 'reds', blackAndWhiteDefaults.reds, -200, 300);
        const yellows = numberParam(params, 'yellows', blackAndWhiteDefaults.yellows, -200, 300);
        const greens = numberParam(params, 'greens', blackAndWhiteDefaults.greens, -200, 300);
        const cyans = numberParam(params, 'cyans', blackAndWhiteDefaults.cyans, -200, 300);
        const blues = numberParam(params, 'blues', blackAndWhiteDefaults.blues, -200, 300);
        const magentas = numberParam(params, 'magentas', blackAndWhiteDefaults.magentas, -200, 300);
        const tint = booleanParam(params, 'tint', blackAndWhiteDefaults.tint);
        const tintColor = parseHexColor(params.tintColor, parseHexColor(blackAndWhiteDefaults.tintColor, [221, 192, 128]));
        const out = new ImageData(new Uint8ClampedArray(image.data), image.width, image.height);
        for (let i = 0; i < out.data.length; i += 4) {
            const r = image.data[i] / 255;
            const g = image.data[i + 1] / 255;
            const b = image.data[i + 2] / 255;
            const max = Math.max(r, g, b);
            const min = Math.min(r, g, b);
            const lightness = (max + min) / 2;
            // weights drawn from Photoshop defaults
            const value = (
                r * reds +
                g * greens +
                b * blues +
                Math.min(r, g) * yellows +
                Math.min(g, b) * cyans +
                Math.min(r, b) * magentas
            ) / 240 + lightness * 0.1;
            const v = clampByte(value * 255);
            out.data[i] = out.data[i + 1] = out.data[i + 2] = v;
        }
        if (tint) {
            const [tr, tg, tb] = tintColor;
            for (let i = 0; i < out.data.length; i += 4) {
                const v = out.data[i] / 255;
                out.data[i] = clampByte(tr * v);
                out.data[i + 1] = clampByte(tg * v);
                out.data[i + 2] = clampByte(tb * v);
            }
        }
        return out;
    },
};

registerAdjustment(vibrance);
registerAdjustment(hueSaturation);
registerAdjustment(colorBalance);
registerAdjustment(blackAndWhite);
