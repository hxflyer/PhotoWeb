import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, screen, cleanup } from '@testing-library/react';
import { useEditorStore } from '../store/editorStore';
import { ensureStubsRegistered } from '../tools/stubs';
import { Canvas2DCompositor } from '../compositor/Canvas2DCompositor';
import { getEffect } from '../effects';
import { saveDocument } from '../core/persistence';
import type { DocumentManifest } from '../core/persistence';
import { pixelAt } from './simulator';
import { PropertiesPanel } from '../components/Panels/PropertiesPanel';

ensureStubsRegistered();

function reset() {
    useEditorStore.getState().clearHistory();
    useEditorStore.setState((s) => ({
        ...s,
        layers: [],
        activeLayerId: null,
        width: 100,
        height: 100,
        patternPresets: [],
        activePatternId: null,
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

describe('Inner Glow effect', () => {
    beforeEach(reset);

    it('is registered with the effects registry', () => {
        expect(getEffect('inner-glow')).toBeTruthy();
    });

    it('a red inner glow tints pixels near the layer alpha edge but not the centre', () => {
        const layer = useEditorStore.getState().layers[0];
        // 30x30 white square so the centre is far from any alpha edge.
        paintRect(layer, '#ffffff', 35, 35, 30, 30);

        useEditorStore.getState().addLayerEffect(layer.id, 'inner-glow');
        useEditorStore.getState().setLayerEffectParams(layer.id, 0, {
            color: '#ff0000', opacity: 1, choke: 0.5, size: 8, blendMode: 'source-over',
        });

        const target = compose();
        // Just inside the left edge: the inward red band should colour this px.
        const edge = pixelAt(target, 37, 50);
        // Far centre: still white, untouched by the inward glow.
        const centre = pixelAt(target, 50, 50);

        // Edge has a strong red bias over green/blue.
        expect(edge.r - edge.g).toBeGreaterThan(40);
        expect(edge.r - edge.b).toBeGreaterThan(40);
        // Centre stays close to white (all channels balanced and high).
        expect(centre.r).toBeGreaterThan(220);
        expect(centre.g).toBeGreaterThan(220);
        expect(centre.b).toBeGreaterThan(220);
    });

    it('disabling the inner glow effect restores the original layer pixels', () => {
        const layer = useEditorStore.getState().layers[0];
        paintRect(layer, '#ffffff', 35, 35, 30, 30);
        useEditorStore.getState().addLayerEffect(layer.id, 'inner-glow');
        useEditorStore.getState().setLayerEffectParams(layer.id, 0, {
            color: '#ff0000', opacity: 1, choke: 0.5, size: 8, blendMode: 'source-over',
        });
        useEditorStore.getState().setLayerEffectEnabled(layer.id, 0, false);

        const target = compose();
        const edge = pixelAt(target, 37, 50);
        // No glow applied, edge stays white.
        expect(edge.r).toBeGreaterThan(220);
        expect(edge.g).toBeGreaterThan(220);
        expect(edge.b).toBeGreaterThan(220);
    });
});

describe('Gradient Overlay effect', () => {
    beforeEach(reset);

    it('is registered with the effects registry', () => {
        expect(getEffect('gradient-overlay')).toBeTruthy();
    });

    it('a red-to-blue horizontal linear gradient paints red on the left half and blue on the right', () => {
        const layer = useEditorStore.getState().layers[0];
        // Fill the entire canvas so the gradient has alpha to clip against.
        paintRect(layer, '#ffffff', 0, 0, 100, 100);

        useEditorStore.getState().addLayerEffect(layer.id, 'gradient-overlay');
        useEditorStore.getState().setLayerEffectParams(layer.id, 0, {
            colorStops: [
                { position: 0, color: '#ff0000' },
                { position: 1, color: '#0000ff' },
            ],
            opacityStops: [
                { position: 0, opacity: 1 },
                { position: 1, opacity: 1 },
            ],
            gradientType: 'linear',
            angle: 0,
            scale: 100,
            opacity: 1,
            blendMode: 'source-over',
        });

        const target = compose();
        const left = pixelAt(target, 10, 50);
        const right = pixelAt(target, 90, 50);
        // Left half should be red-leaning, right half blue-leaning.
        expect(left.r).toBeGreaterThan(left.b + 80);
        expect(right.b).toBeGreaterThan(right.r + 80);
    });

    it('disabling the gradient overlay restores the original layer pixels', () => {
        const layer = useEditorStore.getState().layers[0];
        paintRect(layer, '#ffffff', 0, 0, 100, 100);
        useEditorStore.getState().addLayerEffect(layer.id, 'gradient-overlay');
        useEditorStore.getState().setLayerEffectParams(layer.id, 0, {
            colorStops: [
                { position: 0, color: '#ff0000' },
                { position: 1, color: '#0000ff' },
            ],
            opacityStops: [
                { position: 0, opacity: 1 },
                { position: 1, opacity: 1 },
            ],
        });
        useEditorStore.getState().setLayerEffectEnabled(layer.id, 0, false);

        const target = compose();
        const px = pixelAt(target, 50, 50);
        // Pure white layer pixels, no gradient contribution.
        expect(px.r).toBeGreaterThan(220);
        expect(px.g).toBeGreaterThan(220);
        expect(px.b).toBeGreaterThan(220);
    });
});

describe('Pattern Overlay effect', () => {
    beforeEach(reset);

    it('is registered with the effects registry', () => {
        expect(getEffect('pattern-overlay')).toBeTruthy();
    });

    it('a 2x2 red/blue checker pattern overlay tiles alternating colours over a uniform layer', () => {
        // Build a 2x2 checker tile.
        const tile = document.createElement('canvas');
        tile.width = 2; tile.height = 2;
        const tctx = tile.getContext('2d')!;
        tctx.fillStyle = '#ff0000';
        tctx.fillRect(0, 0, 1, 1);
        tctx.fillRect(1, 1, 1, 1);
        tctx.fillStyle = '#0000ff';
        tctx.fillRect(1, 0, 1, 1);
        tctx.fillRect(0, 1, 1, 1);
        const patternId = useEditorStore.getState().definePattern('Checker 2x2', tile);

        const layer = useEditorStore.getState().layers[0];
        paintRect(layer, '#ffffff', 0, 0, 100, 100);

        useEditorStore.getState().addLayerEffect(layer.id, 'pattern-overlay');
        useEditorStore.getState().setLayerEffectParams(layer.id, 0, {
            patternId,
            scale: 100,
            opacity: 1,
            blendMode: 'source-over',
        });

        const target = compose();
        // (0,0) → tile[0,0] = red. (1,0) → tile[1,0] = blue. Confirm alternation.
        const a = pixelAt(target, 0, 0);
        const b = pixelAt(target, 1, 0);
        expect(a.r).toBeGreaterThan(220);
        expect(a.b).toBeLessThan(40);
        expect(b.b).toBeGreaterThan(220);
        expect(b.r).toBeLessThan(40);
    });

    it('disabling the pattern overlay restores the original layer pixels', () => {
        const tile = document.createElement('canvas');
        tile.width = 2; tile.height = 2;
        const tctx = tile.getContext('2d')!;
        tctx.fillStyle = '#ff0000';
        tctx.fillRect(0, 0, 2, 2);
        const patternId = useEditorStore.getState().definePattern('Red', tile);

        const layer = useEditorStore.getState().layers[0];
        paintRect(layer, '#ffffff', 0, 0, 100, 100);

        useEditorStore.getState().addLayerEffect(layer.id, 'pattern-overlay');
        useEditorStore.getState().setLayerEffectParams(layer.id, 0, {
            patternId, scale: 100, opacity: 1, blendMode: 'source-over',
        });
        useEditorStore.getState().setLayerEffectEnabled(layer.id, 0, false);

        const target = compose();
        const px = pixelAt(target, 50, 50);
        expect(px.r).toBeGreaterThan(220);
        expect(px.g).toBeGreaterThan(220);
        expect(px.b).toBeGreaterThan(220);
    });
});

describe('layer effects persistence (Batch 3)', () => {
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

    it('saving the document preserves inner-glow, gradient-overlay (colorStops), and pattern-overlay params', async () => {
        const layer = useEditorStore.getState().layers[0];

        useEditorStore.getState().addLayerEffect(layer.id, 'inner-glow');
        useEditorStore.getState().setLayerEffectParams(layer.id, 0, {
            color: '#abcdef', opacity: 0.6, choke: 0.4, size: 7, blendMode: 'screen',
        });

        useEditorStore.getState().addLayerEffect(layer.id, 'gradient-overlay');
        useEditorStore.getState().setLayerEffectParams(layer.id, 1, {
            colorStops: [
                { position: 0, color: '#112233' },
                { position: 0.5, color: '#445566' },
                { position: 1, color: '#778899' },
            ],
            opacityStops: [
                { position: 0, opacity: 0.5 },
                { position: 1, opacity: 1 },
            ],
            gradientType: 'radial',
            angle: 45,
            scale: 150,
            opacity: 0.8,
            blendMode: 'multiply',
        });

        useEditorStore.getState().addLayerEffect(layer.id, 'pattern-overlay');
        useEditorStore.getState().setLayerEffectParams(layer.id, 2, {
            patternId: 'pattern-xyz',
            scale: 75,
            opacity: 0.9,
            blendMode: 'overlay',
        });

        await saveDocument(useEditorStore.getState(), 'batch3-fx-doc');

        const json = store['pwbdoc:batch3-fx-doc'];
        expect(json).toBeTruthy();
        const manifest = JSON.parse(json) as DocumentManifest;
        const persisted = manifest.layers[0].effects ?? [];

        const inner = persisted.find(e => e.kind === 'inner-glow');
        expect(inner?.params.color).toBe('#abcdef');
        expect(inner?.params.choke).toBe(0.4);
        expect(inner?.params.size).toBe(7);
        expect(inner?.params.blendMode).toBe('screen');

        const gradient = persisted.find(e => e.kind === 'gradient-overlay');
        const cs = gradient?.params.colorStops as { position: number; color: string }[];
        expect(cs).toHaveLength(3);
        expect(cs[0].color).toBe('#112233');
        expect(cs[1].position).toBe(0.5);
        expect(cs[2].color).toBe('#778899');
        const os = gradient?.params.opacityStops as { position: number; opacity: number }[];
        expect(os).toHaveLength(2);
        expect(os[0].opacity).toBe(0.5);
        expect(gradient?.params.gradientType).toBe('radial');
        expect(gradient?.params.angle).toBe(45);
        expect(gradient?.params.scale).toBe(150);

        const pattern = persisted.find(e => e.kind === 'pattern-overlay');
        expect(pattern?.params.patternId).toBe('pattern-xyz');
        expect(pattern?.params.scale).toBe(75);
        expect(pattern?.params.blendMode).toBe('overlay');
    });
});

describe('Properties panel Effects picker (Batch 3)', () => {
    beforeEach(reset);
    afterEach(() => cleanup());

    it('exposes Inner Glow, Gradient Overlay, and Pattern Overlay as add options', () => {
        render(<PropertiesPanel />);
        const picker = screen.getByTestId('effects-add-picker') as HTMLSelectElement;
        const labels = Array.from(picker.options).map(o => o.label);
        expect(labels).toContain('Inner Glow');
        expect(labels).toContain('Gradient Overlay');
        expect(labels).toContain('Pattern Overlay');
    });
});

describe('layer effects history (Batch 3)', () => {
    beforeEach(reset);

    it('undo and redo of a gradient-overlay param edit via the store', () => {
        const layer = useEditorStore.getState().layers[0];
        useEditorStore.getState().addLayerEffect(layer.id, 'gradient-overlay');
        useEditorStore.getState().setLayerEffectParams(layer.id, 0, { angle: 30 });
        useEditorStore.getState().setLayerEffectParams(layer.id, 0, { angle: 120 });

        const afterEdit = useEditorStore.getState().layers[0].effects[0].params.angle;
        expect(afterEdit).toBe(120);

        useEditorStore.getState().undo();
        const afterUndo = useEditorStore.getState().layers[0].effects[0].params.angle;
        expect(afterUndo).toBe(30);

        useEditorStore.getState().redo();
        const afterRedo = useEditorStore.getState().layers[0].effects[0].params.angle;
        expect(afterRedo).toBe(120);
    });
});
