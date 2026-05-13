import { describe, it, expect, beforeEach } from 'vitest';
import { useEditorStore } from '../store/editorStore';
import { getTool } from '../tools/registry';
import { ensureStubsRegistered } from '../tools/stubs';
import { getGradientOptions, getGradientPresets, resetGradientOptions, setGradientOptions } from '../tools/gradient';
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
        opacity: 1, mode: 'normal', stops: undefined, opacityStops: undefined, smoothness: undefined,
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
    tool.onKeyDown?.({
        key: 'Enter',
        shift: false,
        alt: false,
        meta: false,
        ctrl: false,
        rawEvent: { preventDefault: () => {} } as KeyboardEvent,
    }, ctx());
}

describe('gradient method and transparency wiring', () => {
    beforeEach(reset);

    it('defaults Dither on like Photoshop gradient options', () => {
        resetGradientOptions();
        expect(getGradientOptions().dither).toBe(true);
    });

    it('includes the rainbow recipe preset with Photoshop lesson stop locations', () => {
        const rainbow = getGradientPresets().find(p => p.id === 'rainbow');
        expect(rainbow?.stops.map(stop => stop.position)).toEqual([0, 0.2, 0.4, 0.6, 0.8, 1]);
        expect(rainbow?.stops.map(stop => stop.color)).toEqual(['#ff0000', '#ffff00', '#00ff00', '#00ffff', '#0000ff', '#ff00ff']);
    });

    it('Black, White preset ignores the current foreground and background colors', () => {
        useEditorStore.setState((s) => ({
            ...s,
            primaryColor: '#ff0000',
            secondaryColor: '#0000ff',
        }));
        setGradientOptions({ presetId: 'black-to-white', method: 'classic' });
        dragGradient();
        const left = layerPixelAt(useEditorStore.getState().layers[0], 0, 50);
        const right = layerPixelAt(useEditorStore.getState().layers[0], 199, 50);
        expect(left.r).toBeLessThan(8);
        expect(left.g).toBeLessThan(8);
        expect(left.b).toBeLessThan(8);
        expect(right.r).toBeGreaterThan(245);
        expect(right.g).toBeGreaterThan(245);
        expect(right.b).toBeGreaterThan(245);
    });

    it('renders custom Gradient Editor stops when drawing with the Gradient Tool', () => {
        setGradientOptions({
            presetId: 'black-to-white',
            method: 'classic',
            stops: [
                { position: 0, color: '#ff0000', opacity: 1 },
                { position: 0.5, color: '#00ff00', opacity: 1 },
                { position: 1, color: '#0000ff', opacity: 1 },
            ],
        });
        dragGradient();
        const middle = layerPixelAt(useEditorStore.getState().layers[0], 100, 50);
        expect(middle.g).toBeGreaterThan(240);
        expect(middle.r).toBeLessThan(20);
        expect(middle.b).toBeLessThan(20);
    });

    it('keeps opacity-only Gradient Editor stops when rendering custom gradients', () => {
        setGradientOptions({
            presetId: 'black-to-white',
            method: 'classic',
            transparency: true,
            stops: [
                { position: 0, color: '#ff0000', opacity: 1 },
                { position: 1, color: '#0000ff', opacity: 1 },
            ],
            opacityStops: [
                { position: 0, opacity: 1 },
                { position: 0.5, opacity: 0 },
                { position: 1, opacity: 1 },
            ],
        });
        dragGradient();
        const middle = layerPixelAt(useEditorStore.getState().layers[0], 100, 50);
        expect(middle.a).toBeLessThan(40);
    });

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
