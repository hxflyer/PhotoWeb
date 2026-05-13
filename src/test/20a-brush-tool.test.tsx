import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import App from '../App';
import { Viewport } from '../components/Canvas/Viewport';
import { Layer } from '../core/Layer';
import { getBrushOptions, setBrushOptions } from '../tools/brush';
import { ensureStubsRegistered } from '../tools/stubs';
import { useEditorStore } from '../store/editorStore';
import { pixelAt } from './simulator';

ensureStubsRegistered();

function setCanvasRect(canvas: HTMLCanvasElement, width = 40, height = 40) {
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
    const layer = new Layer(40, 40, 'Brush target');
    useEditorStore.setState((s) => ({
        ...s,
        width: 40,
        height: 40,
        zoom: 1,
        pan: { x: 0, y: 0 },
        layers: [layer],
        activeLayerId: layer.id,
        selectedLayerIds: [layer.id],
        layerSelectionAnchorId: layer.id,
        activeTool: 'brush',
        primaryColor: '#00ff00',
        secondaryColor: '#0000ff',
        brushSettings: { size: 10, hardness: 1, opacity: 1, flow: 1 },
        selection: { ...s.selection, hasSelection: false, path: [], operations: [], polyPoints: [], isDraggingSelection: false },
    }));
    useEditorStore.getState().clearHistory();
    return layer;
}

describe('20a brush tool basics', () => {
    beforeEach(reset);
    afterEach(cleanup);

    it('bracket shortcuts resize the brush and Shift brackets adjust hardness', () => {
        render(<App />);
        const store = useEditorStore.getState();
        store.setBrushSize(20);
        store.setBrushHardness(0.5);

        fireEvent.keyDown(window, { key: ']' });
        expect(useEditorStore.getState().brushSettings.size).toBe(25);
        fireEvent.keyDown(window, { key: '[' });
        expect(useEditorStore.getState().brushSettings.size).toBe(20);
        fireEvent.keyDown(window, { key: ']', shiftKey: true });
        expect(useEditorStore.getState().brushSettings.hardness).toBeCloseTo(0.6);
        fireEvent.keyDown(window, { key: '[', shiftKey: true });
        expect(useEditorStore.getState().brushSettings.hardness).toBeCloseTo(0.5);
    });

    it('Brush Options Bar mode is wired, including Clear and its shortcuts', () => {
        render(<App />);

        fireEvent.change(screen.getByTestId('brush-mode'), { target: { value: 'multiply' } });
        expect(getBrushOptions().mode).toBe('multiply');

        fireEvent.keyDown(window, { key: 'r', shiftKey: true, altKey: true });
        expect(getBrushOptions().mode).toBe('clear');

        fireEvent.keyDown(window, { key: 'n', shiftKey: true, altKey: true });
        expect(getBrushOptions().mode).toBe('source-over');
    });

    it('shows a brush-tip cursor and Caps Lock switches to precise cursor', () => {
        const { container } = render(<Viewport />);
        const workarea = screen.getByTestId('viewport-workarea');
        const canvas = container.querySelector('canvas') as HTMLCanvasElement;
        setCanvasRect(canvas);

        expect(workarea.style.cursor).toContain('data:image/svg+xml');

        fireEvent.keyDown(window, { key: 'CapsLock' });
        expect(workarea.style.cursor).toBe('crosshair');

        fireEvent.keyDown(window, { key: 'CapsLock' });
        expect(workarea.style.cursor).toContain('data:image/svg+xml');
    });

    it('temporary Alt eyedropper samples into foreground and restores Brush', () => {
        const layer = useEditorStore.getState().layers[0];
        layer.ctx.fillStyle = '#ff0000';
        layer.ctx.fillRect(10, 10, 1, 1);
        const { container } = render(<App />);
        const workarea = screen.getByTestId('viewport-workarea');
        const canvas = container.querySelector('canvas') as HTMLCanvasElement;
        setCanvasRect(canvas);

        fireEvent.keyDown(window, { key: 'Alt' });
        expect(useEditorStore.getState().activeTool).toBe('eyedropper');
        fireEvent.mouseDown(workarea, { clientX: 10, clientY: 10, button: 0, buttons: 1, altKey: true });

        expect(useEditorStore.getState().primaryColor).toBe('#ff0000');
        expect(useEditorStore.getState().secondaryColor).toBe('#0000ff');

        fireEvent.keyUp(window, { key: 'Alt' });
        expect(useEditorStore.getState().activeTool).toBe('brush');
    });

    it('Clear brush mode erases with the current brush and commits one undoable stroke', () => {
        const layer = useEditorStore.getState().layers[0];
        layer.ctx.fillStyle = '#ff0000';
        layer.ctx.fillRect(0, 0, 40, 40);
        layer.markDirty(null);
        setBrushOptions({ mode: 'clear' });
        const { container } = render(<Viewport />);
        const workarea = screen.getByTestId('viewport-workarea');
        const canvas = container.querySelector('canvas') as HTMLCanvasElement;
        setCanvasRect(canvas);

        fireEvent.mouseDown(workarea, { clientX: 20, clientY: 20, button: 0, buttons: 1 });
        fireEvent.mouseUp(workarea, { clientX: 20, clientY: 20, button: 0, buttons: 0 });

        expect(pixelAt(layer.canvas, 20, 20).a).toBeLessThan(255);
        expect(useEditorStore.getState().canUndo).toBe(true);

        useEditorStore.getState().undo();
        expect(pixelAt(layer.canvas, 20, 20).a).toBe(255);
    });

    it('right-clicking with Brush active opens a compact brush preset picker', () => {
        const { container } = render(<Viewport />);
        const workarea = screen.getByTestId('viewport-workarea');
        const canvas = container.querySelector('canvas') as HTMLCanvasElement;
        setCanvasRect(canvas);

        fireEvent.contextMenu(workarea, { clientX: 12, clientY: 12 });
        expect(screen.getByTestId('brush-preset-picker')).toBeTruthy();

        fireEvent.change(screen.getByTestId('brush-picker-size'), { target: { value: '24' } });
        expect(useEditorStore.getState().brushSettings.size).toBe(24);
    });
});
