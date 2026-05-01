import type { Adjustment } from './Adjustment';
import { registerAdjustment } from './registry';

export interface BrightnessContrastParams extends Record<string, unknown> {
    brightness: number;
    contrast: number;
}

const clamp = (v: number) => Math.max(0, Math.min(255, v));

export const brightnessContrast: Adjustment<BrightnessContrastParams> = {
    id: 'brightness-contrast',
    label: 'Brightness/Contrast',
    defaultParams: { brightness: 0, contrast: 0 },
    apply: (params, { image }) => {
        const out = new ImageData(new Uint8ClampedArray(image.data), image.width, image.height);
        const cf = (259 * (params.contrast + 255)) / (255 * (259 - params.contrast));
        for (let i = 0; i < out.data.length; i += 4) {
            out.data[i] = clamp(cf * (image.data[i] - 128) + 128 + params.brightness);
            out.data[i + 1] = clamp(cf * (image.data[i + 1] - 128) + 128 + params.brightness);
            out.data[i + 2] = clamp(cf * (image.data[i + 2] - 128) + 128 + params.brightness);
        }
        return out;
    },
};

registerAdjustment(brightnessContrast);
