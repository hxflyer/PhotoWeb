import type { Adjustment } from './Adjustment';
import { registerAdjustment } from './registry';

export interface ExposureParams extends Record<string, unknown> {
    exposure: number;
    offset: number;
    gamma: number;
}

const clamp = (v: number) => Math.max(0, Math.min(255, v));

export const exposure: Adjustment<ExposureParams> = {
    id: 'exposure',
    label: 'Exposure',
    defaultParams: { exposure: 0, offset: 0, gamma: 1 },
    apply: (p, { image }) => {
        const out = new ImageData(new Uint8ClampedArray(image.data), image.width, image.height);
        const exp = Math.pow(2, p.exposure);
        for (let i = 0; i < out.data.length; i += 4) {
            for (let c = 0; c < 3; c++) {
                let v = (image.data[i + c] / 255) * exp + p.offset;
                v = Math.pow(Math.max(0, v), 1 / Math.max(0.01, p.gamma));
                out.data[i + c] = clamp(v * 255);
            }
        }
        return out;
    },
};

registerAdjustment(exposure);
