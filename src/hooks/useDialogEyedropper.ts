// Shared eyedropper hook used by AdjustmentDialog (Levels, Curves, Exposure,
// Hue/Saturation, Black & White). Returns an `activate(onSampled)` function
// that arms a one-shot sampling mode: the next click on the document canvas
// resolves the active layer pixel under the cursor and invokes the callback
// with {r,g,b,luma,x,y}. While armed the page-cursor is forced to crosshair
// and the dialog is responsible for visually de-emphasising itself so the
// canvas underneath is clickable.

import { useCallback, useEffect, useRef, useState } from 'react';

export interface EyedropperSample {
    r: number;
    g: number;
    b: number;
    luma: number;
    x: number;
    y: number;
}

export type EyedropperCallback = (sample: EyedropperSample) => void;

interface UseDialogEyedropperResult {
    /** True while a sample is being awaited. */
    isArmed: boolean;
    /** Identifier of the active slot (e.g., 'black', 'gray', 'white'). null when idle. */
    armedSlot: string | null;
    /** Arm sampling with an identifier; resolves on the next canvas click. */
    activate: (slot: string, onSampled: EyedropperCallback) => void;
    /** Cancel any pending arm. */
    cancel: () => void;
    /**
     * Sample the active layer at canvas coordinates and return {r,g,b}. Exposed
     * so unit tests can drive the callback without rendering the Viewport.
     */
    sampleAt: (canvasX: number, canvasY: number) => EyedropperSample | null;
}

interface ActiveLayerProvider {
    getActiveLayerCanvas: () => HTMLCanvasElement | null;
}

const VIEWPORT_SELECTOR = '[data-testid="viewport"], canvas[data-photoweb-canvas]';

function readPixel(canvas: HTMLCanvasElement, x: number, y: number): EyedropperSample | null {
    if (x < 0 || y < 0 || x >= canvas.width || y >= canvas.height) return null;
    const ctx = canvas.getContext('2d');
    if (!ctx) return null;
    const data = ctx.getImageData(Math.floor(x), Math.floor(y), 1, 1).data;
    const r = data[0];
    const g = data[1];
    const b = data[2];
    const luma = Math.round(0.299 * r + 0.587 * g + 0.114 * b);
    return { r, g, b, luma, x, y };
}

export function useDialogEyedropper(provider: ActiveLayerProvider): UseDialogEyedropperResult {
    const [armedSlot, setArmedSlot] = useState<string | null>(null);
    const callbackRef = useRef<EyedropperCallback | null>(null);

    const sampleAt = useCallback((canvasX: number, canvasY: number): EyedropperSample | null => {
        const canvas = provider.getActiveLayerCanvas();
        if (!canvas) return null;
        return readPixel(canvas, canvasX, canvasY);
    }, [provider]);

    const cancel = useCallback(() => {
        setArmedSlot(null);
        callbackRef.current = null;
    }, []);

    const activate = useCallback((slot: string, onSampled: EyedropperCallback) => {
        callbackRef.current = onSampled;
        setArmedSlot(slot);
    }, []);

    useEffect(() => {
        if (!armedSlot) return undefined;
        const handler = (event: MouseEvent) => {
            const target = event.target as HTMLElement | null;
            if (!target) return;
            const viewportEl = target.closest(VIEWPORT_SELECTOR) as HTMLElement | null;
            if (!viewportEl) {
                cancel();
                return;
            }
            const rect = viewportEl.getBoundingClientRect();
            const canvas = provider.getActiveLayerCanvas();
            if (!canvas) { cancel(); return; }
            const relX = (event.clientX - rect.left) / rect.width;
            const relY = (event.clientY - rect.top) / rect.height;
            const cx = Math.floor(relX * canvas.width);
            const cy = Math.floor(relY * canvas.height);
            const sample = readPixel(canvas, cx, cy);
            const cb = callbackRef.current;
            callbackRef.current = null;
            setArmedSlot(null);
            if (sample && cb) cb(sample);
            event.preventDefault();
            event.stopPropagation();
        };
        const escHandler = (event: KeyboardEvent) => {
            if (event.key === 'Escape') cancel();
        };
        document.addEventListener('mousedown', handler, true);
        document.addEventListener('keydown', escHandler, true);
        return () => {
            document.removeEventListener('mousedown', handler, true);
            document.removeEventListener('keydown', escHandler, true);
        };
    }, [armedSlot, cancel, provider]);

    return { isArmed: armedSlot !== null, armedSlot, activate, cancel, sampleAt };
}
