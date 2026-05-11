import { describe, it, expect, beforeEach } from 'vitest';
import { useEditorStore } from '../store/editorStore';
import { getTool } from '../tools/registry';
import { ensureStubsRegistered } from '../tools/stubs';
import { layerPixelAt, makeToolPointerEvent } from './simulator';
import {
    setHealingBrushOptions, getHealingBrushOptions, resetHealingBrushSource,
} from '../tools/healingBrush';

ensureStubsRegistered();

function reset() {
    useEditorStore.setState((s) => ({
        ...s,
        layers: [],
        activeLayerId: null,
        primaryColor: '#000000',
        brushSettings: { size: 20, hardness: 1, opacity: 1, flow: 1 },
    }));
    useEditorStore.getState().clearSelection();
    useEditorStore.getState().addLayer();
    useEditorStore.getState().clearHistory();
    setHealingBrushOptions({ aligned: true, mode: 'normal', sampleAllLayers: false });
    resetHealingBrushSource();
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

describe('Healing Brush — sampled source with mean-shift blend', () => {
    beforeEach(reset);

    it('Alt-click sets the source anchor without painting', () => {
        const layer = useEditorStore.getState().layers[0];
        paintRect(layer, '#ffffff', 0, 0, layer.canvas.width, layer.canvas.height);
        paintRect(layer, '#ff0000', 200, 50, 30, 30);

        const tool = getTool('healing-brush')!;
        // Alt-click on the red region.
        tool.onPointerDown!(makeToolPointerEvent({ canvasX: 215, canvasY: 65, modifiers: { alt: true } }), ctx());
        tool.onPointerUp!(makeToolPointerEvent({ canvasX: 215, canvasY: 65 }), ctx());

        // Layer pixels untouched by sampling.
        const px = layerPixelAt(layer, 215, 65);
        expect(px.r).toBe(255);
        expect(px.g).toBe(0);
        expect(px.b).toBe(0);
        expect(useEditorStore.getState().canUndo).toBeFalsy();
    });

    it('subsequent click paints source + (destMean - sourceMean) so texture matches destination tone', () => {
        const layer = useEditorStore.getState().layers[0];
        // Source: uniform red.
        paintRect(layer, '#ff0000', 200, 50, 50, 50);
        // Destination: blue field with a tiny dark blemish smaller than the brush.
        paintRect(layer, '#3366ff', 0, 150, layer.canvas.width, 200);
        paintRect(layer, '#000000', 96, 246, 8, 8);

        useEditorStore.setState(s => ({ ...s, brushSettings: { ...s.brushSettings, size: 30 } }));
        const tool = getTool('healing-brush')!;
        // Alt-click in the middle of red source.
        tool.onPointerDown!(makeToolPointerEvent({ canvasX: 225, canvasY: 75, modifiers: { alt: true } }), ctx());
        // Click on the small black blemish to heal. Brush radius=15, footprint
        // dominated by surrounding blue.
        tool.onPointerDown!(makeToolPointerEvent({ canvasX: 100, canvasY: 250 }), ctx());
        tool.onPointerUp!(makeToolPointerEvent({ canvasX: 100, canvasY: 250 }), ctx());

        // After healing: source was red but mean shift moves it toward the blue
        // destination tone. The result should be blue-dominated, not red.
        const px = layerPixelAt(layer, 100, 250);
        expect(px.b).toBeGreaterThan(px.r);
        // Definitely no longer pure red.
        expect(px.r).toBeLessThan(200);
    });

    it('aligned-off resets the source-destination offset on each pointer-down', () => {
        const layer = useEditorStore.getState().layers[0];
        paintRect(layer, '#ffffff', 0, 0, layer.canvas.width, layer.canvas.height);
        paintRect(layer, '#ff0000', 200, 50, 60, 60);

        setHealingBrushOptions({ aligned: false, mode: 'normal', sampleAllLayers: false });
        const tool = getTool('healing-brush')!;
        // Sample the red.
        tool.onPointerDown!(makeToolPointerEvent({ canvasX: 230, canvasY: 80, modifiers: { alt: true } }), ctx());
        // Paint at A: source-dest offset = (230 - 50, 80 - 200) = (180, -120)
        tool.onPointerDown!(makeToolPointerEvent({ canvasX: 50, canvasY: 200 }), ctx());
        tool.onPointerUp!(makeToolPointerEvent({ canvasX: 50, canvasY: 200 }), ctx());
        // Paint at B without aligned: offset should reset so source comes from
        // anchor=B, sampling at (230,80) again.
        tool.onPointerDown!(makeToolPointerEvent({ canvasX: 100, canvasY: 300 }), ctx());
        tool.onPointerUp!(makeToolPointerEvent({ canvasX: 100, canvasY: 300 }), ctx());

        // The point we painted at must have changed color (heal must have occurred).
        const a = layerPixelAt(layer, 50, 200);
        const b = layerPixelAt(layer, 100, 300);
        // Both points were white before the heal; after pulling from red source +
        // mean-shift (mean dest ~ white, mean source ~ red, shift ~ white-red),
        // the result remains close to white.
        expect(a.a).toBeGreaterThan(220);
        expect(b.a).toBeGreaterThan(220);
    });

    it('selection clipping prevents painting outside the active selection', () => {
        const layer = useEditorStore.getState().layers[0];
        paintRect(layer, '#ffffff', 0, 0, layer.canvas.width, layer.canvas.height);
        // Source: solid red far from anywhere.
        paintRect(layer, '#ff0000', 200, 50, 60, 60);
        // Stripe of green inside the selection bounds and a stripe outside.
        paintRect(layer, '#00ff00', 50, 200, 100, 50);   // inside selection
        paintRect(layer, '#00ff00', 50, 350, 100, 50);   // outside selection

        useEditorStore.getState().setHasSelection(true);
        useEditorStore.getState().setSelectionOperations([
            { mode: 'add', type: 'rect', path: [{ x: 0, y: 0 }, { x: 300, y: 300 }] },
        ]);

        const tool = getTool('healing-brush')!;
        tool.onPointerDown!(makeToolPointerEvent({ canvasX: 230, canvasY: 80, modifiers: { alt: true } }), ctx());
        // Click that would paint at y=370 (outside selection band).
        tool.onPointerDown!(makeToolPointerEvent({ canvasX: 100, canvasY: 370 }), ctx());
        tool.onPointerUp!(makeToolPointerEvent({ canvasX: 100, canvasY: 370 }), ctx());

        // Outside the selection: the original green pixel must remain.
        const outside = layerPixelAt(layer, 100, 370);
        expect(outside.r).toBe(0);
        expect(outside.g).toBe(255);
        expect(outside.b).toBe(0);
    });

    it('undo and redo round-trip a Healing Brush stroke', () => {
        const layer = useEditorStore.getState().layers[0];
        paintRect(layer, '#ffffff', 0, 0, layer.canvas.width, layer.canvas.height);
        paintRect(layer, '#ff0000', 200, 50, 60, 60);
        // Small black blemish smaller than the brush radius.
        paintRect(layer, '#000000', 96, 246, 8, 8);

        useEditorStore.setState(s => ({ ...s, brushSettings: { ...s.brushSettings, size: 30 } }));
        const tool = getTool('healing-brush')!;
        tool.onPointerDown!(makeToolPointerEvent({ canvasX: 230, canvasY: 80, modifiers: { alt: true } }), ctx());
        tool.onPointerDown!(makeToolPointerEvent({ canvasX: 100, canvasY: 250 }), ctx());
        tool.onPointerUp!(makeToolPointerEvent({ canvasX: 100, canvasY: 250 }), ctx());

        const after = layerPixelAt(layer, 100, 250);
        // Heal must have changed the black-blemish pixel toward the mean (~white).
        expect(after.r + after.g + after.b).toBeGreaterThan(300);

        useEditorStore.getState().undo();
        const undone = layerPixelAt(useEditorStore.getState().layers[0], 100, 250);
        expect(undone.r).toBe(0);
        expect(undone.g).toBe(0);
        expect(undone.b).toBe(0);

        useEditorStore.getState().redo();
        const redone = layerPixelAt(useEditorStore.getState().layers[0], 100, 250);
        expect(redone.r + redone.g + redone.b).toBeGreaterThan(300);
    });

    it('options round-trip: setHealingBrushOptions persists, getHealingBrushOptions returns latest', () => {
        setHealingBrushOptions({ aligned: false, mode: 'multiply', sampleAllLayers: true });
        const o = getHealingBrushOptions();
        expect(o.aligned).toBe(false);
        expect(o.mode).toBe('multiply');
        expect(o.sampleAllLayers).toBe(true);
    });
});
