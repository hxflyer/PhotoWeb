import type { Adjustment } from './Adjustment';
import { registerAdjustment } from './registry';

export interface LevelsParams extends Record<string, unknown> {
    inputBlack: number;
    inputWhite: number;
    gamma: number;
    outputBlack: number;
    outputWhite: number;
}

const clamp = (v: number) => Math.max(0, Math.min(255, v));

export const levels: Adjustment<LevelsParams> = {
    id: 'levels',
    label: 'Levels',
    defaultParams: { inputBlack: 0, inputWhite: 255, gamma: 1, outputBlack: 0, outputWhite: 255 },
    apply: (p, { image }) => {
        const out = new ImageData(new Uint8ClampedArray(image.data), image.width, image.height);
        const range = Math.max(1, p.inputWhite - p.inputBlack);
        const outRange = p.outputWhite - p.outputBlack;
        for (let i = 0; i < out.data.length; i += 4) {
            for (let c = 0; c < 3; c++) {
                let v = (image.data[i + c] - p.inputBlack) / range;
                v = Math.max(0, Math.min(1, v));
                v = Math.pow(v, 1 / Math.max(0.01, p.gamma));
                out.data[i + c] = clamp(p.outputBlack + v * outRange);
            }
        }
        return out;
    },
};

registerAdjustment(levels);
