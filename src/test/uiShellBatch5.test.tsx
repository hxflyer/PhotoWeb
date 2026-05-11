import { describe, it, expect, beforeEach, afterEach, beforeAll, afterAll } from 'vitest';
import { render, cleanup, act } from '@testing-library/react';
import { useEditorStore } from '../store/editorStore';
import { ensureStubsRegistered } from '../tools/stubs';
import { Layer } from '../core/Layer';
import { NavigatorPanel } from '../components/Panels/NavigatorPanel';
import { InfoPanel } from '../components/Panels/InfoPanel';
import { StatusBar } from '../components/layout/StatusBar';
import App from '../App';
import { runScript } from './simulator';

ensureStubsRegistered();

const SWATCH_KEY = 'photoweb:swatches:v1';
const PREFS_KEY = 'photoweb:userPrefs:v1';

// Node 25 ships a stub `localStorage` global without a working `setItem`, which
// shadows jsdom's. Install an in-memory Storage stand-in so the colorSlice and
// App boot code can actually persist values during the test run.
function installFakeStorage() {
    const store = new Map<string, string>();
    const fake = {
        getItem: (k: string) => store.get(k) ?? null,
        setItem: (k: string, v: string) => { store.set(k, String(v)); },
        removeItem: (k: string) => { store.delete(k); },
        clear: () => { store.clear(); },
        key: (i: number) => Array.from(store.keys())[i] ?? null,
        get length() { return store.size; },
    } as Storage;
    Object.defineProperty(window, 'localStorage', { value: fake, configurable: true, writable: true });
    Object.defineProperty(globalThis, 'localStorage', { value: fake, configurable: true, writable: true });
    return store;
}

function resetStore() {
    const layer = new Layer(100, 100, 'Background');
    layer.ctx.fillStyle = '#404080';
    layer.ctx.fillRect(0, 0, 100, 100);
    useEditorStore.setState(s => ({
        ...s,
        width: 100,
        height: 100,
        zoom: 1,
        pan: { x: 0, y: 0 },
        layers: [layer],
        activeLayerId: layer.id,
        selectedLayerIds: [layer.id],
        layerSelectionAnchorId: layer.id,
        activeTool: 'brush',
        quickMaskMode: false,
        quickMaskBuffer: null,
        selection: {
            hasSelection: false,
            mode: 'rect',
            path: [],
            polyPoints: [],
            operations: [],
            isDraggingSelection: false,
            isFreeEditMode: false,
            feather: 0,
        },
        isDirty: false,
        lastSavedHistoryTick: useEditorStore.getState().historyTick,
    }));
}

let originalLocalStorage: Storage | undefined;
beforeAll(() => {
    originalLocalStorage = window.localStorage;
});
afterAll(() => {
    if (originalLocalStorage) {
        Object.defineProperty(window, 'localStorage', { value: originalLocalStorage, configurable: true, writable: true });
        Object.defineProperty(globalThis, 'localStorage', { value: originalLocalStorage, configurable: true, writable: true });
    }
});

beforeEach(() => {
    installFakeStorage();
});

afterEach(() => {
    cleanup();
});

describe('Batch 5 UI Shell — Navigator', () => {
    beforeEach(resetStore);

    it('clicking the navigator canvas calls setPan with new coordinates', () => {
        const { container } = render(<NavigatorPanel />);
        const canvas = container.querySelector('[data-testid="navigator-canvas"]') as HTMLCanvasElement;
        expect(canvas).toBeTruthy();
        const before = useEditorStore.getState().pan;
        act(() => {
            canvas.dispatchEvent(new PointerEvent('pointerdown', {
                clientX: 50,
                clientY: 50,
                bubbles: true,
                pointerId: 1,
            } as PointerEventInit));
        });
        const after = useEditorStore.getState().pan;
        expect(after.x === before.x && after.y === before.y).toBe(false);
    });
});

