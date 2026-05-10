import { describe, expect, it } from 'vitest';
import { applyBrushDab, brushTipAlpha } from '../utils/brushEngine';

function buffers(width = 9, height = 9, rgba: [number, number, number, number] = [0, 0, 0, 0]) {
    const base = new Uint8ClampedArray(width * height * 4);
    for (let i = 0; i < base.length; i += 4) {
        base[i] = rgba[0];
        base[i + 1] = rgba[1];
        base[i + 2] = rgba[2];
        base[i + 3] = rgba[3];
    }
    return {
        width,
        height,
        base,
        work: new Uint8ClampedArray(base),
        coverage: new Float32Array(width * height),
    };
}

function alphaAt(work: Uint8ClampedArray, width: number, x: number, y: number): number {
    return work[((y * width + x) * 4) + 3];
}

describe('brush engine', () => {
    it('opacity caps one stroke even after repeated high-flow dabs', () => {
        const b = buffers();
        for (let i = 0; i < 5; i++) {
            applyBrushDab({
                ...b,
                x: 4,
                y: 4,
                size: 5,
                hardness: 1,
                opacity: 0.5,
                flow: 1,
                color: { r: 255, g: 0, b: 0 },
                mode: 'paint',
            });
        }
        expect(alphaAt(b.work, b.width, 4, 4)).toBeCloseTo(128, 1);
    });

    it('flow builds up gradually below the opacity cap', () => {
        const b = buffers();
        applyBrushDab({
            ...b,
            x: 4,
            y: 4,
            size: 5,
            hardness: 1,
            opacity: 1,
            flow: 0.25,
            color: { r: 255, g: 0, b: 0 },
            mode: 'paint',
        });
        const first = alphaAt(b.work, b.width, 4, 4);
        applyBrushDab({
            ...b,
            x: 4,
            y: 4,
            size: 5,
            hardness: 1,
            opacity: 1,
            flow: 0.25,
            color: { r: 255, g: 0, b: 0 },
            mode: 'paint',
        });
        const second = alphaAt(b.work, b.width, 4, 4);
        expect(first).toBeGreaterThan(50);
        expect(first).toBeLessThan(80);
        expect(second).toBeGreaterThan(first);
        expect(second).toBeLessThan(140);
    });

    it('hardness softens the brush edge without changing the center', () => {
        expect(brushTipAlpha(0, 5, 0)).toBe(1);
        expect(brushTipAlpha(4.5, 5, 0)).toBeLessThan(0.1);
        expect(brushTipAlpha(4.5, 5, 1)).toBe(1);
    });

    it('eraser opacity caps alpha removal', () => {
        const b = buffers(9, 9, [10, 20, 30, 255]);
        for (let i = 0; i < 4; i++) {
            applyBrushDab({
                ...b,
                x: 4,
                y: 4,
                size: 5,
                hardness: 1,
                opacity: 0.5,
                flow: 1,
                color: { r: 0, g: 0, b: 0 },
                mode: 'erase',
            });
        }
        expect(alphaAt(b.work, b.width, 4, 4)).toBeCloseTo(128, 1);
    });
});
