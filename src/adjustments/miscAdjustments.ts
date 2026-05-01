import type { Adjustment } from './Adjustment';
import { registerAdjustment } from './registry';

const clamp = (v: number) => Math.max(0, Math.min(255, v));

export interface PhotoFilterParams extends Record<string, unknown> {
    color: string;
    density: number;
    preserveLuminosity: boolean;
}

export const photoFilter: Adjustment<PhotoFilterParams> = {
    id: 'photo-filter',
    label: 'Photo Filter',
    defaultParams: { color: '#ec8b5e', density: 25, preserveLuminosity: true },
    apply: (p, { image }) => {
        const out = new ImageData(new Uint8ClampedArray(image.data), image.width, image.height);
        const r = parseInt(p.color.slice(1, 3), 16);
        const g = parseInt(p.color.slice(3, 5), 16);
        const b = parseInt(p.color.slice(5, 7), 16);
        const k = p.density / 100;
        for (let i = 0; i < out.data.length; i += 4) {
            const oR = image.data[i];
            const oG = image.data[i + 1];
            const oB = image.data[i + 2];
            let nR = oR * (1 - k) + r * k;
            let nG = oG * (1 - k) + g * k;
            let nB = oB * (1 - k) + b * k;
            if (p.preserveLuminosity) {
                const oL = 0.299 * oR + 0.587 * oG + 0.114 * oB;
                const nL = 0.299 * nR + 0.587 * nG + 0.114 * nB;
                const corr = oL - nL;
                nR += corr; nG += corr; nB += corr;
            }
            out.data[i] = clamp(nR);
            out.data[i + 1] = clamp(nG);
            out.data[i + 2] = clamp(nB);
        }
        return out;
    },
};

export interface ChannelMixerParams extends Record<string, unknown> {
    output: 'red' | 'green' | 'blue';
    red: number; green: number; blue: number; constant: number; monochrome: boolean;
}

export const channelMixer: Adjustment<ChannelMixerParams> = {
    id: 'channel-mixer',
    label: 'Channel Mixer',
    defaultParams: { output: 'red', red: 100, green: 0, blue: 0, constant: 0, monochrome: false },
    apply: (p, { image }) => {
        const out = new ImageData(new Uint8ClampedArray(image.data), image.width, image.height);
        for (let i = 0; i < out.data.length; i += 4) {
            const r = image.data[i];
            const g = image.data[i + 1];
            const b = image.data[i + 2];
            const v = clamp((r * p.red + g * p.green + b * p.blue) / 100 + p.constant);
            if (p.monochrome) {
                out.data[i] = out.data[i + 1] = out.data[i + 2] = v;
            } else {
                if (p.output === 'red') out.data[i] = v;
                else if (p.output === 'green') out.data[i + 1] = v;
                else out.data[i + 2] = v;
            }
        }
        return out;
    },
};

export const invert: Adjustment<Record<string, unknown>> = {
    id: 'invert',
    label: 'Invert',
    defaultParams: {},
    apply: (_p, { image }) => {
        const out = new ImageData(new Uint8ClampedArray(image.data), image.width, image.height);
        for (let i = 0; i < out.data.length; i += 4) {
            out.data[i] = 255 - image.data[i];
            out.data[i + 1] = 255 - image.data[i + 1];
            out.data[i + 2] = 255 - image.data[i + 2];
        }
        return out;
    },
};

export interface PosterizeParams extends Record<string, unknown> { levels: number }

export const posterize: Adjustment<PosterizeParams> = {
    id: 'posterize',
    label: 'Posterize',
    defaultParams: { levels: 4 },
    apply: (p, { image }) => {
        const out = new ImageData(new Uint8ClampedArray(image.data), image.width, image.height);
        const lvl = Math.max(2, Math.floor(p.levels));
        const step = 255 / (lvl - 1);
        for (let i = 0; i < out.data.length; i += 4) {
            for (let c = 0; c < 3; c++) {
                out.data[i + c] = Math.round(image.data[i + c] / step) * step;
            }
        }
        return out;
    },
};

export interface ThresholdParams extends Record<string, unknown> { level: number }

export const threshold: Adjustment<ThresholdParams> = {
    id: 'threshold',
    label: 'Threshold',
    defaultParams: { level: 128 },
    apply: (p, { image }) => {
        const out = new ImageData(new Uint8ClampedArray(image.data), image.width, image.height);
        for (let i = 0; i < out.data.length; i += 4) {
            const luma = 0.299 * image.data[i] + 0.587 * image.data[i + 1] + 0.114 * image.data[i + 2];
            const v = luma >= p.level ? 255 : 0;
            out.data[i] = out.data[i + 1] = out.data[i + 2] = v;
        }
        return out;
    },
};

export interface GradientMapParams extends Record<string, unknown> {
    stops: { position: number; color: string }[];
}

function parseHex(c: string): [number, number, number] {
    return [parseInt(c.slice(1, 3), 16), parseInt(c.slice(3, 5), 16), parseInt(c.slice(5, 7), 16)];
}

export const gradientMap: Adjustment<GradientMapParams> = {
    id: 'gradient-map',
    label: 'Gradient Map',
    defaultParams: {
        stops: [
            { position: 0, color: '#000000' },
            { position: 1, color: '#ffffff' },
        ],
    },
    apply: (p, { image }) => {
        const lutR = new Uint8ClampedArray(256);
        const lutG = new Uint8ClampedArray(256);
        const lutB = new Uint8ClampedArray(256);
        const stops = [...p.stops].sort((a, b) => a.position - b.position);
        for (let i = 0; i < 256; i++) {
            const t = i / 255;
            let stopA = stops[0]; let stopB = stops[stops.length - 1];
            for (let s = 0; s < stops.length - 1; s++) {
                if (t >= stops[s].position && t <= stops[s + 1].position) {
                    stopA = stops[s]; stopB = stops[s + 1]; break;
                }
            }
            const span = Math.max(0.0001, stopB.position - stopA.position);
            const local = (t - stopA.position) / span;
            const [r1, g1, b1] = parseHex(stopA.color);
            const [r2, g2, b2] = parseHex(stopB.color);
            lutR[i] = Math.round(r1 + (r2 - r1) * local);
            lutG[i] = Math.round(g1 + (g2 - g1) * local);
            lutB[i] = Math.round(b1 + (b2 - b1) * local);
        }
        const out = new ImageData(new Uint8ClampedArray(image.data), image.width, image.height);
        for (let i = 0; i < out.data.length; i += 4) {
            const luma = Math.round(0.299 * image.data[i] + 0.587 * image.data[i + 1] + 0.114 * image.data[i + 2]);
            out.data[i] = lutR[luma];
            out.data[i + 1] = lutG[luma];
            out.data[i + 2] = lutB[luma];
        }
        return out;
    },
};

registerAdjustment(photoFilter);
registerAdjustment(channelMixer);
registerAdjustment(invert);
registerAdjustment(posterize);
registerAdjustment(threshold);
registerAdjustment(gradientMap);
