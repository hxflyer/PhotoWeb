/**
 * Persistence / autosave / export error toast routing (STAB-01).
 *
 * Each failure path that used to swallow errors should now push an actionable
 * toast through `toastsSlice.reportError(channel, ...)`. Repeated failures on
 * the same channel must dedupe to one toast.
 */

import React from 'react';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, fireEvent, cleanup } from '@testing-library/react';
import { useEditorStore } from '../store/editorStore';
import { saveDocument, loadDocument, autosave } from '../core/persistence';
import { performAutosaveOnce, resetAutosaveErrorState } from '../core/autoSave';
import { ExportDialog } from '../components/Dialogs/ExportDialog';

function resetStore(): void {
    const store = useEditorStore.getState();
    store.clearHistory();
    store.clearSelection();
    useEditorStore.setState({
        layers: [],
        activeLayerId: null,
        toasts: [],
        lastErrorChannel: null,
    });
    resetAutosaveErrorState();
}

function lastToast() {
    const toasts = useEditorStore.getState().toasts;
    return toasts[toasts.length - 1];
}

function errorToasts() {
    return useEditorStore.getState().toasts.filter(t => t.type === 'error');
}

describe('STAB-01 persistence error toasts', () => {
    let originalLocalStorage: Storage;

    beforeEach(() => {
        resetStore();
        originalLocalStorage = window.localStorage;
    });

    afterEach(() => {
        Object.defineProperty(window, 'localStorage', {
            value: originalLocalStorage,
            configurable: true,
            writable: true,
        });
        vi.restoreAllMocks();
    });

    it('saveDocument surfaces a quota toast when localStorage throws QuotaExceededError', async () => {
        useEditorStore.getState().addLayer();
        const store = useEditorStore.getState();

        const quotaError = Object.assign(new Error('Quota exceeded'), { name: 'QuotaExceededError' });
        Object.defineProperty(window, 'localStorage', {
            value: {
                setItem: () => { throw quotaError; },
                getItem: () => null,
                removeItem: () => { /* noop */ },
                clear: () => { /* noop */ },
                key: () => null,
                length: 0,
            } as unknown as Storage,
            configurable: true,
            writable: true,
        });

        await expect(saveDocument(store, 'doc-quota')).rejects.toBeTruthy();

        const toast = lastToast();
        expect(toast).toBeTruthy();
        expect(toast.type).toBe('error');
        expect(toast.message.toLowerCase()).toMatch(/quota/);
        expect(useEditorStore.getState().lastErrorChannel).toBe('quota');
    });

    it('loadDocument surfaces an invalid-file toast when JSON.parse fails', async () => {
        Object.defineProperty(window, 'localStorage', {
            value: {
                setItem: () => { /* noop */ },
                getItem: () => 'not-valid-json{',
                removeItem: () => { /* noop */ },
                clear: () => { /* noop */ },
                key: () => null,
                length: 0,
            } as unknown as Storage,
            configurable: true,
            writable: true,
        });

        await expect(
            loadDocument('broken', () => useEditorStore.getState(), () => { /* set noop */ }),
        ).rejects.toBeTruthy();

        const toast = lastToast();
        expect(toast).toBeTruthy();
        expect(toast.type).toBe('error');
        expect(toast.message.toLowerCase()).toMatch(/valid \.pwbdoc|not a valid/);
        expect(useEditorStore.getState().lastErrorChannel).toBe('load');
    });

    it('loadDocument surfaces a missing-file toast when there is no saved document', async () => {
        Object.defineProperty(window, 'localStorage', {
            value: {
                setItem: () => { /* noop */ },
                getItem: () => null,
                removeItem: () => { /* noop */ },
                clear: () => { /* noop */ },
                key: () => null,
                length: 0,
            } as unknown as Storage,
            configurable: true,
            writable: true,
        });

        await expect(
            loadDocument('ghost', () => useEditorStore.getState(), () => { /* set noop */ }),
        ).rejects.toBeTruthy();

        const toast = lastToast();
        expect(toast).toBeTruthy();
        expect(toast.type).toBe('error');
        expect(toast.message.toLowerCase()).toMatch(/no saved file|could not load/);
    });

    it('autosave deduplicates: 3 failing ticks produce ONE error toast', async () => {
        useEditorStore.getState().addLayer();
        const store = useEditorStore.getState();

        const quotaError = Object.assign(new Error('Quota exceeded'), { name: 'QuotaExceededError' });
        Object.defineProperty(window, 'localStorage', {
            value: {
                setItem: () => { throw quotaError; },
                getItem: () => null,
                removeItem: () => { /* noop */ },
                clear: () => { /* noop */ },
                key: () => null,
                length: 0,
            } as unknown as Storage,
            configurable: true,
            writable: true,
        });

        // Three back-to-back autosave failures should each be swallowed and
        // produce only one error toast on the same channel.
        await expect(autosave(store)).rejects.toBeTruthy();
        await expect(autosave(store)).rejects.toBeTruthy();
        await expect(autosave(store)).rejects.toBeTruthy();

        expect(errorToasts().length).toBe(1);
        expect(useEditorStore.getState().lastErrorChannel).toBe('quota');
    });

    it('performAutosaveOnce swallows autosave errors and reports a single toast across repeated ticks', async () => {
        useEditorStore.getState().addLayer();

        const quotaError = Object.assign(new Error('Quota exceeded'), { name: 'QuotaExceededError' });
        Object.defineProperty(window, 'localStorage', {
            value: {
                setItem: () => { throw quotaError; },
                getItem: () => null,
                removeItem: () => { /* noop */ },
                clear: () => { /* noop */ },
                key: () => null,
                length: 0,
            } as unknown as Storage,
            configurable: true,
            writable: true,
        });

        const getStore = () => ({
            ...useEditorStore.getState(),
        });

        // performAutosaveOnce must not throw — it's the timer-tick contract.
        await performAutosaveOnce(getStore);
        await performAutosaveOnce(getStore);
        await performAutosaveOnce(getStore);

        expect(errorToasts().length).toBe(1);
    });

    it('successful saveDocument does NOT add an error toast', async () => {
        useEditorStore.getState().addLayer();
        const store = useEditorStore.getState();

        const setSpy = vi.fn();
        Object.defineProperty(window, 'localStorage', {
            value: {
                setItem: setSpy,
                getItem: () => null,
                removeItem: () => { /* noop */ },
                clear: () => { /* noop */ },
                key: () => null,
                length: 0,
            } as unknown as Storage,
            configurable: true,
            writable: true,
        });

        await saveDocument(store, 'doc-ok');
        expect(setSpy).toHaveBeenCalled();
        expect(errorToasts().length).toBe(0);
    });

    it('reportError dedupes consecutive errors on the same channel', () => {
        const s = useEditorStore.getState();
        s.reportError('save', 'first save error', 'error');
        s.reportError('save', 'second save error', 'error');
        s.reportError('save', 'third save error', 'error');

        expect(errorToasts().length).toBe(1);
        expect(errorToasts()[0].message).toBe('first save error');
    });

    it('reportError surfaces a new toast after the dedup flag is cleared', () => {
        const s = useEditorStore.getState();
        s.reportError('save', 'first save error', 'error');
        expect(errorToasts().length).toBe(1);
        s.clearLastErrorChannel();
        s.reportError('save', 'second save error', 'error');
        expect(errorToasts().length).toBe(2);
    });

    it('reportError on a different channel emits a new toast even without clearing', () => {
        const s = useEditorStore.getState();
        s.reportError('save', 'save error', 'error');
        s.reportError('export', 'export error', 'error');
        expect(errorToasts().length).toBe(2);
    });
});

