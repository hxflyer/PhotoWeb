/**
 * 03-navigation — Zoom Tool zoom-at-point + Scrubby Zoom, editable
 * status-bar zoom %, double-click Hand/Zoom toolbar icons, Alt+wheel
 * zoom semantics.
 */
import { describe, it, expect, afterEach } from 'vitest';
import { render, fireEvent, cleanup } from '@testing-library/react';
import { StatusBar } from '../components/layout/StatusBar';
import { useEditorStore } from '../store/editorStore';
import { zoomTool, applyZoomAtPoint } from '../tools/handZoom';
import type { ToolContext, ToolPointerEvent } from '../tools/Tool';

afterEach(() => {
    cleanup();
    useEditorStore.getState().setZoom(1);
    useEditorStore.getState().setPan(0, 0);
});

function ctx(): ToolContext {
    return {
        store: useEditorStore.getState(),
        getStore: () => useEditorStore.getState(),
        requestRender: () => { /* noop */ },
    };
}

function ptr(over: Partial<ToolPointerEvent>): ToolPointerEvent {
    return {
        canvasX: 0, canvasY: 0,
        clientX: 0, clientY: 0,
        button: 0, buttons: 1,
        shift: false, alt: false, meta: false, ctrl: false,
        pressure: 1,
        pointerType: 'mouse',
        rawEvent: {} as PointerEvent,
        ...over,
    };
}

describe('03 — applyZoomAtPoint math', () => {
    it('keeps the anchor pixel under the cursor after a zoom', () => {
        useEditorStore.getState().setZoom(1);
        useEditorStore.getState().setPan(0, 0);
        // Anchor at canvas (100, 200). With zoom=1 and pan=(0,0), its screen
        // position is also (100, 200). After applyZoomAtPoint to zoom=2, the
        // screen position should still be (100, 200), so pan should adjust to
        // (100 - 200, 200 - 400) = (-100, -200).
        applyZoomAtPoint(ctx(), { x: 100, y: 200 }, 2);
        const s = useEditorStore.getState();
        expect(s.zoom).toBe(2);
        expect(s.pan.x).toBe(-100);
        expect(s.pan.y).toBe(-200);
    });

    it('clamps the new zoom into [0.05, 32]', () => {
        useEditorStore.getState().setZoom(1);
        applyZoomAtPoint(ctx(), { x: 0, y: 0 }, 100);
        expect(useEditorStore.getState().zoom).toBe(32);
        applyZoomAtPoint(ctx(), { x: 0, y: 0 }, 0.001);
        expect(useEditorStore.getState().zoom).toBe(0.05);
    });
});

describe('03 — Zoom Tool click-to-zoom-at-point', () => {
    it('click without modifier zooms 2x at the click point', () => {
        useEditorStore.getState().setZoom(1);
        useEditorStore.getState().setPan(0, 0);
        zoomTool.onPointerDown!(ptr({ canvasX: 100, canvasY: 100, clientX: 200, clientY: 200 }), ctx());
        zoomTool.onPointerUp!(ptr({ canvasX: 100, canvasY: 100, clientX: 200, clientY: 200 }), ctx());
        expect(useEditorStore.getState().zoom).toBe(2);
    });

    it('Alt+click zooms 0.5x at the click point', () => {
        useEditorStore.getState().setZoom(2);
        useEditorStore.getState().setPan(0, 0);
        zoomTool.onPointerDown!(ptr({ canvasX: 100, canvasY: 100, clientX: 200, clientY: 200, alt: true }), ctx());
        zoomTool.onPointerUp!(ptr({ canvasX: 100, canvasY: 100, clientX: 200, clientY: 200, alt: true }), ctx());
        expect(useEditorStore.getState().zoom).toBe(1);
    });

    it('drag horizontally (Scrubby Zoom) past the 4px threshold updates zoom continuously', () => {
        useEditorStore.getState().setZoom(1);
        zoomTool.onPointerDown!(ptr({ canvasX: 100, canvasY: 100, clientX: 200, clientY: 200 }), ctx());
        // Move right 100px — exponential factor exp(100*0.005) = exp(0.5) ≈ 1.648.
        zoomTool.onPointerMove!(ptr({ canvasX: 100, canvasY: 100, clientX: 300, clientY: 200 }), ctx());
        expect(useEditorStore.getState().zoom).toBeCloseTo(Math.exp(0.5), 2);
        // Release after scrubbing — should NOT re-apply a 2x click jump.
        zoomTool.onPointerUp!(ptr({ canvasX: 100, canvasY: 100, clientX: 300, clientY: 200 }), ctx());
        expect(useEditorStore.getState().zoom).toBeCloseTo(Math.exp(0.5), 2);
    });

    it('drag of 3px is treated as click (no scrubby)', () => {
        useEditorStore.getState().setZoom(1);
        zoomTool.onPointerDown!(ptr({ canvasX: 50, canvasY: 50, clientX: 100, clientY: 100 }), ctx());
        zoomTool.onPointerMove!(ptr({ canvasX: 50, canvasY: 50, clientX: 103, clientY: 100 }), ctx());
        zoomTool.onPointerUp!(ptr({ canvasX: 50, canvasY: 50, clientX: 103, clientY: 100 }), ctx());
        // Click path → 2x.
        expect(useEditorStore.getState().zoom).toBe(2);
    });
});

describe('03 — Editable status-bar zoom %', () => {
    it('clicking the percent shows an input prefilled with current value', () => {
        useEditorStore.getState().setZoom(0.5);
        const { getByTestId } = render(<StatusBar />);
        const pct = getByTestId('statusbar-zoom-pct');
        expect(pct.textContent).toBe('50%');
        fireEvent.click(pct);
        const input = getByTestId('statusbar-zoom-input') as HTMLInputElement;
        expect(input.value).toBe('50');
    });

    it('typing a value and pressing Enter commits the zoom', () => {
        useEditorStore.getState().setZoom(1);
        const { getByTestId } = render(<StatusBar />);
        fireEvent.click(getByTestId('statusbar-zoom-pct'));
        const input = getByTestId('statusbar-zoom-input') as HTMLInputElement;
        fireEvent.change(input, { target: { value: '200' } });
        fireEvent.keyDown(input, { key: 'Enter' });
        expect(useEditorStore.getState().zoom).toBe(2);
    });

    it('pressing Esc reverts to the previous zoom', () => {
        useEditorStore.getState().setZoom(1);
        const { getByTestId, queryByTestId } = render(<StatusBar />);
        fireEvent.click(getByTestId('statusbar-zoom-pct'));
        const input = getByTestId('statusbar-zoom-input') as HTMLInputElement;
        fireEvent.change(input, { target: { value: '999' } });
        fireEvent.keyDown(input, { key: 'Escape' });
        expect(useEditorStore.getState().zoom).toBe(1);
        expect(queryByTestId('statusbar-zoom-input')).toBeNull();
    });

    it('a trailing % is stripped from user input', () => {
        useEditorStore.getState().setZoom(1);
        const { getByTestId } = render(<StatusBar />);
        fireEvent.click(getByTestId('statusbar-zoom-pct'));
        const input = getByTestId('statusbar-zoom-input') as HTMLInputElement;
        fireEvent.change(input, { target: { value: '150%' } });
        fireEvent.keyDown(input, { key: 'Enter' });
        expect(useEditorStore.getState().zoom).toBe(1.5);
    });
});
