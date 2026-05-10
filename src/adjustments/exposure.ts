import type { Adjustment } from './Adjustment';
import { registerAdjustment } from './registry';
import { clampByte, mergeDefaults, numberParam } from './utils';

export interface ExposureParams extends Record<string, unknown> {
    exposure: number;
    offset: number;
    gamma: number;
}

const defaults: ExposureParams = { exposure: 0, offset: 0, gamma: 1 };

export const exposure: Adjustment<ExposureParams> = {
    id: 'exposure',
    label: 'Exposure',
    defaultParams: defaults,
    apply: (p, { image }) => {
        const params = mergeDefaults(defaults, p);
        const exposureValue = numberParam(params, 'exposure', defaults.exposure, -20, 20);
        const offset = numberParam(params, 'offset', defaults.offset, -1, 1);
        const gamma = numberParam(params, 'gamma', defaults.gamma, 0.01, 10);
        const out = new ImageData(new Uint8ClampedArray(image.data), image.width, image.height);
        const exp = Math.pow(2, exposureValue);
        for (let i = 0; i < out.data.length; i += 4) {
            for (let c = 0; c < 3; c++) {
                let v = (image.data[i + c] / 255) * exp + offset;
                v = Math.pow(Math.max(0, v), 1 / gamma);
                out.data[i + c] = clampByte(v * 255);
            }
        }
        return out;
    },
};

registerAdjustment(exposure);
