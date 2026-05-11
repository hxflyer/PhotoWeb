import { describe, it, expect, beforeEach } from 'vitest';
import { useEditorStore } from '../store/editorStore';
import { getTool } from '../tools/registry';
import { ensureStubsRegistered } from '../tools/stubs';
import { layerPixelAt, makeToolPointerEvent } from './simulator';
import { setCloneStampOptions } from '../tools/cloneStamp';

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
    setCloneStampOptions({ aligned: true, sample: 'current', mode: 'source-over' });
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

    it('undo and redo restore a pencil stroke', () => {
        const tool = getTool('pencil')!;
        useEditorStore.getState().setPrimaryColor('#ff0000');
        tool.onPointerDown!(makeToolPointerEvent({ canvasX: 50, canvasY: 50 }), ctx());
        tool.onPointerUp!(makeToolPointerEvent({ canvasX: 50, canvasY: 50 }), ctx());
        expect(layerPixelAt(useEditorStore.getState().layers[0], 50, 50).r).toBe(255);

        useEditorStore.getState().undo();
        expect(layerPixelAt(useEditorStore.getState().layers[0], 50, 50).a).toBe(0);

        useEditorStore.getState().redo();
        expect(layerPixelAt(useEditorStore.getState().layers[0], 50, 50).r).toBe(255);
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

    it('clone stamp: Alt-click sets source and click paints sampled pixels immediately', () => {
        const layer = useEditorStore.getState().layers[0];
        layer.ctx.fillStyle = '#ff0000';
        layer.ctx.fillRect(8, 8, 8, 8);

        const tool = getTool('clone-stamp')!;
        tool.onPointerDown!(makeToolPointerEvent({ canvasX: 10, canvasY: 10, modifiers: { alt: true } }), ctx());
        tool.onPointerDown!(makeToolPointerEvent({ canvasX: 50, canvasY: 50 }), ctx());
        tool.onPointerUp!(makeToolPointerEvent({ canvasX: 50, canvasY: 50 }), ctx());

        expect(useEditorStore.getState().cloneSource).toEqual({ x: 10, y: 10 });
        expect(layerPixelAt(layer, 50, 50)).toMatchObject({ r: 255, g: 0, b: 0, a: 255 });
    });

    it('clone stamp: non-aligned mode restarts from the original sample on each stroke', () => {
        setCloneStampOptions({ aligned: false, sample: 'current' });
        const layer = useEditorStore.getState().layers[0];
        layer.ctx.fillStyle = '#ff0000';
        layer.ctx.fillRect(8, 8, 5, 5);
        layer.ctx.fillStyle = '#0000ff';
        layer.ctx.fillRect(18, 8, 5, 5);

        const tool = getTool('clone-stamp')!;
        tool.onPointerDown!(makeToolPointerEvent({ canvasX: 10, canvasY: 10, modifiers: { alt: true } }), ctx());
        tool.onPointerDown!(makeToolPointerEvent({ canvasX: 50, canvasY: 50 }), ctx());
        tool.onPointerMove!(makeToolPointerEvent({ canvasX: 60, canvasY: 50 }), ctx());
        tool.onPointerUp!(makeToolPointerEvent({ canvasX: 60, canvasY: 50 }), ctx());

        tool.onPointerDown!(makeToolPointerEvent({ canvasX: 70, canvasY: 50 }), ctx());
        tool.onPointerUp!(makeToolPointerEvent({ canvasX: 70, canvasY: 50 }), ctx());

        expect(layerPixelAt(layer, 50, 50)).toMatchObject({ r: 255, g: 0, b: 0, a: 255 });
        expect(layerPixelAt(layer, 60, 50)).toMatchObject({ r: 0, g: 0, b: 255, a: 255 });
        expect(layerPixelAt(layer, 70, 50)).toMatchObject({ r: 255, g: 0, b: 0, a: 255 });
    });

    it('clone stamp: sample all layers lets a blank retouch layer clone visible content below', () => {
        const store = useEditorStore.getState();
        store.addLayer();
        const [bottom, top] = useEditorStore.getState().layers;
        bottom.ctx.fillStyle = '#00ff00';
        bottom.ctx.fillRect(8, 8, 8, 8);
        useEditorStore.getState().setActiveLayer(top.id);
        setCloneStampOptions({ sample: 'all', aligned: true });

        const tool = getTool('clone-stamp')!;
        tool.onPointerDown!(makeToolPointerEvent({ canvasX: 10, canvasY: 10, modifiers: { alt: true } }), ctx());
        tool.onPointerDown!(makeToolPointerEvent({ canvasX: 80, canvasY: 80 }), ctx());
        tool.onPointerUp!(makeToolPointerEvent({ canvasX: 80, canvasY: 80 }), ctx());

        expect(layerPixelAt(bottom, 80, 80)).toMatchObject({ a: 0 });
        expect(layerPixelAt(top, 80, 80)).toMatchObject({ r: 0, g: 255, b: 0, a: 255 });
    });
});
