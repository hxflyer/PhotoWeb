import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import App from '../App';
import { Layer } from '../core/Layer';
import { useEditorStore } from '../store/editorStore';
import { ensureStubsRegistered } from '../tools/stubs';
import { pixelAt } from './simulator';

ensureStubsRegistered();

function reset() {
    localStorage.clear();
    useEditorStore.getState().clearHistory();
    const layer = new Layer(40, 40, 'Transform me');
    layer.ctx.fillStyle = '#ff0000';
    layer.ctx.fillRect(0, 0, 10, 10);
    layer.markDirty(null);
    useEditorStore.setState((s) => ({
        ...s,
        width: 40,
        height: 40,
        layers: [layer],
        activeLayerId: layer.id,
        selectedLayerIds: [layer.id],
        layerSelectionAnchorId: layer.id,
        activeTool: 'move',
    }));
    useEditorStore.getState().clearHistory();
    return layer;
}

describe('19a free transform', () => {
    beforeEach(reset);
    afterEach(cleanup);

    it('committing a raster Free Transform records undo/redo history', () => {
        const layer = useEditorStore.getState().layers[0];
        render(<App />);

        fireEvent.keyDown(window, { key: 't', metaKey: true });
        const overlay = screen.getByTestId('free-transform-overlay');
        expect(overlay).toBeTruthy();

        const inputs = overlay.querySelectorAll('input[type="number"]');
        fireEvent.change(inputs[0], { target: { value: '10' } });
        fireEvent.click(screen.getByTitle('Commit transform'));

        expect(pixelAt(layer.canvas, 0, 0).r).toBeLessThan(20);
        expect(pixelAt(layer.canvas, 10, 0).r).toBeGreaterThan(200);
        expect(useEditorStore.getState().canUndo).toBe(true);

        useEditorStore.getState().undo();
        expect(pixelAt(layer.canvas, 0, 0).r).toBeGreaterThan(200);
        expect(pixelAt(layer.canvas, 10, 0).r).toBeLessThan(20);

        useEditorStore.getState().redo();
        expect(pixelAt(layer.canvas, 10, 0).r).toBeGreaterThan(200);
    });

    it('does not start Free Transform for a locked layer', () => {
        const layer = useEditorStore.getState().layers[0];
        layer.locks.all = true;
        render(<App />);

        fireEvent.keyDown(window, { key: 't', metaKey: true });

        expect(screen.queryByTestId('free-transform-overlay')).toBeNull();
    });
});
