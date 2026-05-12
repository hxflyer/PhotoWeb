import { describe, it, expect, beforeEach } from 'vitest';
import { useEditorStore } from '../store/editorStore';
import { ensureStubsRegistered } from '../tools/stubs';
import { Canvas2DCompositor } from '../compositor/Canvas2DCompositor';
import { pixelAt } from './simulator';

ensureStubsRegistered();

function reset() {
    useEditorStore.getState().clearHistory();
    useEditorStore.setState((s) => ({
        ...s,
        layers: [],
        activeLayerId: null,
        selectedLayerIds: [],
        width: 100,
        height: 100,
        globalLight: { angle: 120, altitude: 30 },
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
        globalLight: useEditorStore.getState().globalLight,
    });
    return target;
}

describe('Stroke effect: gradient + pattern fill types (Batch F)', () => {
    beforeEach(reset);

    it('Fill Type=color still paints the original solid stroke (backwards compatible)', () => {
        const layer = useEditorStore.getState().layers[0];
        layer.canvas.width = 100; layer.canvas.height = 100;
        layer.ctx.fillStyle = '#ffffff';
        layer.ctx.fillRect(30, 30, 40, 40);

        useEditorStore.getState().addLayerEffect(layer.id, 'stroke');
        useEditorStore.getState().setLayerEffectParams(layer.id, 0, {
            size: 4, position: 'outside', color: '#0000ff', opacity: 1, fillType: 'color',
        });
        const target = compose();
        const ring = pixelAt(target, 27, 50);
        expect(ring.b).toBeGreaterThan(150);
    });

    it('Fill Type=gradient renders a linear gradient along the stroke direction', () => {
        const layer = useEditorStore.getState().layers[0];
        layer.canvas.width = 100; layer.canvas.height = 100;
        layer.ctx.fillStyle = '#ffffff';
        layer.ctx.fillRect(30, 30, 40, 40);

        useEditorStore.getState().addLayerEffect(layer.id, 'stroke');
        useEditorStore.getState().setLayerEffectParams(layer.id, 0, {
            size: 8, position: 'outside', opacity: 1, fillType: 'gradient',
            gradient: {
                colorStops: [
                    { position: 0, color: '#ff0000' },
                    { position: 1, color: '#00ff00' },
                ],
                opacityStops: [
                    { position: 0, opacity: 1 },
                    { position: 1, opacity: 1 },
                ],
                type: 'linear',
                angle: 0, // horizontal: red on left, green on right
                scale: 100,
            },
        });
        const target = compose();
        // Stroke is just outside the layer (30-70). At y=50, left ring (x≈26)
        // should be red-dominant, right ring (x≈74) should be green-dominant.
        const leftRing = pixelAt(target, 26, 50);
        const rightRing = pixelAt(target, 74, 50);
        expect(leftRing.r).toBeGreaterThan(leftRing.g);
        expect(rightRing.g).toBeGreaterThan(rightRing.r);
    });

    it('Fill Type=pattern selects the pattern picker primitive and stores patternId on the effect', () => {
        const id = useEditorStore.getState().activeLayerId!;
        useEditorStore.getState().addLayerEffect(id, 'stroke');
        useEditorStore.getState().setLayerEffectParams(id, 0, {
            fillType: 'pattern',
            pattern: { patternId: 'test-pattern', scale: 120, link: false },
        });
        const layer = useEditorStore.getState().layers.find(l => l.id === id)!;
        const params = layer.effects[0].params as { fillType: string; pattern: { patternId: string; scale: number; link: boolean } };
        expect(params.fillType).toBe('pattern');
        expect(params.pattern.patternId).toBe('test-pattern');
        expect(params.pattern.scale).toBe(120);
        expect(params.pattern.link).toBe(false);
    });

    it('Fill Type=pattern with a missing pattern falls back to a grey ring and does not throw', () => {
        const layer = useEditorStore.getState().layers[0];
        layer.canvas.width = 100; layer.canvas.height = 100;
        layer.ctx.fillStyle = '#ffffff';
        layer.ctx.fillRect(30, 30, 40, 40);
        useEditorStore.getState().addLayerEffect(layer.id, 'stroke');
        useEditorStore.getState().setLayerEffectParams(layer.id, 0, {
            size: 4, position: 'outside', opacity: 1, fillType: 'pattern',
            pattern: { patternId: 'missing', scale: 100, link: true },
        });
        const target = compose();
        const ring = pixelAt(target, 26, 50);
        // Fallback fill is grey-ish; certainly not the original layer's white.
        expect(ring.r).toBeLessThan(220);
    });
});
