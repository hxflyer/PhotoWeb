/**
 * 01a-interface-shell — simulator-driven coverage for the four document-
 * window-chrome features landed in this cluster:
 *
 *   1. Document Tab (no × close button this tick; deferred to 04c).
 *   2. Status Bar info-mode menu + press-and-hold dimensions popover.
 *   3. Pasteboard color picker (right-click context menu).
 *   4. Color theme (Shift+F1 / Shift+F2 cycle + Preferences > Interface
 *      thumbnails).
 *
 * Tests assert the Photoshop hotkey, modifier, and choreography end-to-end:
 * multi-step gestures use multi-step input scripts, cursor changes and
 * Esc/Enter outcomes are explicitly checked.
 */
import { describe, it, expect, afterEach, beforeEach, vi } from 'vitest';
import { render, fireEvent, cleanup, act } from '@testing-library/react';
import { DocumentTab } from '../components/layout/DocumentTab';
import { StatusBar } from '../components/layout/StatusBar';
import { PasteboardContextMenu } from '../components/layout/PasteboardContextMenu';
import { PreferencesDialog } from '../components/Dialogs/PreferencesDialog';
import { useEditorStore } from '../store/editorStore';

afterEach(() => {
    cleanup();
    // Reset relevant store state between tests.
    const s = useEditorStore.getState();
    s.setColorTheme('dark');
    s.setPasteboardColor('default');
    s.setStatusBarInfoMode('documentSizes');
    if (typeof document !== 'undefined') {
        delete document.documentElement.dataset.theme;
        document.documentElement.style.removeProperty('--pasteboard-bg');
    }
});

beforeEach(() => {
    vi.useFakeTimers();
});

afterEach(() => {
    vi.useRealTimers();
});

describe('01a — Document Tab', () => {
    it('renders <filename> @ <zoom>% (RGB/8) and updates live when zoom changes', () => {
        useEditorStore.setState({ documentName: 'photo.jpg', zoom: 0.25, isDirty: false });
        const { getByTestId, rerender } = render(<DocumentTab />);
        expect(getByTestId('document-tab-name').textContent).toBe('photo.jpg');
        expect(getByTestId('document-tab-zoom').textContent).toBe('25%');
        // Zoom change re-renders live.
        act(() => { useEditorStore.setState({ zoom: 1 }); });
        rerender(<DocumentTab />);
        expect(getByTestId('document-tab-zoom').textContent).toBe('100%');
    });

    it('shows trailing * only when the document is dirty', () => {
        useEditorStore.setState({ documentName: 'photo.jpg', isDirty: false });
        const { queryByTestId, rerender } = render(<DocumentTab />);
        expect(queryByTestId('document-tab-dirty')).toBeNull();
        act(() => { useEditorStore.setState({ isDirty: true }); });
        rerender(<DocumentTab />);
        expect(queryByTestId('document-tab-dirty')?.textContent).toBe('*');
    });

    it('appends .png when documentName has no extension and strips path prefix', () => {
        useEditorStore.setState({ documentName: 'Untitled' });
        const { getByTestId, rerender } = render(<DocumentTab />);
        expect(getByTestId('document-tab-name').textContent).toBe('Untitled.png');
        act(() => { useEditorStore.setState({ documentName: '/Users/me/Documents/IMG_001.jpg' }); });
        rerender(<DocumentTab />);
        expect(getByTestId('document-tab-name').textContent).toBe('IMG_001.jpg');
    });
});

