import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import App from '../App';
import { Layer } from '../core/Layer';
import { useEditorStore } from '../store/editorStore';
import { ensureStubsRegistered } from '../tools/stubs';

ensureStubsRegistered();

function checksum(layer: Layer): number {
    const data = layer.ctx.getImageData(0, 0, layer.canvas.width, layer.canvas.height).data;
    let sum = 0;
    for (let i = 0; i < data.length; i++) sum = (sum + data[i] * (i + 1)) % 1000000007;
    return sum;
}

function reset() {
    localStorage.clear();
    useEditorStore.getState().clearHistory();
    const layer = new Layer(24, 24, 'Warp me');
    layer.ctx.fillStyle = '#ff0000';
    layer.ctx.fillRect(4, 4, 8, 16);
    layer.ctx.fillStyle = '#0000ff';
    layer.ctx.fillRect(12, 4, 8, 16);
    layer.markDirty(null);
    useEditorStore.setState((s) => ({
        ...s,
        width: 24,
        height: 24,
        layers: [layer],
        activeLayerId: layer.id,
        selectedLayerIds: [layer.id],
        layerSelectionAnchorId: layer.id,
        activeTool: 'move',
        zoom: 1,
        pan: { x: 0, y: 0 },
    }));
    useEditorStore.getState().clearHistory();
    return layer;
}

describe('19b warp', () => {
    beforeEach(reset);
    afterEach(cleanup);

    it('opens Warp from the shortcut, supports grid presets and split lines', () => {
        render(<App />);

        fireEvent.keyDown(window, { key: 't', metaKey: true, shiftKey: true });
        expect(screen.getByTestId('warp-overlay')).toBeTruthy();
        expect(document.querySelectorAll('[data-warp-point="true"]')).toHaveLength(4);

        fireEvent.change(screen.getByTestId('warp-grid'), { target: { value: '3x3' } });
        expect(document.querySelectorAll('[data-warp-point="true"]')).toHaveLength(16);

        fireEvent.click(screen.getByTestId('warp-split-cross'));
        fireEvent.mouseDown(screen.getByTestId('warp-stage'), { clientX: 12, clientY: 12 });
        expect(document.querySelectorAll('[data-warp-point="true"]')).toHaveLength(25);

        fireEvent.change(screen.getByTestId('warp-grid'), { target: { value: 'custom' } });
        expect(document.querySelectorAll('[data-warp-point="true"]')).toHaveLength(49);
    });

    it('commits a content-bounds warp as undoable history', () => {
        const layer = useEditorStore.getState().layers[0];
        const before = checksum(layer);
        render(<App />);

        fireEvent.keyDown(window, { key: 't', metaKey: true, shiftKey: true });
        const point = screen.getByTestId('warp-point-3');
        fireEvent.mouseDown(point, { clientX: 20, clientY: 20 });
        fireEvent.mouseMove(window, { clientX: 8, clientY: 8, buttons: 1 });
        fireEvent.mouseUp(window, { clientX: 8, clientY: 8 });

        const afterPreview = checksum(layer);
        expect(afterPreview).not.toBe(before);

        fireEvent.click(screen.getByTestId('warp-commit'));
        expect(useEditorStore.getState().canUndo).toBe(true);

        useEditorStore.getState().undo();
        expect(checksum(layer)).toBe(before);

        useEditorStore.getState().redo();
        expect(checksum(layer)).toBe(afterPreview);
    });

    it('cancels back to the snapshot and refuses locked layers', () => {
        const layer = useEditorStore.getState().layers[0];
        const before = checksum(layer);
        render(<App />);

        fireEvent.keyDown(window, { key: 't', metaKey: true, shiftKey: true });
        fireEvent.mouseDown(screen.getByTestId('warp-point-3'), { clientX: 20, clientY: 20 });
        fireEvent.mouseMove(window, { clientX: 8, clientY: 8, buttons: 1 });
        fireEvent.mouseUp(window, { clientX: 8, clientY: 8 });
        expect(checksum(layer)).not.toBe(before);

        fireEvent.click(screen.getByTestId('warp-cancel'));
        expect(checksum(layer)).toBe(before);

        layer.locks.all = true;
        fireEvent.keyDown(window, { key: 't', metaKey: true, shiftKey: true });
        expect(screen.queryByTestId('warp-overlay')).toBeNull();
    });

    it('switches from Free Transform to Warp from the options bar', () => {
        render(<App />);

        fireEvent.keyDown(window, { key: 't', metaKey: true });
        expect(screen.getByTestId('free-transform-overlay')).toBeTruthy();

        fireEvent.click(screen.getByTestId('free-transform-warp'));
        expect(screen.queryByTestId('free-transform-overlay')).toBeNull();
        expect(screen.getByTestId('warp-overlay')).toBeTruthy();
    });
});
