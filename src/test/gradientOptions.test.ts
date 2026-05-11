import { describe, it, expect, beforeEach } from 'vitest';
import { useEditorStore } from '../store/editorStore';
import { getTool } from '../tools/registry';
import { ensureStubsRegistered } from '../tools/stubs';
import { setGradientOptions } from '../tools/gradient';
import { layerPixelAt, makeToolPointerEvent } from './simulator';

ensureStubsRegistered();

function reset() {
    useEditorStore.setState((s) => ({
        ...s,
        layers: [],
        activeLayerId: null,
        primaryColor: '#000000',
        secondaryColor: '#ffffff',
        width: 200,
        height: 100,
    }));
    useEditorStore.getState().addLayer();
    useEditorStore.getState().clearHistory();
    setGradientOptions({
        type: 'linear', presetId: 'foreground-to-background',
        reverse: false, dither: false, method: 'classic', transparency: true,
        opacity: 1, mode: 'normal',
    });
}

function ctx() {
    return {
        store: useEditorStore.getState(),
        getStore: () => useEditorStore.getState(),
        requestRender: () => {},
    };
}

function dragGradient() {
    const tool = getTool('gradient')!;
    tool.onPointerDown!(makeToolPointerEvent({ canvasX: 0, canvasY: 50 }), ctx());
    tool.onPointerMove!(makeToolPointerEvent({ canvasX: 200, canvasY: 50 }), ctx());
    tool.onPointerUp!(makeToolPointerEvent({ canvasX: 200, canvasY: 50 }), ctx());
}

describe('gradient method and transparency wiring', () => {
    beforeEach(reset);

    it('classic and smooth differ visibly at the gradient midpoint', () => {
        setGradientOptions({ method: 'classic' });
        dragGradient();
        const classicMid = layerPixelAt(useEditorStore.getState().layers[0], 100, 50);

        reset();
        setGradientOptions({ method: 'smooth' });
        dragGradient();
        const smoothMid = layerPixelAt(useEditorStore.getState().layers[0], 100, 50);

        // Classic interpolates in sRGB → midpoint of #000000..#ffffff is ~127,127,127.
        // Smooth interpolates in linear-light → midpoint is brighter (~187,187,187 sRGB).
        expect(Math.abs(classicMid.r - 127)).toBeLessThan(8);
        expect(smoothMid.r).toBeGreaterThan(classicMid.r + 30);
    });

    it('transparency off makes alpha-stops opaque', () => {
        setGradientOptions({ presetId: 'foreground-to-transparent', transparency: false, method: 'classic' });
        dragGradient();
        // Right edge is the "transparent" stop. With transparency=off it should be opaque.
        const right = layerPixelAt(useEditorStore.getState().layers[0], 199, 50);
        expect(right.a).toBeGreaterThan(200);
    });

    it('transparency on (default) preserves the alpha falloff', () => {
        setGradientOptions({ presetId: 'foreground-to-transparent', transparency: true });
        dragGradient();
        const right = layerPixelAt(useEditorStore.getState().layers[0], 199, 50);
        expect(right.a).toBeLessThan(20);
    });
});
