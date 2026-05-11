import { describe, it, expect, beforeEach } from 'vitest';
import { useEditorStore } from '../store/editorStore';
import { getTool } from '../tools/registry';
import { ensureStubsRegistered } from '../tools/stubs';
import { layerPixelAt, makeToolPointerEvent } from './simulator';
import { setPaintBucketOptions, getPaintBucketOptions } from '../tools/paintBucket';
import { setGradientOptions, getGradientOptions } from '../tools/gradient';

ensureStubsRegistered();

function reset() {
    useEditorStore.setState((s) => ({ ...s, layers: [], activeLayerId: null, primaryColor: '#ff0000', secondaryColor: '#0000ff' }));
    useEditorStore.getState().clearSelection();
    useEditorStore.getState().addLayer();
    useEditorStore.getState().clearHistory();
}

function ctx() {
    return {
        store: useEditorStore.getState(),
        getStore: () => useEditorStore.getState(),
        requestRender: () => { /* noop */ },
    };
}

describe('Paint Bucket — selection-aware', () => {
    beforeEach(() => {
        reset();
        // Reset to defaults to avoid bleed from other tests.
        setPaintBucketOptions({ tolerance: 32, antiAlias: true, contiguous: true, sampleAllLayers: false, opacity: 1, mode: 'normal', source: 'foreground' });
    });

    it('with selection, only fills inside the selection rect; outside stays unchanged', () => {
        const layer = useEditorStore.getState().layers[0];
        const lctx = layer.canvas.getContext('2d')!;
        // Pre-fill layer with a uniform color so flood-fill matches everywhere.
        lctx.fillStyle = '#808080';
        lctx.fillRect(0, 0, layer.canvas.width, layer.canvas.height);

        // Selection: a 100×100 rectangle in the upper-left.
        useEditorStore.getState().setHasSelection(true);
        useEditorStore.getState().setSelectionOperations([
            { mode: 'add', type: 'rect', path: [{ x: 0, y: 0 }, { x: 100, y: 100 }] },
        ]);

        useEditorStore.getState().setPrimaryColor('#ff0000');
        const tool = getTool('fill')!;
        // Click inside the selection; non-contiguous so it would otherwise flood the entire matching color.
        setPaintBucketOptions({ contiguous: false, antiAlias: false });
        tool.onPointerDown!(makeToolPointerEvent({ canvasX: 50, canvasY: 50 }), ctx());

        // Inside selection: painted red.
        const inside = layerPixelAt(layer, 50, 50);
        expect(inside.r).toBe(255);
        expect(inside.g).toBe(0);
        // Outside selection: untouched grey.
        const outside = layerPixelAt(layer, 200, 200);
        expect(outside.r).toBe(0x80);
        expect(outside.g).toBe(0x80);
        expect(outside.b).toBe(0x80);
    });

    it('without selection, fills the whole layer (matching connected region)', () => {
        const layer = useEditorStore.getState().layers[0];
        const lctx = layer.canvas.getContext('2d')!;
        lctx.fillStyle = '#aaaaaa';
        lctx.fillRect(0, 0, layer.canvas.width, layer.canvas.height);

        useEditorStore.getState().setPrimaryColor('#00ff00');
        setPaintBucketOptions({ contiguous: true, antiAlias: false });
        const tool = getTool('fill')!;
        tool.onPointerDown!(makeToolPointerEvent({ canvasX: 10, canvasY: 10 }), ctx());

        const a = layerPixelAt(layer, 5, 5);
        const b = layerPixelAt(layer, 200, 200);
        expect(a.g).toBe(255);
        expect(b.g).toBe(255);
    });

    it('undo and redo restore a paint bucket fill', () => {
        const layer = useEditorStore.getState().layers[0];
        layer.ctx.fillStyle = '#aaaaaa';
        layer.ctx.fillRect(0, 0, layer.canvas.width, layer.canvas.height);
        useEditorStore.getState().setPrimaryColor('#00ff00');
        setPaintBucketOptions({ contiguous: true, antiAlias: false });
        const tool = getTool('fill')!;
        tool.onPointerDown!(makeToolPointerEvent({ canvasX: 10, canvasY: 10 }), ctx());
        expect(layerPixelAt(layer, 5, 5).g).toBe(255);

        useEditorStore.getState().undo();
        expect(layerPixelAt(useEditorStore.getState().layers[0], 5, 5).r).toBe(0xaa);

        useEditorStore.getState().redo();
        expect(layerPixelAt(useEditorStore.getState().layers[0], 5, 5).g).toBe(255);
    });

    it('opacity 50% blends fill toward primary color', () => {
        const layer = useEditorStore.getState().layers[0];
        const lctx = layer.canvas.getContext('2d')!;
        lctx.fillStyle = '#000000';
        lctx.fillRect(0, 0, layer.canvas.width, layer.canvas.height);

        useEditorStore.getState().setPrimaryColor('#ffffff');
        setPaintBucketOptions({ opacity: 0.5, contiguous: false, antiAlias: false });
        const tool = getTool('fill')!;
        tool.onPointerDown!(makeToolPointerEvent({ canvasX: 30, canvasY: 30 }), ctx());

        const px = layerPixelAt(layer, 30, 30);
        // Blend of black and white at 50% should be ~127.
        expect(px.r).toBeGreaterThan(110);
        expect(px.r).toBeLessThan(145);
    });

    it('contiguous=false fills all matching pixels; contiguous=true only the connected region', () => {
        // Build two disconnected grey patches separated by a black wall.
        const layer = useEditorStore.getState().layers[0];
        const lctx = layer.canvas.getContext('2d')!;
        lctx.fillStyle = '#000000';
        lctx.fillRect(0, 0, layer.canvas.width, layer.canvas.height);
        lctx.fillStyle = '#808080';
        lctx.fillRect(10, 10, 30, 30);    // patch A
        lctx.fillRect(100, 100, 30, 30);  // patch B (disconnected)

        useEditorStore.getState().setPrimaryColor('#ff0000');
        const tool = getTool('fill')!;

        // Contiguous click on patch A → patch B should remain grey.
        setPaintBucketOptions({ contiguous: true, antiAlias: false });
        tool.onPointerDown!(makeToolPointerEvent({ canvasX: 20, canvasY: 20 }), ctx());
        let aPx = layerPixelAt(layer, 20, 20);
        let bPx = layerPixelAt(layer, 110, 110);
        expect(aPx.r).toBe(255);
        expect(bPx.r).toBe(0x80);

        // Reset and redo with contiguous=false → both patches red.
        lctx.fillStyle = '#000000'; lctx.fillRect(0, 0, layer.canvas.width, layer.canvas.height);
        lctx.fillStyle = '#808080';
        lctx.fillRect(10, 10, 30, 30);
        lctx.fillRect(100, 100, 30, 30);

        setPaintBucketOptions({ contiguous: false, antiAlias: false });
        tool.onPointerDown!(makeToolPointerEvent({ canvasX: 20, canvasY: 20 }), ctx());
        aPx = layerPixelAt(layer, 20, 20);
        bPx = layerPixelAt(layer, 110, 110);
        expect(aPx.r).toBe(255);
        expect(bPx.r).toBe(255);
    });

    it('options round-trip: setPaintBucketOptions persists, getPaintBucketOptions returns latest', () => {
        setPaintBucketOptions({ tolerance: 100, mode: 'multiply', sampleAllLayers: true });
        const o = getPaintBucketOptions();
        expect(o.tolerance).toBe(100);
        expect(o.mode).toBe('multiply');
        expect(o.sampleAllLayers).toBe(true);
    });
});

