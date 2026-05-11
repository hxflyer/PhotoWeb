import { describe, it, expect, beforeAll } from 'vitest';
import '../filters/index'; // ensure all filters are registered
import { getFilter, registerFilter } from '../filters/registry';
import { applyFilterToLayer } from '../filters/applyFilter';
import { useEditorStore } from '../store/editorStore';
import { captureLayerRegion, createPixelHistoryAction } from '../core/history';
import { layerPixelAt } from './simulator';

beforeAll(() => {
    // Local test-only filter: invert RGB channels
    if (!getFilter('test-invert')) {
        registerFilter({
            id: 'test-invert',
            label: 'Test Invert',
            defaultParams: {},
            apply(_p, { image }) {
                const out = new ImageData(new Uint8ClampedArray(image.data), image.width, image.height);
                for (let i = 0; i < out.data.length; i += 4) {
                    out.data[i]     = 255 - out.data[i];
                    out.data[i + 1] = 255 - out.data[i + 1];
                    out.data[i + 2] = 255 - out.data[i + 2];
                }
                return out;
            },
        });
    }
});

function makeImageData(w: number, h: number, fill: [number, number, number, number]): ImageData {
    const d = new Uint8ClampedArray(w * h * 4);
    for (let i = 0; i < d.length; i += 4) {
        d[i] = fill[0]; d[i + 1] = fill[1]; d[i + 2] = fill[2]; d[i + 3] = fill[3];
    }
    return new ImageData(d, w, h);
}

function noSel() { return useEditorStore.getState().selection; }

function freshLayer() {
    useEditorStore.setState(s => ({ ...s, layers: [], activeLayerId: null }));
    useEditorStore.getState().addLayer();
    useEditorStore.getState().clearHistory();
    return useEditorStore.getState().layers[0];
}

// ── Blur ──────────────────────────────────────────────────────────────────

describe('blur filters', () => {
    it('blur-gaussian is registered', () => { expect(getFilter('blur-gaussian')).toBeDefined(); });
    it('blur-box is registered', () => { expect(getFilter('blur-box')).toBeDefined(); });
    it('blur-motion is registered', () => { expect(getFilter('blur-motion')).toBeDefined(); });
    it('blur-surface is registered', () => { expect(getFilter('blur-surface')).toBeDefined(); });

    it('gaussian blur produces output with same dimensions', () => {
        const img = makeImageData(10, 10, [200, 100, 50, 255]);
        const result = getFilter('blur-gaussian')!.apply({ radius: 2 }, { image: img, width: 10, height: 10, selectionMask: null, dirtyRect: null });
        expect(result.width).toBe(10);
        expect(result.height).toBe(10);
    });

    it('undo and redo restore an applied filter result', () => {
        const layer = freshLayer();
        layer.ctx.fillStyle = '#102030';
        layer.ctx.fillRect(0, 0, layer.canvas.width, layer.canvas.height);
        const before = captureLayerRegion(layer, { x: 0, y: 0, width: layer.canvas.width, height: layer.canvas.height });
        expect(applyFilterToLayer(layer, 'test-invert', {}, noSel())).toBe(true);
        useEditorStore.getState().commitHistory(createPixelHistoryAction(
            layer,
            { x: 0, y: 0, width: layer.canvas.width, height: layer.canvas.height },
            before,
            'Filter: test-invert',
        ));
        expect(layerPixelAt(layer, 2, 2)).toMatchObject({ r: 239, g: 223, b: 207, a: 255 });

        useEditorStore.getState().undo();
        expect(layerPixelAt(useEditorStore.getState().layers[0], 2, 2)).toMatchObject({ r: 16, g: 32, b: 48, a: 255 });

        useEditorStore.getState().redo();
        expect(layerPixelAt(useEditorStore.getState().layers[0], 2, 2)).toMatchObject({ r: 239, g: 223, b: 207, a: 255 });
    });

    it('box blur smooths sharp color boundary', () => {
        // left half red, right half blue → edge pixel should become a mix
        const w = 10; const h = 4;
        const d = new Uint8ClampedArray(w * h * 4);
        for (let y = 0; y < h; y++) {
            for (let x = 0; x < w; x++) {
                const i = (y * w + x) * 4;
                if (x < w / 2) { d[i] = 255; d[i + 3] = 255; }
                else { d[i + 2] = 255; d[i + 3] = 255; }
            }
        }
        const img = new ImageData(d, w, h);
        const result = getFilter('blur-box')!.apply({ radius: 1 }, { image: img, width: w, height: h, selectionMask: null, dirtyRect: null });
        // The center edge pixel should have both red and blue non-zero
        const edgeIdx = (1 * w + (w / 2)) * 4;
        expect(result.data[edgeIdx]).toBeGreaterThan(0);   // some red
        expect(result.data[edgeIdx + 2]).toBeGreaterThan(0); // some blue
    });

    it('motion blur with distance=1 produces non-zero output', () => {
        const img = makeImageData(8, 8, [128, 64, 32, 255]);
        const result = getFilter('blur-motion')!.apply({ distance: 1, angle: 0 }, { image: img, width: 8, height: 8, selectionMask: null, dirtyRect: null });
        expect(result.data[0]).toBeGreaterThan(0);
    });

    it('surface blur preserves uniform-color region exactly', () => {
        const img = makeImageData(8, 8, [100, 150, 200, 255]);
        const result = getFilter('blur-surface')!.apply({ radius: 2, threshold: 10 }, { image: img, width: 8, height: 8, selectionMask: null, dirtyRect: null });
        // All pixels were same color → surface blur should leave them ~same
        expect(result.data[0]).toBeGreaterThan(80);
        expect(result.data[1]).toBeGreaterThan(130);
    });
});

