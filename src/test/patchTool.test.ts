import { describe, it, expect, beforeEach } from 'vitest';
import { useEditorStore } from '../store/editorStore';
import { getTool } from '../tools/registry';
import { ensureStubsRegistered } from '../tools/stubs';
import { layerPixelAt, makeToolPointerEvent } from './simulator';
import { setPatchOptions, getPatchOptions } from '../tools/patch';

ensureStubsRegistered();

function reset() {
    useEditorStore.setState((s) => ({
        ...s,
        layers: [],
        activeLayerId: null,
    }));
    useEditorStore.getState().clearSelection();
    useEditorStore.getState().addLayer();
    useEditorStore.getState().clearHistory();
    setPatchOptions({ mode: 'source' });
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

describe('Patch Tool — selection-based repair', () => {
    beforeEach(reset);

    it('source mode: drag selection from clean source onto target; target heals using original-position pixels', () => {
        const layer = useEditorStore.getState().layers[0];
        paintRect(layer, '#ffffff', 0, 0, layer.canvas.width, layer.canvas.height);
        // Target to repair: a red blemish at (200..250, 200..250).
        paintRect(layer, '#ff0000', 200, 200, 50, 50);

        // Selection around a clean white area (50..100, 50..100).
        useEditorStore.getState().setHasSelection(true);
        useEditorStore.getState().setSelectionOperations([
            { mode: 'add', type: 'rect', path: [{ x: 50, y: 50 }, { x: 100, y: 100 }] },
        ]);

        setPatchOptions({ mode: 'source' });
        const tool = getTool('patch')!;
        // Drag the clean selection onto the red blemish (offset +150, +150).
        tool.onPointerDown!(makeToolPointerEvent({ canvasX: 75, canvasY: 75 }), ctx());
        tool.onPointerMove!(makeToolPointerEvent({ canvasX: 225, canvasY: 225 }), ctx());
        tool.onPointerUp!(makeToolPointerEvent({ canvasX: 225, canvasY: 225 }), ctx());

        // Drop position (red blemish) should now be healed to surrounding white.
        const px = layerPixelAt(useEditorStore.getState().layers[0], 225, 225);
        expect(px.g).toBeGreaterThan(200);
        expect(px.b).toBeGreaterThan(200);
        // Red dominance is gone (white now).
        expect(px.r - Math.max(px.g, px.b)).toBeLessThan(20);
        // The original source region (white) is untouched.
        const srcPx = layerPixelAt(useEditorStore.getState().layers[0], 75, 75);
        expect(srcPx.r).toBe(255);
        expect(srcPx.g).toBe(255);
        expect(srcPx.b).toBe(255);
    });

    it('destination mode: pixels at the drop position are stamped onto the original-position pixels', () => {
        const layer = useEditorStore.getState().layers[0];
        paintRect(layer, '#ffffff', 0, 0, layer.canvas.width, layer.canvas.height);
        // Original (selection) area: blue.
        paintRect(layer, '#0000ff', 50, 50, 50, 50);
        // Drop area: red.
        paintRect(layer, '#ff0000', 200, 200, 50, 50);

        // Selection around the original (blue) region.
        useEditorStore.getState().setHasSelection(true);
        useEditorStore.getState().setSelectionOperations([
            { mode: 'add', type: 'rect', path: [{ x: 50, y: 50 }, { x: 100, y: 100 }] },
        ]);

        setPatchOptions({ mode: 'destination' });
        const tool = getTool('patch')!;
        // Drag from selection center to (225, 225), which falls inside the red zone.
        tool.onPointerDown!(makeToolPointerEvent({ canvasX: 75, canvasY: 75 }), ctx());
        tool.onPointerMove!(makeToolPointerEvent({ canvasX: 225, canvasY: 225 }), ctx());
        tool.onPointerUp!(makeToolPointerEvent({ canvasX: 225, canvasY: 225 }), ctx());

        // Original position should now be red (drop pixels stamped onto original).
        const orig = layerPixelAt(useEditorStore.getState().layers[0], 75, 75);
        expect(orig.r).toBeGreaterThan(200);
        expect(orig.b).toBeLessThan(80);
        // Drop position itself remains red (untouched by destination mode).
        const dropped = layerPixelAt(useEditorStore.getState().layers[0], 225, 225);
        expect(dropped.r).toBeGreaterThan(200);
    });

    it('without an active selection, the patch tool does nothing', () => {
        const layer = useEditorStore.getState().layers[0];
        paintRect(layer, '#ffffff', 0, 0, layer.canvas.width, layer.canvas.height);
        paintRect(layer, '#ff0000', 50, 50, 50, 50);

        const tool = getTool('patch')!;
        tool.onPointerDown!(makeToolPointerEvent({ canvasX: 75, canvasY: 75 }), ctx());
        tool.onPointerMove!(makeToolPointerEvent({ canvasX: 225, canvasY: 225 }), ctx());
        tool.onPointerUp!(makeToolPointerEvent({ canvasX: 225, canvasY: 225 }), ctx());

        // Red blemish remains untouched.
        const px = layerPixelAt(useEditorStore.getState().layers[0], 75, 75);
        expect(px.r).toBe(255);
        expect(px.g).toBe(0);
        expect(px.b).toBe(0);
        // No history entry.
        expect(useEditorStore.getState().canUndo).toBeFalsy();
    });

    it('undo and redo round-trip a Patch operation', () => {
        const layer = useEditorStore.getState().layers[0];
        paintRect(layer, '#ffffff', 0, 0, layer.canvas.width, layer.canvas.height);
        // Target blemish at the drop location.
        paintRect(layer, '#ff0000', 200, 200, 50, 50);

        useEditorStore.getState().setHasSelection(true);
        useEditorStore.getState().setSelectionOperations([
            { mode: 'add', type: 'rect', path: [{ x: 50, y: 50 }, { x: 100, y: 100 }] },
        ]);

        const tool = getTool('patch')!;
        tool.onPointerDown!(makeToolPointerEvent({ canvasX: 75, canvasY: 75 }), ctx());
        tool.onPointerMove!(makeToolPointerEvent({ canvasX: 225, canvasY: 225 }), ctx());
        tool.onPointerUp!(makeToolPointerEvent({ canvasX: 225, canvasY: 225 }), ctx());

        // Drop position gets healed (no longer pure red).
        const healed = layerPixelAt(useEditorStore.getState().layers[0], 225, 225);
        expect(healed.g).toBeGreaterThan(200);
        expect(healed.b).toBeGreaterThan(200);

        useEditorStore.getState().undo();
        const undone = layerPixelAt(useEditorStore.getState().layers[0], 225, 225);
        expect(undone.r).toBe(255);
        expect(undone.g).toBe(0);

        useEditorStore.getState().redo();
        const redone = layerPixelAt(useEditorStore.getState().layers[0], 225, 225);
        expect(redone.g).toBeGreaterThan(200);
        expect(redone.b).toBeGreaterThan(200);
    });

    it('options round-trip: setPatchOptions persists, getPatchOptions returns latest', () => {
        setPatchOptions({ mode: 'destination' });
        const o = getPatchOptions();
        expect(o.mode).toBe('destination');
    });
});
