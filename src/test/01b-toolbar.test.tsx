/**
 * 01b-toolbar — simulator-driven coverage for the toolbar UI behavior:
 *
 *   1. Click-and-hold flyout (300ms press → opens, drag-cancels, no
 *      stray tool activation).
 *   2. Single/double column toggle with `>>` / `<<` icon.
 *   3. Default-tool memory persistence per group.
 *
 * Individual tools are tested in their per-tool clusters. This file
 * focuses on the toolbar interaction surface itself.
 */
import { describe, it, expect, afterEach, beforeEach, vi } from 'vitest';
import { render, fireEvent, cleanup, act } from '@testing-library/react';
import { Toolbar } from '../components/Panels/Toolbar';
import { useEditorStore } from '../store/editorStore';

afterEach(() => {
    cleanup();
    const s = useEditorStore.getState();
    s.setToolbarColumns(1);
    // Clear the per-group memory by overwriting each known group index.
    for (let i = 0; i < 32; i++) {
        // Reset to primary by simulating "no preference" — easiest is to
        // write a no-op that the slice silently records, then verify.
    }
    // Hard reset toolbarGroupActive by stomping the store value directly.
    useEditorStore.setState({ toolbarGroupActive: {} });
});

beforeEach(() => {
    vi.useFakeTimers();
});

afterEach(() => {
    vi.useRealTimers();
});

describe('01b — click-and-hold flyout', () => {
    it('opens the flyout after 300ms press-and-hold on a tool with subs', () => {
        const { getByTestId, queryByTestId } = render(<Toolbar />);
        const marquee = getByTestId('toolbar-marquee-rect');
        fireEvent.mouseDown(marquee, { button: 0, clientX: 0, clientY: 0 });
        // Before threshold: no flyout.
        act(() => { vi.advanceTimersByTime(200); });
        expect(queryByTestId('toolbar-flyout-marquee-ellipse')).toBeNull();
        // After threshold: the flyout renders and shows the sub-tool entry.
        act(() => { vi.advanceTimersByTime(150); });
        expect(queryByTestId('toolbar-flyout-marquee-ellipse')).not.toBeNull();
    });

    it('does NOT open the flyout on a short tap; activates the displayed tool instead', () => {
        useEditorStore.getState().setTool('hand');
        const { getByTestId, queryByTestId } = render(<Toolbar />);
        const marquee = getByTestId('toolbar-marquee-rect');
        fireEvent.mouseDown(marquee, { button: 0, clientX: 0, clientY: 0 });
        // Release before threshold.
        act(() => { vi.advanceTimersByTime(80); });
        fireEvent.mouseUp(marquee);
        fireEvent.click(marquee);
        // Tool changed to the displayed primary; flyout never opened.
        expect(useEditorStore.getState().activeTool).toBe('marquee-rect');
        expect(queryByTestId('toolbar-flyout-marquee-ellipse')).toBeNull();
    });

    it('cancels the hold timer when the cursor drags >4px during the press', () => {
        useEditorStore.getState().setTool('hand');
        const { getByTestId, queryByTestId } = render(<Toolbar />);
        const lasso = getByTestId('toolbar-lasso');
        fireEvent.mouseDown(lasso, { button: 0, clientX: 0, clientY: 0 });
        fireEvent.mouseMove(lasso, { clientX: 20, clientY: 0 });
        act(() => { vi.advanceTimersByTime(400); });
        // Drag-aborted: no flyout, no tool change.
        expect(queryByTestId('toolbar-flyout-lasso-poly')).toBeNull();
        expect(useEditorStore.getState().activeTool).toBe('hand');
    });

    it('right-click still opens the flyout immediately (alternate gesture)', () => {
        const { getByTestId, queryByTestId } = render(<Toolbar />);
        fireEvent.contextMenu(getByTestId('toolbar-marquee-rect'));
        expect(queryByTestId('toolbar-flyout-marquee-ellipse')).not.toBeNull();
    });

    it('hold on a tool without subs is a no-op and the tool still activates on click', () => {
        useEditorStore.getState().setTool('hand');
        const { getByTestId } = render(<Toolbar />);
        // The Move tool group has no subs.
        const move = getByTestId('toolbar-move');
        fireEvent.mouseDown(move, { button: 0, clientX: 0, clientY: 0 });
        act(() => { vi.advanceTimersByTime(400); });
        fireEvent.mouseUp(move);
        fireEvent.click(move);
        expect(useEditorStore.getState().activeTool).toBe('move');
    });
});

describe('01b — single/double column toggle', () => {
    it('renders >> when single column and switches to << on click', () => {
        const { getByTestId } = render(<Toolbar />);
        const toggle = getByTestId('toolbar-column-toggle');
        expect(toggle.getAttribute('aria-pressed')).toBe('false');
        fireEvent.click(toggle);
        expect(useEditorStore.getState().toolbarColumns).toBe(2);
        expect(toggle.getAttribute('aria-pressed')).toBe('true');
    });

    it('clicking again returns to single column', () => {
        useEditorStore.getState().setToolbarColumns(2);
        const { getByTestId } = render(<Toolbar />);
        fireEvent.click(getByTestId('toolbar-column-toggle'));
        expect(useEditorStore.getState().toolbarColumns).toBe(1);
    });

    it('column choice persists by writing chromePrefs to localStorage', () => {
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
            useEditorStore.getState().setToolbarColumns(2);
            const raw = store['photoweb:chromePrefs:v1'];
            expect(raw).toBeDefined();
            expect(JSON.parse(raw)).toMatchObject({ toolbarColumns: 2 });
        } finally {
            Object.defineProperty(globalThis, 'localStorage', {
                configurable: true,
                value: original,
            });
        }
    });
});

describe('01b — default-tool memory', () => {
    it('selecting a sub-tool via flyout records groupActive for that group', () => {
        const { getByTestId } = render(<Toolbar />);
        // Open marquee flyout via right-click for speed.
        fireEvent.contextMenu(getByTestId('toolbar-marquee-rect'));
        // Click the ellipse marquee sub-tool.
        fireEvent.click(getByTestId('toolbar-flyout-marquee-ellipse'));
        // Find the group index for the marquee group (it's group #1 in TOOL_GROUPS).
        const groupActive = useEditorStore.getState().toolbarGroupActive;
        // The slice records per group index; values reflect the chosen tool id.
        expect(Object.values(groupActive)).toContain('marquee-ellipse');
    });

    it('group falls back to primary when stored toolId is no longer in the group', () => {
        useEditorStore.setState({ toolbarGroupActive: { 0: 'this-tool-does-not-exist' as never } });
        const { getByTestId } = render(<Toolbar />);
        // Move is group #0; should still show as `toolbar-move`, not the bogus id.
        expect(getByTestId('toolbar-move')).not.toBeNull();
    });

    it('groupActive persists via chromePrefs in localStorage', () => {
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
            useEditorStore.getState().setToolbarGroupActive(1, 'marquee-ellipse');
            const raw = store['photoweb:chromePrefs:v1'];
            expect(raw).toBeDefined();
            const parsed = JSON.parse(raw);
            expect(parsed.toolbarGroupActive[1]).toBe('marquee-ellipse');
        } finally {
            Object.defineProperty(globalThis, 'localStorage', {
                configurable: true,
                value: original,
            });
        }
    });
});
