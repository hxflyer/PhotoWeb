import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { useEditorStore } from '../store/editorStore';
import { ensureStubsRegistered } from '../tools/stubs';
import {
    addPath,
    clearPaths,
    getPaths,
    getActivePathId,
    setActivePath,
    type PathShape,
} from '../tools/pen';
import { saveDocument, loadDocument } from '../core/persistence';

ensureStubsRegistered();

function resetStore() {
    useEditorStore.getState().clearHistory();
    useEditorStore.setState((s) => ({
        ...s,
        layers: [],
        activeLayerId: null,
        documentName: 'path-rt',
        width: 200,
        height: 200,
    }));
    useEditorStore.getState().addLayer();
    clearPaths();
}

function getStoreView() {
    const s = useEditorStore.getState();
    return {
        layers: s.layers,
        activeLayerId: s.activeLayerId,
        width: s.width,
        height: s.height,
        documentName: s.documentName,
        savedSelections: s.savedSelections,
    };
}

function loadSet(partial: Parameters<Parameters<typeof loadDocument>[2]>[0]): void {
    useEditorStore.setState(partial as Parameters<typeof useEditorStore.setState>[0]);
}

describe('Path persistence — paths and active id round-trip through .pwbdoc', () => {
    let originalLocalStorage: Storage;
    let originalImage: typeof Image;
    let store: Record<string, string>;

    beforeEach(() => {
        resetStore();
        originalLocalStorage = window.localStorage;
        originalImage = globalThis.Image;
        store = {};
        Object.defineProperty(window, 'localStorage', {
            value: {
                setItem: (k: string, v: string) => { store[k] = v; },
                getItem: (k: string) => store[k] ?? null,
                removeItem: (k: string) => { delete store[k]; },
                clear: () => { store = {}; },
                key: (i: number) => Object.keys(store)[i] ?? null,
                get length() { return Object.keys(store).length; },
            } as unknown as Storage,
            configurable: true,
            writable: true,
        });
        // jsdom's Image() never fires onload for data: URLs — install a stub
        // that resolves onload on the next microtask so loadDocument's per-layer
        // image draw completes.
        // Resolve via onerror (which the persistence layer also accepts) so we
        // do not need a node-canvas-compatible source for drawImage to consume.
        class StubImage {
            onload: (() => void) | null = null;
            onerror: (() => void) | null = null;
            width = 1;
            height = 1;
            set src(_v: string) {
                setTimeout(() => { try { this.onerror?.(); } catch { /* ignore */ } }, 0);
            }
        }
        Object.defineProperty(globalThis, 'Image', {
            value: StubImage,
            configurable: true,
            writable: true,
        });
        Object.defineProperty(window, 'Image', {
            value: StubImage,
            configurable: true,
            writable: true,
        });
        void vi;
    });

    afterEach(() => {
        Object.defineProperty(window, 'localStorage', {
            value: originalLocalStorage,
            configurable: true,
            writable: true,
        });
        Object.defineProperty(globalThis, 'Image', {
            value: originalImage,
            configurable: true,
            writable: true,
        });
        Object.defineProperty(window, 'Image', {
            value: originalImage,
            configurable: true,
            writable: true,
        });
    });

    it('saves and restores two paths with their anchors and the active path id', { timeout: 30000 }, async () => {
        const p1: PathShape = {
            id: 'path-1', closed: true,
            anchors: [
                { x: 10, y: 10, type: 'corner' },
                { x: 90, y: 10, type: 'corner' },
                { x: 90, y: 90, type: 'corner' },
                { x: 10, y: 90, type: 'corner' },
            ],
        };
        const p2: PathShape = {
            id: 'path-2', closed: false,
            anchors: [
                { x: 100, y: 100, type: 'smooth', outHandle: { x: 120, y: 100 } },
                { x: 150, y: 150, type: 'corner', inHandle: { x: 130, y: 150 } },
            ],
        };
        addPath(p1);
        addPath(p2);
        setActivePath(p1.id);
        expect(getPaths()).toHaveLength(2);
        expect(getActivePathId()).toBe(p1.id);

        await saveDocument(getStoreView(), 'path-rt', { silent: true });

        clearPaths();
        expect(getPaths()).toHaveLength(0);
        expect(getActivePathId()).toBeNull();

        await loadDocument('path-rt', getStoreView, loadSet);

        const restored = getPaths();
        expect(restored).toHaveLength(2);
        const r1 = restored.find(p => p.id === 'path-1')!;
        const r2 = restored.find(p => p.id === 'path-2')!;
        expect(r1.closed).toBe(true);
        expect(r1.anchors).toHaveLength(4);
        expect(r1.anchors[0]).toMatchObject({ x: 10, y: 10, type: 'corner' });
        expect(r1.anchors[2]).toMatchObject({ x: 90, y: 90 });
        expect(r2.closed).toBe(false);
        expect(r2.anchors).toHaveLength(2);
        expect(r2.anchors[0].outHandle).toMatchObject({ x: 120, y: 100 });
        expect(r2.anchors[1].inHandle).toMatchObject({ x: 130, y: 150 });
        expect(getActivePathId()).toBe(p1.id);
    });

    it('loading a document with no paths field clears the in-memory paths', { timeout: 30000 }, async () => {
        await saveDocument(getStoreView(), 'path-rt', { silent: true });
        addPath({ id: 'stray', closed: false, anchors: [{ x: 0, y: 0, type: 'corner' }] });
        expect(getPaths().length).toBeGreaterThan(0);
        await loadDocument('path-rt', getStoreView, loadSet);
        expect(getPaths()).toHaveLength(0);
    });

    it('manifest written to localStorage includes paths[] and activePathId fields', async () => {
        addPath({ id: 'p', closed: true, anchors: [{ x: 1, y: 2, type: 'corner' }, { x: 3, y: 4, type: 'corner' }] });
        setActivePath('p');
        await saveDocument(getStoreView(), 'path-rt', { silent: true });
        const raw = store['pwbdoc:path-rt'];
        expect(raw).toBeTruthy();
        const manifest = JSON.parse(raw);
        expect(Array.isArray(manifest.paths)).toBe(true);
        expect(manifest.paths.length).toBe(1);
        expect(manifest.paths[0].id).toBe('p');
        expect(manifest.activePathId).toBe('p');
    });
});
