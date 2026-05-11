import { describe, it, expect, beforeEach, vi } from 'vitest';
import { useEditorStore } from '../store/editorStore';
import { ensureStubsRegistered } from '../tools/stubs';
import { getTool } from '../tools/registry';
import type { ToolPointerEvent, ToolKeyEvent } from '../tools/Tool';
import { getShapeOptions, setShapeOptions } from '../tools/shapes';
import { getPenOptions, setPenOptions, getPaths, addPath, getActivePath, setActivePath } from '../tools/pen';

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

function keyEvent(key: string): ToolKeyEvent {
    return {
        key,
        shift: false,
        alt: false,
        ctrl: false,
        meta: false,
        rawEvent: new KeyboardEvent('keydown', { key, bubbles: true, cancelable: true }),
    };
}

function toolCtx() {
    return {
        store: useEditorStore.getState(),
        getStore: () => useEditorStore.getState(),
        requestRender: vi.fn(),
    };
}

describe('Slice J — vector tools', () => {
    beforeEach(() => {
        ensureStubsRegistered();
        useEditorStore.getState().clearHistory();
        useEditorStore.setState(s => ({
            ...s,
            width: 200,
            height: 200,
            layers: [],
            activeLayerId: null,
        }));
        // Reset shape and pen options between tests.
        setShapeOptions({ mode: 'shape', fill: '#000000', stroke: null, strokeWidth: 1 });
        setPenOptions({ mode: 'path', autoAddDelete: true, rubberBand: true });
        // Clear any leftover paths from prior tests. removePath isn't exported
        // here, so we splice the array directly via the same reference exposed
        // by getPaths() (the pen module mutates this array in place).
        const paths = getPaths();
        paths.length = 0;
    });

    it('setShapeOptions and getShapeOptions round-trip fill/stroke/strokeWidth', () => {
        setShapeOptions({ fill: '#ff0000', stroke: '#0000ff', strokeWidth: 4 });
        const opts = getShapeOptions();
        expect(opts.fill).toBe('#ff0000');
        expect(opts.stroke).toBe('#0000ff');
        expect(opts.strokeWidth).toBe(4);
    });

    it('shape mode toggles between shape / path / pixels', () => {
        setShapeOptions({ mode: 'path' });
        expect(getShapeOptions().mode).toBe('path');
        setShapeOptions({ mode: 'pixels' });
        expect(getShapeOptions().mode).toBe('pixels');
        setShapeOptions({ mode: 'shape' });
        expect(getShapeOptions().mode).toBe('shape');
    });

    it('pen autoAddDelete defaults to true and toggles', () => {
        expect(getPenOptions().autoAddDelete).toBe(true);
        setPenOptions({ autoAddDelete: false });
        expect(getPenOptions().autoAddDelete).toBe(false);
    });

    it('pen rubberBand defaults to true and toggles', () => {
        expect(getPenOptions().rubberBand).toBe(true);
        setPenOptions({ rubberBand: false });
        expect(getPenOptions().rubberBand).toBe(false);
    });

    it('pen click on existing anchor with autoAddDelete=false does NOT delete the anchor', () => {
        // Manually create a path with two anchors.
        const id = crypto.randomUUID();
        addPath({ id, closed: false, anchors: [{ x: 10, y: 10, type: 'corner' }, { x: 30, y: 30, type: 'corner' }] });
        setActivePath(id);
        setPenOptions({ autoAddDelete: false });
        const pen = getTool('pen')!;
        const ctx = toolCtx();
        // Click on the first anchor — would normally delete it.
        pen.onPointerDown!(pointer(10, 10), ctx);
        pen.onPointerUp!(pointer(10, 10), ctx);
        const path = getActivePath();
        expect(path?.anchors.length).toBeGreaterThanOrEqual(2);
    });

    it('pen click on existing anchor with autoAddDelete=true DOES delete the anchor', () => {
        const id = crypto.randomUUID();
        addPath({ id, closed: false, anchors: [{ x: 10, y: 10, type: 'corner' }, { x: 30, y: 30, type: 'corner' }, { x: 60, y: 60, type: 'corner' }] });
        setActivePath(id);
        setPenOptions({ autoAddDelete: true });
        const pen = getTool('pen')!;
        const ctx = toolCtx();
        // Click on middle anchor (30,30).
        pen.onPointerDown!(pointer(30, 30), ctx);
        pen.onPointerUp!(pointer(30, 30), ctx);
        const path = getActivePath();
        // Middle anchor removed.
        expect(path?.anchors.length).toBe(2);
        expect(path?.anchors.find(a => a.x === 30 && a.y === 30)).toBeUndefined();
    });

    it('Path Selection: Backspace deletes the entire active path', () => {
        const id = crypto.randomUUID();
        addPath({ id, closed: false, anchors: [{ x: 5, y: 5, type: 'corner' }, { x: 15, y: 15, type: 'corner' }] });
        setActivePath(id);
        const ps = getTool('path-selection')!;
        const ctx = toolCtx();
        // Click on a path anchor to make it active.
        ps.onPointerDown!(pointer(5, 5), ctx);
        ps.onPointerUp!(pointer(5, 5), ctx);
        ps.onKeyDown!(keyEvent('Backspace'), ctx);
        expect(getPaths().find(p => p.id === id)).toBeUndefined();
    });

    it('Direct Selection: Backspace removes the currently-selected anchor and leaves remaining anchors', () => {
        const id = crypto.randomUUID();
        addPath({ id, closed: false, anchors: [{ x: 5, y: 5, type: 'corner' }, { x: 15, y: 15, type: 'corner' }, { x: 25, y: 25, type: 'corner' }] });
        setActivePath(id);
        const ds = getTool('direct-selection')!;
        const ctx = toolCtx();
        // Pick the middle anchor.
        ds.onPointerDown!(pointer(15, 15), ctx);
        // Don't release — we want drag.state to retain the anchor index.
        ds.onKeyDown!(keyEvent('Backspace'), ctx);
        const path = getPaths().find(p => p.id === id);
        expect(path?.anchors.length).toBe(2);
        expect(path?.anchors.some(a => a.x === 15 && a.y === 15)).toBe(false);
    });
});
