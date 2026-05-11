import { describe, it, expect, beforeEach } from 'vitest';
import { useEditorStore } from '../store/editorStore';
import { ensureStubsRegistered } from '../tools/stubs';
import { brushTool } from '../tools/brush';
import { pencilTool } from '../tools/pencil';
import { eraserTool } from '../tools/eraser';
import { makeToolPointerEvent } from './simulator';

ensureStubsRegistered();

function reset() {
    useEditorStore.getState().clearHistory();
    useEditorStore.setState(s => ({
        ...s,
        layers: [],
        activeLayerId: null,
        width: 256,
        height: 256,
        brushSettings: { size: 10, hardness: 1, opacity: 1, flow: 1 },
        selection: { ...s.selection, hasSelection: false, operations: [], path: [] },
    }));
    useEditorStore.getState().addLayer();
}

import type { Tool } from '../tools/Tool';

function runStroke(tool: Tool, x0: number, y0: number, x1: number, y1: number) {
    const ctx = {
        store: useEditorStore.getState(),
        getStore: () => useEditorStore.getState(),
        requestRender: () => {},
    };
    tool.onPointerDown?.(makeToolPointerEvent({ canvasX: x0, canvasY: y0 }), ctx);
    tool.onPointerMove?.(makeToolPointerEvent({ canvasX: (x0 + x1) / 2, canvasY: (y0 + y1) / 2 }), ctx);
    tool.onPointerMove?.(makeToolPointerEvent({ canvasX: x1, canvasY: y1 }), ctx);
    tool.onPointerUp?.(makeToolPointerEvent({ canvasX: x1, canvasY: y1 }), ctx);
}

describe('GAP-15 paint tools commit tight dirty rects', () => {
    beforeEach(reset);

    it('Brush stroke dirty rect is bounded around the stroke, not full canvas', () => {
        runStroke(brushTool, 50, 50, 60, 60);
        const entries = useEditorStore.getState().historyEntries;
        const top = entries[entries.length - 1];
        const action = top.action;
        if (action.kind !== 'pixel') throw new Error('expected pixel action');
        expect(action.dirtyRect.width).toBeLessThan(256);
        expect(action.dirtyRect.height).toBeLessThan(256);
        expect(action.dirtyRect.width).toBeGreaterThan(0);
    });

    it('Pencil stroke dirty rect is bounded around the stroke', () => {
        useEditorStore.getState().setTool('pencil');
        runStroke(pencilTool, 100, 100, 110, 110);
        const entries = useEditorStore.getState().historyEntries;
        const top = entries[entries.length - 1];
        const action = top.action;
        if (action.kind !== 'pixel') throw new Error('expected pixel action');
        expect(action.dirtyRect.width).toBeLessThan(256);
        expect(action.dirtyRect.height).toBeLessThan(256);
    });

    it('Eraser stroke dirty rect is bounded around the stroke', () => {
        const layer = useEditorStore.getState().layers[0];
        layer.ctx.fillStyle = '#ff0000';
        layer.ctx.fillRect(0, 0, 256, 256);
        useEditorStore.getState().setTool('eraser');
        runStroke(eraserTool, 30, 30, 40, 40);
        const entries = useEditorStore.getState().historyEntries;
        const top = entries[entries.length - 1];
        const action = top.action;
        if (action.kind !== 'pixel') throw new Error('expected pixel action');
        expect(action.dirtyRect.width).toBeLessThan(256);
        expect(action.dirtyRect.height).toBeLessThan(256);
    });

    it('Brush undo still restores correctly with cropped before-buffer', () => {
        const layer = useEditorStore.getState().layers[0];
        layer.ctx.fillStyle = '#00ff00';
        layer.ctx.fillRect(0, 0, 256, 256);
        useEditorStore.getState().setTool('brush');
        useEditorStore.setState(s => ({ ...s, primaryColor: '#ff0000' }));
        runStroke(brushTool, 100, 100, 110, 110);
        const beforeUndo = layer.ctx.getImageData(105, 105, 1, 1).data;
        expect(beforeUndo[0]).toBeGreaterThan(beforeUndo[1]); // red > green
        useEditorStore.getState().undo();
        const afterUndo = layer.ctx.getImageData(105, 105, 1, 1).data;
        expect(afterUndo[1]).toBeGreaterThan(afterUndo[0]); // green > red
    });
});
