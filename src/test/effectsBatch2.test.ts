import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { useEditorStore } from '../store/editorStore';
import { ensureStubsRegistered } from '../tools/stubs';
import { Canvas2DCompositor } from '../compositor/Canvas2DCompositor';
import { getEffect } from '../effects';
import { saveDocument } from '../core/persistence';
import type { DocumentManifest } from '../core/persistence';
import { pixelAt } from './simulator';

ensureStubsRegistered();

function reset() {
    useEditorStore.getState().clearHistory();
    useEditorStore.setState((s) => ({
        ...s,
        layers: [],
        activeLayerId: null,
        width: 100,
        height: 100,
    }));
    useEditorStore.getState().addLayer();
}

function compose(width = 100, height = 100): HTMLCanvasElement {
    const target = document.createElement('canvas');
    target.width = width; target.height = height;
    const c = new Canvas2DCompositor();
    c.render({
        layers: useEditorStore.getState().layers,
        activeLayerId: useEditorStore.getState().activeLayerId,
        viewport: { width, height, zoom: 1, pan: { x: 0, y: 0 } },
        target,
    });
    return target;
}

function paintRect(layer: { ctx: CanvasRenderingContext2D; canvas: HTMLCanvasElement; markDirty: (r: null) => void }, color: string, x: number, y: number, w: number, h: number): void {
    layer.canvas.width = 100;
    layer.canvas.height = 100;
    layer.ctx.fillStyle = color;
    layer.ctx.fillRect(x, y, w, h);
    layer.markDirty(null);
}

describe('Inner Shadow effect', () => {
    beforeEach(reset);

    it('is registered with the effects registry', () => {
        expect(getEffect('inner-shadow')).toBeTruthy();
    });

    it('a white inner shadow with angle=0 darkens pixels near the layer\'s left edge', () => {
        const layer = useEditorStore.getState().layers[0];
        // 40x40 red square in the middle so the layer has real alpha edges.
        paintRect(layer, '#ff0000', 30, 30, 40, 40);

        useEditorStore.getState().addLayerEffect(layer.id, 'inner-shadow');
        useEditorStore.getState().setLayerEffectParams(layer.id, 0, {
            color: '#ffffff', opacity: 1, angle: 0, distance: 6, choke: 1, size: 0, blendMode: 'source-over',
        });

        const target = compose();
        // Just inside the LEFT edge of the square: the white shadow (shifting right
        // from the inverted silhouette) should brighten the red here.
        const left = pixelAt(target, 32, 50);
        // Far interior, well past the shadow distance: still red.
        const right = pixelAt(target, 68, 50);

        expect(left.g + left.b).toBeGreaterThan(80);
        expect(right.g + right.b).toBeLessThan(40);
    });

    it('size=0 choke=100 produces a sharp inner band (no blur)', () => {
        const layer = useEditorStore.getState().layers[0];
        paintRect(layer, '#ff0000', 30, 30, 40, 40);

        useEditorStore.getState().addLayerEffect(layer.id, 'inner-shadow');
        useEditorStore.getState().setLayerEffectParams(layer.id, 0, {
            color: '#ffffff', opacity: 1, angle: 0, distance: 8, choke: 1, size: 0, blendMode: 'source-over',
        });

        const target = compose();
        // Inside the band at x=33: bright. Just past the band at x=42: still red.
        const inBand = pixelAt(target, 33, 50);
        const past = pixelAt(target, 42, 50);
        expect(inBand.g).toBeGreaterThan(180);
        expect(past.g).toBeLessThan(60);
    });

    it('disabling the inner shadow effect restores the original layer pixels', () => {
        const layer = useEditorStore.getState().layers[0];
        paintRect(layer, '#ff0000', 30, 30, 40, 40);
        useEditorStore.getState().addLayerEffect(layer.id, 'inner-shadow');
        useEditorStore.getState().setLayerEffectParams(layer.id, 0, {
            color: '#ffffff', opacity: 1, angle: 0, distance: 6, choke: 1, size: 0,
        });
        useEditorStore.getState().setLayerEffectEnabled(layer.id, 0, false);

        const target = compose();
        const px = pixelAt(target, 32, 50);
        expect(px.r).toBeGreaterThan(220);
        expect(px.g).toBeLessThan(40);
        expect(px.b).toBeLessThan(40);
    });
});