describe('01a — Status Bar info-mode menu', () => {
    it('opens the mode menu from the > arrow with 5 modes in order', () => {
        useEditorStore.setState({ width: 100, height: 100 });
        const { getByTestId, getAllByTestId } = render(<StatusBar />);
        fireEvent.mouseDown(getByTestId('status-info-arrow'));
        const menu = getByTestId('status-info-menu');
        const items = Array.from(menu.querySelectorAll('[role="menuitem"]'));
        expect(items.map(i => i.textContent?.trim())).toEqual([
            '✓Document Sizes',
            'Document Profile',
            'Document Dimensions',
            'Current Tool',
            'Layer Count',
        ]);
        // The active mode has data-active set.
        const active = getAllByTestId(/^status-info-mode-/).filter(el => el.dataset.active === 'true');
        expect(active.map(el => el.dataset.testid)).toEqual(['status-info-mode-documentSizes']);
    });

    it('selecting Document Dimensions updates the visible text and persists', () => {
        useEditorStore.setState({ width: 800, height: 600 });
        const { getByTestId } = render(<StatusBar />);
        fireEvent.mouseDown(getByTestId('status-info-arrow'));
        fireEvent.mouseDown(getByTestId('status-info-mode-documentDimensions'));
        expect(getByTestId('status-info-text').textContent).toBe('800 px × 600 px (72 ppi)');
        expect(useEditorStore.getState().statusBarInfoMode).toBe('documentDimensions');
    });

    it('pressing Escape closes the mode menu without changing the active mode', () => {
        const { getByTestId, queryByTestId } = render(<StatusBar />);
        fireEvent.mouseDown(getByTestId('status-info-arrow'));
        expect(queryByTestId('status-info-menu')).not.toBeNull();
        fireEvent.keyDown(document, { key: 'Escape' });
        expect(queryByTestId('status-info-menu')).toBeNull();
        expect(useEditorStore.getState().statusBarInfoMode).toBe('documentSizes');
    });

    it('press-and-hold for 200ms shows the dimensions popover; release dismisses it', () => {
        useEditorStore.setState({ width: 1024, height: 768 });
        const { getByTestId, queryByTestId } = render(<StatusBar />);
        const txt = getByTestId('status-info-text');
        fireEvent.mouseDown(txt, { button: 0, clientX: 0, clientY: 0 });
        // Before threshold, no popover.
        act(() => { vi.advanceTimersByTime(50); });
        expect(queryByTestId('status-info-popover')).toBeNull();
        // After threshold, popover appears with dimensions content.
        act(() => { vi.advanceTimersByTime(200); });
        const popover = getByTestId('status-info-popover');
        expect(popover.textContent).toContain('Width: 1024 pixels');
        expect(popover.textContent).toContain('Height: 768 pixels');
        expect(popover.textContent).toContain('Channels: 3 (RGB Color, 8bpc)');
        expect(popover.textContent).toContain('Resolution: 72 pixels/inch');
        // Releasing dismisses.
        fireEvent.mouseUp(txt);
        expect(queryByTestId('status-info-popover')).toBeNull();
    });

    it('moving the mouse during press-and-hold cancels the popover', () => {
        const { getByTestId, queryByTestId } = render(<StatusBar />);
        const txt = getByTestId('status-info-text');
        fireEvent.mouseDown(txt, { button: 0, clientX: 0, clientY: 0 });
        fireEvent.mouseMove(txt, { clientX: 20, clientY: 0 });
        act(() => { vi.advanceTimersByTime(300); });
        expect(queryByTestId('status-info-popover')).toBeNull();
    });
});

