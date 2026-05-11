import { describe, it, expect, beforeEach } from 'vitest';
import { useEditorStore } from '../store/editorStore';
import { getTool } from '../tools/registry';
import { ensureStubsRegistered } from '../tools/stubs';
import { setBrushOptions } from '../tools/brush';
import { makeToolPointerEvent, pixelAt } from './simulator';

ensureStubsRegistered();

function reset() {
    useEditorStore.setState((s) => ({
        ...s,
        layers: [],
        activeLayerId: null,
        primaryColor: '#000000',
        brushSettings: { size: 6, hardness: 1, opacity: 1, flow: 1 },
    }));
    useEditorStore.getState().addLayer();
    setBrushOptions({ smoothing: 0, spacing: 0.15, mode: 'source-over', pressureSize: false, pressureOpacity: false });
}

function ctx() {
    return {
        store: useEditorStore.getState(),
        getStore: () => useEditorStore.getState(),
        requestRender: () => {},
    };
}

function paintZigzag() {
    const tool = getTool('brush')!;
    const path = [
        { x: 50, y: 100 }, { x: 60, y: 90 }, { x: 70, y: 110 },
        { x: 80, y: 90 }, { x: 90, y: 110 }, { x: 100, y: 90 },
        { x: 110, y: 110 }, { x: 120, y: 90 }, { x: 130, y: 100 },
    ];
    tool.onPointerDown!(makeToolPointerEvent(makeOpts(path[0])), ctx());
    for (let i = 1; i < path.length; i++) tool.onPointerMove!(makeToolPointerEvent(makeOpts(path[i])), ctx());
    tool.onPointerUp!(makeToolPointerEvent(makeOpts(path[path.length - 1])), ctx());
}

function makeOpts(p: { x: number; y: number }) {
    return { canvasX: p.x, canvasY: p.y };
}

function strokeBoundsHeight(): number {
    const layer = useEditorStore.getState().layers[0];
    let minY = Infinity, maxY = -Infinity;
    for (let y = 0; y < 200; y++) {
        for (let x = 40; x < 140; x++) {
            const px = pixelAt(layer.canvas, x, y);
            if (px.a > 8) {
                if (y < minY) minY = y;
                if (y > maxY) maxY = y;
                break;
            }
        }
    }
    return Math.max(0, maxY - minY);
}

describe('brush smoothing', () => {
    beforeEach(reset);

    it('smoothing 0 produces a noisy zigzag of full vertical extent', () => {
        setBrushOptions({ smoothing: 0 });
        paintZigzag();
        const h = strokeBoundsHeight();
        // The unsmoothed zigzag spans the full +/-10px envelope (~20px tall).
        expect(h).toBeGreaterThan(15);
    });

    it('smoothing 0.95 produces a visibly smoother stroke', () => {
        setBrushOptions({ smoothing: 0.95 });
        paintZigzag();
        const h = strokeBoundsHeight();
        // With heavy smoothing the stroke can't follow the zigzag fully.
        expect(h).toBeLessThan(15);
    });
});
