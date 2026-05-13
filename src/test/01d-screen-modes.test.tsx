/**
 * 01d-screen-modes — three Photoshop screen modes wired through viewSlice.
 *
 * Standard / Full Screen Mode With Menu Bar / Full Screen Mode.
 * F cycles forward, Shift+F cycles backward, Esc exits Full Screen,
 * View > Screen Mode menu items and the toolbar flyout both set the mode.
 */
import { describe, it, expect, afterEach } from 'vitest';
import { useEditorStore } from '../store/editorStore';

afterEach(() => {
    useEditorStore.getState().setScreenMode('standard');
});

describe('01d — screen mode cycle', () => {
    it('cycleScreenMode(+1) cycles Standard → Full-With-Menu → Full → Standard', () => {
        const s = useEditorStore.getState();
        s.setScreenMode('standard');
        s.cycleScreenMode(1);
        expect(useEditorStore.getState().screenMode).toBe('full-with-menu');
        s.cycleScreenMode(1);
        expect(useEditorStore.getState().screenMode).toBe('full');
        s.cycleScreenMode(1);
        expect(useEditorStore.getState().screenMode).toBe('standard');
    });

    it('cycleScreenMode(-1) cycles backward Standard → Full → Full-With-Menu → Standard', () => {
        const s = useEditorStore.getState();
        s.setScreenMode('standard');
        s.cycleScreenMode(-1);
        expect(useEditorStore.getState().screenMode).toBe('full');
        s.cycleScreenMode(-1);
        expect(useEditorStore.getState().screenMode).toBe('full-with-menu');
        s.cycleScreenMode(-1);
        expect(useEditorStore.getState().screenMode).toBe('standard');
    });

    it('setScreenMode directly sets each mode', () => {
        useEditorStore.getState().setScreenMode('full');
        expect(useEditorStore.getState().screenMode).toBe('full');
        useEditorStore.getState().setScreenMode('full-with-menu');
        expect(useEditorStore.getState().screenMode).toBe('full-with-menu');
        useEditorStore.getState().setScreenMode('standard');
        expect(useEditorStore.getState().screenMode).toBe('standard');
    });
});

/*
 * The keyboard-to-store wiring (F, Shift+F, Esc) lives in App.tsx and
 * registers a window-level keydown listener. We cover the cycle and
 * setter logic directly above; mounting <App /> in this unit test would
 * pull in dozens of side effects (autosave, type bindings, dialog
 * portals). End-to-end keyboard coverage rides along with the existing
 * App-level tests.
 */

describe('01d — persistence', () => {
    it('screenMode persists to photoweb:chromePrefs:v1', () => {
        const store: Record<string, string> = {};
        const original = globalThis.localStorage;
        Object.defineProperty(globalThis, 'localStorage', {
            configurable: true,
            value: {
                getItem: (k: string) => (k in store ? store[k] : null),
                setItem: (k: string, v: string) => { store[k] = v; },
                removeItem: (k: string) => { delete store[k]; },
                clear: () => { Object.keys(store).forEach(k => delete store[k]); },
                key: (i: number) => Object.keys(store)[i] ?? null,
                get length() { return Object.keys(store).length; },
            },
        });
        try {
            useEditorStore.getState().setScreenMode('full-with-menu');
            const raw = store['photoweb:chromePrefs:v1'];
            expect(raw).toBeDefined();
            expect(JSON.parse(raw).screenMode).toBe('full-with-menu');
        } finally {
            Object.defineProperty(globalThis, 'localStorage', { configurable: true, value: original });
        }
    });
});
