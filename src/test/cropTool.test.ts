import { describe, expect, it, beforeEach, vi } from 'vitest';
import { Layer } from '../core/Layer';
import { useEditorStore } from '../store/editorStore';
import type { ToolContext, ToolKeyEvent } from '../tools/Tool';
import { getTool } from '../tools/registry';
import { ensureStubsRegistered } from '../tools/stubs';
import { getCropRect } from '../tools/crop';
import { layerPixelAt, makeToolPointerEvent } from './simulator';

ensureStubsRegistered();

function resetDocument(): Layer {
    const layer = new Layer(100, 80, 'Crop target');
    layer.ctx.fillStyle = '#ff0000';
    layer.ctx.fillRect(79, 59, 1, 1);
    layer.ctx.fillStyle = '#0000ff';
    layer.ctx.fillRect(95, 70, 1, 1);
    layer.markDirty(null);

    useEditorStore.setState(s => ({
        ...s,
        width: 100,
        height: 80,
        zoom: 1,
        activeTool: 'brush',
        layers: [layer],
        activeLayerId: layer.id,
    }));
    return layer;
}

function ctx(requestRender = vi.fn()): ToolContext {
    return {
        store: useEditorStore.getState(),
        getStore: () => useEditorStore.getState(),
        requestRender,
    };
}

function keyEvent(key: string): ToolKeyEvent {
    return {
        key,
        shift: false,
        alt: false,
        ctrl: false,
        meta: false,
        rawEvent: new KeyboardEvent('keydown', { key, bubbles: true, cancelable: true }),
    };
}

describe('crop tool', () => {
    beforeEach(() => {
        resetDocument();
        getTool('crop')?.onKeyDown?.(keyEvent('Escape'), ctx());
    });

    it('starts snapped to the document bounds and waits for Enter before cropping', () => {
        const crop = getTool('crop')!;
        const render = vi.fn();
        const toolCtx = ctx(render);

        crop.onActivate?.(toolCtx);
        expect(getCropRect()).toEqual({ x: 0, y: 0, w: 100, h: 80 });

        crop.onPointerDown?.(makeToolPointerEvent({ canvasX: 100, canvasY: 80 }), toolCtx);
        crop.onPointerMove?.(makeToolPointerEvent({ canvasX: 80, canvasY: 60 }), toolCtx);
        crop.onPointerUp?.(makeToolPointerEvent({ canvasX: 80, canvasY: 60 }), toolCtx);

        expect(getCropRect()).toEqual({ x: 0, y: 0, w: 80, h: 60 });
        expect(useEditorStore.getState().width).toBe(100);
        expect(useEditorStore.getState().height).toBe(80);
        expect(useEditorStore.getState().layers[0].canvas.width).toBe(100);
        expect(useEditorStore.getState().layers[0].canvas.height).toBe(80);

        crop.onKeyDown?.(keyEvent('Enter'), toolCtx);

        const store = useEditorStore.getState();
        const layer = store.layers[0];
        expect(store.width).toBe(80);
        expect(store.height).toBe(60);
        expect(layer.canvas.width).toBe(80);
        expect(layer.canvas.height).toBe(60);
        expect(layerPixelAt(layer, 79, 59)).toMatchObject({ r: 255, g: 0, b: 0, a: 255 });
        expect(render).toHaveBeenCalled();
    });

    it('commits the active crop when switching away from the crop tool', () => {
        const store = useEditorStore.getState();
        store.setTool('crop');

        const crop = getTool('crop')!;
        const toolCtx = ctx();
        crop.onPointerDown?.(makeToolPointerEvent({ canvasX: 100, canvasY: 80 }), toolCtx);
        crop.onPointerMove?.(makeToolPointerEvent({ canvasX: 70, canvasY: 50 }), toolCtx);
        crop.onPointerUp?.(makeToolPointerEvent({ canvasX: 70, canvasY: 50 }), toolCtx);

        expect(useEditorStore.getState().width).toBe(100);
        expect(getCropRect()).toEqual({ x: 0, y: 0, w: 70, h: 50 });

        useEditorStore.getState().setTool('brush');

        const next = useEditorStore.getState();
        expect(next.activeTool).toBe('brush');
        expect(next.width).toBe(70);
        expect(next.height).toBe(50);
        expect(next.layers[0].canvas.width).toBe(70);
        expect(next.layers[0].canvas.height).toBe(50);
        expect(getCropRect()).toBeNull();
    });

    it('can expand outside the original image and commits transparent extension', () => {
        const crop = getTool('crop')!;
        const toolCtx = ctx();

        crop.onActivate?.(toolCtx);
        crop.onPointerDown?.(makeToolPointerEvent({ canvasX: 100, canvasY: 80 }), toolCtx);
        crop.onPointerMove?.(makeToolPointerEvent({ canvasX: 120, canvasY: 90 }), toolCtx);
        crop.onPointerUp?.(makeToolPointerEvent({ canvasX: 120, canvasY: 90 }), toolCtx);

        expect(getCropRect()).toEqual({ x: 0, y: 0, w: 120, h: 90 });

        crop.onKeyDown?.(keyEvent('Enter'), toolCtx);

        const store = useEditorStore.getState();
        const layer = store.layers[0];
        expect(store.width).toBe(120);
        expect(store.height).toBe(90);
        expect(layerPixelAt(layer, 95, 70)).toMatchObject({ r: 0, g: 0, b: 255, a: 255 });
        expect(layerPixelAt(layer, 110, 85)).toMatchObject({ a: 0 });
    });
});
