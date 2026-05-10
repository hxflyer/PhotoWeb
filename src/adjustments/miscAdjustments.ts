import type { Adjustment } from './Adjustment';
import { registerAdjustment } from './registry';
import { booleanParam, clampByte, mergeDefaults, numberParam, parseHexColor, stringParam } from './utils';

export interface PhotoFilterParams extends Record<string, unknown> {
    color: string;
    density: number;
    preserveLuminosity: boolean;
}
const photoFilterDefaults: PhotoFilterParams = { color: '#ec8b5e', density: 25, preserveLuminosity: true };

export const photoFilter: Adjustment<PhotoFilterParams> = {
    id: 'photo-filter',
    label: 'Photo Filter',
    defaultParams: photoFilterDefaults,
    apply: (p, { image }) => {
        const params = mergeDefaults(photoFilterDefaults, p);
        const out = new ImageData(new Uint8ClampedArray(image.data), image.width, image.height);
        const [r, g, b] = parseHexColor(params.color, parseHexColor(photoFilterDefaults.color, [236, 139, 94]));
        const k = numberParam(params, 'density', photoFilterDefaults.density, 0, 100) / 100;
        const preserveLuminosity = booleanParam(params, 'preserveLuminosity', photoFilterDefaults.preserveLuminosity);
        for (let i = 0; i < out.data.length; i += 4) {
            const oR = image.data[i];
            const oG = image.data[i + 1];
            const oB = image.data[i + 2];
            let nR = oR * (1 - k) + r * k;
            let nG = oG * (1 - k) + g * k;
            let nB = oB * (1 - k) + b * k;
            if (preserveLuminosity) {
                const oL = 0.299 * oR + 0.587 * oG + 0.114 * oB;
                const nL = 0.299 * nR + 0.587 * nG + 0.114 * nB;
                const corr = oL - nL;
                nR += corr; nG += corr; nB += corr;
            }
            out.data[i] = clampByte(nR);
            out.data[i + 1] = clampByte(nG);
            out.data[i + 2] = clampByte(nB);
        }
        return out;
    },
};

export interface ChannelMixerParams extends Record<string, unknown> {
    output: 'red' | 'green' | 'blue';
    red: number; green: number; blue: number; constant: number; monochrome: boolean;
}
const channelMixerDefaults: ChannelMixerParams = {
    output: 'red',
    red: 100,
    green: 0,
    blue: 0,
    constant: 0,
    monochrome: false,
};

export const channelMixer: Adjustment<ChannelMixerParams> = {
    id: 'channel-mixer',
    label: 'Channel Mixer',
    defaultParams: channelMixerDefaults,
    apply: (p, { image }) => {
        const params = mergeDefaults(channelMixerDefaults, p);
        const outputValue = stringParam(params, 'output', channelMixerDefaults.output);
        const output = outputValue === 'green' || outputValue === 'blue' ? outputValue : 'red';
        const red = numberParam(params, 'red', channelMixerDefaults.red, -200, 200);
        const green = numberParam(params, 'green', channelMixerDefaults.green, -200, 200);
        const blue = numberParam(params, 'blue', channelMixerDefaults.blue, -200, 200);
        const constant = numberParam(params, 'constant', channelMixerDefaults.constant, -255, 255);
        const monochrome = booleanParam(params, 'monochrome', channelMixerDefaults.monochrome);
        const out = new ImageData(new Uint8ClampedArray(image.data), image.width, image.height);
        for (let i = 0; i < out.data.length; i += 4) {
            const r = image.data[i];
            const g = image.data[i + 1];
            const b = image.data[i + 2];
            const v = clampByte((r * red + g * green + b * blue) / 100 + constant);
            if (monochrome) {
                out.data[i] = out.data[i + 1] = out.data[i + 2] = v;
            } else {
                if (output === 'red') out.data[i] = v;
                else if (output === 'green') out.data[i + 1] = v;
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
const posterizeDefaults: PosterizeParams = { levels: 4 };

export const posterize: Adjustment<PosterizeParams> = {
    id: 'posterize',
    label: 'Posterize',
    defaultParams: posterizeDefaults,
    apply: (p, { image }) => {
        const params = mergeDefaults(posterizeDefaults, p);
        const out = new ImageData(new Uint8ClampedArray(image.data), image.width, image.height);
        const lvl = Math.floor(numberParam(params, 'levels', posterizeDefaults.levels, 2, 256));
        const step = 255 / (lvl - 1);
        for (let i = 0; i < out.data.length; i += 4) {
            for (let c = 0; c < 3; c++) {
                out.data[i + c] = clampByte(Math.round(image.data[i + c] / step) * step);
            }
        }
        return out;
    },
};

export interface ThresholdParams extends Record<string, unknown> { level: number }
const thresholdDefaults: ThresholdParams = { level: 128 };

export const threshold: Adjustment<ThresholdParams> = {
    id: 'threshold',
    label: 'Threshold',
    defaultParams: thresholdDefaults,
    apply: (p, { image }) => {
        const params = mergeDefaults(thresholdDefaults, p);
        const level = numberParam(params, 'level', thresholdDefaults.level, 0, 255);
        const out = new ImageData(new Uint8ClampedArray(image.data), image.width, image.height);
        for (let i = 0; i < out.data.length; i += 4) {
            const luma = 0.299 * image.data[i] + 0.587 * image.data[i + 1] + 0.114 * image.data[i + 2];
            const v = luma >= level ? 255 : 0;
            out.data[i] = out.data[i + 1] = out.data[i + 2] = v;
        }
        return out;
    },
};

export interface GradientMapParams extends Record<string, unknown> {
    stops: { position: number; color: string }[];
}
const gradientMapDefaults: GradientMapParams = {
    stops: [
        { position: 0, color: '#000000' },
        { position: 1, color: '#ffffff' },
    ],
};

export const gradientMap: Adjustment<GradientMapParams> = {
    id: 'gradient-map',
    label: 'Gradient Map',
    defaultParams: gradientMapDefaults,
    apply: (p, { image }) => {
        const params = mergeDefaults(gradientMapDefaults, p);
        const lutR = new Uint8ClampedArray(256);
        const lutG = new Uint8ClampedArray(256);
        const lutB = new Uint8ClampedArray(256);
        const rawStops = Array.isArray(params.stops) && params.stops.length > 0 ? params.stops : gradientMapDefaults.stops;
        const stops = rawStops
            .map(stop => ({
                position: numberParam(stop as unknown as Record<string, unknown>, 'position', 0, 0, 1),
                color: parseHexColor(stop.color, [0, 0, 0]),
            }))
            .sort((a, b) => a.position - b.position);
        for (let i = 0; i < 256; i++) {
            const t = i / 255;
            let stopA = stops[0]; let stopB = stops[stops.length - 1];
            for (let s = 0; s < stops.length - 1; s++) {
                if (t >= stops[s].position && t <= stops[s + 1].position) {
                    stopA = stops[s]; stopB = stops[s + 1]; break;
                }
            }
            const span = Math.max(0.0001, stopB.position - stopA.position);
            const local = Math.max(0, Math.min(1, (t - stopA.position) / span));
            const [r1, g1, b1] = stopA.color;
            const [r2, g2, b2] = stopB.color;
            lutR[i] = clampByte(r1 + (r2 - r1) * local);
            lutG[i] = clampByte(g1 + (g2 - g1) * local);
            lutB[i] = clampByte(b1 + (b2 - b1) * local);
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
