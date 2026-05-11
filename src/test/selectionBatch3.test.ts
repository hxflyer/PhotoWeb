import { describe, it, expect, beforeEach } from 'vitest';
import { useEditorStore } from '../store/editorStore';
import { ensureStubsRegistered } from '../tools/stubs';
import { rasterizeSelectionOperations } from '../utils/selectionUtils';
import { layerPixelAt } from './simulator';

ensureStubsRegistered();

function reset(w = 12, h = 12) {
    useEditorStore.getState().clearHistory();
    useEditorStore.setState((s) => ({
        ...s,
        layers: [],
        activeLayerId: null,
        width: w,
        height: h,
        selection: {
            ...s.selection,
            hasSelection: false,
            path: [],
            polyPoints: [],
            operations: [],
            isDraggingSelection: false,
            feather: 0,
        },
    }));
    useEditorStore.getState().addLayer();
    useEditorStore.getState().clearHistory();
}

function activeLayer() {
    const s = useEditorStore.getState();
    return s.layers.find(l => l.id === s.activeLayerId)!;
}

function selectedCount(): number {
    const s = useEditorStore.getState();
    const m = rasterizeSelectionOperations(s.selection.operations, s.width, s.height);
    let n = 0;
    for (const v of m) if (v >= 128) n++;
    return n;
}

describe('Grow', () => {
    beforeEach(() => reset(12, 12));

    it('expands a one-pixel red selection across all contiguous red pixels within tolerance', () => {
        const layer = activeLayer();
        layer.ctx.clearRect(0, 0, 12, 12);
        // Paint a contiguous red blob in the left half plus a far red pixel.
        layer.ctx.fillStyle = '#ff0000';
        layer.ctx.fillRect(2, 2, 4, 4);
        layer.ctx.fillStyle = '#ff0000';
        layer.ctx.fillRect(10, 10, 1, 1);
        layer.markDirty(null);

        // Seed: a one-pixel selection at (3,3) inside the red blob.
        useEditorStore.getState().setSelectionOperations([
            { mode: 'add', type: 'rect', path: [{ x: 3, y: 3 }, { x: 4, y: 4 }] },
        ]);
        useEditorStore.getState().setHasSelection(true);

        useEditorStore.getState().growSelection(32);
        const after = useEditorStore.getState();
        const mask = rasterizeSelectionOperations(after.selection.operations, after.width, after.height);
        // The 4x4 red blob (16 pixels) should now all be selected.
        let blobSelected = 0;
        for (let y = 2; y < 6; y++) {
            for (let x = 2; x < 6; x++) {
                if (mask[y * after.width + x] >= 128) blobSelected++;
            }
        }
        expect(blobSelected).toBe(16);
        // The disconnected red pixel at (10,10) is NOT included by Grow.
        expect(mask[10 * after.width + 10]).toBeLessThan(128);
    });

    it('is undoable', () => {
        const layer = activeLayer();
        layer.ctx.fillStyle = '#ff0000';
        layer.ctx.fillRect(2, 2, 4, 4);
        layer.markDirty(null);
        useEditorStore.getState().setSelectionOperations([
            { mode: 'add', type: 'rect', path: [{ x: 3, y: 3 }, { x: 4, y: 4 }] },
        ]);
        useEditorStore.getState().setHasSelection(true);
        const before = selectedCount();
        useEditorStore.getState().growSelection(32);
        const grown = selectedCount();
        expect(grown).toBeGreaterThan(before);
        useEditorStore.getState().undo();
        expect(selectedCount()).toBe(before);
    });
});

describe('Similar', () => {
    beforeEach(() => reset(12, 12));

    it('selects every red pixel in the canvas regardless of contiguity', () => {
        const layer = activeLayer();
        layer.ctx.clearRect(0, 0, 12, 12);
        layer.ctx.fillStyle = '#ff0000';
        layer.ctx.fillRect(2, 2, 2, 2);
        layer.ctx.fillStyle = '#ff0000';
        layer.ctx.fillRect(9, 9, 2, 2);
        layer.markDirty(null);

        useEditorStore.getState().setSelectionOperations([
            { mode: 'add', type: 'rect', path: [{ x: 2, y: 2 }, { x: 3, y: 3 }] },
        ]);
        useEditorStore.getState().setHasSelection(true);

        useEditorStore.getState().similarSelection(32);
        const after = useEditorStore.getState();
        const mask = rasterizeSelectionOperations(after.selection.operations, after.width, after.height);
        // Both blobs should be selected by Similar.
        expect(mask[2 * after.width + 2]).toBeGreaterThanOrEqual(128);
        expect(mask[9 * after.width + 9]).toBeGreaterThanOrEqual(128);
        expect(mask[10 * after.width + 10]).toBeGreaterThanOrEqual(128);
    });

    it('is undoable', () => {
        const layer = activeLayer();
        layer.ctx.fillStyle = '#ff0000';
        layer.ctx.fillRect(2, 2, 2, 2);
        layer.ctx.fillStyle = '#ff0000';
        layer.ctx.fillRect(9, 9, 2, 2);
        layer.markDirty(null);
        useEditorStore.getState().setSelectionOperations([
            { mode: 'add', type: 'rect', path: [{ x: 2, y: 2 }, { x: 3, y: 3 }] },
        ]);
        useEditorStore.getState().setHasSelection(true);
        const before = selectedCount();
        useEditorStore.getState().similarSelection(32);
        const after = selectedCount();
        expect(after).toBeGreaterThan(before);
        useEditorStore.getState().undo();
        expect(selectedCount()).toBe(before);
    });
});