describe('Batch 5 UI Shell — InfoPanel cursor readout', () => {
    beforeEach(resetStore);

    it('moving the pointer over the document updates X/Y in canvas space', () => {
        // Fabricate a document element so the InfoPanel's coordinate math hits.
        const docEl = document.createElement('div');
        docEl.setAttribute('data-photoweb-document', '');
        Object.defineProperty(docEl, 'getBoundingClientRect', {
            value: () => ({ left: 0, top: 0, right: 100, bottom: 100, width: 100, height: 100, x: 0, y: 0, toJSON: () => ({}) }),
        });
        document.body.appendChild(docEl);

        const { container } = render(<InfoPanel />);
        act(() => {
            window.dispatchEvent(new MouseEvent('mousemove', { clientX: 25, clientY: 50, bubbles: true }));
        });
        const xCell = container.querySelector('[data-testid="info-cursor-x"]')!;
        const yCell = container.querySelector('[data-testid="info-cursor-y"]')!;
        expect(xCell.textContent).toBe('25');
        expect(yCell.textContent).toBe('50');

        docEl.remove();
    });
});

describe('Batch 5 UI Shell — StatusBar active tool', () => {
    beforeEach(resetStore);

    it('shows the active tool label and updates when the tool changes', () => {
        const { container } = render(<StatusBar />);
        useEditorStore.getState().setTool('brush');
        const labelEl = container.querySelector('[data-testid="status-active-tool"]')!;
        // Force a re-render by re-mounting (state subscription handles updates,
        // but in jsdom the synchronous read is enough for this assertion).
        expect(labelEl.textContent).toBe('Brush');

        act(() => { useEditorStore.getState().setTool('eraser'); });
        expect(container.querySelector('[data-testid="status-active-tool"]')!.textContent).toBe('Eraser');
    });
});

describe('Batch 5 UI Shell — Quick Mask end-to-end', () => {
    beforeEach(resetStore);

    it('Q toggles, brush paints into the buffer, second Q converts to a selection', () => {
        const s = useEditorStore.getState();
        s.setQuickMaskMode(true);
        expect(useEditorStore.getState().quickMaskMode).toBe(true);

        // Simulate painting into the buffer by writing red pixels.
        const buf = new ImageData(100, 100);
        for (let y = 20; y < 40; y++) {
            for (let x = 30; x < 50; x++) {
                const i = (y * 100 + x) * 4;
                buf.data[i] = 255;
                buf.data[i + 1] = 0;
                buf.data[i + 2] = 0;
                buf.data[i + 3] = 255;
            }
        }
        useEditorStore.getState().setQuickMaskBuffer(buf);
        expect(useEditorStore.getState().quickMaskBuffer).not.toBeNull();

        useEditorStore.getState().setQuickMaskMode(false);
        const post = useEditorStore.getState();
        expect(post.quickMaskMode).toBe(false);
        expect(post.selection.hasSelection).toBe(true);
        expect(post.selection.operations.length).toBeGreaterThan(0);
        expect(post.selection.operations[0].mask).toBeTruthy();
    });
});

describe('Batch 5 UI Shell — Swatch persistence', () => {
    beforeEach(resetStore);

    it('addSwatch writes to localStorage and survives a slice reload', async () => {
        useEditorStore.getState().addSwatch('#abcdef');
        expect(useEditorStore.getState().swatches).toContain('#abcdef');
        const raw = window.localStorage.getItem(SWATCH_KEY);
        expect(raw).toBeTruthy();
        const parsed = JSON.parse(raw!) as string[];
        expect(parsed).toContain('#abcdef');

        // Re-import the colorSlice factory and verify the swatches load from
        // localStorage on a fresh creation.
        const { createColorSlice } = await import('../store/colorSlice');
        let captured: { swatches: string[] } | null = null;
        const set = () => {};
        const get = (() => useEditorStore.getState()) as unknown as Parameters<typeof createColorSlice>[1];
        const api = useEditorStore as unknown as Parameters<typeof createColorSlice>[2];
        captured = createColorSlice(set as unknown as Parameters<typeof createColorSlice>[0], get, api) as unknown as { swatches: string[] };
        expect(captured.swatches).toContain('#abcdef');
    });
});

