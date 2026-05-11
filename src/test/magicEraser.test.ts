import { describe, it, expect, beforeEach } from 'vitest';
import { useEditorStore } from '../store/editorStore';
import { getTool } from '../tools/registry';
import { ensureStubsRegistered } from '../tools/stubs';
import { layerPixelAt, makeToolPointerEvent } from './simulator';
import { setMagicEraserOptions, getMagicEraserOptions } from '../tools/magicEraser';

ensureStubsRegistered();

function reset() {
    useEditorStore.setState((s) => ({ ...s, layers: [], activeLayerId: null }));
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

function paintRect(layer: { ctx: CanvasRenderingContext2D }, color: string, x: number, y: number, w: number, h: number) {
    layer.ctx.fillStyle = color;
    layer.ctx.fillRect(x, y, w, h);
}

describe('Magic Eraser — clicked-color removal', () => {
    beforeEach(() => {
        reset();
        setMagicEraserOptions({ tolerance: 32, antiAlias: true, contiguous: true, sampleAllLayers: false, opacity: 1 });
    });

    it('clicking on a red region with tolerance 0 erases only red pixels to transparent', () => {
        const layer = useEditorStore.getState().layers[0];
        paintRect(layer, '#00ff00', 0, 0, layer.canvas.width, layer.canvas.height);
        paintRect(layer, '#ff0000', 10, 10, 50, 50);

        setMagicEraserOptions({ tolerance: 0, antiAlias: false, contiguous: true });
        const tool = getTool('magic-eraser')!;
        tool.onPointerDown!(makeToolPointerEvent({ canvasX: 30, canvasY: 30 }), ctx());

        const inRed = layerPixelAt(layer, 30, 30);
        expect(inRed.a).toBe(0);
        const inGreen = layerPixelAt(layer, 80, 80);
        expect(inGreen.a).toBe(255);
        expect(inGreen.g).toBe(255);
    });

    it('clicking with tolerance 50 erases near-red pixels too', () => {
        const layer = useEditorStore.getState().layers[0];
        paintRect(layer, '#00ff00', 0, 0, layer.canvas.width, layer.canvas.height);
        paintRect(layer, '#ff0000', 10, 10, 30, 30);
        // Near-red patch connected to the red patch
        paintRect(layer, '#e62020', 40, 10, 20, 30);

        setMagicEraserOptions({ tolerance: 50, antiAlias: false, contiguous: true });
        const tool = getTool('magic-eraser')!;
        tool.onPointerDown!(makeToolPointerEvent({ canvasX: 20, canvasY: 20 }), ctx());

        expect(layerPixelAt(layer, 20, 20).a).toBe(0);
        expect(layerPixelAt(layer, 50, 20).a).toBe(0);
        expect(layerPixelAt(layer, 80, 80).g).toBe(255);
    });

    it('contiguous=false erases all matching pixels; contiguous=true only the connected region', () => {
        const layer = useEditorStore.getState().layers[0];
        paintRect(layer, '#000000', 0, 0, layer.canvas.width, layer.canvas.height);
        paintRect(layer, '#ff0000', 10, 10, 20, 20);     // patch A
        paintRect(layer, '#ff0000', 100, 100, 20, 20);   // patch B (disconnected)

        const tool = getTool('magic-eraser')!;

        setMagicEraserOptions({ tolerance: 0, antiAlias: false, contiguous: true });
        tool.onPointerDown!(makeToolPointerEvent({ canvasX: 15, canvasY: 15 }), ctx());
        expect(layerPixelAt(layer, 15, 15).a).toBe(0);
        expect(layerPixelAt(layer, 110, 110).a).toBe(255);
        expect(layerPixelAt(layer, 110, 110).r).toBe(255);

        // Reset and try contiguous=false
        paintRect(layer, '#000000', 0, 0, layer.canvas.width, layer.canvas.height);
        paintRect(layer, '#ff0000', 10, 10, 20, 20);
        paintRect(layer, '#ff0000', 100, 100, 20, 20);

        setMagicEraserOptions({ contiguous: false });
        tool.onPointerDown!(makeToolPointerEvent({ canvasX: 15, canvasY: 15 }), ctx());
        expect(layerPixelAt(layer, 15, 15).a).toBe(0);
        expect(layerPixelAt(layer, 110, 110).a).toBe(0);
    });

    it('active selection clips erase: clicking outside the selection rect leaves it intact', () => {
        const layer = useEditorStore.getState().layers[0];
        paintRect(layer, '#ff0000', 0, 0, layer.canvas.width, layer.canvas.height);

        useEditorStore.getState().setHasSelection(true);
        useEditorStore.getState().setSelectionOperations([
            { mode: 'add', type: 'rect', path: [{ x: 0, y: 0 }, { x: 50, y: 50 }] },
        ]);

        setMagicEraserOptions({ tolerance: 0, antiAlias: false, contiguous: false });
        const tool = getTool('magic-eraser')!;
        // Click outside the selection rect — outside should be untouched, inside selection erased.
        tool.onPointerDown!(makeToolPointerEvent({ canvasX: 200, canvasY: 200 }), ctx());

        // Inside selection: erased (red was matching the seed color).
        expect(layerPixelAt(layer, 20, 20).a).toBe(0);
        // Outside selection: still red.
        expect(layerPixelAt(layer, 200, 200).a).toBe(255);
        expect(layerPixelAt(layer, 200, 200).r).toBe(255);
    });

    it('anti-alias on produces at least one partially transparent edge pixel', () => {
        const layer = useEditorStore.getState().layers[0];
        paintRect(layer, '#000000', 0, 0, layer.canvas.width, layer.canvas.height);
        // Red core (matched directly). Outer ring with red distance 12 — inside
        // the smoothstep band (tol=10, upper=15) so AA softening engages.
        paintRect(layer, '#ff0000', 20, 20, 20, 20);
        // Single-pixel ring of #f30000 (distance 12 from #ff0000) hugging the core.
        layer.ctx.fillStyle = '#f30000';
        for (let x = 19; x <= 40; x++) { layer.ctx.fillRect(x, 19, 1, 1); layer.ctx.fillRect(x, 40, 1, 1); }
        for (let y = 19; y <= 40; y++) { layer.ctx.fillRect(19, y, 1, 1); layer.ctx.fillRect(40, y, 1, 1); }

        setMagicEraserOptions({ tolerance: 10, antiAlias: true, contiguous: false });
        const tool = getTool('magic-eraser')!;
        tool.onPointerDown!(makeToolPointerEvent({ canvasX: 30, canvasY: 30 }), ctx());

        let hasPartial = false;
        for (let y = 18; y <= 41 && !hasPartial; y++) {
            for (let x = 18; x <= 41; x++) {
                const a = layerPixelAt(layer, x, y).a;
                if (a > 0 && a < 255) { hasPartial = true; break; }
            }
        }
        expect(hasPartial).toBe(true);
    });

    it('anti-alias off leaves only fully transparent or fully opaque pixels in the erased region', () => {
        const layer = useEditorStore.getState().layers[0];
        paintRect(layer, '#000000', 0, 0, layer.canvas.width, layer.canvas.height);
        paintRect(layer, '#ff0000', 10, 10, 40, 40);

        setMagicEraserOptions({ tolerance: 0, antiAlias: false, contiguous: true });
        const tool = getTool('magic-eraser')!;
        tool.onPointerDown!(makeToolPointerEvent({ canvasX: 30, canvasY: 30 }), ctx());

        for (let y = 0; y < layer.canvas.height; y += 5) {
            for (let x = 0; x < layer.canvas.width; x += 5) {
                const a = layerPixelAt(layer, x, y).a;
                expect(a === 0 || a === 255).toBe(true);
            }
        }
    });

    it('opacity 0.5 reduces alpha by roughly half rather than fully erasing', () => {
        const layer = useEditorStore.getState().layers[0];
        paintRect(layer, '#ff0000', 0, 0, layer.canvas.width, layer.canvas.height);

        setMagicEraserOptions({ tolerance: 0, antiAlias: false, contiguous: false, opacity: 0.5 });
        const tool = getTool('magic-eraser')!;
        tool.onPointerDown!(makeToolPointerEvent({ canvasX: 30, canvasY: 30 }), ctx());

        const px = layerPixelAt(layer, 30, 30);
        expect(px.a).toBeGreaterThan(100);
        expect(px.a).toBeLessThan(160);
    });

    it('sampleAllLayers samples composite but always writes to the active layer', () => {
        // Layer 1 is created by reset(). Add a second layer on top.
        const baseLayer = useEditorStore.getState().layers[0];
        paintRect(baseLayer, '#ff0000', 0, 0, baseLayer.canvas.width, baseLayer.canvas.height);

        useEditorStore.getState().addLayer();
        const topLayer = useEditorStore.getState().layers[1];
        // Top layer has a red patch overlapping where we click, plus other regions clear.
        paintRect(topLayer, '#ff0000', 0, 0, 60, 60);

        useEditorStore.getState().setActiveLayer(topLayer.id);
        setMagicEraserOptions({ tolerance: 0, antiAlias: false, contiguous: false, sampleAllLayers: true });
        const tool = getTool('magic-eraser')!;
        tool.onPointerDown!(makeToolPointerEvent({ canvasX: 30, canvasY: 30 }), ctx());

        // Active layer (top) erased where red was.
        expect(layerPixelAt(topLayer, 30, 30).a).toBe(0);
        // Base layer untouched.
        expect(layerPixelAt(baseLayer, 30, 30).a).toBe(255);
        expect(layerPixelAt(baseLayer, 30, 30).r).toBe(255);
    });

    it('undo and redo round-trip a Magic Eraser click', () => {
        const layer = useEditorStore.getState().layers[0];
        paintRect(layer, '#ff0000', 0, 0, layer.canvas.width, layer.canvas.height);

        setMagicEraserOptions({ tolerance: 0, antiAlias: false, contiguous: false, opacity: 1 });
        const tool = getTool('magic-eraser')!;
        tool.onPointerDown!(makeToolPointerEvent({ canvasX: 30, canvasY: 30 }), ctx());
        expect(layerPixelAt(layer, 30, 30).a).toBe(0);

        useEditorStore.getState().undo();
        expect(layerPixelAt(useEditorStore.getState().layers[0], 30, 30).a).toBe(255);
        expect(layerPixelAt(useEditorStore.getState().layers[0], 30, 30).r).toBe(255);

        useEditorStore.getState().redo();
        expect(layerPixelAt(useEditorStore.getState().layers[0], 30, 30).a).toBe(0);
    });

    it('options round-trip: setMagicEraserOptions persists, getMagicEraserOptions returns latest', () => {
        setMagicEraserOptions({ tolerance: 88, antiAlias: false, contiguous: false, sampleAllLayers: true, opacity: 0.25 });
        const o = getMagicEraserOptions();
        expect(o.tolerance).toBe(88);
        expect(o.antiAlias).toBe(false);
        expect(o.contiguous).toBe(false);
        expect(o.sampleAllLayers).toBe(true);
        expect(o.opacity).toBe(0.25);
    });
});
