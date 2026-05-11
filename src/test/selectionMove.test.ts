import { describe, it, expect, beforeEach } from 'vitest';
import { useEditorStore } from '../store/editorStore';
import { getTool } from '../tools/registry';
import { ensureStubsRegistered } from '../tools/stubs';
import { setMagicWandOptions, defaultMagicWandOptions } from '../tools/magicWand';
import { setQuickSelectionOptions } from '../tools/quickSelection';
import { nudgeSelectionBorderBy } from '../tools/selectionMove';
import { makeToolPointerEvent } from './simulator';

ensureStubsRegistered();

function reset() {
    useEditorStore.getState().clearHistory();
    useEditorStore.setState((s) => ({
        ...s,
        layers: [],
        activeLayerId: null,
        width: 200,
        height: 200,
        selection: {
            ...s.selection,
            hasSelection: false,
            path: [], polyPoints: [], operations: [],
            isDraggingSelection: false, feather: 0,
        },
    }));
    setMagicWandOptions(defaultMagicWandOptions);
    setQuickSelectionOptions({ size: 30, sampleAllLayers: false, autoEnhance: true });
    useEditorStore.getState().addLayer();
}

function ctx() {
    return {
        store: useEditorStore.getState(),
        getStore: () => useEditorStore.getState(),
        requestRender: () => {},
    };
}

function makeRectSelection(x1: number, y1: number, x2: number, y2: number) {
    useEditorStore.getState().setSelectionOperations([
        { mode: 'add', type: 'rect', path: [{ x: x1, y: y1 }, { x: x2, y: y2 }] },
    ]);
    useEditorStore.getState().setHasSelection(true);
}

describe('inside-drag / outside-dismiss applies to all selection tools', () => {
    beforeEach(reset);

    it('lasso: click outside an existing selection dismisses it before drawing', () => {
        makeRectSelection(10, 10, 50, 50);
        const lasso = getTool('lasso')!;
        // Click outside (60+) — should clear the rect and start a fresh lasso.
        lasso.onPointerDown!(makeToolPointerEvent({ canvasX: 100, canvasY: 100 }), ctx());
        // After pointerDown, the rect should already be cleared.
        expect(useEditorStore.getState().selection.hasSelection).toBe(false);
    });

    it('lasso: click inside an existing selection enters move mode (no new lasso path)', () => {
        makeRectSelection(10, 10, 100, 100);
        const lasso = getTool('lasso')!;
        // Click inside the rect — should NOT clear; should set up move state.
        lasso.onPointerDown!(makeToolPointerEvent({ canvasX: 50, canvasY: 50 }), ctx());
        // Move and release; selection should shift, not be replaced.
        lasso.onPointerMove!(makeToolPointerEvent({ canvasX: 80, canvasY: 50, buttons: 1 }), ctx());
        lasso.onPointerUp!(makeToolPointerEvent({ canvasX: 80, canvasY: 50 }), ctx());
        const ops = useEditorStore.getState().selection.operations;
        expect(ops).toHaveLength(1);
        expect(ops[0].type).toBe('rect'); // still the original rect, just moved
        expect(ops[0].path[0].x).toBe(40); // 10 + (80 - 50) = 40
    });

    it('magic wand: click outside existing selection dismisses immediately, before flood fill', () => {
        makeRectSelection(10, 10, 50, 50);
        const tool = getTool('magic-wand')!;
        // Click outside the rect; the rect should clear before the flood-fill replaces it.
        tool.onPointerDown!(makeToolPointerEvent({ canvasX: 100, canvasY: 100 }), ctx());
        // After pointerDown, EITHER the flood fill produced something (replacing the rect),
        // or no flood matched (cleared rect remains cleared). In both cases the rect itself
        // should be gone.
        const ops = useEditorStore.getState().selection.operations;
        expect(ops.every(op => op.type !== 'rect' || op.path.length === 0 || op.path[0].x !== 10)).toBe(true);
    });

    it('magic wand: click inside existing selection enters move mode', () => {
        makeRectSelection(10, 10, 100, 100);
        const tool = getTool('magic-wand')!;
        tool.onPointerDown!(makeToolPointerEvent({ canvasX: 50, canvasY: 50 }), ctx());
        tool.onPointerMove!(makeToolPointerEvent({ canvasX: 70, canvasY: 50, buttons: 1 }), ctx());
        tool.onPointerUp!(makeToolPointerEvent({ canvasX: 70, canvasY: 50 }), ctx());
        const ops = useEditorStore.getState().selection.operations;
        expect(ops).toHaveLength(1);
        expect(ops[0].type).toBe('rect');
        expect(ops[0].path[0].x).toBe(30); // 10 + 20
    });

    it('quick selection: click inside an existing selection enters move mode', () => {
        makeRectSelection(10, 10, 100, 100);
        const tool = getTool('quick-selection')!;
        tool.onPointerDown!(makeToolPointerEvent({ canvasX: 50, canvasY: 50 }), ctx());
        tool.onPointerMove!(makeToolPointerEvent({ canvasX: 60, canvasY: 50, buttons: 1 }), ctx());
        tool.onPointerUp!(makeToolPointerEvent({ canvasX: 60, canvasY: 50 }), ctx());
        const ops = useEditorStore.getState().selection.operations;
        expect(ops).toHaveLength(1);
        expect(ops[0].type).toBe('rect');
        expect(ops[0].path[0].x).toBe(20);
    });

    it('lasso-poly: first click outside existing selection dismisses it', () => {
        makeRectSelection(10, 10, 50, 50);
        const tool = getTool('lasso-poly')!;
        tool.onPointerDown!(makeToolPointerEvent({ canvasX: 100, canvasY: 100 }), ctx());
        expect(useEditorStore.getState().selection.hasSelection).toBe(false);
    });

    it('arrow-style nudge moves the selection border and is undoable', () => {
        makeRectSelection(10, 10, 50, 50);

        expect(nudgeSelectionBorderBy(10, 0)).toBe(true);
        expect(useEditorStore.getState().selection.operations[0].path).toEqual([
            { x: 20, y: 10 },
            { x: 60, y: 50 },
        ]);

        useEditorStore.getState().undo();
        expect(useEditorStore.getState().selection.operations[0].path).toEqual([
            { x: 10, y: 10 },
            { x: 50, y: 50 },
        ]);

        useEditorStore.getState().redo();
        expect(useEditorStore.getState().selection.operations[0].path[0]).toEqual({ x: 20, y: 10 });
    });
});
