/**
 * STAB-02 autosave recovery reliability.
 *
 * Coverage:
 * - autosave write fails on OPFS but the localStorage fallback persists data
 *   (saveDocument + autosave path).
 * - initAutoSaveCheck clears a corrupt blob in localStorage and toasts a
 *   "Corrupt recovery information cleared" message instead of leaving a
 *   permanently-failing Recover banner.
 * - isDirty flips to true on a history advance and back to false after
 *   saveFile or markDocumentClean.
 * - Recover and Discard banner buttons load the document or clear hasAutosave.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { useEditorStore } from '../store/editorStore';
import { saveDocument } from '../core/persistence';
import { initAutoSaveCheck, resetAutosaveErrorState } from '../core/autoSave';

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
    });
    resetAutosaveErrorState();
}

function makeFakeLocalStorage(store: Map<string, string>, setItem?: () => void): Storage {
    return {
        setItem: (k: string, v: string) => { if (setItem) setItem(); store.set(k, v); },
        getItem: (k: string) => store.get(k) ?? null,
        removeItem: (k: string) => { store.delete(k); },
        clear: () => store.clear(),
        key: (i: number) => Array.from(store.keys())[i] ?? null,
        get length() { return store.size; },
    } as unknown as Storage;
}

describe('STAB-02 autosave fallback + recovery', () => {
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

    it('saveDocument writes to localStorage when OPFS is unavailable', async () => {
        useEditorStore.getState().addLayer();
        const store = useEditorStore.getState();

        const lsMap = new Map<string, string>();
        Object.defineProperty(window, 'localStorage', {
            value: makeFakeLocalStorage(lsMap),
            configurable: true,
            writable: true,
        });

        await saveDocument(store, 'autosave', { channel: 'autosave' });

        const persisted = lsMap.get('pwbdoc:autosave');
        expect(persisted).toBeTruthy();
        const parsed = JSON.parse(persisted!) as { version: number; layers: unknown[] };
        expect(parsed.version).toBe(1);
        expect(parsed.layers.length).toBeGreaterThan(0);
    });

    it('initAutoSaveCheck clears a corrupt autosave slot and toasts', async () => {
        const lsMap = new Map<string, string>();
        lsMap.set('pwbdoc:autosave', '{ this is not valid json');
        Object.defineProperty(window, 'localStorage', {
            value: makeFakeLocalStorage(lsMap),
            configurable: true,
            writable: true,
        });

        await initAutoSaveCheck(() => useEditorStore.getState());

        // Corrupt slot wiped; banner not exposed.
        expect(useEditorStore.getState().hasAutosave).toBe(false);
        expect(lsMap.get('pwbdoc:autosave')).toBeUndefined();
        const toasts = useEditorStore.getState().toasts;
        expect(toasts.some(t => /corrupt recovery/i.test(t.message))).toBe(true);
    });

    it('initAutoSaveCheck keeps a valid autosave slot and exposes the recover banner', async () => {
        const lsMap = new Map<string, string>();
        lsMap.set('pwbdoc:autosave', JSON.stringify({
            version: 1, name: 'autosave', width: 10, height: 10,
            activeLayerId: null, layers: [], timestamp: Date.now(),
        }));
        Object.defineProperty(window, 'localStorage', {
            value: makeFakeLocalStorage(lsMap),
            configurable: true,
            writable: true,
        });

        await initAutoSaveCheck(() => useEditorStore.getState());

        expect(useEditorStore.getState().hasAutosave).toBe(true);
        expect(lsMap.get('pwbdoc:autosave')).toBeTruthy();
    });

    it('isDirty flips to true on a history advance and resets after saveFile', async () => {
        useEditorStore.getState().addLayer();
        // Mark clean as if document was just opened.
        useEditorStore.getState().markDocumentClean();
        expect(useEditorStore.getState().isDirty).toBe(false);

        // Any history-committing edit (e.g., adding another layer) marks dirty.
        useEditorStore.getState().addLayer();
        expect(useEditorStore.getState().isDirty).toBe(true);

        const lsMap = new Map<string, string>();
        Object.defineProperty(window, 'localStorage', {
            value: makeFakeLocalStorage(lsMap),
            configurable: true,
            writable: true,
        });

        await useEditorStore.getState().saveFile('test-doc');
        expect(useEditorStore.getState().isDirty).toBe(false);
    });

    it('markDocumentClean resets the dirty flag', () => {
        useEditorStore.getState().addLayer();
        useEditorStore.getState().markDocumentDirty();
        expect(useEditorStore.getState().isDirty).toBe(true);
        useEditorStore.getState().markDocumentClean();
        expect(useEditorStore.getState().isDirty).toBe(false);
    });

    it('Discard clears hasAutosave', () => {
        useEditorStore.setState({ hasAutosave: true });
        useEditorStore.getState().dismissAutosave();
        expect(useEditorStore.getState().hasAutosave).toBe(false);
    });

    it('Recover banner calls loadFile and Discard dismisses', async () => {
        // The Recover button on the banner wires onClick to:
        //   gs().loadFile('autosave').then(() => gs().dismissAutosave())
        // Verify each piece independently — full loadFile round-trip is
        // covered separately in persistenceErrors.test.ts; here we focus on
        // the banner action surface.

        // Discard path.
        useEditorStore.setState({ hasAutosave: true });
        useEditorStore.getState().dismissAutosave();
        expect(useEditorStore.getState().hasAutosave).toBe(false);

        // Recover path: verify loadFile is callable and surfaces errors to the
        // load channel when the slot is missing.
        const lsMap = new Map<string, string>();
        Object.defineProperty(window, 'localStorage', {
            value: makeFakeLocalStorage(lsMap),
            configurable: true,
            writable: true,
        });
        useEditorStore.setState({ hasAutosave: true });

        let threw = false;
        try { await useEditorStore.getState().loadFile('autosave'); }
        catch { threw = true; }
        expect(threw).toBe(true);
        expect(useEditorStore.getState().lastErrorChannel).toBe('load');
    });
});
