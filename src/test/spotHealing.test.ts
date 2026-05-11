import { describe, it, expect, beforeEach } from 'vitest';
import { useEditorStore } from '../store/editorStore';
import { getTool } from '../tools/registry';
import { ensureStubsRegistered } from '../tools/stubs';
import { layerPixelAt, makeToolPointerEvent } from './simulator';
import {
    setSpotHealingOptions, getSpotHealingOptions,
} from '../tools/spotHealing';

ensureStubsRegistered();

function reset() {
    useEditorStore.setState((s) => ({
        ...s,
        layers: [],
        activeLayerId: null,
        primaryColor: '#000000',
        brushSettings: { size: 14, hardness: 1, opacity: 1, flow: 1 },
    }));
    useEditorStore.getState().clearSelection();
    useEditorStore.getState().addLayer();
    useEditorStore.getState().clearHistory();
    setSpotHealingOptions({ type: 'proximity-match', sampleAllLayers: false, mode: 'normal' });
}

function ctx() {
    return {
        store: useEditorStore.getState(),
        getStore: () => useEditorStore.getState(),
        requestRender: () => { /* noop */ },
    };
}

function paintRect(layer: { ctx: CanvasRenderingContext2D }, color: string, x: number, y: number, w: number, h: number) {
    layer.ctx.fillStyle = color;
    layer.ctx.fillRect(x, y, w, h);
}

