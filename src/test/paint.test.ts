import { describe, it, expect, beforeEach } from 'vitest';
import { useEditorStore } from '../store/editorStore';
import { getTool } from '../tools/registry';
import { ensureStubsRegistered } from '../tools/stubs';
import { layerPixelAt, makeToolPointerEvent } from './simulator';

ensureStubsRegistered();

function reset() {
    useEditorStore.setState((s) => ({ ...s, layers: [], activeLayerId: null, primaryColor: '#ff0000' }));
    useEditorStore.getState().addLayer();
}

function ctx() {
    return {
        store: useEditorStore.getState(),
        getStore: () => useEditorStore.getState(),
        requestRender: () => {},
    };
}

describe('paint tools', () => {
    beforeEach(reset);

    it('pencil: stamps a colored dot at the click point', () => {
        const tool = getTool('pencil')!;
        useEditorStore.getState().setPrimaryColor('#ff0000');
        tool.onPointerDown!(makeToolPointerEvent({ canvasX: 50, canvasY: 50 }), ctx());
        tool.onPointerUp!(makeToolPointerEvent({ canvasX: 50, canvasY: 50 }), ctx());
        const layer = useEditorStore.getState().layers[0];
        const px = layerPixelAt(layer, 50, 50);
        expect(px.r).toBe(255);
        expect(px.g).toBe(0);
    });

    it('pencil: stamping then moving leaves both endpoints painted', () => {
        const tool = getTool('pencil')!;
        useEditorStore.getState().setPrimaryColor('#0000ff');
        tool.onPointerDown!(makeToolPointerEvent({ canvasX: 20, canvasY: 20 }), ctx());
        tool.onPointerMove!(makeToolPointerEvent({ canvasX: 80, canvasY: 80 }), ctx());
        tool.onPointerUp!(makeToolPointerEvent({ canvasX: 80, canvasY: 80 }), ctx());
        const layer = useEditorStore.getState().layers[0];
        const start = layerPixelAt(layer, 20, 20);
        const mid = layerPixelAt(layer, 50, 50);
        const end = layerPixelAt(layer, 80, 80);
        expect(start.b).toBe(255);
        expect(end.b).toBe(255);
        expect(mid.b).toBe(255);
    });

    it('eraser: destination-out clears existing pixels', () => {
        const layer = useEditorStore.getState().layers[0];
        const lctx = layer.canvas.getContext('2d')!;
        lctx.fillStyle = '#00ff00';
        lctx.fillRect(0, 0, 200, 200);
        const tool = getTool('eraser')!;
        tool.onPointerDown!(makeToolPointerEvent({ canvasX: 60, canvasY: 60 }), ctx());
        tool.onPointerMove!(makeToolPointerEvent({ canvasX: 100, canvasY: 100 }), ctx());
        tool.onPointerUp!(makeToolPointerEvent({ canvasX: 100, canvasY: 100 }), ctx());
        const erased = layerPixelAt(layer, 80, 80);
        const intact = layerPixelAt(layer, 5, 5);
        expect(erased.a).toBeLessThan(255);
        expect(intact.a).toBe(255);
    });

    it('paint bucket: floods the layer with the primary color', () => {
        useEditorStore.getState().setPrimaryColor('#123456');
        const tool = getTool('fill')!;
        tool.onPointerDown!(makeToolPointerEvent({ canvasX: 10, canvasY: 10 }), ctx());
        const layer = useEditorStore.getState().layers[0];
        const px = layerPixelAt(layer, 200, 200);
        expect(px.r).toBe(0x12);
        expect(px.g).toBe(0x34);
        expect(px.b).toBe(0x56);
    });

    it('eyedropper: samples a known pixel and sets the primary color', () => {
        const layer = useEditorStore.getState().layers[0];
        const lctx = layer.canvas.getContext('2d')!;
        lctx.fillStyle = '#a0b0c0';
        lctx.fillRect(0, 0, 100, 100);
        const tool = getTool('eyedropper')!;
        tool.onPointerDown!(makeToolPointerEvent({ canvasX: 50, canvasY: 50 }), ctx());
        const primary = useEditorStore.getState().primaryColor;
        expect(primary.toLowerCase()).toBe('#a0b0c0');
    });
});
