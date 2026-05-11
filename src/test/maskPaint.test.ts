import { describe, it, expect, beforeEach } from 'vitest';
import { useEditorStore } from '../store/editorStore';
import { getTool } from '../tools/registry';
import { ensureStubsRegistered } from '../tools/stubs';
import { layerPixelAt, makeToolPointerEvent } from './simulator';

ensureStubsRegistered();

function reset() {
    useEditorStore.getState().clearHistory();
    useEditorStore.setState((s) => ({
        ...s,
        layers: [],
        activeLayerId: null,
        primaryColor: '#000000',
        brushSettings: { size: 30, hardness: 1, opacity: 1, flow: 1 },
    }));
    useEditorStore.getState().addLayer();
}

function ctx() {
    return {
        store: useEditorStore.getState(),
        getStore: () => useEditorStore.getState(),
        requestRender: () => {},
    };
}

describe('mask paint mode', () => {
    beforeEach(reset);

    it('switching active edit target to mask leaves layer pixels untouched on a brush stroke', () => {
        const { activeLayerId } = useEditorStore.getState();
        useEditorStore.getState().addLayerMask(activeLayerId!, 'reveal-all');
        const layer = useEditorStore.getState().layers[0];
        // Fill the layer with a known color.
        layer.ctx.fillStyle = '#00ff00';
        layer.ctx.fillRect(0, 0, 200, 200);

        useEditorStore.getState().setActiveLayerEditTarget('mask');

        const tool = getTool('brush')!;
        // Foreground is black; in mask mode the brush paints luminance, so this paints black on the mask.
        tool.onPointerDown!(makeToolPointerEvent({ canvasX: 100, canvasY: 100 }), ctx());
        tool.onPointerMove!(makeToolPointerEvent({ canvasX: 110, canvasY: 100 }), ctx());
        tool.onPointerUp!(makeToolPointerEvent({ canvasX: 110, canvasY: 100 }), ctx());

        // Layer pixels: still pure green.
        const layerPx = layerPixelAt(layer, 100, 100);
        expect(layerPx.r).toBe(0);
        expect(layerPx.g).toBe(255);

        // Mask pixels: luminance dropped near the brush center (we painted black).
        expect(layer.mask).toBeTruthy();
        const maskPx = layer.mask!.ctx.getImageData(100, 100, 1, 1).data;
        expect(maskPx[0]).toBeLessThan(255);
    });

    it('switching active layer resets edit target to layer', () => {
        useEditorStore.getState().setActiveLayerEditTarget('mask');
        useEditorStore.getState().addLayer();
        expect(useEditorStore.getState().activeLayerEditTarget).toBe('layer');
    });

    it('mask paint stroke is undoable and round-trips the mask pixels', () => {
        const { activeLayerId } = useEditorStore.getState();
        useEditorStore.getState().addLayerMask(activeLayerId!, 'reveal-all');
        useEditorStore.getState().setActiveLayerEditTarget('mask');

        const layer = useEditorStore.getState().layers[0];
        const tool = getTool('brush')!;
        tool.onPointerDown!(makeToolPointerEvent({ canvasX: 60, canvasY: 60 }), ctx());
        tool.onPointerMove!(makeToolPointerEvent({ canvasX: 70, canvasY: 60 }), ctx());
        tool.onPointerUp!(makeToolPointerEvent({ canvasX: 70, canvasY: 60 }), ctx());

        const after = layer.mask!.ctx.getImageData(60, 60, 1, 1).data[0];
        expect(after).toBeLessThan(255);

        useEditorStore.getState().undo();
        const restored = layer.mask!.ctx.getImageData(60, 60, 1, 1).data[0];
        expect(restored).toBe(255);
    });

    it('mask-from-selection populates a mask matching the active selection bounds', () => {
        const { activeLayerId } = useEditorStore.getState();
        useEditorStore.getState().setSelectionOperations([
            { mode: 'add', type: 'rect', path: [{ x: 30, y: 30 }, { x: 80, y: 80 }] },
        ]);
        useEditorStore.getState().setHasSelection(true);
        useEditorStore.getState().addLayerMaskFromSelection(activeLayerId!, 'reveal');
        const layer = useEditorStore.getState().layers[0];
        expect(layer.mask).toBeTruthy();
        const inside = layer.mask!.ctx.getImageData(50, 50, 1, 1).data;
        const outside = layer.mask!.ctx.getImageData(120, 120, 1, 1).data;
        expect(inside[0]).toBe(255); // revealed (white)
        expect(outside[0]).toBe(0);  // hidden (black)
    });
});
