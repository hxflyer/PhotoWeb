import { fireEvent, render, cleanup } from '@testing-library/react';
import { beforeEach, describe, expect, it } from 'vitest';
import { Viewport } from '../components/Canvas/Viewport';
import { useEditorStore } from '../store/editorStore';
import { ensureStubsRegistered } from '../tools/stubs';

ensureStubsRegistered();

class TestPath2D {
    moveTo() {}
    lineTo() {}
    closePath() {}
}

if (!globalThis.Path2D) {
    globalThis.Path2D = TestPath2D as unknown as typeof Path2D;
}

function reset() {
    useEditorStore.getState().clearHistory();
    useEditorStore.setState(s => ({
        ...s,
        width: 100,
        height: 100,
        zoom: 1,
        pan: { x: 0, y: 0 },
        activeTool: 'select',
        showSelectionEdges: true,
        layers: [],
        activeLayerId: null,
        selection: {
            ...s.selection,
            mode: 'rect',
            hasSelection: true,
            path: [{ x: 10, y: 10 }, { x: 50, y: 50 }],
            operations: [],
            polyPoints: [],
            isDraggingSelection: false,
        },
    }));
    useEditorStore.getState().addLayer();
    useEditorStore.getState().clearHistory();
}

function setCanvasRect(canvas: HTMLCanvasElement) {
    canvas.getBoundingClientRect = () => ({
        x: 0,
        y: 0,
        left: 0,
        top: 0,
        right: 100,
        bottom: 100,
        width: 100,
        height: 100,
        toJSON: () => ({}),
    });
}

describe('Viewport selection interactions', () => {
    beforeEach(() => {
        cleanup();
        reset();
    });

    it('mouse-down outside an existing selection dismisses it immediately', () => {
        const { container } = render(<Viewport />);
        const viewport = container.firstElementChild as HTMLElement;
        const canvas = container.querySelector('canvas') as HTMLCanvasElement;
        setCanvasRect(canvas);

        fireEvent.mouseDown(viewport, { clientX: 70, clientY: 70, button: 0, buttons: 1 });

        const selection = useEditorStore.getState().selection;
        expect(selection.hasSelection).toBe(false);
        expect(selection.path).toEqual([]);
        expect(selection.operations).toEqual([]);
    });

    it('plain click inside an existing selection keeps it selected', () => {
        const { container } = render(<Viewport />);
        const viewport = container.firstElementChild as HTMLElement;
        const canvas = container.querySelector('canvas') as HTMLCanvasElement;
        setCanvasRect(canvas);

        fireEvent.mouseDown(viewport, { clientX: 20, clientY: 20, button: 0, buttons: 1 });
        fireEvent.mouseUp(viewport, { clientX: 20, clientY: 20, button: 0, buttons: 0 });

        const selection = useEditorStore.getState().selection;
        expect(selection.hasSelection).toBe(true);
        expect(selection.path).toEqual([{ x: 10, y: 10 }, { x: 50, y: 50 }]);
    });

    it('drag after outside mouse-down creates a replacement selection', () => {
        const { container } = render(<Viewport />);
        const viewport = container.firstElementChild as HTMLElement;
        const canvas = container.querySelector('canvas') as HTMLCanvasElement;
        setCanvasRect(canvas);

        fireEvent.mouseDown(viewport, { clientX: 70, clientY: 70, button: 0, buttons: 1 });
        fireEvent.mouseMove(viewport, { clientX: 90, clientY: 90, button: 0, buttons: 1 });
        fireEvent.mouseUp(viewport, { clientX: 90, clientY: 90, button: 0, buttons: 0 });

        const selection = useEditorStore.getState().selection;
        expect(selection.hasSelection).toBe(true);
        expect(selection.operations.at(-1)?.path).toEqual([{ x: 70, y: 70 }, { x: 90, y: 90 }]);
    });

    it('selection edge visibility toggle does not clear the active selection', () => {
        useEditorStore.getState().setShowSelectionEdges(false);

        const state = useEditorStore.getState();
        expect(state.showSelectionEdges).toBe(false);
        expect(state.selection.hasSelection).toBe(true);
        expect(state.selection.path).toEqual([{ x: 10, y: 10 }, { x: 50, y: 50 }]);
    });
});
