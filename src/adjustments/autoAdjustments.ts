import type { Adjustment } from './Adjustment';
import { registerAdjustment } from './registry';

const clamp = (v: number) => Math.max(0, Math.min(255, v));

function histogramPerChannel(image: ImageData): { rMin: number; rMax: number; gMin: number; gMax: number; bMin: number; bMax: number } {
    let rMin = 255, rMax = 0, gMin = 255, gMax = 0, bMin = 255, bMax = 0;
    for (let i = 0; i < image.data.length; i += 4) {
        rMin = Math.min(rMin, image.data[i]);
        rMax = Math.max(rMax, image.data[i]);
        gMin = Math.min(gMin, image.data[i + 1]);
        gMax = Math.max(gMax, image.data[i + 1]);
        bMin = Math.min(bMin, image.data[i + 2]);
        bMax = Math.max(bMax, image.data[i + 2]);
    }
    return { rMin, rMax, gMin, gMax, bMin, bMax };
}

function lumaHistogram(image: ImageData): { min: number; max: number } {
    let min = 255, max = 0;
    for (let i = 0; i < image.data.length; i += 4) {
        const l = 0.299 * image.data[i] + 0.587 * image.data[i + 1] + 0.114 * image.data[i + 2];
        if (l < min) min = l;
        if (l > max) max = l;
    }
    return { min, max };
}

export const autoTone: Adjustment<Record<string, unknown>> = {
    id: 'auto-tone',
    label: 'Auto Tone',
    defaultParams: {},
    apply: (_p, { image }) => {
        const out = new ImageData(new Uint8ClampedArray(image.data), image.width, image.height);
        const h = histogramPerChannel(image);
        const stretch = (v: number, mn: number, mx: number) => clamp(((v - mn) * 255) / Math.max(1, mx - mn));
        for (let i = 0; i < out.data.length; i += 4) {
            out.data[i] = stretch(image.data[i], h.rMin, h.rMax);
            out.data[i + 1] = stretch(image.data[i + 1], h.gMin, h.gMax);
            out.data[i + 2] = stretch(image.data[i + 2], h.bMin, h.bMax);
        }
        return out;
    },
};

export const autoContrast: Adjustment<Record<string, unknown>> = {
    id: 'auto-contrast',
    label: 'Auto Contrast',
    defaultParams: {},
    apply: (_p, { image }) => {
        const out = new ImageData(new Uint8ClampedArray(image.data), image.width, image.height);
        const { min, max } = lumaHistogram(image);
        const stretch = (v: number) => clamp(((v - min) * 255) / Math.max(1, max - min));
        for (let i = 0; i < out.data.length; i += 4) {
            out.data[i] = stretch(image.data[i]);
            out.data[i + 1] = stretch(image.data[i + 1]);
            out.data[i + 2] = stretch(image.data[i + 2]);
        }
        return out;
    },
};

export const autoColor: Adjustment<Record<string, unknown>> = {
    id: 'auto-color',
    label: 'Auto Color',
    defaultParams: {},
    apply: (_p, { image }) => {
        const out = new ImageData(new Uint8ClampedArray(image.data), image.width, image.height);
        let avgR = 0, avgG = 0, avgB = 0, n = 0;
        for (let i = 0; i < image.data.length; i += 4) {
            avgR += image.data[i];
            avgG += image.data[i + 1];
            avgB += image.data[i + 2];
            n++;
        }
        avgR /= n; avgG /= n; avgB /= n;
        const target = (avgR + avgG + avgB) / 3;
        const fr = target / Math.max(1, avgR);
        const fg = target / Math.max(1, avgG);
        const fb = target / Math.max(1, avgB);
        for (let i = 0; i < out.data.length; i += 4) {
            out.data[i] = clamp(image.data[i] * fr);
            out.data[i + 1] = clamp(image.data[i + 1] * fg);
            out.data[i + 2] = clamp(image.data[i + 2] * fb);
        }
        return out;
    },
};

export const desaturate: Adjustment<Record<string, unknown>> = {
    id: 'desaturate',
    label: 'Desaturate',
    defaultParams: {},
    apply: (_p, { image }) => {
        const out = new ImageData(new Uint8ClampedArray(image.data), image.width, image.height);
        for (let i = 0; i < out.data.length; i += 4) {
            const v = (Math.max(image.data[i], image.data[i + 1], image.data[i + 2])
                + Math.min(image.data[i], image.data[i + 1], image.data[i + 2])) / 2;
            out.data[i] = out.data[i + 1] = out.data[i + 2] = v;
        }
        return out;
    },
};

registerAdjustment(autoTone);
registerAdjustment(autoContrast);
registerAdjustment(autoColor);
registerAdjustment(desaturate);
