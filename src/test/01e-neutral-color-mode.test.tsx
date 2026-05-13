/**
 * 01e-neutral-color-mode — Preferences > Interface > Neutral Color Mode.
 * Toggling the checkbox swaps the accent CSS custom properties to gray.
 */
import { describe, it, expect, afterEach } from 'vitest';
import { render, fireEvent, cleanup } from '@testing-library/react';
import { PreferencesDialog } from '../components/Dialogs/PreferencesDialog';
import { useEditorStore } from '../store/editorStore';

afterEach(() => {
    cleanup();
    useEditorStore.getState().setNeutralColorMode(false);
});

describe('01e — Neutral Color Mode store', () => {
    it('defaults to off', () => {
        expect(useEditorStore.getState().neutralColorMode).toBe(false);
    });

    it('setNeutralColorMode(true) flips the store value', () => {
        useEditorStore.getState().setNeutralColorMode(true);
        expect(useEditorStore.getState().neutralColorMode).toBe(true);
    });

    it('persists to photoweb:chromePrefs:v1', () => {
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
            useEditorStore.getState().setNeutralColorMode(true);
            const raw = store['photoweb:chromePrefs:v1'];
            expect(raw).toBeDefined();
            expect(JSON.parse(raw).neutralColorMode).toBe(true);
        } finally {
            Object.defineProperty(globalThis, 'localStorage', { configurable: true, value: original });
        }
    });
});

describe('01e — Preferences > Interface > Neutral Color Mode checkbox', () => {
    it('reflects current state and toggles the store on click', () => {
        useEditorStore.getState().setNeutralColorMode(false);
        const { getByTestId } = render(<PreferencesDialog isOpen onClose={() => { /* noop */ }} />);
        // Preferences now opens on General; switch to Interface to expose the checkbox.
        fireEvent.click(getByTestId('preferences-category-interface'));
        const checkbox = getByTestId('pref-neutral-color-mode') as HTMLInputElement;
        expect(checkbox.checked).toBe(false);
        fireEvent.click(checkbox);
        expect(useEditorStore.getState().neutralColorMode).toBe(true);
    });
});