describe('STAB-01 export error toast', () => {
    beforeEach(() => {
        resetStore();
    });

    afterEach(() => {
        cleanup();
        vi.restoreAllMocks();
    });

    it('ExportDialog surfaces an actionable toast when canvas.toBlob returns null', async () => {
        useEditorStore.getState().addLayer();

        const originalToBlob = HTMLCanvasElement.prototype.toBlob;
        HTMLCanvasElement.prototype.toBlob = function patchedToBlob(
            this: HTMLCanvasElement,
            cb: BlobCallback,
        ): void {
            cb(null);
        };

        try {
            const onClose = vi.fn();
            const { getByTestId } = render(
                React.createElement(ExportDialog, { isOpen: true, onClose }),
            );
            fireEvent.click(getByTestId('export-download-btn'));

            expect(errorToasts().length).toBe(1);
            expect(errorToasts()[0].message.toLowerCase()).toMatch(/export failed/);
            expect(useEditorStore.getState().lastErrorChannel).toBe('export');
            expect(onClose).not.toHaveBeenCalled();
        } finally {
            HTMLCanvasElement.prototype.toBlob = originalToBlob;
        }
    });

    it('ExportDialog surfaces a toast when canvas.toBlob throws synchronously', () => {
        useEditorStore.getState().addLayer();

        const originalToBlob = HTMLCanvasElement.prototype.toBlob;
        HTMLCanvasElement.prototype.toBlob = function patchedToBlob(): void {
            throw new Error('encoder not available');
        };

        try {
            const onClose = vi.fn();
            const { getByTestId } = render(
                React.createElement(ExportDialog, { isOpen: true, onClose }),
            );
            fireEvent.click(getByTestId('export-download-btn'));

            expect(errorToasts().length).toBe(1);
            expect(errorToasts()[0].message.toLowerCase()).toMatch(/export failed/);
        } finally {
            HTMLCanvasElement.prototype.toBlob = originalToBlob;
        }
    });
});