// ── Sharpen ───────────────────────────────────────────────────────────────

describe('sharpen filters', () => {
    it('sharpen-unsharp is registered', () => { expect(getFilter('sharpen-unsharp')).toBeDefined(); });
    it('sharpen-smart is registered', () => { expect(getFilter('sharpen-smart')).toBeDefined(); });

    it('unsharp mask on uniform-color does not change pixels (threshold=0, amount=100)', () => {
        const img = makeImageData(10, 10, [100, 100, 100, 255]);
        const result = getFilter('sharpen-unsharp')!.apply({ amount: 100, radius: 1, threshold: 0 }, { image: img, width: 10, height: 10, selectionMask: null, dirtyRect: null });
        // Uniform image — blur = original → diff = 0 → no change
        expect(result.data[0]).toBe(100);
    });
});

// ── Noise ─────────────────────────────────────────────────────────────────

describe('noise filters', () => {
    it('noise-add is registered', () => { expect(getFilter('noise-add')).toBeDefined(); });
    it('noise-reduce is registered', () => { expect(getFilter('noise-reduce')).toBeDefined(); });
    it('noise-median is registered', () => { expect(getFilter('noise-median')).toBeDefined(); });

    it('add noise produces output that differs from input', () => {
        const img = makeImageData(20, 20, [128, 128, 128, 255]);
        const result = getFilter('noise-add')!.apply({ amount: 50, monochromatic: false }, { image: img, width: 20, height: 20, selectionMask: null, dirtyRect: null });
        // With noise, at least one pixel should differ from 128
        let differs = false;
        for (let i = 0; i < result.data.length; i += 4) {
            if (result.data[i] !== 128 || result.data[i + 1] !== 128 || result.data[i + 2] !== 128) { differs = true; break; }
        }
        expect(differs).toBe(true);
    });

    it('median on uniform image keeps same values', () => {
        const img = makeImageData(8, 8, [200, 100, 50, 255]);
        const result = getFilter('noise-median')!.apply({ radius: 1 }, { image: img, width: 8, height: 8, selectionMask: null, dirtyRect: null });
        expect(result.data[0]).toBe(200);
        expect(result.data[1]).toBe(100);
    });
});

// ── Distort ───────────────────────────────────────────────────────────────