describe('Spot Healing Brush — neighborhood replacement', () => {
    beforeEach(reset);

    it('a red blob on a uniform white field heals to approximately white', () => {
        const layer = useEditorStore.getState().layers[0];
        paintRect(layer, '#ffffff', 0, 0, layer.canvas.width, layer.canvas.height);
        // Small red blemish (smaller than the brush).
        paintRect(layer, '#ff0000', 95, 95, 10, 10);

        useEditorStore.setState(s => ({ ...s, brushSettings: { ...s.brushSettings, size: 30 } }));
        const tool = getTool('spot-healing')!;
        tool.onPointerDown!(makeToolPointerEvent({ canvasX: 100, canvasY: 100 }), ctx());
        tool.onPointerUp!(makeToolPointerEvent({ canvasX: 100, canvasY: 100 }), ctx());

        // Center of the blemish should be approximately white.
        const px = layerPixelAt(layer, 100, 100);
        expect(px.r).toBeGreaterThan(220);
        expect(px.g).toBeGreaterThan(220);
        expect(px.b).toBeGreaterThan(220);
        expect(px.a).toBeGreaterThan(220);
    });

    it('a green spot in a blue field heals to approximately blue', () => {
        const layer = useEditorStore.getState().layers[0];
        paintRect(layer, '#1133cc', 0, 0, layer.canvas.width, layer.canvas.height);
        paintRect(layer, '#22ff11', 95, 95, 10, 10);

        useEditorStore.setState(s => ({ ...s, brushSettings: { ...s.brushSettings, size: 30 } }));
        const tool = getTool('spot-healing')!;
        tool.onPointerDown!(makeToolPointerEvent({ canvasX: 100, canvasY: 100 }), ctx());
        tool.onPointerUp!(makeToolPointerEvent({ canvasX: 100, canvasY: 100 }), ctx());

        const px = layerPixelAt(layer, 100, 100);
        // Blue dominant.
        expect(px.b).toBeGreaterThan(px.g);
        expect(px.b).toBeGreaterThan(px.r);
        // The healed pixel should be close to the surrounding blue.
        expect(px.r).toBeLessThan(60);
        expect(px.b).toBeGreaterThan(140);
    });

    it('sampleAllLayers reads composited visible layers but writes only to the active layer', () => {
        // Layer 0 (base): uniform white with a red dot where we'll heal.
        const base = useEditorStore.getState().layers[0];
        paintRect(base, '#ffffff', 0, 0, base.canvas.width, base.canvas.height);

        // Add a top layer that is mostly transparent with a small red blemish.
        useEditorStore.getState().addLayer();
        const top = useEditorStore.getState().layers[1];
        paintRect(top, '#ff0000', 95, 95, 10, 10);

        useEditorStore.getState().setActiveLayer(top.id);
        useEditorStore.setState(s => ({ ...s, brushSettings: { ...s.brushSettings, size: 30 } }));
        setSpotHealingOptions({ type: 'proximity-match', sampleAllLayers: true, mode: 'normal' });

        const tool = getTool('spot-healing')!;
        tool.onPointerDown!(makeToolPointerEvent({ canvasX: 100, canvasY: 100 }), ctx());
        tool.onPointerUp!(makeToolPointerEvent({ canvasX: 100, canvasY: 100 }), ctx());

        // Active layer (top) at the brush center: healed using ring samples from the
        // composite (which is dominated by base white). It should look light.
        const px = layerPixelAt(top, 100, 100);
        expect(px.r).toBeGreaterThan(180);
        expect(px.g).toBeGreaterThan(180);
        expect(px.b).toBeGreaterThan(180);

        // Base layer untouched.
        const basePx = layerPixelAt(base, 100, 100);
        expect(basePx.r).toBe(255);
        expect(basePx.g).toBe(255);
        expect(basePx.b).toBe(255);
    });

    it('active selection clips the heal: pixels outside the selection remain unchanged', () => {
        const layer = useEditorStore.getState().layers[0];
        paintRect(layer, '#ffffff', 0, 0, layer.canvas.width, layer.canvas.height);
        paintRect(layer, '#ff0000', 50, 50, 100, 100);

        // Selection: only the top half of the red box.
        useEditorStore.getState().setHasSelection(true);
        useEditorStore.getState().setSelectionOperations([
            { mode: 'add', type: 'rect', path: [{ x: 0, y: 0 }, { x: 200, y: 100 }] },
        ]);

        useEditorStore.setState(s => ({ ...s, brushSettings: { ...s.brushSettings, size: 50 } }));
        const tool = getTool('spot-healing')!;
        // Click on the boundary: half of the footprint is in selection, half outside.
        tool.onPointerDown!(makeToolPointerEvent({ canvasX: 100, canvasY: 100 }), ctx());
        tool.onPointerUp!(makeToolPointerEvent({ canvasX: 100, canvasY: 100 }), ctx());

        // Below the selection cutoff (y > 100): still red.
        const below = layerPixelAt(layer, 100, 130);
        expect(below.r).toBe(255);
        expect(below.g).toBe(0);
        expect(below.b).toBe(0);
    });

    it('undo and redo round-trip a Spot Healing click', () => {
        const layer = useEditorStore.getState().layers[0];
        paintRect(layer, '#ffffff', 0, 0, layer.canvas.width, layer.canvas.height);
        paintRect(layer, '#ff0000', 95, 95, 10, 10);

        useEditorStore.setState(s => ({ ...s, brushSettings: { ...s.brushSettings, size: 30 } }));
        const tool = getTool('spot-healing')!;
        tool.onPointerDown!(makeToolPointerEvent({ canvasX: 100, canvasY: 100 }), ctx());
        tool.onPointerUp!(makeToolPointerEvent({ canvasX: 100, canvasY: 100 }), ctx());

        const healed = layerPixelAt(layer, 100, 100);
        expect(healed.r).toBeGreaterThan(200);

        useEditorStore.getState().undo();
        const after = layerPixelAt(useEditorStore.getState().layers[0], 100, 100);
        // Pre-heal pixel was red.
        expect(after.r).toBe(255);
        expect(after.g).toBe(0);

        useEditorStore.getState().redo();
        const redone = layerPixelAt(useEditorStore.getState().layers[0], 100, 100);
        expect(redone.r).toBeGreaterThan(200);
    });

    it('options round-trip: setSpotHealingOptions persists, getSpotHealingOptions returns latest', () => {
        setSpotHealingOptions({ type: 'proximity-match', sampleAllLayers: true, mode: 'multiply' });
        const o = getSpotHealingOptions();
        expect(o.type).toBe('proximity-match');
        expect(o.sampleAllLayers).toBe(true);
        expect(o.mode).toBe('multiply');
    });
});
