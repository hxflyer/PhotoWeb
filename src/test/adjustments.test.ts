import { describe, it, expect } from 'vitest';
import { brightnessContrast } from '../adjustments/brightnessContrast';
import { curves } from '../adjustments/curves';
import { invert } from '../adjustments/miscAdjustments';
import { gradientMap, threshold } from '../adjustments/miscAdjustments';
import { autoColor, autoContrast, autoTone } from '../adjustments/autoAdjustments';
import { hueSaturation } from '../adjustments/colorAdjustments';
import { exposure } from '../adjustments/exposure';
import { levels } from '../adjustments/levels';
import { listAdjustments } from '../adjustments';
import type { Adjustment } from '../adjustments';
import { applyAdjustmentToLayer } from '../adjustments';
import { Canvas2DCompositor } from '../compositor/Canvas2DCompositor';
import { Layer } from '../core/Layer';
import { useEditorStore } from '../store/editorStore';
import type { SelectionState } from '../store/types';

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
        const out = brightnessContrast.apply({ brightness: 50, contrast: 0, useLegacy: false }, { image: src, width: src.width, height: src.height, selectionMask: null, dirtyRect: null });
        expect(out.data[0]).toBeGreaterThan(100);
    });

    it('invert flips RGB and preserves alpha', () => {
        const src = flat(40, 60, 80);
        const out = invert.apply({}, { image: src, width: src.width, height: src.height, selectionMask: null, dirtyRect: null });
        expect(out.data[0]).toBe(215);
        expect(out.data[1]).toBe(195);
        expect(out.data[2]).toBe(175);
        expect(out.data[3]).toBe(255);
    });

    it('threshold @128 maps below to 0 and above to 255', () => {
        const dark = flat(50, 50, 50);
        const bright = flat(200, 200, 200);
        const o1 = threshold.apply({ level: 128 }, { image: dark, width: dark.width, height: dark.height, selectionMask: null, dirtyRect: null });
        const o2 = threshold.apply({ level: 128 }, { image: bright, width: bright.width, height: bright.height, selectionMask: null, dirtyRect: null });
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
        const out = autoContrast.apply({}, { image: src, width: w, height: h, selectionMask: null, dirtyRect: null });
        // After stretch, min should be ~0 and max ~255
        expect(out.data[0]).toBe(0);
        expect(out.data[8]).toBe(255);
    });

    it('hue/sat with saturation=-100 produces grayscale-ish output', () => {
        const src = flat(200, 50, 50);
        const out = hueSaturation.apply(
            { hue: 0, saturation: -100, lightness: 0, colorize: false },
            { image: src, width: src.width, height: src.height, selectionMask: null, dirtyRect: null },
        );
        // R G B should converge
        const diff = Math.max(out.data[0], out.data[1], out.data[2]) - Math.min(out.data[0], out.data[1], out.data[2]);
        expect(diff).toBeLessThan(10);
    });

    it('adjustment layers do not alter the transparency checkerboard', () => {
        const target = document.createElement('canvas');
        target.width = 24;
        target.height = 24;
        const adjustment = new Layer(24, 24, 'Invert', 'adjustment') as Layer & { adjustment: { id: string; params: Record<string, unknown> } };
        adjustment.adjustment = { id: 'invert', params: {} };
        const compositor = new Canvas2DCompositor();

        compositor.beginFrame(target);
        compositor.render({
            layers: [adjustment],
            activeLayerId: adjustment.id,
            viewport: { width: 24, height: 24, zoom: 1, pan: { x: 0, y: 0 } },
            target,
        });

        const data = target.getContext('2d')!.getImageData(0, 0, 16, 16).data;
        expect(data[0]).toBe(242);
        expect(data[1]).toBe(242);
        const darkIdx = ((5 * 16) + 15) * 4;
        expect(data[darkIdx]).toBe(208);
        expect(data[darkIdx + 1]).toBe(208);
    });

    it('addAdjustmentLayer merges empty params with adjustment defaults', () => {
        useEditorStore.setState({ layers: [], activeLayerId: null });
        useEditorStore.getState().addAdjustmentLayer('brightness-contrast', {});
        const layer = useEditorStore.getState().layers[0] as Layer & { adjustment?: { params: Record<string, unknown> } };
        expect(layer.adjustment?.params).toMatchObject({ brightness: 0, contrast: 0 });
    });

    it('empty params are safe for every registered adjustment', () => {
        const src = flat(90, 140, 210);
        for (const adjustment of listAdjustments()) {
            const out = adjustment.apply({}, { image: src, width: src.width, height: src.height, selectionMask: null, dirtyRect: null });
            expect(out.width, adjustment.id).toBe(src.width);
            expect(out.height, adjustment.id).toBe(src.height);
            expect(out.data[3], adjustment.id).toBe(255);
        }
    });

    it('neutral adjustment defaults keep pixels unchanged when params are empty', () => {
        const src = flat(90, 140, 210);
        const neutral = [
            brightnessContrast,
            levels,
            curves,
            exposure,
            hueSaturation,
        ] as unknown as Adjustment<Record<string, unknown>>[];
        for (const adjustment of neutral) {
            const out = adjustment.apply({}, { image: src, width: src.width, height: src.height, selectionMask: null, dirtyRect: null });
            expect([out.data[0], out.data[1], out.data[2]], adjustment.id).toEqual([90, 140, 210]);
        }
    });

    it('auto adjustments ignore transparent RGB values', () => {
        const arr = new Uint8ClampedArray([
            100, 100, 100, 255,
            0, 0, 0, 0,
        ]);
        const src = new ImageData(arr, 2, 1);
        for (const adjustment of [autoTone, autoContrast, autoColor]) {
            const out = adjustment.apply({}, { image: src, width: src.width, height: src.height, selectionMask: null, dirtyRect: null });
            expect([out.data[0], out.data[1], out.data[2]], adjustment.id).toEqual([100, 100, 100]);
            expect([out.data[4], out.data[5], out.data[6], out.data[7]], adjustment.id).toEqual([0, 0, 0, 0]);
        }
    });

    it('hue/saturation colorize uses the chosen hue instead of shifting the source hue', () => {
        const src = flat(128, 128, 128);
        const out = hueSaturation.apply(
            { hue: 120, saturation: 50, lightness: 0, colorize: true },
            { image: src, width: src.width, height: src.height, selectionMask: null, dirtyRect: null },
        );
        expect(out.data[1]).toBeGreaterThan(out.data[0]);
        expect(out.data[1]).toBeGreaterThan(out.data[2]);
    });

    it('gradient map clamps values outside the first and last custom stops', () => {
        const arr = new Uint8ClampedArray([
            0, 0, 0, 255,
            255, 255, 255, 255,
        ]);
        const src = new ImageData(arr, 2, 1);
        const out = gradientMap.apply(
            {
                stops: [
                    { position: 0.25, color: '#ff0000' },
                    { position: 0.75, color: '#0000ff' },
                ],
            },
            { image: src, width: src.width, height: src.height, selectionMask: null, dirtyRect: null },
        );
        expect([out.data[0], out.data[1], out.data[2]]).toEqual([255, 0, 0]);
        expect([out.data[4], out.data[5], out.data[6]]).toEqual([0, 0, 255]);
    });

    it('destructive adjustment applies only inside the active selection', () => {
        const layer = new Layer(2, 1, 'Layer');
        layer.ctx.putImageData(new ImageData(new Uint8ClampedArray([
            10, 20, 30, 255,
            100, 110, 120, 255,
        ]), 2, 1), 0, 0);
        const selection: SelectionState = {
            hasSelection: true,
            mode: 'rect',
            path: [],
            polyPoints: [],
            operations: [{ mode: 'add', type: 'rect', path: [{ x: 0, y: 0 }, { x: 1, y: 1 }] }],
            isDraggingSelection: false,
            feather: 0,
            isFreeEditMode: false,
        };

        expect(applyAdjustmentToLayer(layer, 'invert', {}, selection)).toBe(true);
        const out = layer.ctx.getImageData(0, 0, 2, 1).data;
        expect([out[0], out[1], out[2], out[3]]).toEqual([245, 235, 225, 255]);
        expect([out[4], out[5], out[6], out[7]]).toEqual([100, 110, 120, 255]);
    });
});
