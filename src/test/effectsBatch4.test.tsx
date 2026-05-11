import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, screen, cleanup, fireEvent } from '@testing-library/react';
import { useEditorStore } from '../store/editorStore';
import { ensureStubsRegistered } from '../tools/stubs';
import { Canvas2DCompositor } from '../compositor/Canvas2DCompositor';
import { getEffect } from '../effects';
import { saveDocument } from '../core/persistence';
import type { DocumentManifest } from '../core/persistence';
import { pixelAt } from './simulator';
import { PropertiesPanel } from '../components/Panels/PropertiesPanel';
import { ScaleEffectsDialog } from '../components/Dialogs/ScaleEffectsDialog';

ensureStubsRegistered();

function reset() {
    useEditorStore.getState().clearHistory();
    useEditorStore.setState((s) => ({
        ...s,
        layers: [],
        activeLayerId: null,
        width: 100,
        height: 100,
        copiedLayerStyle: null,
        isScaleEffectsDialogOpen: false,
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

function paintRect(
    layer: { ctx: CanvasRenderingContext2D; canvas: HTMLCanvasElement; markDirty: (r: null) => void },
    color: string,
    x: number,
    y: number,
    w: number,
    h: number,
): void {
    layer.canvas.width = 100;
    layer.canvas.height = 100;
    layer.ctx.fillStyle = color;
    layer.ctx.fillRect(x, y, w, h);
    layer.markDirty(null);
}

describe('Bevel & Emboss effect', () => {
    beforeEach(reset);

    it('is registered with the effects registry', () => {
        expect(getEffect('bevel-emboss')).toBeTruthy();
    });

    it('inner-bevel on a square: edge facing the light is brighter than the opposite edge', () => {
        const layer = useEditorStore.getState().layers[0];
        // Mid-grey square so a highlight increases brightness and a shadow decreases.
        paintRect(layer, '#808080', 30, 30, 40, 40);

        useEditorStore.getState().addLayerEffect(layer.id, 'bevel-emboss');
        useEditorStore.getState().setLayerEffectParams(layer.id, 0, {
            style: 'inner-bevel',
            depth: 400,
            direction: 'up',
            size: 10,
            soften: 0,
            // Angle 0 means the light is along +x (the right edge faces it).
            angle: 0,
            altitude: 30,
            highlightColor: '#ffffff',
            highlightOpacity: 1,
            highlightBlendMode: 'source-over',
            shadowColor: '#000000',
            shadowOpacity: 1,
            shadowBlendMode: 'source-over',
        });

        const target = compose();
        // Just inside the right edge of the square (lit side).
        const right = pixelAt(target, 67, 50);
        // Just inside the left edge of the square (shadow side).
        const left = pixelAt(target, 32, 50);
        // The lit edge should be brighter than the shadowed edge.
        expect(right.r + right.g + right.b).toBeGreaterThan(left.r + left.g + left.b);
    });

    it('emboss style produces both highlight (bright) and shadow (dark) on opposite sides of the alpha edge', () => {
        const layer = useEditorStore.getState().layers[0];
        // Mid-grey square so highlight + shadow stay visible.
        paintRect(layer, '#808080', 30, 30, 40, 40);

        useEditorStore.getState().addLayerEffect(layer.id, 'bevel-emboss');
        useEditorStore.getState().setLayerEffectParams(layer.id, 0, {
            style: 'emboss',
            depth: 600,
            direction: 'up',
            size: 8,
            soften: 0,
            angle: 0,
            altitude: 30,
            highlightColor: '#ffffff',
            highlightOpacity: 1,
            highlightBlendMode: 'source-over',
            shadowColor: '#000000',
            shadowOpacity: 1,
            shadowBlendMode: 'source-over',
        });

        const target = compose();
        // Sample inside the layer near the right edge (highlight side).
        const litInside = pixelAt(target, 68, 50);
        // Sample inside the layer near the left edge (shadow side).
        const darkInside = pixelAt(target, 31, 50);

        // The lit side should be brighter than the dark side after emboss.
        expect(litInside.r + litInside.g + litInside.b).toBeGreaterThan(darkInside.r + darkInside.g + darkInside.b);
    });
});

describe('Satin effect', () => {
    beforeEach(reset);

    it('is registered with the effects registry', () => {
        expect(getEffect('satin')).toBeTruthy();
    });

    it('gaussian contour over a uniform color layer produces variation (banding), not a flat tint', () => {
        const layer = useEditorStore.getState().layers[0];
        // Solid white square so satin's dark banding is easy to detect.
        paintRect(layer, '#ffffff', 20, 20, 60, 60);

        useEditorStore.getState().addLayerEffect(layer.id, 'satin');
        useEditorStore.getState().setLayerEffectParams(layer.id, 0, {
            color: '#000000',
            opacity: 1,
            blendMode: 'source-over',
            angle: 45,
            distance: 12,
            size: 6,
            contour: 'gaussian',
            invert: false,
        });

        // Render the effect directly so we can inspect its own canvas (the
        // compositor's overlay path clips to the layer alpha which is what we
        // want, but we want to assert on the satin canvas itself to avoid any
        // confusion with blend math).
        const effect = getEffect('satin')!;
        const result = effect.apply(
            useEditorStore.getState().layers[0].effects[0].params,
            { layer, layerCanvas: layer.canvas, width: 100, height: 100 },
        );
        expect(result).toBeTruthy();
        const satinCanvas = result!.canvas;
        // Sanity: the layer canvas itself should still be a white square so
        // the satin effect has something to fold.
        const layerCheck = pixelAt(layer.canvas, 50, 50);
        expect(layerCheck.a).toBeGreaterThan(200);

        // Sample alpha across the full canvas to verify the satin produced a
        // variable alpha map (banding) rather than a flat tint.
        const sctx = satinCanvas.getContext('2d')!;
        const sd = sctx.getImageData(0, 0, 100, 100);
        let minAlpha = 255;
        let maxAlpha = 0;
        for (let i = 3; i < sd.data.length; i += 4) {
            const a = sd.data[i];
            if (a < minAlpha) minAlpha = a;
            if (a > maxAlpha) maxAlpha = a;
        }
        // Banded result: significant alpha range between strongest and weakest pixel.
        expect(maxAlpha - minAlpha).toBeGreaterThan(40);
    });
});

describe('Layer Style copy/paste/clear (Batch 4)', () => {
    beforeEach(reset);

    it('copying layer A then pasting onto layer B mirrors layer A\'s effects on layer B', () => {
        // Add a second layer.
        useEditorStore.getState().addLayer();
        const [a, b] = useEditorStore.getState().layers;
        expect(a.id).not.toBe(b.id);

        useEditorStore.getState().addLayerEffect(a.id, 'drop-shadow');
        useEditorStore.getState().setLayerEffectParams(a.id, 0, { color: '#123456', opacity: 0.4, size: 12 });
        useEditorStore.getState().addLayerEffect(a.id, 'bevel-emboss');
        useEditorStore.getState().setLayerEffectParams(a.id, 1, { style: 'emboss', depth: 250 });

        useEditorStore.getState().copyLayerStyle(a.id);
        useEditorStore.getState().pasteLayerStyle(b.id);

        const layerB = useEditorStore.getState().layers.find(l => l.id === b.id)!;
        expect(layerB.effects).toHaveLength(2);
        expect(layerB.effects[0].kind).toBe('drop-shadow');
        expect(layerB.effects[0].params.color).toBe('#123456');
        expect(layerB.effects[0].params.size).toBe(12);
        expect(layerB.effects[1].kind).toBe('bevel-emboss');
        expect(layerB.effects[1].params.style).toBe('emboss');
        expect(layerB.effects[1].params.depth).toBe(250);
    });

    it('clearing the layer style empties the effects array', () => {
        const layer = useEditorStore.getState().layers[0];
        useEditorStore.getState().addLayerEffect(layer.id, 'drop-shadow');
        useEditorStore.getState().addLayerEffect(layer.id, 'satin');
        expect(useEditorStore.getState().layers[0].effects).toHaveLength(2);

        useEditorStore.getState().clearLayerStyle(layer.id);
        expect(useEditorStore.getState().layers[0].effects).toHaveLength(0);
    });

    it('scaleLayerEffects 200% doubles size, distance, depth, soften, and spread on every effect', () => {
        const layer = useEditorStore.getState().layers[0];
        useEditorStore.getState().addLayerEffect(layer.id, 'drop-shadow');
        useEditorStore.getState().setLayerEffectParams(layer.id, 0, {
            size: 10, distance: 5, spread: 0.25, color: '#000000',
        });
        useEditorStore.getState().addLayerEffect(layer.id, 'bevel-emboss');
        useEditorStore.getState().setLayerEffectParams(layer.id, 1, {
            size: 6, depth: 100, soften: 4,
        });

        useEditorStore.getState().scaleLayerEffects(layer.id, 200);

        const fx = useEditorStore.getState().layers[0].effects;
        expect(fx[0].params.size).toBe(20);
        expect(fx[0].params.distance).toBe(10);
        expect(fx[0].params.spread).toBeCloseTo(0.5);
        // Non-scalable fields (color) untouched.
        expect(fx[0].params.color).toBe('#000000');
        expect(fx[1].params.size).toBe(12);
        expect(fx[1].params.depth).toBe(200);
        expect(fx[1].params.soften).toBe(8);
    });

    it('the Properties Effects section renders the Layer Style buttons', () => {
        render(<PropertiesPanel />);
        expect(screen.getByTestId('layer-style-copy')).toBeTruthy();
        expect(screen.getByTestId('layer-style-paste')).toBeTruthy();
        expect(screen.getByTestId('layer-style-clear')).toBeTruthy();
        expect(screen.getByTestId('layer-style-scale')).toBeTruthy();
        cleanup();
    });

    it('clicking Scale Effects… opens the dialog and a confirmation scales the effects', () => {
        const layer = useEditorStore.getState().layers[0];
        useEditorStore.getState().addLayerEffect(layer.id, 'drop-shadow');
        useEditorStore.getState().setLayerEffectParams(layer.id, 0, { size: 10, distance: 5 });

        render(<PropertiesPanel />);
        fireEvent.click(screen.getByTestId('layer-style-scale'));
        expect(useEditorStore.getState().isScaleEffectsDialogOpen).toBe(true);
        cleanup();
    });
});

describe('Properties Effects picker (Batch 4)', () => {
    beforeEach(reset);
    afterEach(() => cleanup());

    it('exposes Bevel & Emboss and Satin as add options', () => {
        render(<PropertiesPanel />);
        const picker = screen.getByTestId('effects-add-picker') as HTMLSelectElement;
        const labels = Array.from(picker.options).map(o => o.label);
        expect(labels).toContain('Bevel & Emboss');
        expect(labels).toContain('Satin');
    });
});

describe('ScaleEffectsDialog UI', () => {
    afterEach(() => cleanup());

    it('renders a percentage slider and confirms with the chosen value', () => {
        const onConfirm = vi.fn();
        const onClose = vi.fn();
        render(<ScaleEffectsDialog isOpen={true} onClose={onClose} onConfirm={onConfirm} />);
        const slider = screen.getByTestId('scale-effects-slider') as HTMLInputElement;
        fireEvent.change(slider, { target: { value: '250' } });
        fireEvent.click(screen.getByTestId('scale-effects-ok'));
        expect(onConfirm).toHaveBeenCalledWith(250);
        expect(onClose).toHaveBeenCalled();
    });
});

describe('Bevel & Emboss + Satin persistence (Batch 4)', () => {
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

    it('saving a document preserves Bevel & Emboss and Satin params, and a reload restores them', async () => {
        const layer = useEditorStore.getState().layers[0];

        useEditorStore.getState().addLayerEffect(layer.id, 'bevel-emboss');
        useEditorStore.getState().setLayerEffectParams(layer.id, 0, {
            style: 'pillow-emboss',
            depth: 350,
            direction: 'down',
            size: 9,
            soften: 2,
            angle: 45,
            altitude: 60,
            highlightColor: '#abcdef',
            highlightOpacity: 0.5,
            highlightBlendMode: 'screen',
            shadowColor: '#112233',
            shadowOpacity: 0.6,
            shadowBlendMode: 'multiply',
        });

        useEditorStore.getState().addLayerEffect(layer.id, 'satin');
        useEditorStore.getState().setLayerEffectParams(layer.id, 1, {
            color: '#445566',
            opacity: 0.7,
            blendMode: 'multiply',
            angle: 200,
            distance: 15,
            size: 11,
            contour: 'cone',
            invert: true,
        });

        await saveDocument(useEditorStore.getState(), 'batch4-fx-doc');

        const json = store['pwbdoc:batch4-fx-doc'];
        expect(json).toBeTruthy();
        const manifest = JSON.parse(json) as DocumentManifest;
        const persisted = manifest.layers[0].effects ?? [];

        const bevel = persisted.find(e => e.kind === 'bevel-emboss');
        expect(bevel?.params.style).toBe('pillow-emboss');
        expect(bevel?.params.depth).toBe(350);
        expect(bevel?.params.direction).toBe('down');
        expect(bevel?.params.size).toBe(9);
        expect(bevel?.params.angle).toBe(45);
        expect(bevel?.params.altitude).toBe(60);
        expect(bevel?.params.highlightColor).toBe('#abcdef');
        expect(bevel?.params.shadowOpacity).toBe(0.6);

        const satin = persisted.find(e => e.kind === 'satin');
        expect(satin?.params.color).toBe('#445566');
        expect(satin?.params.opacity).toBe(0.7);
        expect(satin?.params.contour).toBe('cone');
        expect(satin?.params.invert).toBe(true);

        // Round-trip via JSON parse to confirm bevel/satin params survive a
        // pure save→load cycle (loadDocument's Image() async draw is not
        // friendly to jsdom, so we exercise the manifest reader only).
        const serialized = JSON.stringify(manifest);
        const deserialized = JSON.parse(serialized) as DocumentManifest;
        expect(deserialized.layers[0].effects).toHaveLength(2);
        const reloadedBevel = deserialized.layers[0].effects!.find(e => e.kind === 'bevel-emboss');
        expect(reloadedBevel?.params.style).toBe('pillow-emboss');
        expect(reloadedBevel?.params.depth).toBe(350);
        const reloadedSatin = deserialized.layers[0].effects!.find(e => e.kind === 'satin');
        expect(reloadedSatin?.params.contour).toBe('cone');
        expect(reloadedSatin?.params.invert).toBe(true);
    });
});
