import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, cleanup, fireEvent } from '@testing-library/react';
import { Layer } from '../core/Layer';
import { useEditorStore } from '../store/editorStore';
import { ensureStubsRegistered } from '../tools/stubs';
import { getTool } from '../tools/registry';
import type { ToolPointerEvent } from '../tools/Tool';
import App from '../App';
import { layerPixelAt } from './simulator';
import { clearBrushLastStampedPoint } from '../tools/brush';
import { clearPencilLastPoint } from '../tools/pencil';
import { clearEraserLastPoint } from '../tools/eraser';

function pointer(x: number, y: number, mods: Partial<ToolPointerEvent> = {}): ToolPointerEvent {
    return {
        canvasX: x,
        canvasY: y,
        clientX: x,
        clientY: y,
        button: 0,
        buttons: 1,
        shift: false,
        alt: false,
        meta: false,
        ctrl: false,
        pressure: 1,
        pointerType: 'mouse',
        rawEvent: new MouseEvent('mousedown') as PointerEvent,
        ...mods,
    };
}

function toolCtx() {
    return {
        store: useEditorStore.getState(),
        getStore: () => useEditorStore.getState(),
        requestRender: vi.fn(),
    };
}

describe('Slice C — paint family modifier parity', () => {
    beforeEach(() => {
        ensureStubsRegistered();
        useEditorStore.getState().clearHistory();
        useEditorStore.setState(s => ({
            ...s,
            width: 64,
            height: 64,
            layers: [],
            activeLayerId: null,
            primaryColor: '#000000',
            brushSettings: { ...s.brushSettings, size: 3, hardness: 1, opacity: 1, flow: 1 },
            selection: { ...s.selection, hasSelection: false, path: [], operations: [], polyPoints: [], isDraggingSelection: false },
            activeTool: 'brush',
        }));
        clearBrushLastStampedPoint();
        clearPencilLastPoint();
        clearEraserLastPoint();
    });

    afterEach(() => cleanup());

    it('brush Shift+click paints a straight line from the previous click', () => {
        const layer = new Layer(64, 64, 'L');
        useEditorStore.setState(s => ({ ...s, layers: [layer], activeLayerId: layer.id }));
        const brush = getTool('brush')!;
        const ctx = toolCtx();
        // First click at (10, 10).
        brush.onPointerDown!(pointer(10, 10), ctx);
        brush.onPointerUp!(pointer(10, 10), ctx);
        // Now Shift+click at (40, 10) — should paint a line through (25, 10).
        brush.onPointerDown!(pointer(40, 10, { shift: true }), ctx);
        brush.onPointerUp!(pointer(40, 10, { shift: true }), ctx);
        const midPixel = layerPixelAt(layer, 25, 10);
        expect(midPixel.a).toBeGreaterThan(0);
    });

    it('pencil Shift+click paints a straight line from the previous click', () => {
        const layer = new Layer(64, 64, 'L');
        useEditorStore.setState(s => ({ ...s, layers: [layer], activeLayerId: layer.id, activeTool: 'pencil' }));
        const pencil = getTool('pencil')!;
        const ctx = toolCtx();
        pencil.onPointerDown!(pointer(8, 8), ctx);
        pencil.onPointerUp!(pointer(8, 8), ctx);
        pencil.onPointerDown!(pointer(30, 8, { shift: true }), ctx);
        pencil.onPointerUp!(pointer(30, 8, { shift: true }), ctx);
        expect(layerPixelAt(layer, 20, 8).a).toBeGreaterThan(0);
    });

    it('eraser Shift+click erases along a straight line from the previous click', () => {
        const layer = new Layer(64, 64, 'L');
        layer.ctx.fillStyle = '#ff0000';
        layer.ctx.fillRect(0, 0, 64, 64);
        useEditorStore.setState(s => ({ ...s, layers: [layer], activeLayerId: layer.id, activeTool: 'eraser' }));
        const eraser = getTool('eraser')!;
        const ctx = toolCtx();
        eraser.onPointerDown!(pointer(5, 20), ctx);
        eraser.onPointerUp!(pointer(5, 20), ctx);
        eraser.onPointerDown!(pointer(50, 20, { shift: true }), ctx);
        eraser.onPointerUp!(pointer(50, 20, { shift: true }), ctx);
        // Pixel along the erased line should be transparent.
        expect(layerPixelAt(layer, 25, 20).a).toBeLessThan(255);
    });

    it('number key 5 sets brush opacity to 50% when a paint tool is active', () => {
        render(<App />);
        useEditorStore.getState().setTool('brush');
        fireEvent.keyDown(window, { key: '5' });
        expect(useEditorStore.getState().brushSettings.opacity).toBeCloseTo(0.5, 2);
    });

    it('number key 0 sets brush opacity to 100% when a paint tool is active', () => {
        render(<App />);
        useEditorStore.getState().setTool('brush');
        useEditorStore.getState().setBrushOpacity(0.5);
        fireEvent.keyDown(window, { key: '0' });
        expect(useEditorStore.getState().brushSettings.opacity).toBeCloseTo(1, 2);
    });

    it('Shift+number key sets brush flow instead of opacity', () => {
        render(<App />);
        useEditorStore.getState().setTool('brush');
        fireEvent.keyDown(window, { key: '3', shiftKey: true });
        expect(useEditorStore.getState().brushSettings.flow).toBeCloseTo(0.3, 2);
    });

    it('number keys do not change brush opacity when a non-paint tool is active', () => {
        render(<App />);
        useEditorStore.getState().setTool('move');
        useEditorStore.getState().setBrushOpacity(0.42);
        fireEvent.keyDown(window, { key: '5' });
        expect(useEditorStore.getState().brushSettings.opacity).toBeCloseTo(0.42, 2);
    });

    it('Alt held with a paint tool temporarily switches to eyedropper; release restores the paint tool', () => {
        render(<App />);
        useEditorStore.getState().setTool('brush');
        fireEvent.keyDown(window, { key: 'Alt' });
        expect(useEditorStore.getState().activeTool).toBe('eyedropper');
        fireEvent.keyUp(window, { key: 'Alt' });
        expect(useEditorStore.getState().activeTool).toBe('brush');
    });

    it('Alt held while a non-paint tool is active does NOT switch to eyedropper', () => {
        render(<App />);
        useEditorStore.getState().setTool('move');
        fireEvent.keyDown(window, { key: 'Alt' });
        expect(useEditorStore.getState().activeTool).toBe('move');
        fireEvent.keyUp(window, { key: 'Alt' });
    });
});
