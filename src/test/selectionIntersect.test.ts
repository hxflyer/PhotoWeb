import { describe, it, expect, beforeEach } from 'vitest';
import { useEditorStore } from '../store/editorStore';
import { getTool } from '../tools/registry';
import { ensureStubsRegistered } from '../tools/stubs';
import { trueIntersectOps } from '../tools/selectionModifiers';
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
    useEditorStore.getState().addLayer();
}

function ctx() {
    return {
        store: useEditorStore.getState(),
        getStore: () => useEditorStore.getState(),
        requestRender: () => {},
    };
}

describe('selection intersect — Phase 3.1', () => {
    beforeEach(reset);

    it('intersect of two overlapping rects produces only the overlap region', () => {
        // Rect A: (10..50, 10..50). Rect B: (30..70, 30..70). Overlap: (30..50, 30..50) = 400 px.
        const result = trueIntersectOps(
            [{ mode: 'add', type: 'rect', path: [{ x: 10, y: 10 }, { x: 50, y: 50 }] }],
            { type: 'rect', path: [{ x: 30, y: 30 }, { x: 70, y: 70 }] },
            200, 200,
        );
        expect(result).toHaveLength(1);
        expect(result[0].mask).toBeTruthy();
        const m = result[0].mask!;
        let count = 0;
        for (const v of m.data) if (v > 0) count++;
        // The overlap is 20*20 = 400 pixels (Canvas2D AA may round borders).
        expect(count).toBeLessThanOrEqual(450);
        expect(count).toBeGreaterThanOrEqual(380);
        // Inside the overlap is selected.
        expect(m.data[40 * 200 + 40]).toBeGreaterThan(0);
        // Outside the overlap (in A only) is NOT.
        expect(m.data[15 * 200 + 15]).toBe(0);
    });

    it('Shift+Alt with the marquee tool produces an intersection (true clip, not append)', () => {
        const tool = getTool('marquee-rect')!;
        // First selection: (10..110, 10..110)
        tool.onPointerDown!(makeToolPointerEvent({ canvasX: 10, canvasY: 10 }), ctx());
        tool.onPointerMove!(makeToolPointerEvent({ canvasX: 110, canvasY: 110 }), ctx());
        tool.onPointerUp!(makeToolPointerEvent({ canvasX: 110, canvasY: 110 }), ctx());

        // Second selection with Shift+Alt = intersect: (60..160, 60..160).
        // Overlap: (60..110, 60..110) = 50*50 = 2500 px.
        tool.onPointerDown!(makeToolPointerEvent({ canvasX: 60, canvasY: 60, modifiers: { shift: true, alt: true } }), ctx());
        tool.onPointerMove!(makeToolPointerEvent({ canvasX: 160, canvasY: 160, modifiers: { shift: true, alt: true } }), ctx());
        tool.onPointerUp!(makeToolPointerEvent({ canvasX: 160, canvasY: 160, modifiers: { shift: true, alt: true } }), ctx());

        const ops = useEditorStore.getState().selection.operations;
        expect(ops).toHaveLength(1);
        expect(ops[0].mask).toBeTruthy();
    });

    it('intersect with no existing selection becomes a fresh selection', () => {
        const result = trueIntersectOps(
            [],
            { type: 'rect', path: [{ x: 0, y: 0 }, { x: 50, y: 50 }] },
            200, 200,
        );
        expect(result).toHaveLength(1);
        expect(result[0].mode).toBe('add');
    });

    it('inverse uses canvas bounds (not 500-pixel-padded) on a 4K canvas', () => {
        useEditorStore.setState(s => ({ ...s, width: 4000, height: 3000 }));
        useEditorStore.getState().toggleInvertSelection();
        const ops = useEditorStore.getState().selection.operations;
        expect(ops[0].path[0]).toEqual({ x: 0, y: 0 });
        expect(ops[0].path[1]).toEqual({ x: 4000, y: 3000 });
    });
});
