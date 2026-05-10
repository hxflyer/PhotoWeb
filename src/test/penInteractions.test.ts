import { describe, it, expect, beforeEach } from 'vitest';
import { getTool } from '../tools/registry';
import { ensureStubsRegistered } from '../tools/stubs';
import { useEditorStore } from '../store/editorStore';
import { getPaths, removePath, getActivePath, setActivePath, getPenSelection, clearPenSelection } from '../tools/pen';
import { makeToolPointerEvent } from './simulator';

ensureStubsRegistered();

function reset() {
    useEditorStore.setState((s) => ({ ...s, layers: [], activeLayerId: null }));
    useEditorStore.getState().addLayer();
    while (getPaths().length > 0) removePath(getPaths()[0].id);
    clearPenSelection();
}

function ctx() {
    return {
        store: useEditorStore.getState(),
        getStore: () => useEditorStore.getState(),
        requestRender: () => { /* noop */ },
    };
}

const pen = () => getTool('pen')!;

// Helper: full down/up cycle at a point with optional modifiers.
function click(x: number, y: number, modifiers: { alt?: boolean; shift?: boolean } = {}) {
    pen().onPointerDown!(makeToolPointerEvent({ canvasX: x, canvasY: y, modifiers }), ctx());
    pen().onPointerUp!(makeToolPointerEvent({ canvasX: x, canvasY: y, modifiers }), ctx());
}
function clickDrag(downX: number, downY: number, upX: number, upY: number, modifiers: { alt?: boolean; shift?: boolean } = {}) {
    pen().onPointerDown!(makeToolPointerEvent({ canvasX: downX, canvasY: downY, modifiers }), ctx());
    pen().onPointerMove!(makeToolPointerEvent({ canvasX: upX, canvasY: upY, modifiers }), ctx());
    pen().onPointerUp!(makeToolPointerEvent({ canvasX: upX, canvasY: upY, modifiers }), ctx());
}

