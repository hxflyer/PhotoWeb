import { describe, it, expect, beforeEach } from 'vitest';
import { useEditorStore } from '../store/editorStore';
import { getTool } from '../tools/registry';
import { ensureStubsRegistered } from '../tools/stubs';
import { layerPixelAt, makeToolPointerEvent } from './simulator';
import {
    setBackgroundEraserOptions, getBackgroundEraserOptions,
} from '../tools/backgroundEraser';

ensureStubsRegistered();

function reset() {
    useEditorStore.setState((s) => ({
        ...s,
        layers: [],
        activeLayerId: null,
        primaryColor: '#000000',
        secondaryColor: '#ffffff',
        brushSettings: { size: 20, hardness: 1, opacity: 1, flow: 1 },
    }));
    useEditorStore.getState().clearSelection();
    useEditorStore.getState().addLayer();
    useEditorStore.getState().clearHistory();
    // Restore defaults between tests.
    setBackgroundEraserOptions({ tolerance: 51, sampling: 'continuous', limits: 'contiguous', opacity: 1 });
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

describe('Background Eraser — sampled-color removal under the brush', () => {
    beforeEach(reset);

    it('continuous sampling: drag across a uniform color erases pixels along the path', () => {
        const layer = useEditorStore.getState().layers[0];
        paintRect(layer, '#3366ff', 0, 0, layer.canvas.width, layer.canvas.height);

        setBackgroundEraserOptions({
            tolerance: 30, sampling: 'continuous', limits: 'discontiguous', opacity: 1,
        });
        const tool = getTool('background-eraser')!;
        tool.onPointerDown!(makeToolPointerEvent({ canvasX: 50, canvasY: 50 }), ctx());
        tool.onPointerMove!(makeToolPointerEvent({ canvasX: 80, canvasY: 50 }), ctx());
        tool.onPointerUp!(makeToolPointerEvent({ canvasX: 80, canvasY: 50 }), ctx());

        expect(layerPixelAt(layer, 50, 50).a).toBe(0);
        expect(layerPixelAt(layer, 70, 50).a).toBe(0);
        // Far from the brush path: still opaque blue.
        expect(layerPixelAt(layer, 400, 400).a).toBe(255);
    });

    it('once sampling: subsequent stamps onto a different color leave it intact', () => {
        const layer = useEditorStore.getState().layers[0];
        // Left half blue, right half red.
        paintRect(layer, '#3366ff', 0, 0, 100, layer.canvas.height);
        paintRect(layer, '#ff0000', 100, 0, layer.canvas.width - 100, layer.canvas.height);

        setBackgroundEraserOptions({
            tolerance: 30, sampling: 'once', limits: 'discontiguous', opacity: 1,
        });
        const tool = getTool('background-eraser')!;
        tool.onPointerDown!(makeToolPointerEvent({ canvasX: 50, canvasY: 50 }), ctx());
        // Drag onto red zone.
        tool.onPointerMove!(makeToolPointerEvent({ canvasX: 150, canvasY: 50 }), ctx());
        tool.onPointerUp!(makeToolPointerEvent({ canvasX: 150, canvasY: 50 }), ctx());

        // Blue at sample point: erased.
        expect(layerPixelAt(layer, 50, 50).a).toBe(0);
        // Red zone: untouched because sample color is blue, red is well outside tolerance.
        const redPx = layerPixelAt(layer, 150, 50);
        expect(redPx.a).toBe(255);
        expect(redPx.r).toBe(255);
    });

    it('background-swatch sampling: erases only colors matching the secondary color', () => {
        useEditorStore.setState({ secondaryColor: '#00ff00' });
        const layer = useEditorStore.getState().layers[0];
        paintRect(layer, '#ff0000', 0, 0, layer.canvas.width, layer.canvas.height);

        setBackgroundEraserOptions({
            tolerance: 20, sampling: 'background-swatch', limits: 'discontiguous', opacity: 1,
        });
        const tool = getTool('background-eraser')!;
        tool.onPointerDown!(makeToolPointerEvent({ canvasX: 50, canvasY: 50 }), ctx());
        tool.onPointerUp!(makeToolPointerEvent({ canvasX: 50, canvasY: 50 }), ctx());

        // Red doesn't match green within tolerance → still opaque.
        expect(layerPixelAt(layer, 50, 50).a).toBe(255);
        expect(layerPixelAt(layer, 50, 50).r).toBe(255);
    });

    it('contiguous limit: brush over two disjoint red regions only erases the one under the crosshair', () => {
        const layer = useEditorStore.getState().layers[0];
        paintRect(layer, '#000000', 0, 0, layer.canvas.width, layer.canvas.height);
        // Two disjoint red blobs side by side.
        paintRect(layer, '#ff0000', 40, 40, 20, 20);
        paintRect(layer, '#ff0000', 80, 40, 20, 20);

        // Brush large enough to cover both blobs.
        useEditorStore.setState(s => ({ ...s, brushSettings: { ...s.brushSettings, size: 80 } }));
        setBackgroundEraserOptions({
            tolerance: 20, sampling: 'continuous', limits: 'contiguous', opacity: 1,
        });
        const tool = getTool('background-eraser')!;
        // Click on the FIRST red blob.
        tool.onPointerDown!(makeToolPointerEvent({ canvasX: 50, canvasY: 50 }), ctx());
        tool.onPointerUp!(makeToolPointerEvent({ canvasX: 50, canvasY: 50 }), ctx());

        // First blob erased.
        expect(layerPixelAt(layer, 50, 50).a).toBe(0);
        // Second blob still opaque — disconnected from the seed pixel.
        expect(layerPixelAt(layer, 90, 50).a).toBe(255);
        expect(layerPixelAt(layer, 90, 50).r).toBe(255);
    });

    it('discontiguous limit: brush over two disjoint red regions erases both within the footprint', () => {
        const layer = useEditorStore.getState().layers[0];
        paintRect(layer, '#000000', 0, 0, layer.canvas.width, layer.canvas.height);
        paintRect(layer, '#ff0000', 40, 40, 20, 20);
        paintRect(layer, '#ff0000', 80, 40, 20, 20);

        useEditorStore.setState(s => ({ ...s, brushSettings: { ...s.brushSettings, size: 80 } }));
        setBackgroundEraserOptions({
            tolerance: 20, sampling: 'continuous', limits: 'discontiguous', opacity: 1,
        });
        const tool = getTool('background-eraser')!;
        // Click on the FIRST red blob so the sample is red.
        tool.onPointerDown!(makeToolPointerEvent({ canvasX: 50, canvasY: 50 }), ctx());
        tool.onPointerUp!(makeToolPointerEvent({ canvasX: 50, canvasY: 50 }), ctx());

        // Both red blobs erased: the brush footprint covers both red regions,
        // and discontiguous mode matches every red pixel inside the footprint.
        expect(layerPixelAt(layer, 50, 50).a).toBe(0);
        expect(layerPixelAt(layer, 90, 50).a).toBe(0);
        // Black background between the blobs does not match red within tolerance.
        expect(layerPixelAt(layer, 70, 50).a).toBe(255);
    });

    it('opacity 0.5 produces partial alpha rather than full erase', () => {
        const layer = useEditorStore.getState().layers[0];
        paintRect(layer, '#ff0000', 0, 0, layer.canvas.width, layer.canvas.height);

        setBackgroundEraserOptions({
            tolerance: 30, sampling: 'continuous', limits: 'discontiguous', opacity: 0.5,
        });
        const tool = getTool('background-eraser')!;
        tool.onPointerDown!(makeToolPointerEvent({ canvasX: 50, canvasY: 50 }), ctx());
        tool.onPointerUp!(makeToolPointerEvent({ canvasX: 50, canvasY: 50 }), ctx());

        const px = layerPixelAt(layer, 50, 50);
        expect(px.a).toBeGreaterThan(80);
        expect(px.a).toBeLessThan(180);
    });

    it('active selection clips the erase: outside-the-selection pixels stay intact', () => {
        const layer = useEditorStore.getState().layers[0];
        paintRect(layer, '#ff0000', 0, 0, layer.canvas.width, layer.canvas.height);

        useEditorStore.getState().setHasSelection(true);
        useEditorStore.getState().setSelectionOperations([
            { mode: 'add', type: 'rect', path: [{ x: 0, y: 0 }, { x: 60, y: 60 }] },
        ]);

        useEditorStore.setState(s => ({ ...s, brushSettings: { ...s.brushSettings, size: 80 } }));
        setBackgroundEraserOptions({
            tolerance: 30, sampling: 'continuous', limits: 'discontiguous', opacity: 1,
        });
        const tool = getTool('background-eraser')!;
        tool.onPointerDown!(makeToolPointerEvent({ canvasX: 40, canvasY: 40 }), ctx());
        tool.onPointerUp!(makeToolPointerEvent({ canvasX: 40, canvasY: 40 }), ctx());

        // Inside selection: erased.
        expect(layerPixelAt(layer, 30, 30).a).toBe(0);
        // Outside selection (brush overlaps but selection clips it): still red.
        const outside = layerPixelAt(layer, 75, 75);
        expect(outside.a).toBe(255);
        expect(outside.r).toBe(255);
    });

    it('undo and redo round-trip a Background Eraser stroke', () => {
        const layer = useEditorStore.getState().layers[0];
        paintRect(layer, '#ff0000', 0, 0, layer.canvas.width, layer.canvas.height);

        setBackgroundEraserOptions({
            tolerance: 30, sampling: 'continuous', limits: 'discontiguous', opacity: 1,
        });
        const tool = getTool('background-eraser')!;
        tool.onPointerDown!(makeToolPointerEvent({ canvasX: 50, canvasY: 50 }), ctx());
        tool.onPointerUp!(makeToolPointerEvent({ canvasX: 50, canvasY: 50 }), ctx());

        expect(layerPixelAt(layer, 50, 50).a).toBe(0);

        useEditorStore.getState().undo();
        expect(layerPixelAt(useEditorStore.getState().layers[0], 50, 50).a).toBe(255);
        expect(layerPixelAt(useEditorStore.getState().layers[0], 50, 50).r).toBe(255);

        useEditorStore.getState().redo();
        expect(layerPixelAt(useEditorStore.getState().layers[0], 50, 50).a).toBe(0);
    });

    it('options round-trip: setBackgroundEraserOptions persists, getBackgroundEraserOptions returns latest', () => {
        setBackgroundEraserOptions({
            tolerance: 88, sampling: 'once', limits: 'find-edges', opacity: 0.25,
        });
        const o = getBackgroundEraserOptions();
        expect(o.tolerance).toBe(88);
        expect(o.sampling).toBe('once');
        expect(o.limits).toBe('find-edges');
        expect(o.opacity).toBe(0.25);
    });
});
