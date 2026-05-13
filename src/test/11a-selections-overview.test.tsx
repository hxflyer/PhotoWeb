import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { Layer } from '../core/Layer';
import { OptionsBar } from '../components/Panels/OptionsBar';
import { Viewport } from '../components/Canvas/Viewport';
import { useEditorStore } from '../store/editorStore';
import { getTool } from '../tools/registry';
import { ensureStubsRegistered } from '../tools/stubs';
import { setSelectionToolOperation } from '../tools/selectionModifiers';
import { makeToolPointerEvent } from './simulator';

ensureStubsRegistered();

function reset() {
    useEditorStore.getState().clearHistory();
    useEditorStore.setState(s => ({
        ...s,
        width: 200,
        height: 200,
        zoom: 1,
        pan: { x: 0, y: 0 },
        layers: [new Layer(200, 200, 'L')],
        activeLayerId: null,
        activeTool: 'marquee-rect',
        selection: {
            ...s.selection,
            hasSelection: false,
            mode: 'rect',
            path: [],
            polyPoints: [],
            operations: [],
            isDraggingSelection: false,
            feather: 0,
            edgesHidden: false,
            lastCleared: undefined,
        },
    }));
    const layer = useEditorStore.getState().layers[0];
    useEditorStore.setState({ activeLayerId: layer.id });
    setSelectionToolOperation('new');
}

function ctx() {
    return {
        store: useEditorStore.getState(),
        getStore: () => useEditorStore.getState(),
        requestRender: () => {},
    };
}

function dragRect(
    from: { x: number; y: number },
    to: { x: number; y: number },
    modifiers: Parameters<typeof makeToolPointerEvent>[0]['modifiers'] = {},
    releaseModifiers = modifiers,
) {
    const tool = getTool('marquee-rect');
    if (!tool) throw new Error('marquee-rect not registered');
    tool.onPointerDown!(makeToolPointerEvent({ canvasX: from.x, canvasY: from.y, modifiers }), ctx());
    tool.onPointerMove!(makeToolPointerEvent({ canvasX: to.x, canvasY: to.y, modifiers: releaseModifiers }), ctx());
    tool.onPointerUp!(makeToolPointerEvent({ canvasX: to.x, canvasY: to.y, modifiers: releaseModifiers }), ctx());
}

afterEach(() => cleanup());

describe('11a selections overview', () => {
    beforeEach(reset);

    it('Options Bar Add mode makes the next marquee add without holding Shift', () => {
        render(<OptionsBar />);
        fireEvent.click(screen.getByTestId('selection-op-add'));
        expect(screen.getByTestId('selection-op-add').getAttribute('aria-pressed')).toBe('true');

        dragRect({ x: 10, y: 10 }, { x: 40, y: 40 });
        dragRect({ x: 60, y: 10 }, { x: 90, y: 40 });

        const ops = useEditorStore.getState().selection.operations;
        expect(ops).toHaveLength(2);
        expect(ops[0].mode).toBe('add');
        expect(ops[1].mode).toBe('add');
    });

    it('Alt/Option subtract is captured at mouse-down, then survives releasing Alt while dragging', () => {
        dragRect({ x: 10, y: 10 }, { x: 100, y: 100 });
        dragRect({ x: 20, y: 20 }, { x: 50, y: 50 }, { alt: true }, {});

        const ops = useEditorStore.getState().selection.operations;
        expect(ops).toHaveLength(2);
        expect(ops[1].mode).toBe('sub');
        expect(ops[1].path).toEqual([{ x: 20, y: 20 }, { x: 50, y: 50 }]);
    });

    it('Shift add is captured at lasso mouse-down, then survives releasing Shift while dragging', () => {
        dragRect({ x: 10, y: 10 }, { x: 40, y: 40 });
        const lasso = getTool('lasso');
        if (!lasso) throw new Error('lasso not registered');

        lasso.onPointerDown!(makeToolPointerEvent({ canvasX: 70, canvasY: 10, modifiers: { shift: true } }), ctx());
        lasso.onPointerMove!(makeToolPointerEvent({ canvasX: 90, canvasY: 15 }), ctx());
        lasso.onPointerMove!(makeToolPointerEvent({ canvasX: 85, canvasY: 35 }), ctx());
        lasso.onPointerUp!(makeToolPointerEvent({ canvasX: 70, canvasY: 10 }), ctx());

        const ops = useEditorStore.getState().selection.operations;
        expect(ops).toHaveLength(2);
        expect(ops[1].mode).toBe('add');
        expect(ops[1].type).toBe('lasso');
    });

    it('Shift+Alt shows the intersect cursor on registered selection tools', () => {
        useEditorStore.setState({ activeTool: 'magic-wand' });
        render(<Viewport />);
        const workarea = screen.getByTestId('viewport-workarea');

        fireEvent.keyDown(window, { key: 'Shift', shiftKey: true });
        fireEvent.keyDown(window, { key: 'Alt', shiftKey: true, altKey: true });

        expect(workarea.style.cursor).toContain('M6 6L18 18');
    });
});
