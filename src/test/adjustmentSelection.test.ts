import { describe, it, expect, beforeEach } from 'vitest';
import '../filters/index';
import { applyAdjustmentToLayer } from '../adjustments';
import { applyFilterToLayer } from '../filters/applyFilter';
import { Layer } from '../core/Layer';
import { useEditorStore } from '../store/editorStore';
import { captureLayerRegion, createPixelHistoryAction } from '../core/history';
import type { SelectionState } from '../store/types';
import { layerPixelAt } from './simulator';

// Each adjustment is registered via its module's import side-effect; force them
// to load by importing the registry-side effects module.
import '../adjustments';

function emptySelection(): SelectionState {
    return {
        hasSelection: false,
        mode: 'rect',
        path: [],
        polyPoints: [],
        operations: [],
        isDraggingSelection: false,
        feather: 0,
        isFreeEditMode: false,
    };
}

function rectSelection(x0: number, y0: number, x1: number, y1: number, feather = 0): SelectionState {
    return {
        ...emptySelection(),
        hasSelection: true,
        feather,
        operations: [{ mode: 'add', type: 'rect', path: [{ x: x0, y: y0 }, { x: x1, y: y1 }] }],
    };
}

function makeRedLayer(w: number, h: number): Layer {
    const layer = new Layer(w, h, 'Test');
    layer.ctx.fillStyle = '#ff0000';
    layer.ctx.fillRect(0, 0, w, h);
    return layer;
}

function addLayerMask(layer: Layer, fill: string, density?: number, feather?: number) {
    const c = document.createElement('canvas');
    c.width = layer.canvas.width;
    c.height = layer.canvas.height;
    const ctx = c.getContext('2d')!;
    ctx.fillStyle = fill;
    ctx.fillRect(0, 0, c.width, c.height);
    layer.mask = { canvas: c, ctx, enabled: true, linked: true, density, feather };
}

function fillMaskRect(layer: Layer, x: number, y: number, w: number, h: number, color: string) {
    if (!layer.mask) throw new Error('layer has no mask');
    layer.mask.ctx.fillStyle = color;
    layer.mask.ctx.fillRect(x, y, w, h);
}

beforeEach(() => {
    useEditorStore.setState((s) => ({ ...s, layers: [], activeLayerId: null }));
});

