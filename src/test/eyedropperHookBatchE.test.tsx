import { describe, it, expect, afterEach } from 'vitest';
import { renderHook, act, cleanup } from '@testing-library/react';
import { useDialogEyedropper } from '../hooks/useDialogEyedropper';

afterEach(() => cleanup());

function makeRedCanvas(): HTMLCanvasElement {
    const c = document.createElement('canvas');
    c.width = 4;
    c.height = 4;
    const ctx = c.getContext('2d');
    if (!ctx) throw new Error('canvas2d ctx unavailable');
    ctx.fillStyle = '#ff0000';
    ctx.fillRect(0, 0, 4, 4);
    return c;
}

describe('Batch E — useDialogEyedropper', () => {
    it('starts idle (not armed, null slot)', () => {
        const c = makeRedCanvas();
        const { result } = renderHook(() => useDialogEyedropper({ getActiveLayerCanvas: () => c }));
        expect(result.current.isArmed).toBe(false);
        expect(result.current.armedSlot).toBeNull();
    });

    it('activate() arms the named slot', () => {
        const c = makeRedCanvas();
        const { result } = renderHook(() => useDialogEyedropper({ getActiveLayerCanvas: () => c }));
        act(() => { result.current.activate('black', () => { /* noop */ }); });
        expect(result.current.isArmed).toBe(true);
        expect(result.current.armedSlot).toBe('black');
    });

    it('cancel() disarms without firing the callback', () => {
        const c = makeRedCanvas();
        let called = false;
        const { result } = renderHook(() => useDialogEyedropper({ getActiveLayerCanvas: () => c }));
        act(() => { result.current.activate('white', () => { called = true; }); });
        act(() => { result.current.cancel(); });
        expect(result.current.isArmed).toBe(false);
        expect(called).toBe(false);
    });

    it('sampleAt() returns RGBA and luma for the active layer pixel', () => {
        const c = makeRedCanvas();
        const { result } = renderHook(() => useDialogEyedropper({ getActiveLayerCanvas: () => c }));
        const sample = result.current.sampleAt(2, 2);
        expect(sample).not.toBeNull();
        expect(sample!.r).toBe(255);
        expect(sample!.g).toBe(0);
        expect(sample!.b).toBe(0);
        // luma = 0.299*255 = ~76
        expect(sample!.luma).toBeGreaterThanOrEqual(75);
        expect(sample!.luma).toBeLessThanOrEqual(78);
    });

    it('sampleAt() returns null when coordinates are out of range', () => {
        const c = makeRedCanvas();
        const { result } = renderHook(() => useDialogEyedropper({ getActiveLayerCanvas: () => c }));
        expect(result.current.sampleAt(100, 100)).toBeNull();
        expect(result.current.sampleAt(-1, 0)).toBeNull();
    });

    it('sampleAt() returns null when there is no active layer', () => {
        const { result } = renderHook(() => useDialogEyedropper({ getActiveLayerCanvas: () => null }));
        expect(result.current.sampleAt(0, 0)).toBeNull();
    });

    it('clicking the viewport while armed samples the pixel and fires the callback', () => {
        const c = makeRedCanvas();
        let captured: { r: number; g: number; b: number; luma: number } | null = null;
        const { result } = renderHook(() => useDialogEyedropper({ getActiveLayerCanvas: () => c }));
        act(() => { result.current.activate('black', (s) => { captured = { r: s.r, g: s.g, b: s.b, luma: s.luma }; }); });

        // Create a fake viewport element matching the selector.
        const viewport = document.createElement('div');
        viewport.setAttribute('data-testid', 'viewport');
        viewport.style.position = 'absolute';
        viewport.style.left = '0';
        viewport.style.top = '0';
        viewport.style.width = '100px';
        viewport.style.height = '100px';
        document.body.appendChild(viewport);
        // jsdom returns a zero rect by default — patch it.
        viewport.getBoundingClientRect = () => ({ left: 0, top: 0, right: 100, bottom: 100, width: 100, height: 100, x: 0, y: 0, toJSON: () => ({}) }) as DOMRect;

        const event = new MouseEvent('mousedown', { clientX: 25, clientY: 25, bubbles: true, cancelable: true });
        act(() => { viewport.dispatchEvent(event); });

        expect(captured).not.toBeNull();
        expect(captured!.r).toBe(255);
        expect(captured!.g).toBe(0);
        expect(captured!.b).toBe(0);
        expect(result.current.isArmed).toBe(false);

        document.body.removeChild(viewport);
    });
});