describe('Gradient — selection-aware', () => {
    beforeEach(() => {
        reset();
        setGradientOptions({ type: 'linear', presetId: 'foreground-to-background', reverse: false, dither: false, method: 'smooth', opacity: 1, mode: 'normal' });
    });

    it('with selection, gradient is clipped to selection; outside stays unchanged', () => {
        const layer = useEditorStore.getState().layers[0];
        const lctx = layer.canvas.getContext('2d')!;
        lctx.fillStyle = '#00ff00';  // pre-fill green
        lctx.fillRect(0, 0, layer.canvas.width, layer.canvas.height);

        useEditorStore.getState().setHasSelection(true);
        useEditorStore.getState().setSelectionOperations([
            { mode: 'add', type: 'rect', path: [{ x: 0, y: 0 }, { x: 100, y: 100 }] },
        ]);
        useEditorStore.getState().setPrimaryColor('#ff0000');
        useEditorStore.getState().setSecondaryColor('#0000ff');

        const tool = getTool('gradient')!;
        tool.onPointerDown!(makeToolPointerEvent({ canvasX: 0, canvasY: 0 }), ctx());
        tool.onPointerMove!(makeToolPointerEvent({ canvasX: 100, canvasY: 0 }), ctx());
        tool.onPointerUp!(makeToolPointerEvent({ canvasX: 100, canvasY: 0 }), ctx());

        // Inside selection at the start of the gradient: should be near red.
        const inSel = layerPixelAt(layer, 5, 5);
        expect(inSel.r).toBeGreaterThan(200);
        // Outside selection: should remain green.
        const outside = layerPixelAt(layer, 200, 200);
        expect(outside.g).toBe(255);
        expect(outside.r).toBe(0);
    });

    it('without selection, gradient is applied to entire layer', () => {
        const layer = useEditorStore.getState().layers[0];
        const lctx = layer.canvas.getContext('2d')!;
        lctx.fillStyle = '#00ff00';
        lctx.fillRect(0, 0, layer.canvas.width, layer.canvas.height);

        useEditorStore.getState().setPrimaryColor('#ff0000');
        useEditorStore.getState().setSecondaryColor('#0000ff');

        const tool = getTool('gradient')!;
        tool.onPointerDown!(makeToolPointerEvent({ canvasX: 0, canvasY: 0 }), ctx());
        tool.onPointerMove!(makeToolPointerEvent({ canvasX: layer.canvas.width, canvasY: 0 }), ctx());
        tool.onPointerUp!(makeToolPointerEvent({ canvasX: layer.canvas.width, canvasY: 0 }), ctx());

        // Far from start: blue side; near start: red side.
        const left = layerPixelAt(layer, 5, 5);
        const right = layerPixelAt(layer, layer.canvas.width - 5, 5);
        expect(left.r).toBeGreaterThan(left.b);
        expect(right.b).toBeGreaterThan(right.r);
    });

    it('undo and redo restore a gradient fill', () => {
        const layer = useEditorStore.getState().layers[0];
        useEditorStore.getState().setPrimaryColor('#ff0000');
        useEditorStore.getState().setSecondaryColor('#0000ff');
        const tool = getTool('gradient')!;
        tool.onPointerDown!(makeToolPointerEvent({ canvasX: 0, canvasY: 0 }), ctx());
        tool.onPointerMove!(makeToolPointerEvent({ canvasX: layer.canvas.width, canvasY: 0 }), ctx());
        tool.onPointerUp!(makeToolPointerEvent({ canvasX: layer.canvas.width, canvasY: 0 }), ctx());
        expect(layerPixelAt(layer, 5, 5).r).toBeGreaterThan(200);

        useEditorStore.getState().undo();
        expect(layerPixelAt(useEditorStore.getState().layers[0], 5, 5).a).toBe(0);

        useEditorStore.getState().redo();
        expect(layerPixelAt(useEditorStore.getState().layers[0], 5, 5).r).toBeGreaterThan(200);
    });

    it('reverse swaps the gradient direction', () => {
        const layer = useEditorStore.getState().layers[0];
        useEditorStore.getState().setPrimaryColor('#ff0000');
        useEditorStore.getState().setSecondaryColor('#0000ff');
        setGradientOptions({ reverse: true });

        const tool = getTool('gradient')!;
        tool.onPointerDown!(makeToolPointerEvent({ canvasX: 0, canvasY: 0 }), ctx());
        tool.onPointerMove!(makeToolPointerEvent({ canvasX: layer.canvas.width, canvasY: 0 }), ctx());
        tool.onPointerUp!(makeToolPointerEvent({ canvasX: layer.canvas.width, canvasY: 0 }), ctx());

        // With reverse, near start should now be blue (secondary), far should be red.
        const left = layerPixelAt(layer, 5, 5);
        const right = layerPixelAt(layer, layer.canvas.width - 5, 5);
        expect(left.b).toBeGreaterThan(left.r);
        expect(right.r).toBeGreaterThan(right.b);
    });

    it('radial type produces a centered circular gradient', () => {
        const layer = useEditorStore.getState().layers[0];
        useEditorStore.getState().setPrimaryColor('#ffffff');
        useEditorStore.getState().setSecondaryColor('#000000');
        setGradientOptions({ type: 'radial' });

        const cx = Math.floor(layer.canvas.width / 2);
        const cy = Math.floor(layer.canvas.height / 2);
        const tool = getTool('gradient')!;
        tool.onPointerDown!(makeToolPointerEvent({ canvasX: cx, canvasY: cy }), ctx());
        tool.onPointerMove!(makeToolPointerEvent({ canvasX: cx + 100, canvasY: cy }), ctx());
        tool.onPointerUp!(makeToolPointerEvent({ canvasX: cx + 100, canvasY: cy }), ctx());

        // Center bright; edges dark.
        const center = layerPixelAt(layer, cx, cy);
        const edge = layerPixelAt(layer, cx + 95, cy);
        expect(center.r).toBeGreaterThan(edge.r + 50);
    });

    it('options round-trip: setGradientOptions persists, getGradientOptions returns latest', () => {
        setGradientOptions({ type: 'angle', dither: true, opacity: 0.4, mode: 'screen' });
        const o = getGradientOptions();
        expect(o.type).toBe('angle');
        expect(o.dither).toBe(true);
        expect(o.opacity).toBe(0.4);
        expect(o.mode).toBe('screen');
    });
});
