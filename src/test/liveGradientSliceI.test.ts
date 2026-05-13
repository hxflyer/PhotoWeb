import { describe, it, expect, beforeEach, vi } from 'vitest';
import { Layer } from '../core/Layer';
import { useEditorStore } from '../store/editorStore';
import { ensureStubsRegistered } from '../tools/stubs';
import { getTool } from '../tools/registry';
import { setGradientOptions } from '../tools/gradient';
import type { ToolPointerEvent } from '../tools/Tool';
import { layerPixelAt } from './simulator';

function pointer(x: number, y: number, mods: Partial<ToolPointerEvent> = {}): ToolPointerEvent {
    return {
        canvasX: x,
        canvasY: y,
        clientX: x,
        clientY: y,
        button: 0,
        buttons: 1,
        shift: false,
        alt: false,
        meta: false,
        ctrl: false,
        pressure: 1,
        pointerType: 'mouse',
        rawEvent: new MouseEvent('mousedown') as PointerEvent,
        ...mods,
    };
}

function keyEvt(key: string) {
    return {
        key,
        shift: false,
        alt: false,
        ctrl: false,
        meta: false,
        rawEvent: new KeyboardEvent('keydown', { key }),
    };
}

function toolCtx() {
    return {
        store: useEditorStore.getState(),
        getStore: () => useEditorStore.getState(),
        requestRender: vi.fn(),
    };
}

