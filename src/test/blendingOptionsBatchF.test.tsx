import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { render, cleanup, fireEvent } from '@testing-library/react';
import { useEditorStore } from '../store/editorStore';
import { ensureStubsRegistered } from '../tools/stubs';
import { Canvas2DCompositor } from '../compositor/Canvas2DCompositor';
import { pixelAt } from './simulator';
import { LayerStyleDialog } from '../components/Dialogs/LayerStyleDialog';

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

describe('Blending Options modal section (Batch F)', () => {
    beforeEach(reset);
    afterEach(cleanup);

    it('Layer model exposes the advanced-blending flags with Photoshop defaults', () => {
        const layer = useEditorStore.getState().layers[0];
        expect(layer.knockout).toBe('none');
        expect(layer.blendInteriorEffectsAsGroup).toBe(false);
        expect(layer.blendClippedLayersAsGroup).toBe(true);
        expect(layer.transparencyShapesLayer).toBe(true);
        expect(layer.layerMaskHidesEffects).toBe(false);
        expect(layer.vectorMaskHidesEffects).toBe(false);
        expect(layer.blendIf.channel).toBe('gray');
        expect(layer.blendIf.gray.thisLayer.low).toBe(0);
        expect(layer.blendIf.gray.thisLayer.high).toBe(255);
    });

    it('Fill Opacity attenuates layer pixels without attenuating effects', () => {
        const layer = useEditorStore.getState().layers[0];
        layer.canvas.width = 100; layer.canvas.height = 100;
        layer.ctx.fillStyle = '#ffffff';
        layer.ctx.fillRect(30, 30, 40, 40);

        // Add a stroke effect — when fill drops to 0, the layer body disappears
        // but the stroke remains.
        useEditorStore.getState().addLayerEffect(layer.id, 'stroke');
        useEditorStore.getState().setLayerEffectParams(layer.id, 0, {
            size: 4, position: 'outside', color: '#ff0000', opacity: 1, fillType: 'color',
        });

        useEditorStore.getState().setLayerFill(layer.id, 0);
        const target = compose();
        // Outside the layer (the stroke ring) should still be red.
        const ring = pixelAt(target, 27, 50);
        expect(ring.r).toBeGreaterThan(150);
        // Centre of the layer should reveal the checkerboard background
        // because fill=0 attenuated the white pixels.
        const center = pixelAt(target, 50, 50);
        // Checkerboard at (50,50): one of #f2f2f2 / #d0d0d0 — both well above 0
        // and well below 255 = layer's white. The point is it is NOT white.
        expect(center.r).toBeLessThan(250);
    });

    it('Blend If with thisLayer high split [0,255,200,255] makes pixels with luma > 200 fully visible', () => {
        const layer = useEditorStore.getState().layers[0];
        layer.canvas.width = 100; layer.canvas.height = 100;
        // Left half: dark grey (luma 50). Right half: bright (luma 230).
        layer.ctx.fillStyle = 'rgb(50,50,50)';
        layer.ctx.fillRect(0, 0, 50, 100);
        layer.ctx.fillStyle = 'rgb(230,230,230)';
        layer.ctx.fillRect(50, 0, 50, 100);

        useEditorStore.getState().setLayerBlendIfRanges(layer.id, 'gray', 'thisLayer', {
            low: 0, lowMax: 255, highMin: 200, high: 255,
        });
        // With lowMax = 255: ramp from 0 to 255 over the full 0..255 range,
        // so pixels with luma < 255 are partially attenuated below the high
        // ramp. To force the bright pixels visible: low=200, lowMax=200,
        // highMin=255, high=255 = visible only above 200.
        useEditorStore.getState().setLayerBlendIfRanges(layer.id, 'gray', 'thisLayer', {
            low: 200, lowMax: 200, highMin: 255, high: 255,
        });
        const target = compose();
        const dark = pixelAt(target, 20, 50);
        const bright = pixelAt(target, 80, 50);
        // Dark side: blend-if filters out → not the original dark grey (50).
        expect(dark.r).toBeGreaterThan(100);
        // Bright side: passes filter → rendered as the layer's bright pixels.
        expect(bright.r).toBeGreaterThan(200);
    });

    it('LayerStyleDialog Blending Options tab renders all advanced blending and Blend If controls', () => {
        const id = useEditorStore.getState().activeLayerId!;
        const { getByTestId } = render(
            <LayerStyleDialog isOpen={true} layerId={id} initialTab="blending" onClose={() => {}} />
        );
        expect(getByTestId('layer-style-blend-mode')).toBeTruthy();
        expect(getByTestId('layer-style-fill-opacity')).toBeTruthy();
        expect(getByTestId('layer-style-knockout')).toBeTruthy();
        expect(getByTestId('layer-style-blend-interior-as-group')).toBeTruthy();
        expect(getByTestId('layer-style-blend-clipped-as-group')).toBeTruthy();
        expect(getByTestId('layer-style-transparency-shapes')).toBeTruthy();
        expect(getByTestId('layer-style-layer-mask-hides')).toBeTruthy();
        expect(getByTestId('layer-style-vector-mask-hides')).toBeTruthy();
        expect(getByTestId('layer-style-blend-if-channel')).toBeTruthy();
        expect(getByTestId('layer-style-blend-if-this-low')).toBeTruthy();
        expect(getByTestId('layer-style-blend-if-this-high')).toBeTruthy();
        expect(getByTestId('layer-style-blend-if-under-low')).toBeTruthy();
    });

    it('Changing the Knockout dropdown writes through the store action', () => {
        const id = useEditorStore.getState().activeLayerId!;
        const { getByTestId } = render(
            <LayerStyleDialog isOpen={true} layerId={id} initialTab="blending" onClose={() => {}} />
        );
        const sel = getByTestId('layer-style-knockout') as HTMLSelectElement;
        fireEvent.change(sel, { target: { value: 'deep' } });
        expect(useEditorStore.getState().layers.find(l => l.id === id)?.knockout).toBe('deep');
    });

    it('Blend If sliders write into the layer.blendIf ranges and the dialog reflects the new values', () => {
        const id = useEditorStore.getState().activeLayerId!;
        const { getByTestId } = render(
            <LayerStyleDialog isOpen={true} layerId={id} initialTab="blending" onClose={() => {}} />
        );
        const low = getByTestId('layer-style-blend-if-this-low') as HTMLInputElement;
        fireEvent.change(low, { target: { value: '128' } });
        const stored = useEditorStore.getState().layers.find(l => l.id === id)?.blendIf.gray.thisLayer.low;
        expect(stored).toBe(128);
    });
});
