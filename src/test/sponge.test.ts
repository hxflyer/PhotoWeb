import { describe, it, expect, beforeEach } from 'vitest';
import { useEditorStore } from '../store/editorStore';
import { getTool } from '../tools/registry';
import { ensureStubsRegistered } from '../tools/stubs';
import { setSpongeOptions } from '../tools/dodgeBurnSponge';
import { layerPixelAt, makeToolPointerEvent } from './simulator';

ensureStubsRegistered();

function reset() {
    useEditorStore.setState((s) => ({
        ...s,
        layers: [],
        activeLayerId: null,
        brushSettings: { size: 40, hardness: 1, opacity: 1, flow: 0.8 },
    }));
    useEditorStore.getState().addLayer();
    setSpongeOptions({ mode: 'desaturate', vibrance: false });
}

function ctx() {
    return {
        store: useEditorStore.getState(),
        getStore: () => useEditorStore.getState(),
        requestRender: () => {},
    };
}

describe('sponge mode and vibrance', () => {
    beforeEach(reset);

    it('saturate increases pixel saturation', () => {
        const layer = useEditorStore.getState().layers[0];
        // Start with a low-saturation reddish color.
        layer.ctx.fillStyle = '#a07070';
        layer.ctx.fillRect(0, 0, 200, 200);
        setSpongeOptions({ mode: 'saturate', vibrance: false });

        const tool = getTool('sponge')!;
        tool.onPointerDown!(makeToolPointerEvent({ canvasX: 50, canvasY: 50 }), ctx());
        tool.onPointerUp!(makeToolPointerEvent({ canvasX: 50, canvasY: 50 }), ctx());

        const after = layerPixelAt(layer, 50, 50);
        // R goes up, G/B go down -> saturation increases.
        expect(after.r).toBeGreaterThan(0xa0);
        expect(after.g).toBeLessThan(0x70);
        expect(after.b).toBeLessThan(0x70);
    });

    it('desaturate is the default and brings R/G/B toward luma', () => {
        const layer = useEditorStore.getState().layers[0];
        layer.ctx.fillStyle = '#ff0000';
        layer.ctx.fillRect(0, 0, 200, 200);

        const tool = getTool('sponge')!;
        tool.onPointerDown!(makeToolPointerEvent({ canvasX: 50, canvasY: 50 }), ctx());
        tool.onPointerUp!(makeToolPointerEvent({ canvasX: 50, canvasY: 50 }), ctx());

        const after = layerPixelAt(layer, 50, 50);
        expect(after.r).toBeLessThan(255);
        expect(after.g).toBeGreaterThan(0);
        expect(after.b).toBeGreaterThan(0);
    });

    it('vibrance dampens already-saturated pixels', () => {
        const tool = getTool('sponge')!;
        // First pass: vibrance OFF, fully saturated red.
        const layer = useEditorStore.getState().layers[0];
        layer.ctx.fillStyle = '#ff0000';
        layer.ctx.fillRect(0, 0, 200, 200);
        setSpongeOptions({ mode: 'desaturate', vibrance: false });
        tool.onPointerDown!(makeToolPointerEvent({ canvasX: 50, canvasY: 50 }), ctx());
        tool.onPointerUp!(makeToolPointerEvent({ canvasX: 50, canvasY: 50 }), ctx());
        const noVibrance = layerPixelAt(layer, 50, 50);

        // Reset; vibrance ON, fully saturated red.
        layer.ctx.fillStyle = '#ff0000';
        layer.ctx.fillRect(0, 0, 200, 200);
        setSpongeOptions({ mode: 'desaturate', vibrance: true });
        tool.onPointerDown!(makeToolPointerEvent({ canvasX: 50, canvasY: 50 }), ctx());
        tool.onPointerUp!(makeToolPointerEvent({ canvasX: 50, canvasY: 50 }), ctx());
        const withVibrance = layerPixelAt(layer, 50, 50);

        // Both desaturate the red, but vibrance changes it less because the
        // pixel is already fully saturated.
        const noVibranceShift = 255 - noVibrance.r;
        const vibranceShift = 255 - withVibrance.r;
        expect(noVibranceShift).toBeGreaterThan(vibranceShift);
    });
});
