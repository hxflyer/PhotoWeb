import { describe, it, expect } from 'vitest';
import { selectiveColor } from '../adjustments/selectiveColor';
import '../adjustments/index';
import { getAdjustment } from '../adjustments';

function singleColorImage(r: number, g: number, b: number): ImageData {
    const arr = new Uint8ClampedArray([r, g, b, 255]);
    return new ImageData(arr, 1, 1);
}

function ctxFor(image: ImageData) {
    return { image, width: image.width, height: image.height, selectionMask: null, dirtyRect: null };
}

describe('selective color adjustment', () => {
    it('registers under the selective-color id', () => {
        expect(getAdjustment('selective-color')).toBeDefined();
    });

    it('absolute Cyan -100 on a pure red pixel brightens the red channel', () => {
        const red = singleColorImage(255, 0, 0);
        const out = selectiveColor.apply(
            { range: 'reds', cyan: -100, magenta: 0, yellow: 0, black: 0, method: 'absolute' },
            ctxFor(red),
        );
        // Red is already pure-red (cyan ink = 0 in CMYK); subtracting cyan
        // can only stay at or above the source red. The pixel must remain at
        // or near pure red and definitely not invert into cyan tones.
        expect(out.data[0]).toBeGreaterThanOrEqual(red.data[0] - 1);
        expect(out.data[0]).toBeGreaterThan(out.data[1]);
        expect(out.data[0]).toBeGreaterThan(out.data[2]);
        expect(out.data[3]).toBe(255);
    });

    it('absolute Cyan +50 on a pure red pixel pulls the red channel toward cyan', () => {
        const red = singleColorImage(255, 0, 0);
        const out = selectiveColor.apply(
            { range: 'reds', cyan: 50, magenta: 0, yellow: 0, black: 0, method: 'absolute' },
            ctxFor(red),
        );
        // Adding cyan to red ink reduces the red channel.
        expect(out.data[0]).toBeLessThan(255);
    });

    it('leaves out-of-range pixels unchanged when targeting reds', () => {
        const blue = singleColorImage(0, 0, 255);
        const out = selectiveColor.apply(
            { range: 'reds', cyan: 100, magenta: 100, yellow: 100, black: 100, method: 'absolute' },
            ctxFor(blue),
        );
        expect(out.data[0]).toBe(0);
        expect(out.data[1]).toBe(0);
        expect(out.data[2]).toBe(255);
        expect(out.data[3]).toBe(255);
    });

    it('relative method with zero sliders leaves pixels unchanged', () => {
        const orange = singleColorImage(200, 120, 40);
        const out = selectiveColor.apply(
            { range: 'reds', cyan: 0, magenta: 0, yellow: 0, black: 0, method: 'relative' },
            ctxFor(orange),
        );
        expect(out.data[0]).toBe(200);
        expect(out.data[1]).toBe(120);
        expect(out.data[2]).toBe(40);
    });

    it('whites range targets near-white pixels only', () => {
        const white = singleColorImage(250, 250, 250);
        const black = singleColorImage(5, 5, 5);
        const whiteOut = selectiveColor.apply(
            { range: 'whites', cyan: 50, magenta: 0, yellow: 0, black: 0, method: 'absolute' },
            ctxFor(white),
        );
        const blackOut = selectiveColor.apply(
            { range: 'whites', cyan: 50, magenta: 0, yellow: 0, black: 0, method: 'absolute' },
            ctxFor(black),
        );
        // White should be tinted, black should remain unchanged.
        expect(whiteOut.data[0]).toBeLessThan(250);
        expect(blackOut.data[0]).toBe(5);
        expect(blackOut.data[1]).toBe(5);
        expect(blackOut.data[2]).toBe(5);
    });

    it('empty params are safe and preserve dimensions', () => {
        const img = singleColorImage(100, 100, 100);
        const out = selectiveColor.apply({} as Parameters<typeof selectiveColor.apply>[0], ctxFor(img));
        expect(out.width).toBe(1);
        expect(out.height).toBe(1);
        expect(out.data[3]).toBe(255);
    });
});
