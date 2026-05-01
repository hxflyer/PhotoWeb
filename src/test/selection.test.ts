import { describe, it, expect, beforeEach } from 'vitest';
import { useEditorStore } from '../store/editorStore';
import { getTool } from '../tools/registry';
import { ensureStubsRegistered } from '../tools/stubs';
import { makeToolPointerEvent } from './simulator';

ensureStubsRegistered();

function reset() {
    useEditorStore.setState((s) => ({
        ...s,
        layers: [],
        activeLayerId: null,
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
}

function ctx() {
    return {
        store: useEditorStore.getState(),
        getStore: () => useEditorStore.getState(),
        requestRender: () => {},
    };
}

describe('selection tools', () => {
    beforeEach(reset);

    it('marquee-rect: drag from (10,20) to (110,80) yields a rect path', () => {
        const tool = getTool('marquee-rect');
        if (!tool) throw new Error('marquee-rect not registered');
        tool.onPointerDown!(makeToolPointerEvent({ canvasX: 10, canvasY: 20 }), ctx());
        tool.onPointerMove!(makeToolPointerEvent({ canvasX: 110, canvasY: 80 }), ctx());
        tool.onPointerUp!(makeToolPointerEvent({ canvasX: 110, canvasY: 80 }), ctx());
        const sel = useEditorStore.getState().selection;
        expect(sel.hasSelection).toBe(true);
        expect(sel.operations.length).toBe(1);
        const op = sel.operations[0];
        expect(op.type).toBe('rect');
        expect(op.path).toEqual([{ x: 10, y: 20 }, { x: 110, y: 80 }]);
    });

    it('marquee-rect with Shift constrains to a square', () => {
        const tool = getTool('marquee-rect')!;
        tool.onPointerDown!(makeToolPointerEvent({ canvasX: 0, canvasY: 0 }), ctx());
        tool.onPointerUp!(makeToolPointerEvent({ canvasX: 80, canvasY: 30, modifiers: { shift: true } }), ctx());
        const op = useEditorStore.getState().selection.operations[0];
        const w = op.path[1].x - op.path[0].x;
        const h = op.path[1].y - op.path[0].y;
        expect(w).toBe(h);
    });

    it('marquee-rect with Alt draws from center', () => {
        const tool = getTool('marquee-rect')!;
        tool.onPointerDown!(makeToolPointerEvent({ canvasX: 100, canvasY: 100 }), ctx());
        tool.onPointerUp!(makeToolPointerEvent({ canvasX: 130, canvasY: 120, modifiers: { alt: true } }), ctx());
        const op = useEditorStore.getState().selection.operations[0];
        // From-center: anchor at (100,100), |dx|=30 |dy|=20, so rect spans (70,80)-(130,120) — width 60, height 40
        expect(op.path[1].x - op.path[0].x).toBe(60);
        expect(op.path[1].y - op.path[0].y).toBe(40);
        expect(op.path[0].x).toBe(70);
        expect(op.path[0].y).toBe(80);
    });

    it('lasso: drag traces a polyline path with hasSelection=true', () => {
        const tool = getTool('lasso')!;
        tool.onPointerDown!(makeToolPointerEvent({ canvasX: 10, canvasY: 10 }), ctx());
        tool.onPointerMove!(makeToolPointerEvent({ canvasX: 50, canvasY: 30 }), ctx());
        tool.onPointerMove!(makeToolPointerEvent({ canvasX: 60, canvasY: 80 }), ctx());
        tool.onPointerUp!(makeToolPointerEvent({ canvasX: 60, canvasY: 80 }), ctx());
        const sel = useEditorStore.getState().selection;
        expect(sel.hasSelection).toBe(true);
        expect(sel.operations[0].type).toBe('lasso');
        expect(sel.operations[0].path.length).toBeGreaterThanOrEqual(3);
    });

    it('lasso-poly: click 3 points then Enter commits', () => {
        const tool = getTool('lasso-poly')!;
        tool.onPointerDown!(makeToolPointerEvent({ canvasX: 0, canvasY: 0 }), ctx());
        tool.onPointerDown!(makeToolPointerEvent({ canvasX: 50, canvasY: 0 }), ctx());
        tool.onPointerDown!(makeToolPointerEvent({ canvasX: 25, canvasY: 50 }), ctx());
        tool.onKeyDown!({ key: 'Enter', shift: false, alt: false, meta: false, ctrl: false, rawEvent: new KeyboardEvent('keydown') }, ctx());
        const sel = useEditorStore.getState().selection;
        expect(sel.hasSelection).toBe(true);
        expect(sel.operations[0].type).toBe('lasso-poly');
        expect(sel.operations[0].path.length).toBe(3);
    });

    it('clearSelection wipes path + operations', () => {
        useEditorStore.getState().addSelectionOperation({ mode: 'add', path: [{ x: 0, y: 0 }, { x: 10, y: 10 }], type: 'rect' });
        useEditorStore.getState().setHasSelection(true);
        useEditorStore.getState().clearSelection();
        const sel = useEditorStore.getState().selection;
        expect(sel.hasSelection).toBe(false);
        expect(sel.operations).toEqual([]);
    });
});