describe('Pen tool — Photoshop-style interactions', () => {
    beforeEach(reset);

    it('plain click adds a corner anchor and starts a new path', () => {
        click(50, 50);
        const path = getActivePath()!;
        expect(path).toBeTruthy();
        expect(path.anchors.length).toBe(1);
        expect(path.anchors[0]).toMatchObject({ x: 50, y: 50, type: 'corner' });
        expect(path.anchors[0].inHandle).toBeUndefined();
        expect(path.anchors[0].outHandle).toBeUndefined();
    });

    it('click-drag on empty area creates a smooth anchor with mirrored handles', () => {
        clickDrag(100, 100, 130, 100); // drag horizontally
        const path = getActivePath()!;
        expect(path.anchors.length).toBe(1);
        const a = path.anchors[0];
        expect(a.type).toBe('smooth');
        expect(a.outHandle).toMatchObject({ x: 130, y: 100 });
        // Mirror: in-handle should be opposite of out-handle relative to anchor.
        expect(a.inHandle).toMatchObject({ x: 70, y: 100 });
    });

    it('clicking the first anchor of an open path with ≥2 anchors closes the path', () => {
        click(0, 0);
        click(50, 0);
        click(25, 40);
        // Click back on the first anchor — should close.
        click(0, 0);
        const path = getActivePath()!;
        expect(path.closed).toBe(true);
        expect(path.anchors.length).toBe(3);
    });

    it('clicking on a non-first existing anchor deletes that anchor', () => {
        click(0, 0);
        click(50, 0);
        click(100, 0);
        expect(getActivePath()!.anchors.length).toBe(3);
        // Click on the middle anchor (50, 0).
        click(50, 0);
        const path = getActivePath()!;
        expect(path.anchors.length).toBe(2);
        expect(path.anchors.map(a => a.x)).toEqual([0, 100]);
    });

    it('alt-click on smooth anchor (no drag) converts it to corner (handles removed)', () => {
        // Make a smooth anchor at (100, 100) via click-drag.
        clickDrag(100, 100, 130, 100);
        let a = getActivePath()!.anchors[0];
        expect(a.type).toBe('smooth');
        expect(a.outHandle).toBeTruthy();

        // Alt-click on the same anchor without dragging.
        click(100, 100, { alt: true });
        a = getActivePath()!.anchors[0];
        expect(a.type).toBe('corner');
        expect(a.inHandle).toBeUndefined();
        expect(a.outHandle).toBeUndefined();
    });

    it('alt-drag on existing corner anchor pulls out smooth (mirrored) handles', () => {
        click(50, 50); // corner anchor
        // Per Adobe docs: alt-drag from a corner converts it to a smooth point with
        // mirrored direction handles. Drag to (90, 50) → outHandle:(90,50), inHandle:(10,50).
        clickDrag(50, 50, 90, 50, { alt: true });
        const a = getActivePath()!.anchors[0];
        expect(a.outHandle).toMatchObject({ x: 90, y: 50 });
        expect(a.inHandle).toMatchObject({ x: 10, y: 50 });
        expect(a.type).toBe('smooth');
    });

    it('clicking on a path segment inserts an anchor at the point on the curve', () => {
        click(0, 0);
        click(100, 0);
        // The segment is a straight line at y=0; click at (50,0) inserts a midpoint.
        click(50, 0);
        const path = getActivePath()!;
        // The middle anchor existed before the click? No — first two are the endpoints.
        // After splitSegment at t≈0.5, expect 3 anchors with the middle near (50,0).
        // BUT "click on existing anchor" hits the endpoints before segments. Since (50,0) is
        // far from anchors at (0,0) and (100,0), the segment hit fires.
        expect(path.anchors.length).toBe(3);
        const mid = path.anchors[1];
        expect(mid.x).toBeCloseTo(50, 0);
        expect(mid.y).toBeCloseTo(0, 0);
    });

    it('shift+click constrains a new anchor to 45° from the previous anchor', () => {
        click(0, 0);
        // atan2(30, 60) ≈ 26.6° → snaps to nearest 45° increment = 45°.
        // Constrained anchor lies on the +45° ray, distance hypot(60, 30) ≈ 67.08.
        click(60, 30, { shift: true });
        const a = getActivePath()!.anchors[1];
        const len = Math.hypot(60, 30);
        const expected = len * Math.SQRT1_2; // cos(45°) = sin(45°) = √2/2
        expect(a.x).toBeCloseTo(expected, 1);
        expect(a.y).toBeCloseTo(expected, 1);

        // Sanity check: a different angle that snaps to 0° (atan2(10, 60) ≈ 9.5° → 0°).
        click(70, 0); // start fresh segment context not needed; previous is (47.4, 47.4)
        click(170, 10, { shift: true });
        const b = getActivePath()!.anchors[3];
        // Snapped to 0° from the previous (170-70=100, 10), expected on +x.
        expect(b.y).toBeCloseTo(0, 1);
    });

    it('drag on an existing handle moves it; opposite handle mirrors when no alt held', () => {
        // Make a smooth anchor at (50, 50) with handles at out:(80,50), in:(20,50).
        clickDrag(50, 50, 80, 50);
        let a = getActivePath()!.anchors[0];
        expect(a.outHandle).toMatchObject({ x: 80, y: 50 });
        expect(a.inHandle).toMatchObject({ x: 20, y: 50 });

        // Drag the out-handle from (80,50) to (80,80) without alt.
        clickDrag(80, 50, 80, 80);
        a = getActivePath()!.anchors[0];
        expect(a.outHandle).toMatchObject({ x: 80, y: 80 });
        // Mirror: in = anchor*2 - out = (100-80, 100-80) = (20, 20).
        expect(a.inHandle).toMatchObject({ x: 20, y: 20 });
    });

    it('alt+drag on an existing handle breaks symmetry (only that handle moves)', () => {
        clickDrag(50, 50, 80, 50);
        let a = getActivePath()!.anchors[0];
        const inBefore = { ...a.inHandle! };

        clickDrag(80, 50, 80, 80, { alt: true });
        a = getActivePath()!.anchors[0];
        expect(a.outHandle).toMatchObject({ x: 80, y: 80 });
        expect(a.inHandle).toMatchObject(inBefore);
    });

    // ── Cmd/Ctrl: temporary Direct Selection (two-stage) ─────────────────
    it('cmd+click two-stage: first selects path, second on anchor selects anchor', () => {
        // Build a closed triangle.
        click(0, 0);
        click(50, 0);
        click(25, 40);
        click(0, 0); // closes
        clearPenSelection();

        // First Cmd+click on an anchor → selects the whole path (anchor indices empty).
        pen().onPointerDown!(makeToolPointerEvent({ canvasX: 50, canvasY: 0, modifiers: { meta: true } }), ctx());
        pen().onPointerUp!(makeToolPointerEvent({ canvasX: 50, canvasY: 0, modifiers: { meta: true } }), ctx());
        let sel = getPenSelection();
        expect(sel.pathId).not.toBeNull();
        expect(sel.anchorIndices.size).toBe(0);

        // Second Cmd+click on an anchor → selects just that anchor.
        pen().onPointerDown!(makeToolPointerEvent({ canvasX: 25, canvasY: 40, modifiers: { meta: true } }), ctx());
        pen().onPointerUp!(makeToolPointerEvent({ canvasX: 25, canvasY: 40, modifiers: { meta: true } }), ctx());
        sel = getPenSelection();
        expect(sel.anchorIndices.size).toBe(1);
        expect(Array.from(sel.anchorIndices)[0]).toBe(2); // (25, 40) was the third anchor
    });

    it('cmd+drag a selected anchor moves it and adjusts its handles', () => {
        // Make a smooth anchor at (50, 50) with handles, then add another anchor.
        clickDrag(50, 50, 80, 50);
        click(150, 100);
        clearPenSelection();

        // Stage 1: cmd+click the path (anywhere on first anchor).
        pen().onPointerDown!(makeToolPointerEvent({ canvasX: 50, canvasY: 50, modifiers: { meta: true } }), ctx());
        pen().onPointerUp!(makeToolPointerEvent({ canvasX: 50, canvasY: 50, modifiers: { meta: true } }), ctx());
        // Stage 2: cmd+drag the anchor to (60, 60) (anchor selection + drag).
        pen().onPointerDown!(makeToolPointerEvent({ canvasX: 50, canvasY: 50, modifiers: { meta: true } }), ctx());
        pen().onPointerMove!(makeToolPointerEvent({ canvasX: 60, canvasY: 60, modifiers: { meta: true } }), ctx());
        pen().onPointerUp!(makeToolPointerEvent({ canvasX: 60, canvasY: 60, modifiers: { meta: true } }), ctx());

        const a = getActivePath()!.anchors[0];
        expect(a.x).toBeCloseTo(60, 1);
        expect(a.y).toBeCloseTo(60, 1);
        // Handles travel with the anchor (translated by the same delta).
        expect(a.outHandle).toMatchObject({ x: 90, y: 60 });
        expect(a.inHandle).toMatchObject({ x: 30, y: 60 });
    });

    it('cmd+drag on the whole path translates every anchor by the same delta', () => {
        click(0, 0);
        click(100, 0);
        click(100, 100);
        click(0, 100);
        click(0, 0); // closes
        clearPenSelection();

        // Cmd+down on the path → selects whole path; then drag → translates.
        pen().onPointerDown!(makeToolPointerEvent({ canvasX: 50, canvasY: 0, modifiers: { meta: true } }), ctx());
        pen().onPointerMove!(makeToolPointerEvent({ canvasX: 60, canvasY: 10, modifiers: { meta: true } }), ctx());
        pen().onPointerUp!(makeToolPointerEvent({ canvasX: 60, canvasY: 10, modifiers: { meta: true } }), ctx());

        const path = getActivePath()!;
        // Each anchor shifted by (+10, +10).
        expect(path.anchors[0]).toMatchObject({ x: 10, y: 10 });
        expect(path.anchors[1]).toMatchObject({ x: 110, y: 10 });
        expect(path.anchors[2]).toMatchObject({ x: 110, y: 110 });
        expect(path.anchors[3]).toMatchObject({ x: 10, y: 110 });
    });

    it('cmd+click on empty area clears the pen selection', () => {
        click(0, 0);
        click(50, 0);
        click(25, 40);
        click(0, 0); // closes

        // Select path first.
        pen().onPointerDown!(makeToolPointerEvent({ canvasX: 50, canvasY: 0, modifiers: { meta: true } }), ctx());
        pen().onPointerUp!(makeToolPointerEvent({ canvasX: 50, canvasY: 0, modifiers: { meta: true } }), ctx());
        expect(getPenSelection().pathId).not.toBeNull();

        // Cmd+click far away from any path/anchor.
        pen().onPointerDown!(makeToolPointerEvent({ canvasX: 500, canvasY: 500, modifiers: { meta: true } }), ctx());
        pen().onPointerUp!(makeToolPointerEvent({ canvasX: 500, canvasY: 500, modifiers: { meta: true } }), ctx());
        expect(getPenSelection().pathId).toBeNull();
    });

    it('Enter key on an open path with ≥2 anchors closes it and deactivates', () => {
        click(0, 0);
        click(50, 0);
        click(25, 40);
        const before = getActivePath()!.id;
        pen().onKeyDown!({ key: 'Enter', shift: false, alt: false, meta: false, ctrl: false, rawEvent: {} as KeyboardEvent }, ctx());
        // After Enter: the path should be closed AND the active path id cleared.
        const path = getPaths().find(p => p.id === before)!;
        expect(path.closed).toBe(true);
        expect(getActivePath()).toBeNull();

        // Re-activating the closed path then clicking starts a NEW path (since closed paths can't be extended).
        setActivePath(path.id);
        click(200, 200);
        expect(getPaths().length).toBe(2);
    });
});
