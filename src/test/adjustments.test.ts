import { describe, it, expect } from 'vitest';
import { brightnessContrast } from '../adjustments/brightnessContrast';
import { invert } from '../adjustments/miscAdjustments';
import { threshold } from '../adjustments/miscAdjustments';
import { autoContrast } from '../adjustments/autoAdjustments';
import { hueSaturation } from '../adjustments/colorAdjustments';

function flat(r: number, g: number, b: number, w = 4, h = 4): ImageData {
    const arr = new Uint8ClampedArray(w * h * 4);
    for (let i = 0; i < arr.length; i += 4) {
        arr[i] = r; arr[i + 1] = g; arr[i + 2] = b; arr[i + 3] = 255;
    }
    return new ImageData(arr, w, h);
}

describe('adjustments', () => {
    it('brightness +50 brightens every channel', () => {
        const src = flat(100, 100, 100);
        const out = brightnessContrast.apply({ brightness: 50, contrast: 0 }, { image: src, width: src.width, height: src.height });
        expect(out.data[0]).toBeGreaterThan(100);
    });

    it('invert flips RGB and preserves alpha', () => {
        const src = flat(40, 60, 80);
        const out = invert.apply({}, { image: src, width: src.width, height: src.height });
        expect(out.data[0]).toBe(215);
        expect(out.data[1]).toBe(195);
        expect(out.data[2]).toBe(175);
        expect(out.data[3]).toBe(255);
    });

    it('threshold @128 maps below to 0 and above to 255', () => {
        const dark = flat(50, 50, 50);
        const bright = flat(200, 200, 200);
        const o1 = threshold.apply({ level: 128 }, { image: dark, width: dark.width, height: dark.height });
        const o2 = threshold.apply({ level: 128 }, { image: bright, width: bright.width, height: bright.height });
        expect(o1.data[0]).toBe(0);
        expect(o2.data[0]).toBe(255);
    });

    it('auto contrast stretches a low-contrast input to full range', () => {
        const w = 4, h = 1;
        const arr = new Uint8ClampedArray(w * h * 4);
        // Two flat blocks at 100 and 150
        arr.set([100, 100, 100, 255], 0);
        arr.set([100, 100, 100, 255], 4);
        arr.set([150, 150, 150, 255], 8);
        arr.set([150, 150, 150, 255], 12);
        const src = new ImageData(arr, w, h);
        const out = autoContrast.apply({}, { image: src, width: w, height: h });
        // After stretch, min should be ~0 and max ~255
        expect(out.data[0]).toBe(0);
        expect(out.data[8]).toBe(255);
    });

    it('hue/sat with saturation=-100 produces grayscale-ish output', () => {
        const src = flat(200, 50, 50);
        const out = hueSaturation.apply(
            { hue: 0, saturation: -100, lightness: 0, colorize: false },
            { image: src, width: src.width, height: src.height },
        );
        // R G B should converge
        const diff = Math.max(out.data[0], out.data[1], out.data[2]) - Math.min(out.data[0], out.data[1], out.data[2]);
        expect(diff).toBeLessThan(10);
    });
});
