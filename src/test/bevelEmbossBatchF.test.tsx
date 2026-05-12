import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { render, cleanup, fireEvent } from '@testing-library/react';
import { useEditorStore } from '../store/editorStore';
import { ensureStubsRegistered } from '../tools/stubs';
import { Canvas2DCompositor } from '../compositor/Canvas2DCompositor';
import { pixelAt } from './simulator';
import { LayerStyleDialog } from '../components/Dialogs/LayerStyleDialog';
import { applyBevelContour, type ContourName } from '../effects/bevelEmboss';

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

describe('Bevel & Emboss completeness (Batch F)', () => {
    beforeEach(reset);
    afterEach(cleanup);

    it('exposes a globalLight field on the document store with default angle/altitude', () => {
        const { globalLight } = useEditorStore.getState();
        expect(globalLight.angle).toBe(120);
        expect(globalLight.altitude).toBe(30);
    });

    it('setGlobalLight updates the document and clamps altitude into 0..90', () => {
        useEditorStore.getState().setGlobalLight({ angle: 45, altitude: 200 });
        expect(useEditorStore.getState().globalLight.angle).toBe(45);
        expect(useEditorStore.getState().globalLight.altitude).toBe(90);
    });

    it('applyBevelContour returns Photoshop-like curves for the four required contour names', () => {
        const names: ContourName[] = ['linear', 'half-round', 'cone', 'cone-inverted'];
        for (const n of names) {
            expect(applyBevelContour(0, n)).toBeCloseTo(n === 'cone-inverted' ? 1 : 0, 1);
            expect(applyBevelContour(1, n)).toBeCloseTo(n === 'cone' ? 0 : 1, 1);
        }
        // Cone peaks at 0.5
        expect(applyBevelContour(0.5, 'cone')).toBeCloseTo(1, 5);
        // Cone-inverted dips at 0.5
        expect(applyBevelContour(0.5, 'cone-inverted')).toBeCloseTo(0, 5);
    });

    it('Bevel & Emboss with Technique=Chisel Hard produces a hard-edged highlight/shadow transition', () => {
        const layer = useEditorStore.getState().layers[0];
        layer.canvas.width = 100; layer.canvas.height = 100;
        layer.ctx.fillStyle = '#808080';
        layer.ctx.fillRect(20, 20, 60, 60);

        useEditorStore.getState().addLayerEffect(layer.id, 'bevel-emboss');
        useEditorStore.getState().setLayerEffectParams(layer.id, 0, {
            style: 'inner-bevel', technique: 'chisel-hard', size: 8, depth: 200,
            angle: 90, altitude: 30, useGlobalLight: false,
            highlightOpacity: 1, shadowOpacity: 1,
        });
        const target = compose();
        // The chisel hard ridge produces a sharp band of altered pixels near
        // distance = size/2 from the edge. Scan the column above the centre
        // and verify at least one pixel differs from the deep interior.
        const interior = pixelAt(target, 50, 50);
        const baseSum = interior.r + interior.g + interior.b;
        let foundRidge = false;
        for (let y = 21; y <= 28; y++) {
            const px = pixelAt(target, 50, y);
            if (px.r + px.g + px.b !== baseSum) { foundRidge = true; break; }
        }
        expect(foundRidge).toBe(true);
    });

    it('Use Global Light: changing globalLight propagates to a bevel effect with useGlobalLight=true', () => {
        const layer = useEditorStore.getState().layers[0];
        layer.canvas.width = 100; layer.canvas.height = 100;
        layer.ctx.fillStyle = '#888888';
        layer.ctx.fillRect(10, 10, 80, 80);

        useEditorStore.getState().addLayerEffect(layer.id, 'bevel-emboss');
        useEditorStore.getState().setLayerEffectParams(layer.id, 0, {
            style: 'inner-bevel', technique: 'smooth', size: 6, depth: 200,
            angle: 0, altitude: 30, useGlobalLight: true,
            highlightOpacity: 1, shadowOpacity: 1,
        });

        useEditorStore.getState().setGlobalLight({ angle: 0, altitude: 30 });
        const target0 = compose();
        const right0 = pixelAt(target0, 88, 50);

        useEditorStore.getState().setGlobalLight({ angle: 180, altitude: 30 });
        const target180 = compose();
        const right180 = pixelAt(target180, 88, 50);

        // Flipping global light direction should change pixels in the bevel
        // band on the right edge from one shading regime to the other.
        const diff = Math.abs(right0.r - right180.r) + Math.abs(right0.g - right180.g) + Math.abs(right0.b - right180.b);
        expect(diff).toBeGreaterThan(2);
    });

    it('LayerStyleDialog Bevel tab exposes Technique, Gloss Contour, and Texture sub-section controls', () => {
        const id = useEditorStore.getState().activeLayerId!;
        useEditorStore.getState().addLayerEffect(id, 'bevel-emboss');
        const { getByTestId } = render(
            <LayerStyleDialog isOpen={true} layerId={id} initialTab="bevel-emboss" onClose={() => {}} />
        );
        expect(getByTestId('effect-0-technique')).toBeTruthy();
        expect(getByTestId('effect-0-glossContour')).toBeTruthy();
        expect(getByTestId('effect-0-contour')).toBeTruthy();
        expect(getByTestId('effect-0-texture-enabled')).toBeTruthy();
        expect(getByTestId('effect-0-texture-scale')).toBeTruthy();
        expect(getByTestId('effect-0-texture-depth')).toBeTruthy();

        // Toggling Technique to chisel-hard writes through the store.
        const select = getByTestId('effect-0-technique') as HTMLSelectElement;
        fireEvent.change(select, { target: { value: 'chisel-hard' } });
        const layer = useEditorStore.getState().layers.find(l => l.id === id)!;
        expect((layer.effects[0].params as { technique: string }).technique).toBe('chisel-hard');
    });

    it('Texture enabled with a pattern modulates the bevel height-field (visible delta vs. disabled)', () => {
        const layer = useEditorStore.getState().layers[0];
        layer.canvas.width = 100; layer.canvas.height = 100;
        layer.ctx.fillStyle = '#999';
        layer.ctx.fillRect(20, 20, 60, 60);
        useEditorStore.getState().addLayerEffect(layer.id, 'bevel-emboss');
        // Texture disabled.
        useEditorStore.getState().setLayerEffectParams(layer.id, 0, {
            style: 'inner-bevel', technique: 'smooth', size: 8, depth: 400, soften: 0,
            angle: 135, altitude: 30, useGlobalLight: false,
            highlightOpacity: 1, shadowOpacity: 1,
            texture: { enabled: false, patternId: '', scale: 100, depth: 1, invert: false, linkWithLayer: true },
        });
        // Sample across a row inside the top bevel band to capture variation.
        const aRow: number[] = [];
        const targetA = compose();
        for (let x = 22; x <= 50; x++) aRow.push(pixelAt(targetA, x, 24).r);
        // Texture enabled — the synthesized checkerboard fallback creates a
        // pattern of bumps that alters the bevel shading along the band.
        useEditorStore.getState().setLayerEffectParams(layer.id, 0, {
            texture: { enabled: true, patternId: 'fallback', scale: 100, depth: 1, invert: false, linkWithLayer: true },
        });
        const bRow: number[] = [];
        const targetB = compose();
        for (let x = 22; x <= 50; x++) bRow.push(pixelAt(targetB, x, 24).r);
        // At least one pixel in the band must differ once the texture is on.
        let anyDiff = false;
        for (let i = 0; i < aRow.length; i++) if (aRow[i] !== bRow[i]) { anyDiff = true; break; }
        expect(anyDiff).toBe(true);
    });
});