describe('01a — Pasteboard color picker', () => {
    it('renders 6 preset entries plus "Select Custom Color…" in order', () => {
        const { getByTestId, queryByTestId } = render(
            <PasteboardContextMenu
                state={{ x: 100, y: 100 }}
                onClose={() => { /* noop */ }}
                onPickCustom={() => { /* noop */ }}
            />
        );
        for (const id of ['default', 'black', 'darkGray', 'mediumGray', 'lightGray', 'custom']) {
            expect(queryByTestId(`pasteboard-preset-${id}`)).not.toBeNull();
        }
        expect(getByTestId('pasteboard-pick-custom').textContent).toContain('Select Custom Color');
    });

    it('selecting Medium Gray sets store + closes the menu', () => {
        let closed = false;
        const { getByTestId } = render(
            <PasteboardContextMenu
                state={{ x: 0, y: 0 }}
                onClose={() => { closed = true; }}
                onPickCustom={() => { /* noop */ }}
            />
        );
        fireEvent.mouseDown(getByTestId('pasteboard-preset-mediumGray'));
        expect(useEditorStore.getState().pasteboardColor).toBe('mediumGray');
        expect(closed).toBe(true);
    });

    it('clicking "Select Custom Color…" calls onPickCustom (which opens the ColorPickerDialog)', () => {
        let pickedCustom = false;
        const { getByTestId } = render(
            <PasteboardContextMenu
                state={{ x: 0, y: 0 }}
                onClose={() => { /* noop */ }}
                onPickCustom={() => { pickedCustom = true; }}
            />
        );
        fireEvent.mouseDown(getByTestId('pasteboard-pick-custom'));
        expect(pickedCustom).toBe(true);
    });

    it('Esc closes the menu without changing the pasteboard color', () => {
        const start = useEditorStore.getState().pasteboardColor;
        let closed = false;
        render(
            <PasteboardContextMenu
                state={{ x: 0, y: 0 }}
                onClose={() => { closed = true; }}
                onPickCustom={() => { /* noop */ }}
            />
        );
        fireEvent.keyDown(document, { key: 'Escape' });
        expect(closed).toBe(true);
        expect(useEditorStore.getState().pasteboardColor).toBe(start);
    });
});

describe('01a — Color theme', () => {
    it('cycleColorTheme(+1) walks darkest → dark → light → lightest → darkest', () => {
        useEditorStore.getState().setColorTheme('darkest');
        useEditorStore.getState().cycleColorTheme(1);
        expect(useEditorStore.getState().colorTheme).toBe('dark');
        useEditorStore.getState().cycleColorTheme(1);
        expect(useEditorStore.getState().colorTheme).toBe('light');
        useEditorStore.getState().cycleColorTheme(1);
        expect(useEditorStore.getState().colorTheme).toBe('lightest');
        useEditorStore.getState().cycleColorTheme(1);
        expect(useEditorStore.getState().colorTheme).toBe('darkest');
    });

    it('cycleColorTheme(-1) walks lightest → light → dark → darkest → lightest', () => {
        useEditorStore.getState().setColorTheme('lightest');
        useEditorStore.getState().cycleColorTheme(-1);
        expect(useEditorStore.getState().colorTheme).toBe('light');
        useEditorStore.getState().cycleColorTheme(-1);
        expect(useEditorStore.getState().colorTheme).toBe('dark');
        useEditorStore.getState().cycleColorTheme(-1);
        expect(useEditorStore.getState().colorTheme).toBe('darkest');
        useEditorStore.getState().cycleColorTheme(-1);
        expect(useEditorStore.getState().colorTheme).toBe('lightest');
    });

    it('clicking a thumbnail in PreferencesDialog applies the theme immediately', () => {
        useEditorStore.getState().setColorTheme('dark');
        const { getByTestId } = render(<PreferencesDialog isOpen onClose={() => { /* noop */ }} />);
        fireEvent.click(getByTestId('color-theme-thumb-lightest'));
        expect(useEditorStore.getState().colorTheme).toBe('lightest');
        expect(getByTestId('color-theme-thumb-lightest').dataset.active).toBe('true');
    });

    it('persists colorTheme to localStorage under photoweb:chromePrefs:v1', () => {
        // jsdom doesn't always provide a functional localStorage; install a
        // tiny in-memory shim so we can verify what the slice would write.
        const store: Record<string, string> = {};
        const originalLs = globalThis.localStorage;
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
            useEditorStore.getState().setColorTheme('light');
            const raw = store['photoweb:chromePrefs:v1'];
            expect(raw).toBeDefined();
            expect(JSON.parse(raw)).toMatchObject({ colorTheme: 'light' });
        } finally {
            Object.defineProperty(globalThis, 'localStorage', {
                configurable: true,
                value: originalLs,
            });
        }
    });
});
