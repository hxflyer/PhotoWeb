import type { Adjustment } from './Adjustment';
import { registerAdjustment } from './registry';

const clamp = (v: number) => Math.max(0, Math.min(255, v));

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

export const vibrance: Adjustment<VibranceParams> = {
    id: 'vibrance',
    label: 'Vibrance',
    defaultParams: { vibrance: 0, saturation: 0 },
    apply: (p, { image }) => {
        const out = new ImageData(new Uint8ClampedArray(image.data), image.width, image.height);
        const vibAmt = p.vibrance / 100;
        const satAmt = p.saturation / 100;
        for (let i = 0; i < out.data.length; i += 4) {
            const [h, s, l] = rgb2hsl(image.data[i], image.data[i + 1], image.data[i + 2]);
            const vibBoost = vibAmt * (1 - s);
            const newS = Math.max(0, Math.min(1, s + vibBoost + satAmt));
            const [r, g, b] = hsl2rgb(h, newS, l);
            out.data[i] = clamp(r);
            out.data[i + 1] = clamp(g);
            out.data[i + 2] = clamp(b);
        }
        return out;
    },
};

export interface HueSaturationParams extends Record<string, unknown> { hue: number; saturation: number; lightness: number; colorize: boolean }

export const hueSaturation: Adjustment<HueSaturationParams> = {
    id: 'hue-saturation',
    label: 'Hue/Saturation',
    defaultParams: { hue: 0, saturation: 0, lightness: 0, colorize: false },
    apply: (p, { image }) => {
        const out = new ImageData(new Uint8ClampedArray(image.data), image.width, image.height);
        const hueShift = (p.hue / 360);
        const satAmt = p.saturation / 100;
        const lightAmt = p.lightness / 100;
        for (let i = 0; i < out.data.length; i += 4) {
            const [h, s, l] = rgb2hsl(image.data[i], image.data[i + 1], image.data[i + 2]);
            const newH = (h + hueShift + 1) % 1;
            let newS = s + satAmt;
            let newL = l + lightAmt;
            if (p.colorize) {
                newS = Math.max(0, Math.min(1, p.saturation / 100));
                newL = Math.max(0, Math.min(1, l + lightAmt));
            }
            newS = Math.max(0, Math.min(1, newS));
            newL = Math.max(0, Math.min(1, newL));
            const [r, g, b] = hsl2rgb(newH, newS, newL);
            out.data[i] = clamp(r);
            out.data[i + 1] = clamp(g);
            out.data[i + 2] = clamp(b);
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

function rangeWeight(luma: number, range: 'shadows' | 'midtones' | 'highlights'): number {
    if (range === 'shadows') return Math.max(0, 1 - luma * 2.5);
    if (range === 'highlights') return Math.max(0, (luma - 0.6) * 2.5);
    return 1 - Math.abs(luma - 0.5) * 2;
}

export const colorBalance: Adjustment<ColorBalanceParams> = {
    id: 'color-balance',
    label: 'Color Balance',
    defaultParams: { cyanRed: 0, magentaGreen: 0, yellowBlue: 0, range: 'midtones', preserveLuminosity: true },
    apply: (p, { image }) => {
        const out = new ImageData(new Uint8ClampedArray(image.data), image.width, image.height);
        for (let i = 0; i < out.data.length; i += 4) {
            const r = image.data[i];
            const g = image.data[i + 1];
            const b = image.data[i + 2];
            const luma = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
            const w = rangeWeight(luma, p.range);
            let nr = r + p.cyanRed * w;
            let ng = g + p.magentaGreen * w;
            let nb = b + p.yellowBlue * w;
            if (p.preserveLuminosity) {
                const newLuma = 0.299 * nr + 0.587 * ng + 0.114 * nb;
                const correction = luma * 255 - newLuma;
                nr += correction;
                ng += correction;
                nb += correction;
            }
            out.data[i] = clamp(nr);
            out.data[i + 1] = clamp(ng);
            out.data[i + 2] = clamp(nb);
        }
        return out;
    },
};

export interface BlackAndWhiteParams extends Record<string, unknown> {
    reds: number; yellows: number; greens: number; cyans: number; blues: number; magentas: number; tint: boolean; tintColor: string;
}

export const blackAndWhite: Adjustment<BlackAndWhiteParams> = {
    id: 'black-and-white',
    label: 'Black & White',
    defaultParams: { reds: 40, yellows: 60, greens: 40, cyans: 60, blues: 20, magentas: 80, tint: false, tintColor: '#ddc080' },
    apply: (p, { image }) => {
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
                r * p.reds +
                g * p.greens +
                b * p.blues +
                Math.min(r, g) * p.yellows +
                Math.min(g, b) * p.cyans +
                Math.min(r, b) * p.magentas
            ) / 240 + lightness * 0.1;
            const v = clamp(value * 255);
            out.data[i] = out.data[i + 1] = out.data[i + 2] = v;
        }
        if (p.tint) {
            const tr = parseInt(p.tintColor.slice(1, 3), 16);
            const tg = parseInt(p.tintColor.slice(3, 5), 16);
            const tb = parseInt(p.tintColor.slice(5, 7), 16);
            for (let i = 0; i < out.data.length; i += 4) {
                const v = out.data[i] / 255;
                out.data[i] = clamp(tr * v);
                out.data[i + 1] = clamp(tg * v);
                out.data[i + 2] = clamp(tb * v);
            }
        }
        return out;
    },
};

registerAdjustment(vibrance);
registerAdjustment(hueSaturation);
registerAdjustment(colorBalance);
registerAdjustment(blackAndWhite);
