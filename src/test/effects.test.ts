import { describe, it, expect, beforeEach } from 'vitest';
import { useEditorStore } from '../store/editorStore';
import { ensureStubsRegistered } from '../tools/stubs';
import { Canvas2DCompositor } from '../compositor/Canvas2DCompositor';
import { getEffect, listEffects } from '../effects';
import { pixelAt } from './simulator';

ensureStubsRegistered();

function reset() {
    useEditorStore.getState().clearHistory();
    useEditorStore.setState((s) => ({
        ...s,
        layers: [],
        activeLayerId: null,
        width: 100,
        height: 100,
    }));
    useEditorStore.getState().addLayer();
}

function compose(): HTMLCanvasElement {
    const target = document.createElement('canvas');
    target.width = 100; target.height = 100;
    const c = new Canvas2DCompositor();
    c.render({
        layers: useEditorStore.getState().layers,
        activeLayerId: useEditorStore.getState().activeLayerId,
        viewport: { width: 100, height: 100, zoom: 1, pan: { x: 0, y: 0 } },
        target,
    });
    return target;
}

describe('layer effects registry + compositor pipeline', () => {
    beforeEach(reset);

    it('drop-shadow, stroke, and color-overlay are all registered', () => {
        expect(getEffect('drop-shadow')).toBeTruthy();
        expect(getEffect('stroke')).toBeTruthy();
        expect(getEffect('color-overlay')).toBeTruthy();
        expect(listEffects().length).toBeGreaterThanOrEqual(3);
    });

    it('color overlay tints a layer with the chosen color', () => {
        const layer = useEditorStore.getState().layers[0];
        layer.canvas.width = 100; layer.canvas.height = 100;
        // Paint a 40x40 white square in the middle.
        layer.ctx.fillStyle = '#ffffff';
        layer.ctx.fillRect(30, 30, 40, 40);

        useEditorStore.getState().addLayerEffect(layer.id, 'color-overlay');
        useEditorStore.getState().setLayerEffectParams(layer.id, 0, { color: '#ff0000', opacity: 1 });

        const target = compose();
        const px = pixelAt(target, 50, 50);
        expect(px.r).toBe(255);
        expect(px.g).toBe(0);
        expect(px.b).toBe(0);
    });

    it('drop shadow extends the layer alpha at an offset', () => {
        const layer = useEditorStore.getState().layers[0];
        layer.canvas.width = 100; layer.canvas.height = 100;
        layer.ctx.fillStyle = '#ffffff';
        layer.ctx.fillRect(30, 30, 20, 20);

        useEditorStore.getState().addLayerEffect(layer.id, 'drop-shadow');
        useEditorStore.getState().setLayerEffectParams(layer.id, 0, {
            color: '#000000', opacity: 1, angle: 0, distance: 10, spread: 0, size: 4,
        });

        const target = compose();
        // 10 px to the right of the square, the shadow should darken what was empty.
        const shadowPixel = pixelAt(target, 65, 40);
        expect(shadowPixel.a).toBeGreaterThan(20);
    });

    it('stroke (outside) draws a ring around the layer alpha', () => {
        const layer = useEditorStore.getState().layers[0];
        layer.canvas.width = 100; layer.canvas.height = 100;
        layer.ctx.fillStyle = '#ffffff';
        layer.ctx.fillRect(30, 30, 40, 40);

        useEditorStore.getState().addLayerEffect(layer.id, 'stroke');
        useEditorStore.getState().setLayerEffectParams(layer.id, 0, {
            size: 4, position: 'outside', color: '#0000ff', opacity: 1,
        });

        const target = compose();
        // Just outside the white square should now be blue.
        const ring = pixelAt(target, 27, 50);
        expect(ring.b).toBeGreaterThan(150);
        // Interior is still white.
        const inside = pixelAt(target, 50, 50);
        expect(inside.r).toBeGreaterThan(200);
        expect(inside.g).toBeGreaterThan(200);
    });

    it('toggling an effect off removes its visual contribution', () => {
        const layer = useEditorStore.getState().layers[0];
        layer.canvas.width = 100; layer.canvas.height = 100;
        layer.ctx.fillStyle = '#ffffff';
        layer.ctx.fillRect(30, 30, 40, 40);

        useEditorStore.getState().addLayerEffect(layer.id, 'color-overlay');
        useEditorStore.getState().setLayerEffectParams(layer.id, 0, { color: '#ff0000', opacity: 1 });
        useEditorStore.getState().setLayerEffectEnabled(layer.id, 0, false);
        const px = pixelAt(compose(), 50, 50);
        // Disabled effect: layer is back to white.
        expect(px.r).toBeGreaterThan(200);
        expect(px.g).toBeGreaterThan(200);
    });
});
