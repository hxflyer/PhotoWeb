import { describe, it, expect, beforeEach } from 'vitest';
import { registerFilter, getFilter, listFilters } from '../filters/registry';
import { applyFilterToLayer } from '../filters/applyFilter';
import { buildSelectionMask, blendWithMask } from '../filters/selectionMask';
import { useEditorStore } from '../store/editorStore';
import { pixelAt } from './simulator';

function reset() {
    useEditorStore.setState((s) => ({ ...s, layers: [], activeLayerId: null }));
    useEditorStore.getState().addLayer();
}

describe('filter registry', () => {
    it('registers and retrieves a filter', () => {
        registerFilter({
            id: 'test-invert',
            label: 'Test Invert',
            defaultParams: {},
            apply: (_p, { image }) => {
                const out = new ImageData(new Uint8ClampedArray(image.data), image.width, image.height);
                for (let i = 0; i < out.data.length; i += 4) {
                    out.data[i]     = 255 - out.data[i];
                    out.data[i + 1] = 255 - out.data[i + 1];
                    out.data[i + 2] = 255 - out.data[i + 2];
                }
                return out;
            },
        });
        const f = getFilter('test-invert');
        expect(f).toBeDefined();
        expect(f!.label).toBe('Test Invert');
    });

    it('listFilters includes registered filter', () => {
        const ids = listFilters().map(f => f.id);
        expect(ids).toContain('test-invert');
    });
});

describe('applyFilterToLayer', () => {
    beforeEach(reset);

    it('applies a registered filter and modifies layer pixels', () => {
        const store = useEditorStore.getState();
        const layer = store.layers[0];

        // Fill layer with red
        layer.ctx.fillStyle = '#ff0000';
        layer.ctx.fillRect(0, 0, layer.canvas.width, layer.canvas.height);

        // Apply invert filter (red → cyan)
        const noSelection = useEditorStore.getState().selection;
        const applied = applyFilterToLayer(layer, 'test-invert', {}, noSelection);
        expect(applied).toBe(true);

        const px = pixelAt(layer.canvas, 10, 10);
        expect(px.r).toBe(0);
        expect(px.g).toBe(255);
        expect(px.b).toBe(255);
    });

    it('returns false for unknown filter id', () => {
        const store = useEditorStore.getState();
        const layer = store.layers[0];
        const noSelection = useEditorStore.getState().selection;
        expect(applyFilterToLayer(layer, 'nonexistent-filter', {}, noSelection)).toBe(false);
    });
});

describe('selectionMask', () => {
    it('buildSelectionMask returns null when no selection', () => {
        const sel = useEditorStore.getState().selection;
        const mask = buildSelectionMask(sel, 100, 100);
        expect(mask).toBeNull();
    });

    it('buildSelectionMask covers rect add op', () => {
        const sel = {
            hasSelection: true,
            mode: 'rect' as const,
            path: [],
            polyPoints: [],
            operations: [{ mode: 'add' as const, type: 'rect' as const, path: [{ x: 10, y: 10 }, { x: 40, y: 40 }] }],
            isDraggingSelection: false,
            feather: 0,
            isFreeEditMode: false,
        };
        const mask = buildSelectionMask(sel, 100, 100);
        expect(mask).not.toBeNull();
        // inside selection
        const inside = mask!.data[(20 * 100 + 20) * 4 + 3];
        expect(inside).toBeGreaterThan(0);
        // outside selection
        const outside = mask!.data[(5 * 100 + 5) * 4 + 3];
        expect(outside).toBe(0);
    });

    it('blendWithMask: null mask returns filtered unchanged', () => {
        const w = 4; const h = 4;
        const original = new ImageData(new Uint8ClampedArray(w * h * 4).fill(0), w, h);
        const filtered = new ImageData(new Uint8ClampedArray(w * h * 4).fill(200), w, h);
        const result = blendWithMask(original, filtered, null);
        expect(result.data[0]).toBe(200);
    });

    it('blendWithMask: mask=0 keeps original', () => {
        const w = 1; const h = 1;
        const original = new ImageData(new Uint8ClampedArray([255, 0, 0, 255]), w, h);
        const filtered = new ImageData(new Uint8ClampedArray([0, 0, 255, 255]), w, h);
        const maskData = new Uint8ClampedArray([0, 0, 0, 0]); // alpha=0 → unselected
        const mask = new ImageData(maskData, w, h);
        const result = blendWithMask(original, filtered, mask);
        expect(result.data[0]).toBe(255); // red kept
        expect(result.data[2]).toBe(0);
    });

    it('blendWithMask: mask=255 uses filtered', () => {
        const w = 1; const h = 1;
        const original = new ImageData(new Uint8ClampedArray([255, 0, 0, 255]), w, h);
        const filtered = new ImageData(new Uint8ClampedArray([0, 0, 255, 255]), w, h);
        const maskData = new Uint8ClampedArray([255, 255, 255, 255]); // alpha=255 → fully selected
        const mask = new ImageData(maskData, w, h);
        const result = blendWithMask(original, filtered, mask);
        expect(result.data[0]).toBe(0);   // blue channel from filtered
        expect(result.data[2]).toBe(255);
    });
});
