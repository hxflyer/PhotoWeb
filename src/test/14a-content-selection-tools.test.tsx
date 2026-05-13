import { describe, it, expect, beforeEach } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { Toolbar } from '../components/Panels/Toolbar';
import { OptionsBar } from '../components/Panels/OptionsBar';
import { useEditorStore } from '../store/editorStore';
import { getTool } from '../tools/registry';
import { ensureStubsRegistered } from '../tools/stubs';
import { setObjectSelectionOptions, getObjectSelectionOptions } from '../tools/objectSelection';
import { setSelectionToolOperation } from '../tools/selectionModifiers';
import { makeToolPointerEvent } from './simulator';

ensureStubsRegistered();

function reset() {
    cleanup();
    useEditorStore.getState().clearHistory();
    useEditorStore.setState((s) => ({
        ...s,
        activeTool: 'quick-selection',
        toolbarGroupActive: {},
        layers: [],
        activeLayerId: null,
        width: 20,
        height: 20,
        selection: {
            ...s.selection,
            hasSelection: false,
            path: [],
            polyPoints: [],
            operations: [],
            isDraggingSelection: false,
            feather: 0,
        },
    }));
    useEditorStore.getState().addLayer();
    setSelectionToolOperation('new');
    setObjectSelectionOptions({ mode: 'rectangle', sampleAllLayers: false, autoEnhance: false, objectSubtract: true });
}

function ctx() {
    return {
        store: useEditorStore.getState(),
        getStore: () => useEditorStore.getState(),
        requestRender: () => {},
    };
}

function selectedPixels(mask: Uint8ClampedArray | undefined): number {
    if (!mask) return 0;
    return Array.from(mask).filter(Boolean).length;
}

function paintSquare(x: number, y: number, size: number, color = '#ff0000') {
    const store = useEditorStore.getState();
    const layer = store.layers.find(l => l.id === store.activeLayerId);
    if (!layer) throw new Error('missing layer');
    layer.ctx.fillStyle = color;
    layer.ctx.fillRect(x, y, size, size);
    layer.markDirty(null);
}

describe('14a content selection tools', () => {
    beforeEach(reset);

    it('registers Object Selection in the W toolbar group', () => {
        useEditorStore.getState().setTool('object-selection');
        render(<Toolbar />);

        expect(screen.getByTitle(/Object Selection Tool/)).toBeTruthy();
    });

    it('Options Bar updates Object Selection mode and toggles', () => {
        useEditorStore.getState().setTool('object-selection');
        render(<OptionsBar />);

        fireEvent.click(screen.getByTestId('object-selection-mode-lasso'));
        fireEvent.click(screen.getByTestId('object-selection-sample-all-layers'));
        fireEvent.click(screen.getByTestId('object-selection-auto-enhance'));
        fireEvent.click(screen.getByTestId('object-selection-object-subtract'));

        expect(getObjectSelectionOptions()).toMatchObject({
            mode: 'lasso',
            sampleAllLayers: true,
            autoEnhance: true,
            objectSubtract: false,
        });
        expect(useEditorStore.getState().selection.mode).toBe('lasso');
    });

    it('rectangle Object Selection shrink-wraps to visible pixels inside the rough drag', () => {
        paintSquare(5, 5, 4);
        const tool = getTool('object-selection')!;

        tool.onPointerDown!(makeToolPointerEvent({ canvasX: 0, canvasY: 0 }), ctx());
        tool.onPointerMove!(makeToolPointerEvent({ canvasX: 12, canvasY: 12 }), ctx());
        tool.onPointerUp!(makeToolPointerEvent({ canvasX: 12, canvasY: 12 }), ctx());

        const op = useEditorStore.getState().selection.operations[0];
        expect(op.type).toBe('rect');
        expect(selectedPixels(op.mask?.data)).toBe(16);
    });

    it('lasso Object Selection commits a lasso mask', () => {
        setObjectSelectionOptions({ mode: 'lasso' });
        paintSquare(5, 5, 4);
        const tool = getTool('object-selection')!;

        tool.onPointerDown!(makeToolPointerEvent({ canvasX: 3, canvasY: 3 }), ctx());
        tool.onPointerMove!(makeToolPointerEvent({ canvasX: 12, canvasY: 3, buttons: 1 }), ctx());
        tool.onPointerMove!(makeToolPointerEvent({ canvasX: 12, canvasY: 12, buttons: 1 }), ctx());
        tool.onPointerMove!(makeToolPointerEvent({ canvasX: 3, canvasY: 12, buttons: 1 }), ctx());
        tool.onPointerUp!(makeToolPointerEvent({ canvasX: 3, canvasY: 3 }), ctx());

        const op = useEditorStore.getState().selection.operations[0];
        expect(op.type).toBe('lasso');
        expect(op.mask).toBeDefined();
        expect(selectedPixels(op.mask?.data)).toBe(16);
    });

    it('Shift adds and Alt subtracts Object Selection refinements', () => {
        paintSquare(2, 2, 4);
        paintSquare(10, 2, 4, '#0000ff');
        const tool = getTool('object-selection')!;

        tool.onPointerDown!(makeToolPointerEvent({ canvasX: 0, canvasY: 0 }), ctx());
        tool.onPointerUp!(makeToolPointerEvent({ canvasX: 7, canvasY: 7 }), ctx());
        tool.onPointerDown!(makeToolPointerEvent({ canvasX: 8, canvasY: 0, modifiers: { shift: true } }), ctx());
        tool.onPointerUp!(makeToolPointerEvent({ canvasX: 15, canvasY: 7, modifiers: { shift: true } }), ctx());
        tool.onPointerDown!(makeToolPointerEvent({ canvasX: 10, canvasY: 2, modifiers: { alt: true } }), ctx());
        tool.onPointerUp!(makeToolPointerEvent({ canvasX: 14, canvasY: 6, modifiers: { alt: true } }), ctx());

        const ops = useEditorStore.getState().selection.operations;
        expect(ops).toHaveLength(3);
        expect(ops[1].mode).toBe('add');
        expect(ops[2].mode).toBe('sub');
        expect(selectedPixels(ops[2].mask?.data)).toBe(16);
    });

    it('Object Subtract off subtracts the full dragged area', () => {
        paintSquare(5, 5, 2);
        setObjectSelectionOptions({ objectSubtract: false });
        const tool = getTool('object-selection')!;

        tool.onPointerDown!(makeToolPointerEvent({ canvasX: 0, canvasY: 0 }), ctx());
        tool.onPointerUp!(makeToolPointerEvent({ canvasX: 12, canvasY: 12 }), ctx());
        tool.onPointerDown!(makeToolPointerEvent({ canvasX: 0, canvasY: 0, modifiers: { alt: true } }), ctx());
        tool.onPointerUp!(makeToolPointerEvent({ canvasX: 10, canvasY: 10, modifiers: { alt: true } }), ctx());

        const sub = useEditorStore.getState().selection.operations[1];
        expect(sub.mode).toBe('sub');
        expect(selectedPixels(sub.mask?.data)).toBe(100);
    });
});
