import { describe, it, expect } from 'vitest';
import { hueSaturation, type HueSaturationParams } from '../adjustments/colorAdjustments';

function makeImage(pixels: number[][]): ImageData {
    const arr = new Uint8ClampedArray(pixels.length * 4);
    for (let i = 0; i < pixels.length; i++) {
        arr[i * 4] = pixels[i][0];
        arr[i * 4 + 1] = pixels[i][1];
        arr[i * 4 + 2] = pixels[i][2];
        arr[i * 4 + 3] = 255;
    }
    return new ImageData(arr, pixels.length, 1);
}

describe('Batch E — Hue/Saturation range', () => {
    it('Range=Master with hue=+180 shifts every pixel', () => {
        const src = makeImage([[255, 0, 0], [0, 0, 255]]);
        const out = hueSaturation.apply(
            { range: 'master', hue: 180, saturation: 0, lightness: 0, colorize: false },
            { image: src, width: src.width, height: src.height, selectionMask: null, dirtyRect: null }
        );
        // Red becomes ~cyan
        expect(out.data[0]).toBeLessThan(100);
        expect(out.data[2]).toBeGreaterThan(150);
        // Blue becomes ~yellow/orange
        expect(out.data[4]).toBeGreaterThan(150);
    });

    it('Range=Reds with hue=+180 affects red pixels but leaves blue mostly unchanged', () => {
        const src = makeImage([[255, 0, 0], [0, 0, 255]]);
        const out = hueSaturation.apply(
            { range: 'reds', hue: 180, saturation: 0, lightness: 0, colorize: false },
            { image: src, width: src.width, height: src.height, selectionMask: null, dirtyRect: null }
        );
        // Red shifted significantly toward cyan.
        expect(out.data[0]).toBeLessThan(100);
        expect(out.data[1]).toBeGreaterThan(150);
        // Blue largely preserved (within 10 of original 0,0,255).
        expect(Math.abs(out.data[4] - 0)).toBeLessThanOrEqual(15);
        expect(Math.abs(out.data[5] - 0)).toBeLessThanOrEqual(15);
        expect(Math.abs(out.data[6] - 255)).toBeLessThanOrEqual(15);
    });

    it('Range=Blues with saturation=-100 desaturates only blues', () => {
        const src = makeImage([[255, 0, 0], [0, 0, 255]]);
        const out = hueSaturation.apply(
            { range: 'blues', hue: 0, saturation: -100, lightness: 0, colorize: false },
            { image: src, width: src.width, height: src.height, selectionMask: null, dirtyRect: null }
        );
        // Red preserved.
        expect(Math.abs(out.data[0] - 255)).toBeLessThanOrEqual(5);
        expect(out.data[1]).toBeLessThanOrEqual(15);
        // Blue desaturated: r/g/b should all converge.
        const diff = Math.max(out.data[4], out.data[5], out.data[6]) - Math.min(out.data[4], out.data[5], out.data[6]);
        expect(diff).toBeLessThan(40);
    });

    it('Empty params default to Master and preserve the existing master behavior', () => {
        const src = makeImage([[128, 64, 200]]);
        const out = hueSaturation.apply(
            {} as HueSaturationParams,
            { image: src, width: src.width, height: src.height, selectionMask: null, dirtyRect: null }
        );
        // Hue 0 sat 0 light 0 master => unchanged.
        expect([out.data[0], out.data[1], out.data[2]]).toEqual([128, 64, 200]);
    });
});
