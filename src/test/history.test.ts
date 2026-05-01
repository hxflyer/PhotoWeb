import { describe, it, expect, beforeEach } from 'vitest';
import { useEditorStore } from '../store/editorStore';
import { commitPixelAction, captureLayerRegion, globalHistory } from '../core/history';
import { layerPixelAt } from './simulator';

function reset() {
    globalHistory.clear();
    useEditorStore.setState((s) => ({
        ...s,
        layers: [],
        activeLayerId: null,
        historyTick: 0,
        historyEntries: [],
        canUndo: false,
        canRedo: false,
    }));
    useEditorStore.getState().addLayer();
}

describe('history command pattern', () => {
    beforeEach(reset);

    it('commit + undo restores prior pixel state', () => {
        const layer = useEditorStore.getState().layers[0];
        const lctx = layer.canvas.getContext('2d')!;
        lctx.fillStyle = '#ffffff';
        lctx.fillRect(0, 0, 100, 100);
        const rect = { x: 0, y: 0, width: 100, height: 100 };
        const before = captureLayerRegion(layer, rect);
        lctx.fillStyle = '#ff0000';
        lctx.fillRect(20, 20, 30, 30);
        commitPixelAction(layer, rect, before, 'fill rect');

        expect(layerPixelAt(layer, 30, 30).r).toBe(255);
        useEditorStore.getState().undo();
        expect(layerPixelAt(layer, 30, 30).r).toBe(255);
        // After undo, the white background is back at the dirty rect
        expect(layerPixelAt(layer, 30, 30).g).toBe(255);
        expect(layerPixelAt(layer, 30, 30).b).toBe(255);
    });

    it('redo replays after undo', () => {
        const layer = useEditorStore.getState().layers[0];
        const lctx = layer.canvas.getContext('2d')!;
        lctx.fillStyle = '#ffffff';
        lctx.fillRect(0, 0, 100, 100);
        const rect = { x: 0, y: 0, width: 100, height: 100 };
        const before = captureLayerRegion(layer, rect);
        lctx.fillStyle = '#00ff00';
        lctx.fillRect(0, 0, 50, 50);
        commitPixelAction(layer, rect, before, 'green');

        useEditorStore.getState().undo();
        expect(layerPixelAt(layer, 10, 10).g).toBe(255);
        // ImageData put back: now expect white
        expect(layerPixelAt(layer, 10, 10).r).toBe(255);

        useEditorStore.getState().redo();
        // After redo: green again
        expect(layerPixelAt(layer, 10, 10).g).toBe(255);
        expect(layerPixelAt(layer, 10, 10).r).toBe(0);
    });

    it('canUndo / canRedo reflect stack state', () => {
        expect(useEditorStore.getState().canUndo).toBe(false);
        const layer = useEditorStore.getState().layers[0];
        const rect = { x: 0, y: 0, width: 50, height: 50 };
        const before = captureLayerRegion(layer, rect);
        layer.ctx.fillStyle = '#0000ff';
        layer.ctx.fillRect(0, 0, 50, 50);
        commitPixelAction(layer, rect, before, 'blue');
        // Tick the store to refresh canUndo
        useEditorStore.setState((s) => ({ ...s, historyTick: s.historyTick + 1, canUndo: globalHistory.canUndo(), canRedo: globalHistory.canRedo() }));
        expect(useEditorStore.getState().canUndo).toBe(true);
    });
});
