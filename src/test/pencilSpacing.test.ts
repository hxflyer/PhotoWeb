import { describe, it, expect, beforeEach } from 'vitest';
import { useEditorStore } from '../store/editorStore';
import { getTool } from '../tools/registry';
import { ensureStubsRegistered } from '../tools/stubs';
import { setPencilOptions } from '../tools/pencil';
import { layerPixelAt, makeToolPointerEvent } from './simulator';

ensureStubsRegistered();

function reset() {
    useEditorStore.setState((s) => ({
        ...s,
        layers: [],
        activeLayerId: null,
        primaryColor: '#0000ff',
        brushSettings: { size: 6, hardness: 1, opacity: 1, flow: 1 },
    }));
    useEditorStore.getState().addLayer();
    setPencilOptions({ spacing: 0.4 });
}

function ctx() {
    return {
        store: useEditorStore.getState(),
        getStore: () => useEditorStore.getState(),
        requestRender: () => {},
    };
}

describe('pencil spacing', () => {
    beforeEach(reset);

    it('small spacing produces a continuous line', () => {
        setPencilOptions({ spacing: 0.1 });
        const tool = getTool('pencil')!;
        tool.onPointerDown!(makeToolPointerEvent({ canvasX: 20, canvasY: 50 }), ctx());
        tool.onPointerMove!(makeToolPointerEvent({ canvasX: 100, canvasY: 50 }), ctx());
        tool.onPointerUp!(makeToolPointerEvent({ canvasX: 100, canvasY: 50 }), ctx());

        const layer = useEditorStore.getState().layers[0];
        // Sample many points along the path; all should be painted.
        let painted = 0;
        for (let x = 25; x <= 95; x += 5) {
            const px = layerPixelAt(layer, x, 50);
            if (px.b === 255) painted++;
        }
        expect(painted).toBeGreaterThanOrEqual(14); // every sample painted
    });

    it('large spacing leaves gaps along the path', () => {
        setPencilOptions({ spacing: 3 });
        const tool = getTool('pencil')!;
        tool.onPointerDown!(makeToolPointerEvent({ canvasX: 20, canvasY: 50 }), ctx());
        tool.onPointerMove!(makeToolPointerEvent({ canvasX: 100, canvasY: 50 }), ctx());
        tool.onPointerUp!(makeToolPointerEvent({ canvasX: 100, canvasY: 50 }), ctx());

        const layer = useEditorStore.getState().layers[0];
        let gaps = 0;
        for (let x = 25; x <= 95; x += 1) {
            const px = layerPixelAt(layer, x, 50);
            if (px.a < 16) gaps++;
        }
        expect(gaps).toBeGreaterThan(20);
    });
});
