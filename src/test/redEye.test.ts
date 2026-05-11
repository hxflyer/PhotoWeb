import { describe, it, expect, beforeEach } from 'vitest';
import { useEditorStore } from '../store/editorStore';
import { getTool } from '../tools/registry';
import { ensureStubsRegistered } from '../tools/stubs';
import { layerPixelAt, makeToolPointerEvent } from './simulator';
import { setRedEyeOptions, getRedEyeOptions } from '../tools/redEye';

ensureStubsRegistered();

function reset() {
    useEditorStore.setState((s) => ({
        ...s,
        layers: [],
        activeLayerId: null,
        brushSettings: { size: 40, hardness: 1, opacity: 1, flow: 1 },
    }));
    useEditorStore.getState().clearSelection();
    useEditorStore.getState().addLayer();
    useEditorStore.getState().clearHistory();
    setRedEyeOptions({ pupilSize: 50, darkenAmount: 50 });
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

describe('Red Eye Tool — desaturate and darken red-eye clusters', () => {
    beforeEach(reset);

    it('clicking on a red cluster desaturates those pixels (R approximately equals G and B)', () => {
        const layer = useEditorStore.getState().layers[0];
        paintRect(layer, '#ffffff', 0, 0, layer.canvas.width, layer.canvas.height);
        // Red-eye cluster: r=240, g=30, b=30 (satisfies r > g+30 && r > b+30 && r > 100).
        paintRect(layer, 'rgb(240, 30, 30)', 90, 90, 20, 20);

        setRedEyeOptions({ pupilSize: 100, darkenAmount: 50 });
        const tool = getTool('red-eye')!;
        tool.onPointerDown!(makeToolPointerEvent({ canvasX: 100, canvasY: 100 }), ctx());

        // Center pixel: red-eye should be desaturated. R/G/B should be close.
        const px = layerPixelAt(layer, 100, 100);
        expect(Math.abs(px.r - px.g)).toBeLessThan(15);
        expect(Math.abs(px.r - px.b)).toBeLessThan(15);
        // And darkened (was 240; expect about half-luminance).
        expect(px.r).toBeLessThan(140);
    });

    it('pixels outside the pupilSize radius are untouched', () => {
        const layer = useEditorStore.getState().layers[0];
        paintRect(layer, '#ffffff', 0, 0, layer.canvas.width, layer.canvas.height);
        paintRect(layer, 'rgb(240, 30, 30)', 0, 0, 400, 400);

        // Small pupilSize so the affected disc is narrow. brushSettings.size=40,
        // baseRadius=20; pupilSize=10 → radius ~ 20 * 0.1 * 2 = 4 px.
        setRedEyeOptions({ pupilSize: 10, darkenAmount: 50 });
        const tool = getTool('red-eye')!;
        tool.onPointerDown!(makeToolPointerEvent({ canvasX: 100, canvasY: 100 }), ctx());

        // Far away from the click: untouched red.
        const far = layerPixelAt(layer, 300, 300);
        expect(far.r).toBe(240);
        expect(far.g).toBe(30);
        expect(far.b).toBe(30);
    });

    it('non-red pixels are untouched even inside the click radius', () => {
        const layer = useEditorStore.getState().layers[0];
        paintRect(layer, '#ffffff', 0, 0, layer.canvas.width, layer.canvas.height);
        // Plain blue inside the click area: r=20, g=20, b=240 (not red).
        paintRect(layer, 'rgb(20, 20, 240)', 80, 80, 40, 40);

        setRedEyeOptions({ pupilSize: 100, darkenAmount: 50 });
        const tool = getTool('red-eye')!;
        tool.onPointerDown!(makeToolPointerEvent({ canvasX: 100, canvasY: 100 }), ctx());

        const px = layerPixelAt(layer, 100, 100);
        expect(px.r).toBe(20);
        expect(px.g).toBe(20);
        expect(px.b).toBe(240);
    });

    it('selection clipping prevents the red-eye effect from leaving the selection', () => {
        const layer = useEditorStore.getState().layers[0];
        paintRect(layer, '#ffffff', 0, 0, layer.canvas.width, layer.canvas.height);
        paintRect(layer, 'rgb(240, 30, 30)', 0, 0, 400, 400);

        // Selection: only the top half (y < 100).
        useEditorStore.getState().setHasSelection(true);
        useEditorStore.getState().setSelectionOperations([
            { mode: 'add', type: 'rect', path: [{ x: 0, y: 0 }, { x: 400, y: 100 }] },
        ]);

        setRedEyeOptions({ pupilSize: 100, darkenAmount: 50 });
        const tool = getTool('red-eye')!;
        // Click on the selection boundary y=100; below should be unaffected.
        tool.onPointerDown!(makeToolPointerEvent({ canvasX: 100, canvasY: 100 }), ctx());

        // Pixel below the selection: still original red.
        const below = layerPixelAt(layer, 100, 130);
        expect(below.r).toBe(240);
        expect(below.g).toBe(30);
        expect(below.b).toBe(30);
    });

    it('undo and redo round-trip a Red Eye click', () => {
        const layer = useEditorStore.getState().layers[0];
        paintRect(layer, '#ffffff', 0, 0, layer.canvas.width, layer.canvas.height);
        paintRect(layer, 'rgb(240, 30, 30)', 90, 90, 20, 20);

        setRedEyeOptions({ pupilSize: 100, darkenAmount: 50 });
        const tool = getTool('red-eye')!;
        tool.onPointerDown!(makeToolPointerEvent({ canvasX: 100, canvasY: 100 }), ctx());

        const after = layerPixelAt(useEditorStore.getState().layers[0], 100, 100);
        expect(after.r).toBeLessThan(140);

        useEditorStore.getState().undo();
        const undone = layerPixelAt(useEditorStore.getState().layers[0], 100, 100);
        expect(undone.r).toBe(240);
        expect(undone.g).toBe(30);
        expect(undone.b).toBe(30);

        useEditorStore.getState().redo();
        const redone = layerPixelAt(useEditorStore.getState().layers[0], 100, 100);
        expect(redone.r).toBeLessThan(140);
    });

    it('options round-trip: setRedEyeOptions persists, getRedEyeOptions returns latest', () => {
        setRedEyeOptions({ pupilSize: 75, darkenAmount: 80 });
        const o = getRedEyeOptions();
        expect(o.pupilSize).toBe(75);
        expect(o.darkenAmount).toBe(80);
    });
});
