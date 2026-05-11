import { describe, it, expect, beforeEach } from 'vitest';
import { useEditorStore } from '../store/editorStore';
import { getTool } from '../tools/registry';
import { ensureStubsRegistered } from '../tools/stubs';
import { setDodgeOptions, setBurnOptions } from '../tools/dodgeBurnSponge';
import { layerPixelAt, makeToolPointerEvent } from './simulator';

ensureStubsRegistered();

function reset() {
    useEditorStore.setState((s) => ({
        ...s,
        layers: [],
        activeLayerId: null,
        brushSettings: { size: 60, hardness: 1, opacity: 1, flow: 1 },
    }));
    useEditorStore.getState().addLayer();
    setDodgeOptions({ exposure: 0.5, range: 'midtones' });
    setBurnOptions({ exposure: 0.5, range: 'midtones' });
}

function ctx() {
    return {
        store: useEditorStore.getState(),
        getStore: () => useEditorStore.getState(),
        requestRender: () => {},
    };
}

describe('dodge / burn range and exposure', () => {
    beforeEach(reset);

    it('dodge with range=highlights barely affects midtones', () => {
        const layer = useEditorStore.getState().layers[0];
        layer.ctx.fillStyle = '#808080';
        layer.ctx.fillRect(0, 0, 200, 200);

        setDodgeOptions({ range: 'highlights', exposure: 0.5 });
        const tool = getTool('dodge')!;
        tool.onPointerDown!(makeToolPointerEvent({ canvasX: 100, canvasY: 100 }), ctx());
        tool.onPointerUp!(makeToolPointerEvent({ canvasX: 100, canvasY: 100 }), ctx());
        const midtoneTouch = layerPixelAt(layer, 100, 100);

        // Reset to clean midtone, then dodge with range=midtones.
        layer.ctx.fillStyle = '#808080';
        layer.ctx.fillRect(0, 0, 200, 200);
        setDodgeOptions({ range: 'midtones', exposure: 0.5 });
        tool.onPointerDown!(makeToolPointerEvent({ canvasX: 100, canvasY: 100 }), ctx());
        tool.onPointerUp!(makeToolPointerEvent({ canvasX: 100, canvasY: 100 }), ctx());
        const midtoneRangeTouch = layerPixelAt(layer, 100, 100);

        expect(midtoneRangeTouch.r - 0x80).toBeGreaterThan(midtoneTouch.r - 0x80);
        expect(midtoneTouch.r).toBeLessThanOrEqual(0x82); // ~unchanged
    });

    it('exposure 0 leaves pixels unchanged', () => {
        const layer = useEditorStore.getState().layers[0];
        layer.ctx.fillStyle = '#808080';
        layer.ctx.fillRect(0, 0, 200, 200);

        setDodgeOptions({ range: 'midtones', exposure: 0 });
        const tool = getTool('dodge')!;
        tool.onPointerDown!(makeToolPointerEvent({ canvasX: 100, canvasY: 100 }), ctx());
        tool.onPointerMove!(makeToolPointerEvent({ canvasX: 110, canvasY: 100 }), ctx());
        tool.onPointerUp!(makeToolPointerEvent({ canvasX: 110, canvasY: 100 }), ctx());

        const center = layerPixelAt(layer, 105, 100);
        expect(center.r).toBe(0x80);
        expect(center.g).toBe(0x80);
        expect(center.b).toBe(0x80);
    });

    it('burn darkens pixels and dodge brightens them', () => {
        const layer = useEditorStore.getState().layers[0];
        layer.ctx.fillStyle = '#808080';
        layer.ctx.fillRect(0, 0, 200, 200);

        const dodge = getTool('dodge')!;
        dodge.onPointerDown!(makeToolPointerEvent({ canvasX: 50, canvasY: 50 }), ctx());
        dodge.onPointerUp!(makeToolPointerEvent({ canvasX: 50, canvasY: 50 }), ctx());

        const burn = getTool('burn')!;
        burn.onPointerDown!(makeToolPointerEvent({ canvasX: 150, canvasY: 50 }), ctx());
        burn.onPointerUp!(makeToolPointerEvent({ canvasX: 150, canvasY: 50 }), ctx());

        const dodged = layerPixelAt(layer, 50, 50);
        const burned = layerPixelAt(layer, 150, 50);
        expect(dodged.r).toBeGreaterThan(0x80);
        expect(burned.r).toBeLessThan(0x80);
    });
});