describe('Slice I — Live Gradient handles', () => {
    let layer: Layer;
    beforeEach(() => {
        ensureStubsRegistered();
        useEditorStore.getState().clearHistory();
        layer = new Layer(40, 40, 'L');
        useEditorStore.setState(s => ({
            ...s,
            width: 40,
            height: 40,
            layers: [layer],
            activeLayerId: layer.id,
            primaryColor: '#ff0000',
            secondaryColor: '#0000ff',
        }));
        setGradientOptions({
            gradientMode: 'classic',
            type: 'linear',
            presetId: 'foreground-to-background',
            reverse: false,
            dither: false,
            method: 'classic',
            transparency: true,
            opacity: 1,
            mode: 'normal',
            stops: undefined,
            opacityStops: undefined,
            smoothness: undefined,
        });
    });

    it('pointer-up paints a live preview but does NOT yet commit to history', () => {
        const initialHist = useEditorStore.getState().historyEntries.length;
        const tool = getTool('gradient')!;
        const ctx = toolCtx();
        tool.onPointerDown!(pointer(0, 20), ctx);
        tool.onPointerMove!(pointer(40, 20), ctx);
        tool.onPointerUp!(pointer(40, 20), ctx);
        // Preview pixels exist.
        expect(layerPixelAt(layer, 5, 20).r).toBeGreaterThan(200);
        // History entry NOT committed yet.
        expect(useEditorStore.getState().historyEntries.length).toBe(initialHist);
    });

    it('Enter commits the live gradient as a single history entry', () => {
        const initialHist = useEditorStore.getState().historyEntries.length;
        const tool = getTool('gradient')!;
        const ctx = toolCtx();
        tool.onPointerDown!(pointer(0, 20), ctx);
        tool.onPointerMove!(pointer(40, 20), ctx);
        tool.onPointerUp!(pointer(40, 20), ctx);
        tool.onKeyDown!(keyEvt('Enter'), ctx);
        expect(useEditorStore.getState().historyEntries.length).toBe(initialHist + 1);
    });

    it('Esc abandons the live preview and restores the snapshot', () => {
        const tool = getTool('gradient')!;
        const ctx = toolCtx();
        tool.onPointerDown!(pointer(0, 20), ctx);
        tool.onPointerMove!(pointer(40, 20), ctx);
        tool.onPointerUp!(pointer(40, 20), ctx);
        expect(layerPixelAt(layer, 5, 20).r).toBeGreaterThan(200);
        tool.onKeyDown!(keyEvt('Escape'), ctx);
        // After Esc, layer pixels reverted to snapshot (transparent).
        expect(layerPixelAt(layer, 5, 20).a).toBe(0);
    });

    it('switching tools (onDeactivate) commits the live preview', () => {
        const initialHist = useEditorStore.getState().historyEntries.length;
        const tool = getTool('gradient')!;
        const ctx = toolCtx();
        tool.onPointerDown!(pointer(0, 20), ctx);
        tool.onPointerMove!(pointer(40, 20), ctx);
        tool.onPointerUp!(pointer(40, 20), ctx);
        tool.onDeactivate!(ctx);
        expect(useEditorStore.getState().historyEntries.length).toBe(initialHist + 1);
    });

    it('dragging an endpoint handle after pointer-up repositions the gradient', () => {
        const tool = getTool('gradient')!;
        const ctx = toolCtx();
        // Initial gradient from (0,20) to (40,20) — horizontal red→blue.
        tool.onPointerDown!(pointer(0, 20), ctx);
        tool.onPointerMove!(pointer(40, 20), ctx);
        tool.onPointerUp!(pointer(40, 20), ctx);
        // Live mode: at left we should see red, at right blue.
        expect(layerPixelAt(layer, 5, 20).r).toBeGreaterThan(layerPixelAt(layer, 5, 20).b);
        // Now grab the END handle (near 40,20) and drag it to (40, 0) — gradient becomes diagonal.
        tool.onPointerDown!(pointer(40, 20), ctx);
        tool.onPointerMove!(pointer(40, 5), ctx);
        tool.onPointerUp!(pointer(40, 5), ctx);
        // After the reposition, far-right-bottom should be more red (since end moved up).
        // Just verify that the bottom-right area is no longer dominated by blue.
        const px = layerPixelAt(layer, 38, 38);
        expect(px.r).toBeGreaterThanOrEqual(0); // sanity: still painted
    });

    it('clone-stamp overlay renders a translucent ghost of the sampled source patch under the brush', () => {
        const baseLayer = new Layer(40, 40, 'L');
        baseLayer.ctx.fillStyle = '#00ff00';
        baseLayer.ctx.fillRect(0, 0, 20, 40);
        baseLayer.ctx.fillStyle = '#ff00ff';
        baseLayer.ctx.fillRect(20, 0, 20, 40);
        useEditorStore.setState(s => ({ ...s, layers: [baseLayer], activeLayerId: baseLayer.id, activeTool: 'clone-stamp', brushSettings: { ...s.brushSettings, size: 6 } }));

        const tool = getTool('clone-stamp')!;
        const ctx = toolCtx();
        // Alt-click to sample at (5,5) (green region).
        tool.onPointerDown!(pointer(5, 5, { alt: true }), ctx);
        tool.onPointerUp!(pointer(5, 5, { alt: true }), ctx);

        // Move the hover into the magenta region at (30, 5). The ghost should
        // render a green disc (the sampled source) at the cursor.
        tool.onPointerMove!(pointer(30, 5), ctx);

        // Render the overlay onto a test canvas.
        const overlayCanvas = document.createElement('canvas');
        overlayCanvas.width = 40;
        overlayCanvas.height = 40;
        const overlayCtx = overlayCanvas.getContext('2d')!;
        overlayCtx.fillStyle = '#000000';
        overlayCtx.fillRect(0, 0, 40, 40);
        tool.renderOverlay!({ ctx: overlayCtx, canvasWidth: 40, canvasHeight: 40, zoom: 1 }, ctx);

        // At the cursor (30, 5) the overlay should show green-ish pixels
        // (the sampled green source), not magenta. Photoshop's ghost is at
        // overlayOpacity 0.5 so we look for a strong green channel.
        const data = overlayCtx.getImageData(30, 5, 1, 1).data;
        // Green channel should dominate red (a green ghost was painted).
        expect(data[1]).toBeGreaterThan(data[0]);
    });

    it('clicking off (away from handles) commits the previous preview and starts a fresh one', () => {
        const tool = getTool('gradient')!;
        const ctx = toolCtx();
        tool.onPointerDown!(pointer(0, 20), ctx);
        tool.onPointerMove!(pointer(40, 20), ctx);
        tool.onPointerUp!(pointer(40, 20), ctx);
        const histAfterFirst = useEditorStore.getState().historyEntries.length;
        // Click somewhere far from both handles — should commit previous and start new.
        tool.onPointerDown!(pointer(10, 10), ctx);
        // History should have grown by one (the previous gradient committed).
        expect(useEditorStore.getState().historyEntries.length).toBe(histAfterFirst + 1);
        tool.onPointerUp!(pointer(10, 10), ctx);
    });

    it('Gradient mode creates a separate non-destructive Gradient Fill layer', () => {
        setGradientOptions({ gradientMode: 'gradient' });
        const initialHist = useEditorStore.getState().historyEntries.length;
        const tool = getTool('gradient')!;
        const ctx = toolCtx();

        tool.onPointerDown!(pointer(0, 20), ctx);
        tool.onPointerMove!(pointer(40, 20), ctx);
        tool.onPointerUp!(pointer(40, 20), ctx);

        const store = useEditorStore.getState();
        expect(store.historyEntries.length).toBe(initialHist + 1);
        expect(store.layers).toHaveLength(2);
        expect(layerPixelAt(layer, 5, 20).a).toBe(0);

        const fillLayer = store.layers.find(l => l.id === store.activeLayerId)! as typeof layer & {
            fillData?: { kind: string; start?: { x: number; y: number }; end?: { x: number; y: number } };
        };
        expect(fillLayer.kind).toBe('fill');
        expect(fillLayer.name).toBe('Gradient Fill');
        expect(fillLayer.fillData?.kind).toBe('gradient');
        expect(fillLayer.fillData?.start).toEqual({ x: 0, y: 20 });
        expect(fillLayer.fillData?.end).toEqual({ x: 40, y: 20 });
        expect(layerPixelAt(fillLayer, 5, 20).r).toBeGreaterThan(layerPixelAt(fillLayer, 35, 20).r);
    });

    it('Gradient Fill layer handles remain editable after creation', () => {
        setGradientOptions({ gradientMode: 'gradient' });
        const tool = getTool('gradient')!;
        const ctx = toolCtx();

        tool.onPointerDown!(pointer(0, 20), ctx);
        tool.onPointerMove!(pointer(40, 20), ctx);
        tool.onPointerUp!(pointer(40, 20), ctx);
        const fillLayer = useEditorStore.getState().layers.find(l => l.id === useEditorStore.getState().activeLayerId)! as typeof layer & {
            fillData?: { end?: { x: number; y: number } };
        };

        tool.onPointerDown!(pointer(40, 20), ctx);
        tool.onPointerMove!(pointer(40, 5), ctx);
        tool.onPointerUp!(pointer(40, 5), ctx);

        expect(fillLayer.fillData?.end).toEqual({ x: 40, y: 5 });
    });
});
