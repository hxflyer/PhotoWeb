import type { Adjustment } from './Adjustment';
import { registerAdjustment } from './registry';
import { clampByte } from './utils';

interface ChannelHistogram {
    rMin: number;
    rMax: number;
    gMin: number;
    gMax: number;
    bMin: number;
    bMax: number;
    count: number;
}

function histogramPerChannel(image: ImageData): ChannelHistogram {
    let rMin = 255, rMax = 0, gMin = 255, gMax = 0, bMin = 255, bMax = 0;
    let count = 0;
    for (let i = 0; i < image.data.length; i += 4) {
        if (image.data[i + 3] === 0) continue;
        rMin = Math.min(rMin, image.data[i]);
        rMax = Math.max(rMax, image.data[i]);
        gMin = Math.min(gMin, image.data[i + 1]);
        gMax = Math.max(gMax, image.data[i + 1]);
        bMin = Math.min(bMin, image.data[i + 2]);
        bMax = Math.max(bMax, image.data[i + 2]);
        count++;
    }
    return { rMin, rMax, gMin, gMax, bMin, bMax, count };
}

function lumaHistogram(image: ImageData): { min: number; max: number; count: number } {
    let min = 255, max = 0;
    let count = 0;
    for (let i = 0; i < image.data.length; i += 4) {
        if (image.data[i + 3] === 0) continue;
        const l = 0.299 * image.data[i] + 0.587 * image.data[i + 1] + 0.114 * image.data[i + 2];
        if (l < min) min = l;
        if (l > max) max = l;
        count++;
    }
    return { min, max, count };
}

function stretchValue(v: number, min: number, max: number): number {
    const range = max - min;
    if (range < 1) return v;
    return clampByte(((v - min) * 255) / range);
}

export const autoTone: Adjustment<Record<string, unknown>> = {
    id: 'auto-tone',
    label: 'Auto Tone',
    defaultParams: {},
    apply: (_p, { image }) => {
        const out = new ImageData(new Uint8ClampedArray(image.data), image.width, image.height);
        const h = histogramPerChannel(image);
        if (h.count === 0) return out;
        for (let i = 0; i < out.data.length; i += 4) {
            if (image.data[i + 3] === 0) continue;
            out.data[i] = stretchValue(image.data[i], h.rMin, h.rMax);
            out.data[i + 1] = stretchValue(image.data[i + 1], h.gMin, h.gMax);
            out.data[i + 2] = stretchValue(image.data[i + 2], h.bMin, h.bMax);
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
        for (let i = 0; i < out.data.length; i += 4) {
            if (image.data[i + 3] === 0) continue;
            out.data[i] = stretchValue(image.data[i], min, max);
            out.data[i + 1] = stretchValue(image.data[i + 1], min, max);
            out.data[i + 2] = stretchValue(image.data[i + 2], min, max);
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
            if (image.data[i + 3] === 0) continue;
            avgR += image.data[i];
            avgG += image.data[i + 1];
            avgB += image.data[i + 2];
            n++;
        }
        if (n === 0) return out;
        avgR /= n; avgG /= n; avgB /= n;
        const target = (avgR + avgG + avgB) / 3;
        const fr = target / Math.max(1, avgR);
        const fg = target / Math.max(1, avgG);
        const fb = target / Math.max(1, avgB);
        for (let i = 0; i < out.data.length; i += 4) {
            if (image.data[i + 3] === 0) continue;
            out.data[i] = clampByte(image.data[i] * fr);
            out.data[i + 1] = clampByte(image.data[i + 1] * fg);
            out.data[i + 2] = clampByte(image.data[i + 2] * fb);
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
