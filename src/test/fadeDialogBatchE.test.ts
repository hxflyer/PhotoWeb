import { describe, it, expect } from 'vitest';
import { fadeImageData, BLEND_MODE_OPTIONS } from '../utils/fadeBlend';

function flat(r: number, g: number, b: number, w = 2, h = 1, a = 255): ImageData {
    const arr = new Uint8ClampedArray(w * h * 4);
    for (let i = 0; i < arr.length; i += 4) {
        arr[i] = r; arr[i + 1] = g; arr[i + 2] = b; arr[i + 3] = a;
    }
    return new ImageData(arr, w, h);
}

describe('Batch E — Fade dialog blend', () => {
    it('opacity 0 returns the before pixels exactly', () => {
        const before = flat(80, 80, 80);
        const after = flat(200, 200, 200);
        const out = fadeImageData(before, after, 0, 'normal');
        expect([out.data[0], out.data[1], out.data[2]]).toEqual([80, 80, 80]);
    });

    it('opacity 1 with mode=normal replaces with the after pixels', () => {
        const before = flat(80, 80, 80);
        const after = flat(200, 200, 200);
        const out = fadeImageData(before, after, 1, 'normal');
        expect([out.data[0], out.data[1], out.data[2]]).toEqual([200, 200, 200]);
    });

    it('opacity 1 with mode=multiply produces (before*after)/255', () => {
        const before = flat(200, 200, 200);
        const after = flat(128, 128, 128);
        const out = fadeImageData(before, after, 1, 'multiply');
        // Multiply: src*dst/255 = 128*200/255 ≈ 100
        expect(out.data[0]).toBeGreaterThanOrEqual(99);
        expect(out.data[0]).toBeLessThanOrEqual(101);
    });

    it('opacity 0.5 with mode=normal averages before and after', () => {
        const before = flat(100, 100, 100);
        const after = flat(200, 200, 200);
        const out = fadeImageData(before, after, 0.5, 'normal');
        // 0.5 * 100 + 0.5 * 200 = 150
        expect(out.data[0]).toBe(150);
    });

    it('alpha channel is preserved from before pixels', () => {
        const before = flat(50, 50, 50, 2, 1, 200);
        const after = flat(100, 100, 100, 2, 1, 100);
        const out = fadeImageData(before, after, 1, 'normal');
        expect(out.data[3]).toBe(200);
    });

    it('mismatched dimensions throw', () => {
        const before = flat(0, 0, 0, 2, 2);
        const after = flat(255, 255, 255, 3, 3);
        expect(() => fadeImageData(before, after, 1, 'normal')).toThrow();
    });

    it('BLEND_MODE_OPTIONS exposes all Photoshop modes', () => {
        const ids = BLEND_MODE_OPTIONS.map(o => o.value);
        for (const expected of ['normal', 'multiply', 'screen', 'overlay', 'soft-light', 'difference']) {
            expect(ids).toContain(expected);
        }
    });
});