describe('Batch 5 UI Shell — UI scale on boot', () => {
    beforeEach(() => {
        resetStore();
        document.documentElement.style.fontSize = '';
    });

    it('mounts App and applies persisted uiScale to documentElement', () => {
        window.localStorage.setItem(PREFS_KEY, JSON.stringify({ uiScale: 1.5, historyMaxSize: 50, autosaveIntervalSec: 60 }));
        render(<App />);
        expect(document.documentElement.style.fontSize).toBe('1.5rem');
    });
});

describe('Batch 5 UI Shell — Tab / Shift+Tab', () => {
    beforeEach(resetStore);

    it('Tab toggles every panel off, then on again', async () => {
        render(<App />);
        const before = useEditorStore.getState().panelVisibility;
        expect(Object.values(before).some(v => v)).toBe(true);

        await runScript([{ type: 'keyDown', key: 'Tab' }]);
        const after = useEditorStore.getState().panelVisibility;
        expect(Object.values(after).every(v => !v)).toBe(true);

        await runScript([{ type: 'keyDown', key: 'Tab' }]);
        const restored = useEditorStore.getState().panelVisibility;
        expect(Object.values(restored).every(v => v)).toBe(true);
    });

    it('Shift+Tab toggles panels too (everything except canvas/status/menu)', async () => {
        render(<App />);
        await runScript([{ type: 'keyDown', key: 'Tab', modifiers: { shift: true } }]);
        const state = useEditorStore.getState();
        // All panel IDs flipped to false. Canvas, status, and menu are not part
        // of panelVisibility, so they remain visible.
        expect(Object.values(state.panelVisibility).every(v => !v)).toBe(true);
    });
});

describe('Batch 5 UI Shell — isDirty across 8 mutation paths', () => {
    beforeEach(resetStore);

    function flip(action: () => void, label: string) {
        useEditorStore.setState({ isDirty: false, lastSavedHistoryTick: useEditorStore.getState().historyTick });
        action();
        expect(useEditorStore.getState().isDirty, `path ${label} should mark dirty`).toBe(true);
    }

    it('every covered mutation path flips isDirty; saveFile clears it', async () => {
        const s0 = useEditorStore.getState();
        const layerId = s0.activeLayerId!;

        flip(() => s0.addLayer(), 'addLayer');
        flip(() => useEditorStore.getState().setLayerOpacity(layerId, 0.5), 'setLayerOpacity');
        flip(() => useEditorStore.getState().renameLayer(layerId, 'Renamed'), 'renameLayer');
        flip(() => useEditorStore.getState().setLayerBlendMode(layerId, 'multiply'), 'setLayerBlendMode');
        flip(() => useEditorStore.getState().toggleLayerVisibility(layerId), 'toggleLayerVisibility');
        flip(() => useEditorStore.getState().setLayerColorTag(layerId, 'red'), 'setLayerColorTag');
        flip(() => useEditorStore.getState().setLayerLock(layerId, 'transparency', true), 'setLayerLock');
        flip(() => useEditorStore.getState().addLayerMask(layerId, 'reveal-all'), 'addLayerMask');

        // Marking the document clean (which saveFile does after a successful
        // write) should clear the dirty flag.
        useEditorStore.getState().markDocumentClean();
        expect(useEditorStore.getState().isDirty).toBe(false);
    });
});

describe('Batch 5 UI Shell — Autosave banner a11y', () => {
    beforeEach(resetStore);

    it('exposes role=status and aria-live=assertive when hasAutosave is true', () => {
        useEditorStore.setState({ hasAutosave: true });
        const { container } = render(<App />);
        const banner = container.querySelector('[data-testid="autosave-recovery-banner"]')!;
        expect(banner).toBeTruthy();
        expect(banner.getAttribute('role')).toBe('status');
        expect(banner.getAttribute('aria-live')).toBe('assertive');
    });
});
