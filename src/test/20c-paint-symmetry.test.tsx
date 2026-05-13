import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import App from '../App';
import { Layer } from '../core/Layer';
import { getTool } from '../tools/registry';
import { setBrushOptions } from '../tools/brush';
import { ensureStubsRegistered } from '../tools/stubs';
import { useEditorStore } from '../store/editorStore';
import { makeToolPointerEvent, pixelAt } from './simulator';

ensureStubsRegistered();

function setCanvasRect(canvas: HTMLCanvasElement, width = 20, height = 20) {
    canvas.getBoundingClientRect = () => ({
        x: 0,
        y: 0,
        left: 0,
        top: 0,
        right: width,
        bottom: height,
        width,
        height,
        toJSON: () => ({}),
    });
}

function reset() {
    localStorage.clear();
    useEditorStore.getState().clearHistory();
    setBrushOptions({ mode: 'source-over', smoothing: 0, spacing: 0.15, pressureSize: true, pressureOpacity: false });
    const layer = new Layer(20, 20, 'Symmetry target');
    useEditorStore.setState((s) => ({
        ...s,
        width: 20,
        height: 20,
        zoom: 1,
        pan: { x: 0, y: 0 },
        layers: [layer],
        activeLayerId: layer.id,
        selectedLayerIds: [layer.id],
        layerSelectionAnchorId: layer.id,
        activeTool: 'brush',
        primaryColor: '#00ff00',
        brushSettings: { size: 3, hardness: 1, opacity: 1, flow: 1 },
        paintSymmetry: { mode: 'none', lastMode: null, visible: true, pending: false, segments: 5 },
        selection: { ...s.selection, hasSelection: false, path: [], operations: [], polyPoints: [], isDraggingSelection: false },
    }));
    useEditorStore.getState().clearHistory();
    return layer;
}

function toolCtx() {
    return {
        store: useEditorStore.getState(),
        getStore: () => useEditorStore.getState(),
        requestRender: () => {},
    };
}

describe('20c paint symmetry', () => {
    beforeEach(reset);
    afterEach(cleanup);

    it('Options Bar symmetry menu creates a pending path, Enter commits it, and Brush mirrors strokes', () => {
        const layer = useEditorStore.getState().layers[0];
        const { container } = render(<App />);

        fireEvent.change(screen.getByTestId('paint-symmetry-menu'), { target: { value: 'vertical' } });
        expect(useEditorStore.getState().paintSymmetry.pending).toBe(true);
        expect(screen.getByTestId('paint-symmetry-path').dataset.pending).toBe('true');

        fireEvent.keyDown(window, { key: 'Enter' });
        expect(useEditorStore.getState().paintSymmetry.pending).toBe(false);
        expect(screen.getByTestId('paint-symmetry-path').dataset.pending).toBe('false');

        const workarea = screen.getByTestId('viewport-workarea');
        const canvas = container.querySelector('canvas') as HTMLCanvasElement;
        setCanvasRect(canvas);
        fireEvent.mouseDown(workarea, { clientX: 5, clientY: 10, button: 0, buttons: 1 });
        fireEvent.mouseUp(workarea, { clientX: 5, clientY: 10, button: 0, buttons: 0 });

        expect(pixelAt(layer.canvas, 5, 10).a).toBe(255);
        expect(pixelAt(layer.canvas, 15, 10).a).toBe(255);
        expect(useEditorStore.getState().canUndo).toBe(true);
    });

    it('Hide Symmetry and Show Symmetry toggle only the path visibility', () => {
        render(<App />);
        fireEvent.change(screen.getByTestId('paint-symmetry-menu'), { target: { value: 'dual-axis' } });
        expect(screen.getByTestId('paint-symmetry-path')).toBeTruthy();

        fireEvent.click(screen.getByTestId('paint-symmetry-visibility'));
        expect(screen.queryByTestId('paint-symmetry-path')).toBeNull();
        expect(useEditorStore.getState().paintSymmetry.mode).toBe('dual-axis');

        fireEvent.click(screen.getByTestId('paint-symmetry-visibility'));
        expect(screen.getByTestId('paint-symmetry-path')).toBeTruthy();
    });

    it('Pencil Tool mirrors through the active symmetry path', () => {
        const layer = useEditorStore.getState().layers[0];
        useEditorStore.setState(s => ({
            ...s,
            activeTool: 'pencil',
            paintSymmetry: { mode: 'vertical', lastMode: 'vertical', visible: true, pending: false, segments: 5 },
            brushSettings: { size: 3, hardness: 1, opacity: 1, flow: 1 },
            primaryColor: '#ff0000',
        }));

        const pencil = getTool('pencil')!;
        pencil.onPointerDown!(makeToolPointerEvent({ canvasX: 5, canvasY: 10, button: 0 }), toolCtx());
        pencil.onPointerUp!(makeToolPointerEvent({ canvasX: 5, canvasY: 10, button: 0 }), toolCtx());

        expect(pixelAt(layer.canvas, 5, 10).a).toBe(255);
        expect(pixelAt(layer.canvas, 15, 10).a).toBe(255);
        expect(useEditorStore.getState().canUndo).toBe(true);
    });
});