describe('Defringe', () => {
    beforeEach(() => reset(12, 12));

    it('rewrites the edge halo RGB toward the nearest opaque interior color, preserving alpha', () => {
        const layer = activeLayer();
        // Paint an opaque red interior at (4..8, 4..8) and a 2-pixel white halo
        // at half-alpha around it.
        const img = layer.ctx.createImageData(12, 12);
        const set = (x: number, y: number, r: number, g: number, b: number, a: number) => {
            const i = (y * 12 + x) * 4;
            img.data[i] = r; img.data[i + 1] = g; img.data[i + 2] = b; img.data[i + 3] = a;
        };
        for (let y = 0; y < 12; y++) {
            for (let x = 0; x < 12; x++) {
                if (x >= 4 && x < 8 && y >= 4 && y < 8) set(x, y, 255, 0, 0, 255);
                else if (x >= 2 && x < 10 && y >= 2 && y < 10) set(x, y, 255, 255, 255, 128);
                else set(x, y, 0, 0, 0, 0);
            }
        }
        layer.ctx.putImageData(img, 0, 0);
        layer.markDirty(null);

        useEditorStore.getState().defringeLayer(2);

        // A halo pixel just outside the interior, e.g. (3,5), should now be red-ish,
        // not white.
        const halo = layerPixelAt(layer, 3, 5);
        expect(halo.r).toBeGreaterThan(200);
        expect(halo.g).toBeLessThan(60);
        expect(halo.b).toBeLessThan(60);
        // Alpha is preserved.
        expect(halo.a).toBe(128);
    });

    it('is undoable', () => {
        const layer = activeLayer();
        const img = layer.ctx.createImageData(12, 12);
        for (let y = 0; y < 12; y++) {
            for (let x = 0; x < 12; x++) {
                const i = (y * 12 + x) * 4;
                if (x >= 4 && x < 8 && y >= 4 && y < 8) {
                    img.data[i] = 255; img.data[i + 1] = 0; img.data[i + 2] = 0; img.data[i + 3] = 255;
                } else if (x >= 2 && x < 10 && y >= 2 && y < 10) {
                    img.data[i] = 255; img.data[i + 1] = 255; img.data[i + 2] = 255; img.data[i + 3] = 128;
                }
            }
        }
        layer.ctx.putImageData(img, 0, 0);
        layer.markDirty(null);

        const beforePixel = layerPixelAt(layer, 3, 5);
        useEditorStore.getState().defringeLayer(2);
        useEditorStore.getState().undo();
        const restored = layerPixelAt(layer, 3, 5);
        expect(restored.r).toBe(beforePixel.r);
        expect(restored.g).toBe(beforePixel.g);
        expect(restored.b).toBe(beforePixel.b);
        expect(restored.a).toBe(beforePixel.a);
    });
});

describe('Remove White Matte', () => {
    beforeEach(() => reset(8, 8));

    it('recovers the pure foreground color from a half-alpha white edge', () => {
        const layer = activeLayer();
        const img = layer.ctx.createImageData(8, 8);
        // The edge pixel at (3,3): pure-red foreground at 50% alpha,
        // composited against white => observed = round(255 * 0.5 + 255 * 0.5),
        //  observed.g = round(0 * 0.5 + 255 * 0.5), observed.b = same.
        const a = 128;
        const inv = (255 - a) / 255;
        const observedR = Math.round(255 * (a / 255) + 255 * inv);
        const observedG = Math.round(0 * (a / 255) + 255 * inv);
        const observedB = Math.round(0 * (a / 255) + 255 * inv);
        for (let i = 0; i < img.data.length; i += 4) {
            img.data[i] = observedR;
            img.data[i + 1] = observedG;
            img.data[i + 2] = observedB;
            img.data[i + 3] = a;
        }
        layer.ctx.putImageData(img, 0, 0);
        layer.markDirty(null);

        useEditorStore.getState().removeWhiteMatte();
        const px = layerPixelAt(layer, 3, 3);
        expect(px.r).toBeGreaterThan(240);
        expect(px.g).toBeLessThan(15);
        expect(px.b).toBeLessThan(15);
        expect(px.a).toBe(128);
    });

    it('is undoable', () => {
        const layer = activeLayer();
        const img = layer.ctx.createImageData(8, 8);
        // Fully opaque source so canvas premultiplied storage doesn't perturb
        // values during the undo round-trip.
        for (let i = 0; i < img.data.length; i += 4) {
            img.data[i] = 255; img.data[i + 1] = 128; img.data[i + 2] = 128; img.data[i + 3] = 255;
        }
        layer.ctx.putImageData(img, 0, 0);
        layer.markDirty(null);
        const before = layerPixelAt(layer, 3, 3);
        useEditorStore.getState().removeWhiteMatte();
        useEditorStore.getState().undo();
        const after = layerPixelAt(layer, 3, 3);
        expect(after.r).toBe(before.r);
        expect(after.g).toBe(before.g);
        expect(after.b).toBe(before.b);
        expect(after.a).toBe(before.a);
    });
});

