import { describe, it, expect, beforeEach } from 'vitest';
import { useEditorStore } from '../store/editorStore';
import { ensureStubsRegistered } from '../tools/stubs';
import { getPatternTile } from '../store/toolsSlice';
import { paintBucketTool, setPaintBucketOptions } from '../tools/paintBucket';
import { makeToolPointerEvent, layerPixelAt } from './simulator';

ensureStubsRegistered();

function reset() {
    useEditorStore.getState().clearHistory();
    useEditorStore.setState(s => ({
        ...s,
        layers: [],
        activeLayerId: null,
        width: 64,
        height: 64,
        patternPresets: [],
        activePatternId: null,
        selection: { ...s.selection, hasSelection: false, operations: [], path: [] },
    }));
    useEditorStore.getState().addLayer();
}

describe('GAP-01 Define Pattern + Paint Bucket pattern fill', () => {
    beforeEach(reset);

    it('definePattern stores a preset, caches tile, sets active id', () => {
        const tile = document.createElement('canvas');
        tile.width = 4; tile.height = 4;
        const cx = tile.getContext('2d')!;
        cx.fillStyle = '#00ff00';
        cx.fillRect(0, 0, 4, 4);
        const id = useEditorStore.getState().definePattern('Green 4x4', tile);
        expect(useEditorStore.getState().patternPresets).toHaveLength(1);
        expect(useEditorStore.getState().activePatternId).toBe(id);
        expect(getPatternTile(id)).toBeTruthy();
    });

    it('Paint Bucket with active pattern fills with pattern colors, not FG', () => {
        const tile = document.createElement('canvas');
        tile.width = 2; tile.height = 2;
        const cx = tile.getContext('2d')!;
        cx.fillStyle = '#00ff00';
        cx.fillRect(0, 0, 2, 2);
        useEditorStore.getState().definePattern('Green', tile);

        setPaintBucketOptions({ source: 'pattern', tolerance: 255, antiAlias: false, contiguous: false, opacity: 1, mode: 'normal' });
        useEditorStore.setState(s => ({ ...s, primaryColor: '#ff0000' }));

        const store = useEditorStore.getState();
        paintBucketTool.onPointerDown!(
            makeToolPointerEvent({ canvasX: 5, canvasY: 5 }),
            { store, getStore: () => useEditorStore.getState(), requestRender: () => {} },
        );

        const layer = useEditorStore.getState().layers[0];
        const px = layerPixelAt(layer, 5, 5);
        expect(px.r).toBe(0);
        expect(px.g).toBe(255);
        expect(px.b).toBe(0);
    });

    it('removePatternPreset clears the cache and unsets active id', () => {
        const tile = document.createElement('canvas');
        tile.width = 2; tile.height = 2;
        const id = useEditorStore.getState().definePattern('Tmp', tile);
        useEditorStore.getState().removePatternPreset(id);
        expect(useEditorStore.getState().patternPresets).toHaveLength(0);
        expect(useEditorStore.getState().activePatternId).toBeNull();
        expect(getPatternTile(id)).toBeNull();
    });
});
