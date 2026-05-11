import { describe, it, expect, beforeEach } from 'vitest';
import { useEditorStore } from '../store/editorStore';
import { getTool } from '../tools/registry';
import { ensureStubsRegistered } from '../tools/stubs';
import { layerPixelAt, makeToolPointerEvent } from './simulator';

ensureStubsRegistered();

function reset() {
    useEditorStore.setState((s) => ({
        ...s,
        layers: [],
        activeLayerId: null,
        primaryColor: '#ff0000',
        brushSettings: { size: 5, hardness: 1, opacity: 1, flow: 1 },
    }));
    useEditorStore.getState().addLayer();
    useEditorStore.getState().clearHistory();
}

function ctx() {
    return {
        store: useEditorStore.getState(),
        getStore: () => useEditorStore.getState(),
        requestRender: () => {},
    };
}

describe('brushSettings as single source of truth', () => {
    beforeEach(reset);

    it('eraser respects brush-size shortcut', () => {
        const layer = useEditorStore.getState().layers[0];
        layer.ctx.fillStyle = '#00ff00';
        layer.ctx.fillRect(0, 0, 200, 200);

        useEditorStore.getState().setBrushSize(40);

        const tool = getTool('eraser')!;
        tool.onPointerDown!(makeToolPointerEvent({ canvasX: 50, canvasY: 50 }), ctx());
        tool.onPointerMove!(makeToolPointerEvent({ canvasX: 60, canvasY: 50 }), ctx());
        tool.onPointerUp!(makeToolPointerEvent({ canvasX: 60, canvasY: 50 }), ctx());

        // With size 40, pixels well outside +/-20 of the stroke remain intact;
        // pixels at the stroke center are partly erased.
        const center = layerPixelAt(layer, 55, 50);
        const farAway = layerPixelAt(layer, 150, 150);
        expect(center.a).toBeLessThan(255);
        expect(farAway.a).toBe(255);
    });

    it('dodge respects brush-hardness shortcut at the radius', () => {
        const layer = useEditorStore.getState().layers[0];
        layer.ctx.fillStyle = '#808080';
        layer.ctx.fillRect(0, 0, 200, 200);

        // Same exposure, same size, hardness controls falloff via brush tip
        // cache. After this test the brush tip is regenerated from brushSettings.
        useEditorStore.getState().setBrushSize(60);
        useEditorStore.getState().setBrushHardness(0.5);

        const tool = getTool('dodge')!;
        tool.onPointerDown!(makeToolPointerEvent({ canvasX: 100, canvasY: 100 }), ctx());
        tool.onPointerUp!(makeToolPointerEvent({ canvasX: 100, canvasY: 100 }), ctx());

        // Center of the dodge gets brighter; pixels outside the radius are unchanged.
        const center = layerPixelAt(layer, 100, 100);
        const outside = layerPixelAt(layer, 180, 100);
        expect(center.r).toBeGreaterThan(0x80);
        expect(outside.r).toBe(0x80);
    });

    it('sponge respects brush-size from store', () => {
        const layer = useEditorStore.getState().layers[0];
        layer.ctx.fillStyle = '#ff0000';
        layer.ctx.fillRect(0, 0, 200, 200);

        useEditorStore.getState().setBrushSize(40);
        useEditorStore.getState().setBrushFlow(0.8);

        const tool = getTool('sponge')!;
        tool.onPointerDown!(makeToolPointerEvent({ canvasX: 50, canvasY: 50 }), ctx());
        tool.onPointerUp!(makeToolPointerEvent({ canvasX: 50, canvasY: 50 }), ctx());

        // Default sponge mode is desaturate -> red toward gray near the click.
        const inside = layerPixelAt(layer, 50, 50);
        const outside = layerPixelAt(layer, 150, 150);
        expect(inside.g).toBeGreaterThan(0);
        expect(outside.r).toBe(255);
        expect(outside.g).toBe(0);
    });
});
