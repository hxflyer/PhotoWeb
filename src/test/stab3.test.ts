/**
 * STAB-03 canvas memory guardrails.
 *
 * Coverage:
 * - MAX_DOC_PIXELS hard limit refuses creation and surfaces an error toast.
 * - SOFT_DOC_PIXELS warning is a window.confirm gate; declining cancels the
 *   create.
 * - openImageAsDocument enforces the same limit.
 * - resizeImage / resizeCanvas enforce the same limit.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { useEditorStore } from '../store/editorStore';
import { MAX_DOC_PIXELS, SOFT_DOC_PIXELS } from '../store/documentSlice';

function resetStore(): void {
    const s = useEditorStore.getState();
    s.clearHistory();
    s.clearSelection();
    useEditorStore.setState({
        layers: [],
        activeLayerId: null,
        toasts: [],
        lastErrorChannel: null,
        hasAutosave: false,
        isDirty: false,
        lastSavedHistoryTick: 0,
        width: 800,
        height: 600,
    });
}

function errorToasts() {
    return useEditorStore.getState().toasts.filter(t => t.type === 'error');
}

describe('STAB-03 memory guardrails', () => {
    let originalConfirm: typeof window.confirm;

    beforeEach(() => {
        resetStore();
        originalConfirm = window.confirm;
    });

    afterEach(() => {
        window.confirm = originalConfirm;
        vi.restoreAllMocks();
    });

    it('MAX_DOC_PIXELS is set to a browser-sensible 60 MP', () => {
        expect(MAX_DOC_PIXELS).toBe(60_000_000);
        // Soft threshold should be ~60% of the hard limit.
        expect(SOFT_DOC_PIXELS).toBeLessThan(MAX_DOC_PIXELS);
        expect(SOFT_DOC_PIXELS).toBeGreaterThan(MAX_DOC_PIXELS / 2);
    });

    it('newDocument refuses a 20000x20000 canvas and toasts', () => {
        const created = useEditorStore.getState().newDocument(20000, 20000, '#ffffff');
        expect(created).toBe(false);
        expect(useEditorStore.getState().layers.length).toBe(0);
        expect(errorToasts().some(t => /megapixel|limit/i.test(t.message))).toBe(true);
    });

    it('newDocument above the soft threshold cancels when window.confirm returns false', () => {
        window.confirm = vi.fn(() => false);
        // 8000x8000 = 64 MP — over the 60 MP hard limit, so it's rejected outright.
        // Use 7000x7000 = 49 MP which is above 36 MP soft but under 60 MP hard.
        const created = useEditorStore.getState().newDocument(7000, 7000, '#ffffff');
        expect(window.confirm).toHaveBeenCalled();
        expect(created).toBe(false);
        expect(useEditorStore.getState().layers.length).toBe(0);
    });

    it('newDocument above the soft threshold succeeds when window.confirm returns true', () => {
        window.confirm = vi.fn(() => true);
        const created = useEditorStore.getState().newDocument(7000, 7000, '#ffffff');
        expect(window.confirm).toHaveBeenCalled();
        expect(created).toBe(true);
        expect(useEditorStore.getState().layers.length).toBe(1);
        expect(useEditorStore.getState().width).toBe(7000);
        expect(useEditorStore.getState().height).toBe(7000);
    });

    it('newDocument under the soft threshold creates without prompting', () => {
        const confirmSpy = vi.fn(() => true);
        window.confirm = confirmSpy;
        const created = useEditorStore.getState().newDocument(1920, 1080, '#ffffff');
        expect(created).toBe(true);
        expect(confirmSpy).not.toHaveBeenCalled();
        expect(useEditorStore.getState().layers.length).toBe(1);
    });

    it('openImageAsDocument refuses an oversized image', () => {
        // Build a stub HTMLImageElement-shaped object — openImageAsDocument
        // reads naturalWidth / naturalHeight only.
        const fakeImg = {
            naturalWidth: 15000,
            naturalHeight: 15000,
            width: 15000,
            height: 15000,
        } as unknown as HTMLImageElement;
        const opened = useEditorStore.getState().openImageAsDocument(fakeImg, 'huge.jpg');
        expect(opened).toBe(false);
        expect(errorToasts().some(t => /megapixel|limit/i.test(t.message))).toBe(true);
    });

    it('resizeImage refuses an oversized target', () => {
        useEditorStore.getState().newDocument(200, 200, '#ffffff');
        const w0 = useEditorStore.getState().width;
        useEditorStore.getState().resizeImage(20000, 20000, 'bilinear');
        // Document size should not have changed.
        expect(useEditorStore.getState().width).toBe(w0);
        expect(errorToasts().some(t => /megapixel|limit/i.test(t.message))).toBe(true);
    });

    it('resizeCanvas refuses an oversized target', () => {
        useEditorStore.getState().newDocument(200, 200, '#ffffff');
        const w0 = useEditorStore.getState().width;
        useEditorStore.getState().resizeCanvas(20000, 20000, 0, 0, '#ffffff');
        expect(useEditorStore.getState().width).toBe(w0);
        expect(errorToasts().some(t => /megapixel|limit/i.test(t.message))).toBe(true);
    });
});