describe('Outer Glow effect', () => {
    beforeEach(reset);

    it('is registered with the effects registry', () => {
        expect(getEffect('outer-glow')).toBeTruthy();
    });

    it('a red outer glow tints the pixels just outside the layer alpha', () => {
        const layer = useEditorStore.getState().layers[0];
        // Small 10x10 white dot centered well inside the canvas. We probe with
        // a RED glow so its presence is visible in the R channel against the
        // gray checkerboard background.
        paintRect(layer, '#ffffff', 45, 45, 10, 10);

        useEditorStore.getState().addLayerEffect(layer.id, 'outer-glow');
        useEditorStore.getState().setLayerEffectParams(layer.id, 0, {
            color: '#ff0000', opacity: 1, spread: 1, size: 6, blendMode: 'source-over',
        });

        const target = compose();
        // A pixel just outside the dot — the spread-expanded glow covers it.
        const near = pixelAt(target, 40, 50);
        // 40 px away from the dot, well past the size+spread radius.
        const far = pixelAt(target, 5, 50);

        expect(near.r).toBeGreaterThan(near.g + 50);
        expect(near.r).toBeGreaterThan(near.b + 50);
        expect(Math.abs(far.r - far.g)).toBeLessThan(20);
    });

    it('higher spread extends the glow farther than spread=0 at the same size', () => {
        const layer = useEditorStore.getState().layers[0];
        paintRect(layer, '#ffffff', 45, 45, 10, 10);
        useEditorStore.getState().addLayerEffect(layer.id, 'outer-glow');
        useEditorStore.getState().setLayerEffectParams(layer.id, 0, {
            color: '#ff0000', opacity: 1, spread: 0, size: 8, blendMode: 'source-over',
        });
        // A pixel several px outside the dot — well past where spread=0 has
        // contribution but inside the expanded reach when spread=1.
        const probeX = 41;
        const probeY = 50;

        const noSpread = pixelAt(compose(), probeX, probeY);

        useEditorStore.getState().setLayerEffectParams(layer.id, 0, { spread: 1 });
        const withSpread = pixelAt(compose(), probeX, probeY);

        // Increasing spread should push more red into the same probe pixel.
        expect(withSpread.r - withSpread.g).toBeGreaterThan(noSpread.r - noSpread.g);
    });

    it('disabling the outer glow effect removes its visual contribution', () => {
        const layer = useEditorStore.getState().layers[0];
        paintRect(layer, '#ffffff', 45, 45, 10, 10);
        useEditorStore.getState().addLayerEffect(layer.id, 'outer-glow');
        useEditorStore.getState().setLayerEffectParams(layer.id, 0, {
            color: '#ff0000', opacity: 1, spread: 1, size: 6, blendMode: 'source-over',
        });
        useEditorStore.getState().setLayerEffectEnabled(layer.id, 0, false);
        const target = compose();
        const outside = pixelAt(target, 40, 50);
        // With the glow disabled, the pixel outside the dot reads the gray
        // checkerboard background (no red tint).
        expect(Math.abs(outside.r - outside.g)).toBeLessThan(20);
    });
});

describe('layer effects persistence (Batch 2)', () => {
    let originalLocalStorage: Storage;
    let store: Record<string, string>;

    beforeEach(() => {
        reset();
        originalLocalStorage = window.localStorage;
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
    });

    afterEach(() => {
        Object.defineProperty(window, 'localStorage', {
            value: originalLocalStorage,
            configurable: true,
            writable: true,
        });
        vi.restoreAllMocks();
    });

    it('save round-trips inner-shadow and outer-glow params in the manifest', async () => {
        const layer = useEditorStore.getState().layers[0];
        useEditorStore.getState().addLayerEffect(layer.id, 'inner-shadow');
        useEditorStore.getState().setLayerEffectParams(layer.id, 0, {
            color: '#123456', opacity: 0.7, angle: 90, distance: 12, choke: 0.5, size: 6, blendMode: 'multiply',
        });
        useEditorStore.getState().addLayerEffect(layer.id, 'outer-glow');
        useEditorStore.getState().setLayerEffectParams(layer.id, 1, {
            color: '#abcdef', opacity: 0.4, spread: 0.25, size: 9, blendMode: 'screen',
        });

        await saveDocument(useEditorStore.getState(), 'batch2-fx-doc');

        const json = store['pwbdoc:batch2-fx-doc'];
        expect(json).toBeTruthy();
        const manifest = JSON.parse(json) as DocumentManifest;
        const persisted = manifest.layers[0].effects ?? [];
        const inner = persisted.find(e => e.kind === 'inner-shadow');
        const outer = persisted.find(e => e.kind === 'outer-glow');
        expect(inner?.params.color).toBe('#123456');
        expect(inner?.params.distance).toBe(12);
        expect(inner?.params.choke).toBe(0.5);
        expect(inner?.params.blendMode).toBe('multiply');
        expect(outer?.params.spread).toBe(0.25);
        expect(outer?.params.size).toBe(9);
        expect(outer?.params.blendMode).toBe('screen');
    });
});

describe('layer effects history (Batch 2)', () => {
    beforeEach(reset);

    it('undo and redo an inner-shadow param edit through the store', () => {
        const layer = useEditorStore.getState().layers[0];
        useEditorStore.getState().addLayerEffect(layer.id, 'inner-shadow');
        useEditorStore.getState().setLayerEffectParams(layer.id, 0, { distance: 5 });
        useEditorStore.getState().setLayerEffectParams(layer.id, 0, { distance: 20 });

        const afterEdit = useEditorStore.getState().layers[0].effects[0].params.distance;
        expect(afterEdit).toBe(20);

        useEditorStore.getState().undo();
        const afterUndo = useEditorStore.getState().layers[0].effects[0].params.distance;
        expect(afterUndo).toBe(5);

        useEditorStore.getState().redo();
        const afterRedo = useEditorStore.getState().layers[0].effects[0].params.distance;
        expect(afterRedo).toBe(20);
    });
});
