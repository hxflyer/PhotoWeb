/**
 * 02-preferences — category sidebar + Use Shift Key for Tool Switch.
 *
 * The dialog re-layout puts 5 categories in a left rail (General, Interface,
 * Tools, File Handling, Performance) with the content pane on the right.
 * Existing settings are redistributed; one new toggle (Use Shift Key for
 * Tool Switch) lands under Tools.
 */
import { describe, it, expect, afterEach } from 'vitest';
import { render, fireEvent, cleanup } from '@testing-library/react';
import { PreferencesDialog } from '../components/Dialogs/PreferencesDialog';
import { useEditorStore } from '../store/editorStore';

afterEach(() => {
    cleanup();
    useEditorStore.getState().setUseShiftForToolSwitch(true);
});

describe('02 — Preferences dialog category sidebar', () => {
    it('renders the sidebar with 5 categories and opens on General', () => {
        const { getByTestId } = render(<PreferencesDialog isOpen onClose={() => { /* noop */ }} />);
        for (const id of ['general', 'interface', 'tools', 'fileHandling', 'performance']) {
            expect(getByTestId(`preferences-category-${id}`)).not.toBeNull();
        }
        // General is active on open.
        expect(getByTestId('preferences-category-general').dataset.active).toBe('true');
    });

    it('clicking Interface reveals the color-theme thumbs + Neutral Color Mode checkbox', () => {
        const { getByTestId, queryByTestId } = render(<PreferencesDialog isOpen onClose={() => { /* noop */ }} />);
        fireEvent.click(getByTestId('preferences-category-interface'));
        expect(queryByTestId('color-theme-thumbs')).not.toBeNull();
        expect(queryByTestId('pref-neutral-color-mode')).not.toBeNull();
    });

    it('clicking Tools reveals the Use Shift Key for Tool Switch checkbox', () => {
        const { getByTestId, queryByTestId } = render(<PreferencesDialog isOpen onClose={() => { /* noop */ }} />);
        fireEvent.click(getByTestId('preferences-category-tools'));
        expect(queryByTestId('pref-use-shift-tool-switch')).not.toBeNull();
    });

    it('switching back to General hides the Tools-category checkbox', () => {
        const { getByTestId, queryByTestId } = render(<PreferencesDialog isOpen onClose={() => { /* noop */ }} />);
        fireEvent.click(getByTestId('preferences-category-tools'));
        expect(queryByTestId('pref-use-shift-tool-switch')).not.toBeNull();
        fireEvent.click(getByTestId('preferences-category-general'));
        expect(queryByTestId('pref-use-shift-tool-switch')).toBeNull();
    });
});

describe('02 — Use Shift Key for Tool Switch', () => {
    it('defaults to true (Photoshop default)', () => {
        expect(useEditorStore.getState().useShiftForToolSwitch).toBe(true);
    });

    it('checkbox in Preferences > Tools toggles the store', () => {
        const { getByTestId } = render(<PreferencesDialog isOpen onClose={() => { /* noop */ }} />);
        fireEvent.click(getByTestId('preferences-category-tools'));
        const checkbox = getByTestId('pref-use-shift-tool-switch') as HTMLInputElement;
        expect(checkbox.checked).toBe(true);
        fireEvent.click(checkbox);
        expect(useEditorStore.getState().useShiftForToolSwitch).toBe(false);
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
            useEditorStore.getState().setUseShiftForToolSwitch(false);
            const raw = store['photoweb:chromePrefs:v1'];
            expect(raw).toBeDefined();
            expect(JSON.parse(raw).useShiftForToolSwitch).toBe(false);
        } finally {
            Object.defineProperty(globalThis, 'localStorage', { configurable: true, value: original });
        }
    });
});
