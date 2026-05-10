import type { Adjustment } from './Adjustment';
import { registerAdjustment } from './registry';
import { booleanParam, clamp01, clampByte, mergeDefaults, numberParam } from './utils';

export interface BrightnessContrastParams extends Record<string, unknown> {
    brightness: number;
    contrast: number;
    useLegacy: boolean;
}

const defaults: BrightnessContrastParams = { brightness: 0, contrast: 0, useLegacy: false };

export const brightnessContrast: Adjustment<BrightnessContrastParams> = {
    id: 'brightness-contrast',
    label: 'Brightness/Contrast',
    defaultParams: defaults,
    apply: (params, { image }) => {
        const p = mergeDefaults(defaults, params);
        const brightness = numberParam(p, 'brightness', defaults.brightness, -150, 150);
        const contrast = numberParam(p, 'contrast', defaults.contrast, -50, 100);
        const useLegacy = booleanParam(p, 'useLegacy', defaults.useLegacy);
        const out = new ImageData(new Uint8ClampedArray(image.data), image.width, image.height);
        const legacyFactor = (259 * (contrast + 255)) / (255 * (259 - contrast));
        const brightnessAmount = brightness / 150;
        const contrastAmount = contrast / 100;
        for (let i = 0; i < out.data.length; i += 4) {
            for (let c = 0; c < 3; c++) {
                if (useLegacy) {
                    out.data[i + c] = clampByte(legacyFactor * (image.data[i + c] - 128) + 128 + brightness);
                    continue;
                }
                let v = image.data[i + c] / 255;
                v = brightnessAmount >= 0
                    ? v + (1 - v) * brightnessAmount
                    : v * (1 + brightnessAmount);
                v = (v - 0.5) * (1 + contrastAmount * 1.6) + 0.5;
                out.data[i + c] = clampByte(clamp01(v) * 255);
            }
        }
        return out;
    },
};

registerAdjustment(brightnessContrast);
