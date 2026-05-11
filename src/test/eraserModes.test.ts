import { describe, it, expect, beforeEach } from 'vitest';
import { useEditorStore } from '../store/editorStore';
import { getTool } from '../tools/registry';
import { ensureStubsRegistered } from '../tools/stubs';
import { setEraserOptions } from '../tools/eraser';
import { layerPixelAt, makeToolPointerEvent } from './simulator';

ensureStubsRegistered();

function reset() {
    useEditorStore.setState((s) => ({
        ...s,
        layers: [],
        activeLayerId: null,
        brushSettings: { size: 30, hardness: 0.5, opacity: 1, flow: 1 },
    }));
    useEditorStore.getState().addLayer();
    setEraserOptions({ mode: 'brush' });
}

function ctx() {
    return {
        store: useEditorStore.getState(),
        getStore: () => useEditorStore.getState(),
        requestRender: () => {},
    };
}

describe('eraser modes', () => {
    beforeEach(reset);

    it('pencil eraser leaves no soft edge', () => {
        const layer = useEditorStore.getState().layers[0];
        layer.ctx.fillStyle = '#00ff00';
        layer.ctx.fillRect(0, 0, 200, 200);

        useEditorStore.getState().setBrushSize(30);
        setEraserOptions({ mode: 'pencil' });

        const tool = getTool('eraser')!;
        tool.onPointerDown!(makeToolPointerEvent({ canvasX: 60, canvasY: 60 }), ctx());
        tool.onPointerMove!(makeToolPointerEvent({ canvasX: 60, canvasY: 61 }), ctx());
        tool.onPointerUp!(makeToolPointerEvent({ canvasX: 60, canvasY: 61 }), ctx());

        const inside = layerPixelAt(layer, 60, 60);
        // Just outside the pencil radius (~15) the pixels stay fully opaque.
        const outside = layerPixelAt(layer, 90, 60);
        expect(inside.a).toBe(0);
        expect(outside.a).toBe(255);
    });

    it('block eraser uses a square footprint regardless of hardness', () => {
        const layer = useEditorStore.getState().layers[0];
        layer.ctx.fillStyle = '#0000ff';
        layer.ctx.fillRect(0, 0, 200, 200);

        useEditorStore.getState().setBrushSize(20);
        useEditorStore.getState().setBrushHardness(0); // hardness is irrelevant for block
        setEraserOptions({ mode: 'block' });

        const tool = getTool('eraser')!;
        tool.onPointerDown!(makeToolPointerEvent({ canvasX: 100, canvasY: 100 }), ctx());
        tool.onPointerMove!(makeToolPointerEvent({ canvasX: 100, canvasY: 101 }), ctx());
        tool.onPointerUp!(makeToolPointerEvent({ canvasX: 100, canvasY: 101 }), ctx());

        // Inside the 20px square (corners) — fully erased thanks to square footprint.
        const corner = layerPixelAt(layer, 92, 92);
        const center = layerPixelAt(layer, 100, 100);
        // Outside the square — untouched.
        const farAway = layerPixelAt(layer, 150, 150);
        expect(center.a).toBe(0);
        expect(corner.a).toBe(0);
        expect(farAway.a).toBe(255);
    });
});
