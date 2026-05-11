import { describe, it, expect } from 'vitest';
import '../filters/index';
import { getFilter } from '../filters/registry';

function gradientImage(width: number, height: number): ImageData {
    const arr = new Uint8ClampedArray(width * height * 4);
    for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
            // A smooth diagonal ramp + horizontal stripe gradient.
            const v = Math.round((x / width) * 120 + (y / height) * 80 + 30);
            const c = Math.max(0, Math.min(255, v));
            const i = (y * width + x) * 4;
            arr[i] = c;
            arr[i + 1] = c;
            arr[i + 2] = c;
            arr[i + 3] = 255;
        }
    }
    return new ImageData(arr, width, height);
}

function pixelDiffFraction(a: ImageData, b: ImageData): number {
    let diff = 0;
    const total = a.width * a.height;
    for (let i = 0; i < a.data.length; i += 4) {
        if (
            a.data[i] !== b.data[i] ||
            a.data[i + 1] !== b.data[i + 1] ||
            a.data[i + 2] !== b.data[i + 2]
        ) {
            diff++;
        }
    }
    return diff / total;
}

describe('smart sharpen modes', () => {
    it('gaussian, motion, and lens modes produce distinct output', () => {
        const filter = getFilter('sharpen-smart');
        expect(filter).toBeDefined();
        const w = 32;
        const h = 32;
        const src = gradientImage(w, h);
        const ctx = { image: src, width: w, height: h, selectionMask: null, dirtyRect: null };

        const gOut = filter!.apply({ amount: 200, radius: 2, removeBlur: 'gaussian' }, ctx);
        const mOut = filter!.apply({ amount: 200, radius: 2, removeBlur: 'motion' }, ctx);
        const lOut = filter!.apply({ amount: 200, radius: 2, removeBlur: 'lens' }, ctx);

        // Every pair of modes must differ on at least 5% of pixels.
        const gmDiff = pixelDiffFraction(gOut, mOut);
        const glDiff = pixelDiffFraction(gOut, lOut);
        const mlDiff = pixelDiffFraction(mOut, lOut);

        expect(gmDiff).toBeGreaterThanOrEqual(0.05);
        expect(glDiff).toBeGreaterThanOrEqual(0.05);
        expect(mlDiff).toBeGreaterThanOrEqual(0.05);
    });

    it('all three modes preserve image dimensions and alpha', () => {
        const filter = getFilter('sharpen-smart')!;
        const src = gradientImage(8, 8);
        const ctx = { image: src, width: 8, height: 8, selectionMask: null, dirtyRect: null };

        for (const mode of ['gaussian', 'motion', 'lens'] as const) {
            const out = filter.apply({ amount: 100, radius: 1, removeBlur: mode }, ctx);
            expect(out.width).toBe(8);
            expect(out.height).toBe(8);
            expect(out.data[3]).toBe(255);
        }
    });
});
