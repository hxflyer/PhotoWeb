import type { Adjustment } from './Adjustment';
import { registerAdjustment } from './registry';
import { clampByte, mergeDefaults, numberParam } from './utils';

export interface LevelsParams extends Record<string, unknown> {
    inputBlack: number;
    inputWhite: number;
    gamma: number;
    outputBlack: number;
    outputWhite: number;
    channel: 'rgb' | 'red' | 'green' | 'blue';
}

const defaults: LevelsParams = { inputBlack: 0, inputWhite: 255, gamma: 1, outputBlack: 0, outputWhite: 255, channel: 'rgb' };

export const levels: Adjustment<LevelsParams> = {
    id: 'levels',
    label: 'Levels',
    defaultParams: defaults,
    apply: (p, { image }) => {
        const params = mergeDefaults(defaults, p);
        const inputBlack = numberParam(params, 'inputBlack', defaults.inputBlack, 0, 254);
        const inputWhite = numberParam(params, 'inputWhite', defaults.inputWhite, inputBlack + 1, 255);
        const gamma = numberParam(params, 'gamma', defaults.gamma, 0.01, 10);
        const outputBlack = numberParam(params, 'outputBlack', defaults.outputBlack, 0, 255);
        const outputWhite = numberParam(params, 'outputWhite', defaults.outputWhite, 0, 255);
        const channelValue = params.channel;
        const channel = channelValue === 'red' || channelValue === 'green' || channelValue === 'blue' ? channelValue : 'rgb';
        const channelIndex = channel === 'red' ? 0 : channel === 'green' ? 1 : channel === 'blue' ? 2 : -1;
        const out = new ImageData(new Uint8ClampedArray(image.data), image.width, image.height);
        const range = Math.max(1, inputWhite - inputBlack);
        const outRange = outputWhite - outputBlack;
        for (let i = 0; i < out.data.length; i += 4) {
            for (let c = 0; c < 3; c++) {
                if (channelIndex !== -1 && c !== channelIndex) continue;
                let v = (image.data[i + c] - inputBlack) / range;
                v = Math.max(0, Math.min(1, v));
                v = Math.pow(v, 1 / gamma);
                out.data[i + c] = clampByte(outputBlack + v * outRange);
            }
        }
        return out;
    },
};

registerAdjustment(levels);