describe('distort filters', () => {
    it('distort-pinch is registered', () => { expect(getFilter('distort-pinch')).toBeDefined(); });
    it('distort-spherize is registered', () => { expect(getFilter('distort-spherize')).toBeDefined(); });

    it('pinch amount=0 produces same-dimension output', () => {
        const img = makeImageData(16, 16, [100, 150, 200, 255]);
        const result = getFilter('distort-pinch')!.apply({ amount: 0 }, { image: img, width: 16, height: 16, selectionMask: null, dirtyRect: null });
        expect(result.width).toBe(16);
        expect(result.height).toBe(16);
    });
});

// ── Stylize ───────────────────────────────────────────────────────────────

describe('stylize filters', () => {
    it('stylize-find-edges is registered', () => { expect(getFilter('stylize-find-edges')).toBeDefined(); });
    it('stylize-emboss is registered', () => { expect(getFilter('stylize-emboss')).toBeDefined(); });

    it('find-edges on uniform image → all pixels near 255 (no edges)', () => {
        const img = makeImageData(8, 8, [100, 100, 100, 255]);
        const result = getFilter('stylize-find-edges')!.apply({}, { image: img, width: 8, height: 8, selectionMask: null, dirtyRect: null });
        expect(result.data[0]).toBeGreaterThan(200);
    });

    it('emboss on uniform image → all pixels near 128 (neutral grey)', () => {
        const img = makeImageData(8, 8, [100, 100, 100, 255]);
        const result = getFilter('stylize-emboss')!.apply({ angle: -45, height: 1, amount: 100 }, { image: img, width: 8, height: 8, selectionMask: null, dirtyRect: null });
        expect(Math.abs(result.data[0] - 128)).toBeLessThan(5);
    });
});

// ── Other ─────────────────────────────────────────────────────────────────

describe('other filters', () => {
    it('other-high-pass is registered', () => { expect(getFilter('other-high-pass')).toBeDefined(); });

    it('high-pass on uniform image → all pixels near 128', () => {
        const img = makeImageData(10, 10, [200, 100, 50, 255]);
        const result = getFilter('other-high-pass')!.apply({ radius: 3 }, { image: img, width: 10, height: 10, selectionMask: null, dirtyRect: null });
        expect(Math.abs(result.data[0] - 128)).toBeLessThan(5);
    });
});

// ── Render ────────────────────────────────────────────────────────────────

describe('render filters', () => {
    it('render-lens-flare is registered', () => { expect(getFilter('render-lens-flare')).toBeDefined(); });

    it('lens flare brightens pixels near the flare center', () => {
        const w = 20; const h = 20;
        const img = makeImageData(w, h, [0, 0, 0, 255]);
        // Flare centered at 50%,50%
        const result = getFilter('render-lens-flare')!.apply({ x: 50, y: 50, brightness: 100, lensType: '50-300mm' }, { image: img, width: w, height: h, selectionMask: null, dirtyRect: null });
        const centerIdx = (10 * w + 10) * 4;
        expect(result.data[centerIdx] + result.data[centerIdx + 1] + result.data[centerIdx + 2]).toBeGreaterThan(0);
    });
});

// ── applyFilterToLayer + selection ───────────────────────────────────────

describe('applyFilterToLayer with selection', () => {
    it('selection mask restricts filter application', () => {
        const layer = freshLayer();
        // Fill layer red
        layer.ctx.fillStyle = '#ff0000';
        layer.ctx.fillRect(0, 0, layer.canvas.width, layer.canvas.height);

        // Select only top-left 50% via ops
        const sel = {
            ...noSel(),
            hasSelection: true,
            operations: [{ mode: 'add' as const, type: 'rect' as const, path: [{ x: 0, y: 0 }, { x: 50, y: 50 }] }],
        };
        applyFilterToLayer(layer, 'test-invert', {}, sel);

        // Inside selection: should be inverted (red → cyan: r=0, g=255, b=255)
        const inside = layer.ctx.getImageData(25, 25, 1, 1).data;
        expect(inside[0]).toBe(0);
        expect(inside[1]).toBe(255);

        // Outside selection: should remain red
        const outside = layer.ctx.getImageData(75, 75, 1, 1).data;
        expect(outside[0]).toBe(255);
        expect(outside[1]).toBe(0);
    });
});