describe('Remove Black Matte', () => {
    beforeEach(() => reset(8, 8));

    it('recovers the pure foreground color from a half-alpha black edge', () => {
        const layer = activeLayer();
        const img = layer.ctx.createImageData(8, 8);
        // Foreground = pure red, alpha = 128 (50%), matte = black (0,0,0).
        // observed = round(F * (a/255) + 0 * inv) = round(255 * 0.5) = 128.
        const a = 128;
        const observedR = Math.round(255 * (a / 255));
        const observedG = 0;
        const observedB = 0;
        for (let i = 0; i < img.data.length; i += 4) {
            img.data[i] = observedR;
            img.data[i + 1] = observedG;
            img.data[i + 2] = observedB;
            img.data[i + 3] = a;
        }
        layer.ctx.putImageData(img, 0, 0);
        layer.markDirty(null);

        useEditorStore.getState().removeBlackMatte();
        const px = layerPixelAt(layer, 3, 3);
        expect(px.r).toBeGreaterThan(240);
        expect(px.g).toBeLessThan(15);
        expect(px.b).toBeLessThan(15);
        expect(px.a).toBe(128);
    });

    it('is undoable', () => {
        const layer = activeLayer();
        const img = layer.ctx.createImageData(8, 8);
        // Fully opaque source so canvas premultiplied storage doesn't perturb
        // values during the undo round-trip.
        for (let i = 0; i < img.data.length; i += 4) {
            img.data[i] = 128; img.data[i + 1] = 0; img.data[i + 2] = 0; img.data[i + 3] = 255;
        }
        layer.ctx.putImageData(img, 0, 0);
        layer.markDirty(null);
        const before = layerPixelAt(layer, 3, 3);
        useEditorStore.getState().removeBlackMatte();
        useEditorStore.getState().undo();
        const after = layerPixelAt(layer, 3, 3);
        expect(after.r).toBe(before.r);
        expect(after.g).toBe(before.g);
        expect(after.b).toBe(before.b);
        expect(after.a).toBe(before.a);
    });
});

describe('Smart Radius', () => {
    beforeEach(() => reset(40, 40));

    it('suppresses the radius blur along a high-gradient edge in the underlying layer', () => {
        const layer = activeLayer();
        // Paint a hard left/right luminance edge at x=20: left half black,
        // right half white.
        const img = layer.ctx.createImageData(40, 40);
        for (let y = 0; y < 40; y++) {
            for (let x = 0; x < 40; x++) {
                const i = (y * 40 + x) * 4;
                const v = x < 20 ? 0 : 255;
                img.data[i] = v; img.data[i + 1] = v; img.data[i + 2] = v; img.data[i + 3] = 255;
            }
        }
        layer.ctx.putImageData(img, 0, 0);
        layer.markDirty(null);

        // Selection: a rect that ends exactly at x=20 (the high-gradient seam).
        useEditorStore.getState().setSelectionOperations([
            { mode: 'add', type: 'rect', path: [{ x: 5, y: 10 }, { x: 20, y: 30 }] },
        ]);
        useEditorStore.getState().setHasSelection(true);

        // Smart radius OFF: radius produces a wide partial-alpha band along
        // the right edge at x=20.
        useEditorStore.getState().refineEdge({ radius: 6, smooth: 0, feather: 0, contrast: 0, shiftEdge: 0, smartRadius: false });
        const dumb = useEditorStore.getState().selection.operations[0].mask!.data;

        // Reset and re-apply with smart radius ON.
        useEditorStore.getState().setSelectionOperations([
            { mode: 'add', type: 'rect', path: [{ x: 5, y: 10 }, { x: 20, y: 30 }] },
        ]);
        useEditorStore.getState().setHasSelection(true);
        useEditorStore.getState().refineEdge({ radius: 6, smooth: 0, feather: 0, contrast: 0, shiftEdge: 0, smartRadius: true });
        const smart = useEditorStore.getState().selection.operations[0].mask!.data;

        // Smart radius preserves the sharp seam at x=20. Measure the sharpness
        // of the right edge of the mask: sum of mid-range partial alphas in
        // the band [x=15..24]. A sharper edge has fewer mid-range partial pixels.
        let dumbSoftness = 0;
        let smartSoftness = 0;
        for (let y = 14; y < 26; y++) {
            for (let x = 15; x < 25; x++) {
                const idx = y * 40 + x;
                // Distance from binary (0 or 255): peaks at 127 for fully partial.
                const dDumb = Math.min(dumb[idx], 255 - dumb[idx]);
                const dSmart = Math.min(smart[idx], 255 - smart[idx]);
                dumbSoftness += dDumb;
                smartSoftness += dSmart;
            }
        }
        expect(smartSoftness).toBeLessThan(dumbSoftness);
    });
});
