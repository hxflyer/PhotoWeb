import { describe, it, expect, beforeEach } from 'vitest';
import { useEditorStore } from '../store/editorStore';
import { layerPixelAt } from './simulator';

function reset() {
    useEditorStore.setState((s) => ({
        ...s,
        layers: [],
        activeLayerId: null,
    }));
}

describe('layers slice', () => {
    beforeEach(reset);

    it('add a layer', () => {
        useEditorStore.getState().addLayer();
        const { layers, activeLayerId } = useEditorStore.getState();
        expect(layers.length).toBe(1);
        expect(activeLayerId).toBe(layers[0].id);
    });

    it('add three layers, then delete the middle one', () => {
        useEditorStore.getState().addLayer();
        useEditorStore.getState().addLayer();
        useEditorStore.getState().addLayer();
        const { layers } = useEditorStore.getState();
        const middleId = layers[1].id;
        useEditorStore.getState().removeLayer(middleId);
        const after = useEditorStore.getState().layers;
        expect(after.length).toBe(2);
        expect(after.find(l => l.id === middleId)).toBeUndefined();
    });

    it('reorder layers (move bottom to top)', () => {
        useEditorStore.getState().addLayer();
        useEditorStore.getState().addLayer();
        useEditorStore.getState().addLayer();
        const layersBefore = useEditorStore.getState().layers;
        const bottomId = layersBefore[0].id;
        useEditorStore.getState().reorderLayers(0, 2);
        const layersAfter = useEditorStore.getState().layers;
        expect(layersAfter[2].id).toBe(bottomId);
    });

    it('toggle visibility', () => {
        useEditorStore.getState().addLayer();
        const id = useEditorStore.getState().layers[0].id;
        expect(useEditorStore.getState().layers[0].visible).toBe(true);
        useEditorStore.getState().toggleLayerVisibility(id);
        expect(useEditorStore.getState().layers[0].visible).toBe(false);
    });

    it('alt-solo: shows only the targeted layer', () => {
        useEditorStore.getState().addLayer();
        useEditorStore.getState().addLayer();
        useEditorStore.getState().addLayer();
        const ids = useEditorStore.getState().layers.map(l => l.id);
        useEditorStore.getState().soloLayer(ids[1]);
        const after = useEditorStore.getState().layers;
        expect(after.find(l => l.id === ids[0])!.visible).toBe(false);
        expect(after.find(l => l.id === ids[1])!.visible).toBe(true);
        expect(after.find(l => l.id === ids[2])!.visible).toBe(false);
    });

    it('rename a layer', () => {
        useEditorStore.getState().addLayer();
        const id = useEditorStore.getState().layers[0].id;
        useEditorStore.getState().renameLayer(id, 'Hero');
        expect(useEditorStore.getState().layers[0].name).toBe('Hero');
    });

    it('layer via copy duplicates pixels', () => {
        useEditorStore.getState().addLayer();
        const layer = useEditorStore.getState().layers[0];
        const ctx = layer.canvas.getContext('2d')!;
        ctx.fillStyle = '#00ff00';
        ctx.fillRect(0, 0, 50, 50);
        useEditorStore.getState().setActiveLayer(layer.id);
        useEditorStore.getState().layerViaCopy();
        const after = useEditorStore.getState().layers;
        expect(after.length).toBe(2);
        const px = layerPixelAt(after[1], 10, 10);
        expect(px.g).toBe(255);
    });

    it('merge down composites top into bottom', () => {
        useEditorStore.getState().addLayer();
        useEditorStore.getState().addLayer();
        const [bottom, top] = useEditorStore.getState().layers;
        const bctx = bottom.canvas.getContext('2d')!;
        bctx.fillStyle = '#ff0000';
        bctx.fillRect(0, 0, 100, 100);
        const tctx = top.canvas.getContext('2d')!;
        tctx.fillStyle = '#0000ff';
        tctx.fillRect(50, 50, 50, 50);
        useEditorStore.getState().mergeLayerDown(top.id);
        const merged = useEditorStore.getState().layers[0];
        expect(useEditorStore.getState().layers.length).toBe(1);
        const pxRed = layerPixelAt(merged, 10, 10);
        const pxBlue = layerPixelAt(merged, 70, 70);
        expect(pxRed.r).toBe(255);
        expect(pxBlue.b).toBe(255);
    });
});