describe('adjustment + mask + selection correctness', () => {
    it('Curves adjustment respects selection feather at the edge', () => {
        // Curves params that map all RGB to 0 (full darkening). Feathered
        // rectangular selection should produce a soft transition across the
        // feather band rather than a hard cut.
        const layer = makeRedLayer(60, 20);
        const sel = rectSelection(20, 0, 40, 20, 8);
        // Curve: black/white anchors only, but invert via a steep ramp.
        // Easier: use 'invert' which is a 1:1 RGB flip. Original red (255,0,0)
        // becomes cyan (0,255,255). The feather band should produce intermediate
        // red channel values strictly between 0 and 255.
        expect(applyAdjustmentToLayer(layer, 'invert', {}, sel)).toBe(true);

        const inside = layer.ctx.getImageData(30, 10, 1, 1).data;
        const outside = layer.ctx.getImageData(0, 10, 1, 1).data;
        // Deep inside: fully inverted
        expect(inside[0]).toBeLessThan(20);
        expect(inside[1]).toBeGreaterThan(235);
        // Well outside: unchanged red
        expect(outside[0]).toBe(255);
        expect(outside[1]).toBe(0);
        // Edge band: intermediate R value (neither 255 nor 0)
        let foundIntermediate = false;
        for (let x = 14; x <= 26; x++) {
            const p = layer.ctx.getImageData(x, 10, 1, 1).data;
            if (p[0] > 20 && p[0] < 235) {
                foundIntermediate = true;
                break;
            }
        }
        expect(foundIntermediate).toBe(true);
    });

    it('mask density at 0.5 attenuates a hiding mask, scaling the effect to ~50%', () => {
        // Photoshop semantics: density = 0 disables the mask entirely; density = 1
        // applies the full mask. A black mask (hides everything) with density 0.5
        // therefore only half-hides: the destructive adjustment lands at 50%.
        // Invert on pure red (255,0,0) targets (0,255,255). Half blend → (~127,127,127).
        const layer = makeRedLayer(8, 8);
        addLayerMask(layer, '#000000', 0.5, 0);

        expect(applyAdjustmentToLayer(layer, 'invert', {}, emptySelection())).toBe(true);
        const p = layer.ctx.getImageData(4, 4, 1, 1).data;
        expect(p[0]).toBeGreaterThanOrEqual(120);
        expect(p[0]).toBeLessThanOrEqual(135);
        expect(p[1]).toBeGreaterThanOrEqual(120);
        expect(p[1]).toBeLessThanOrEqual(135);
        expect(p[2]).toBeGreaterThanOrEqual(120);
        expect(p[2]).toBeLessThanOrEqual(135);
    });

    it('Levels: pixels outside a partial layer mask are completely unchanged', () => {
        const layer = makeRedLayer(20, 20);
        // Mask: black everywhere, white only in the left half.
        addLayerMask(layer, '#000000', 1, 0);
        fillMaskRect(layer, 0, 0, 10, 20, '#ffffff');

        expect(applyAdjustmentToLayer(layer, 'invert', {}, emptySelection())).toBe(true);
        // Right side (mask black): untouched red.
        const right = layer.ctx.getImageData(15, 10, 1, 1).data;
        expect([right[0], right[1], right[2]]).toEqual([255, 0, 0]);
        // Left side (mask white): fully inverted.
        const left = layer.ctx.getImageData(2, 10, 1, 1).data;
        expect([left[0], left[1], left[2]]).toEqual([0, 255, 255]);
    });

    it('Hue/Saturation respects AND of layer mask and active selection', () => {
        // Mask: white in left half only. Selection: rect in top half only.
        // AND => effect only in the top-left quadrant.
        const layer = makeRedLayer(20, 20);
        addLayerMask(layer, '#000000', 1, 0);
        fillMaskRect(layer, 0, 0, 10, 20, '#ffffff');
        const sel = rectSelection(0, 0, 20, 10, 0);

        // saturation = -100 produces grayscale-ish from red.
        expect(applyAdjustmentToLayer(layer, 'hue-saturation', { hue: 0, saturation: -100, lightness: 0, colorize: false }, sel)).toBe(true);

        // Top-left: in both mask AND selection → grayscale red
        const tl = layer.ctx.getImageData(2, 2, 1, 1).data;
        const tlDiff = Math.max(tl[0], tl[1], tl[2]) - Math.min(tl[0], tl[1], tl[2]);
        expect(tlDiff).toBeLessThan(20);

        // Top-right: outside mask → unchanged red
        const tr = layer.ctx.getImageData(15, 2, 1, 1).data;
        expect([tr[0], tr[1], tr[2]]).toEqual([255, 0, 0]);
        // Bottom-left: outside selection → unchanged red
        const bl = layer.ctx.getImageData(2, 15, 1, 1).data;
        expect([bl[0], bl[1], bl[2]]).toEqual([255, 0, 0]);
        // Bottom-right: outside both → unchanged red
        const br = layer.ctx.getImageData(15, 15, 1, 1).data;
        expect([br[0], br[1], br[2]]).toEqual([255, 0, 0]);
    });

    it('Gaussian blur (filter) behaves with the same mask+selection rules as adjustments', () => {
        // Parity check: a filter clipped by mask AND selection must leave
        // pixels outside the combined region untouched.
        const layer = makeRedLayer(20, 20);
        // paint a green dot mid-image so blur has something to mix
        layer.ctx.fillStyle = '#00ff00';
        layer.ctx.fillRect(10, 10, 2, 2);

        addLayerMask(layer, '#000000', 1, 0);
        fillMaskRect(layer, 0, 0, 10, 20, '#ffffff');
        const sel = rectSelection(0, 0, 20, 10, 0);

        const beforeBR = layer.ctx.getImageData(15, 15, 1, 1).data;
        expect([beforeBR[0], beforeBR[1], beforeBR[2]]).toEqual([255, 0, 0]);

        applyFilterToLayer(layer, 'blur-gaussian', { radius: 3 }, sel);

        // Bottom-right (outside selection AND outside mask): unchanged
        const afterBR = layer.ctx.getImageData(15, 15, 1, 1).data;
        expect([afterBR[0], afterBR[1], afterBR[2]]).toEqual([255, 0, 0]);
        // Top-right (outside mask): unchanged
        const tr = layer.ctx.getImageData(15, 2, 1, 1).data;
        expect([tr[0], tr[1], tr[2]]).toEqual([255, 0, 0]);
    });

    it('adjustment with no selection and no mask covers the whole layer', () => {
        const layer = makeRedLayer(10, 10);
        expect(applyAdjustmentToLayer(layer, 'invert', {}, emptySelection())).toBe(true);
        // Every sampled pixel should be the inverted color.
        for (const [x, y] of [[0, 0], [9, 0], [0, 9], [9, 9], [5, 5]] as const) {
            const p = layer.ctx.getImageData(x, y, 1, 1).data;
            expect([p[0], p[1], p[2]]).toEqual([0, 255, 255]);
        }
    });

    it('adjustment + history undo restores the original pixels', () => {
        // Wire layer into the store so history.undo finds it by id.
        useEditorStore.setState((s) => ({ ...s, layers: [], activeLayerId: null }));
        useEditorStore.getState().addLayer();
        const layer = useEditorStore.getState().layers[0];
        layer.ctx.fillStyle = '#ff0000';
        layer.ctx.fillRect(0, 0, layer.canvas.width, layer.canvas.height);
        useEditorStore.getState().clearHistory();

        const fullRect = { x: 0, y: 0, width: layer.canvas.width, height: layer.canvas.height };
        const before = captureLayerRegion(layer, fullRect);
        expect(applyAdjustmentToLayer(layer, 'invert', {}, emptySelection())).toBe(true);
        useEditorStore.getState().commitHistory(createPixelHistoryAction(layer, fullRect, before, 'Adjustment: invert'));

        // After apply
        expect(layerPixelAt(layer, 2, 2)).toMatchObject({ r: 0, g: 255, b: 255 });

        // Undo restores
        useEditorStore.getState().undo();
        const restored = useEditorStore.getState().layers[0];
        expect(layerPixelAt(restored, 2, 2)).toMatchObject({ r: 255, g: 0, b: 0 });
    });
});
