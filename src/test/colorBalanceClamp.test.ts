import { describe, it, expect } from 'vitest';
import { colorBalance } from '../adjustments/colorAdjustments';

function singleColorImage(r: number, g: number, b: number): ImageData {
    const arr = new Uint8ClampedArray([r, g, b, 255]);
    return new ImageData(arr, 1, 1);
}

function ctxFor(image: ImageData) {
    return { image, width: image.width, height: image.height, selectionMask: null, dirtyRect: null };
}

describe('color balance preserve-luminosity clamp', () => {
    it('extreme Cyan/Red shift on a white pixel with preserveLuminosity keeps the pixel near white', () => {
        const white = singleColorImage(255, 255, 255);
        const out = colorBalance.apply(
            { cyanRed: 100, magentaGreen: 0, yellowBlue: 0, range: 'midtones', preserveLuminosity: true },
            ctxFor(white),
        );
        // The result must stay near white, not flip to dark.
        const luma = 0.299 * out.data[0] + 0.587 * out.data[1] + 0.114 * out.data[2];
        expect(luma).toBeGreaterThan(200);
        // The white pixel should not invert: the dominant channel stays high.
        const maxChannel = Math.max(out.data[0], out.data[1], out.data[2]);
        expect(maxChannel).toBeGreaterThan(200);
    });

    it('extreme negative Cyan/Red shift on a white pixel does not drop luminosity below 200', () => {
        const white = singleColorImage(255, 255, 255);
        const out = colorBalance.apply(
            { cyanRed: -100, magentaGreen: 0, yellowBlue: 0, range: 'midtones', preserveLuminosity: true },
            ctxFor(white),
        );
        const luma = 0.299 * out.data[0] + 0.587 * out.data[1] + 0.114 * out.data[2];
        expect(luma).toBeGreaterThan(200);
    });

    it('extreme all-channel shift on a white pixel stays clamped', () => {
        const white = singleColorImage(255, 255, 255);
        const out = colorBalance.apply(
            { cyanRed: 100, magentaGreen: 100, yellowBlue: 100, range: 'midtones', preserveLuminosity: true },
            ctxFor(white),
        );
        // None of the channels should wrap to zero.
        expect(out.data[0]).toBeGreaterThan(150);
        expect(out.data[1]).toBeGreaterThan(150);
        expect(out.data[2]).toBeGreaterThan(150);
    });

    it('mid-gray with extreme shift remains near mid luminance', () => {
        const gray = singleColorImage(128, 128, 128);
        const out = colorBalance.apply(
            { cyanRed: 100, magentaGreen: 0, yellowBlue: 0, range: 'midtones', preserveLuminosity: true },
            ctxFor(gray),
        );
        const luma = 0.299 * out.data[0] + 0.587 * out.data[1] + 0.114 * out.data[2];
        // Preserve luminosity should hold luma near the original (128 ± reasonable).
        expect(Math.abs(luma - 128)).toBeLessThan(20);
    });
});
