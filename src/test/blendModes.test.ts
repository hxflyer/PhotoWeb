import { describe, it, expect } from 'vitest';
import { applyBlendModeToImageData, blendModeToCompositeOp } from '../core/blendModes';

function img(r: number, g: number, b: number, a: number, w = 1, h = 1): ImageData {
    const arr = new Uint8ClampedArray(w * h * 4);
    for (let i = 0; i < arr.length; i += 4) {
        arr[i] = r; arr[i + 1] = g; arr[i + 2] = b; arr[i + 3] = a;
    }
    return new ImageData(arr, w, h);
}

describe('blend modes', () => {
    it('native modes return a Canvas2D composite op string', () => {
        expect(blendModeToCompositeOp('multiply')).toBe('multiply');
        expect(blendModeToCompositeOp('screen')).toBe('screen');
        expect(blendModeToCompositeOp('overlay')).toBe('overlay');
        expect(blendModeToCompositeOp('hue')).toBe('hue');
    });

    it('linear-burn: src+dst-255 clamped', () => {
        const src = img(200, 200, 200, 255);
        const dst = img(100, 100, 100, 255);
        const out = applyBlendModeToImageData(src, dst, 'linear-burn');
        expect(out.data[0]).toBe(45);
        expect(out.data[1]).toBe(45);
        expect(out.data[2]).toBe(45);
    });

    it('linear-dodge: src+dst clamped', () => {
        const src = img(100, 100, 100, 255);
        const dst = img(200, 200, 200, 255);
        const out = applyBlendModeToImageData(src, dst, 'linear-dodge');
        expect(out.data[0]).toBe(255);
        expect(out.data[1]).toBe(255);
        expect(out.data[2]).toBe(255);
    });

    it('dissolve: produces either source or destination per pixel', () => {
        const src = img(255, 0, 0, 255);
        const dst = img(0, 0, 255, 255);
        const out = applyBlendModeToImageData(src, dst, 'dissolve');
        const isSource = out.data[0] === 255 && out.data[2] === 0;
        const isDest = out.data[0] === 0 && out.data[2] === 255;
        expect(isSource || isDest).toBe(true);
    });
});
