import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { render, cleanup, fireEvent } from '@testing-library/react';
import { useEditorStore } from '../store/editorStore';
import { ensureStubsRegistered } from '../tools/stubs';
import { getTool } from '../tools/registry';
import { layerPixelAt, makeToolPointerEvent } from './simulator';
import { LayersPanel } from '../components/Panels/LayersPanel';

ensureStubsRegistered();

function ctx() {
    return {
        store: useEditorStore.getState(),
        getStore: () => useEditorStore.getState(),
        requestRender: () => { /* noop */ },
    };
}

function resetBackground() {
    useEditorStore.getState().clearHistory();
    useEditorStore.setState((s) => ({
        ...s,
        layers: [],
        activeLayerId: null,
        selectedLayerIds: [],
        layerSelectionAnchorId: null,
        width: 80,
        height: 60,
        secondaryColor: '#ffffff',
    }));
    useEditorStore.getState().newDocument(80, 60, '#ffffff', 'Background Test');
}

describe('07b Background layer', () => {
    beforeEach(resetBackground);
    afterEach(cleanup);

    it('solid new documents create a locked italic Background layer, while transparent documents create a normal layer', () => {
        let layer = useEditorStore.getState().layers[0];
        expect(layer.name).toBe('Background');
        expect(layer.isBackground).toBe(true);
        expect(layer.lockPosition).toBe(true);
        expect(layer.lockTransparency).toBe(true);

        useEditorStore.getState().newDocument(20, 20, 'transparent');
        layer = useEditorStore.getState().layers[0];
        expect(layer.name).toBe('Layer 1');
        expect(layer.isBackground).toBe(false);
        expect(layerPixelAt(layer, 2, 2).a).toBe(0);
    });

    it('the Layers panel disables blend/opacity/fill controls and clicking the Background lock converts to Layer 0', () => {
        const id = useEditorStore.getState().activeLayerId!;
        const { getByTestId, getByTitle } = render(<LayersPanel />);

        expect((getByTestId(`layer-row-${id}`).querySelector('span[style*="italic"]'))).toBeTruthy();
        expect((getByTitle('Convert to normal layer') as HTMLButtonElement)).toBeTruthy();
        expect((document.querySelector('select') as HTMLSelectElement).disabled).toBe(true);
        expect((document.querySelector('input[type="number"]') as HTMLInputElement).disabled).toBe(true);

        fireEvent.click(getByTitle('Convert to normal layer'));

        const layer = useEditorStore.getState().layers[0];
        expect(layer.isBackground).toBe(false);
        expect(layer.name).toBe('Layer 0');
        expect(layer.lockPosition).toBe(false);
        expect(layer.lockTransparency).toBe(false);
    });

    it('Background layers cannot move in the stack and no layer can move below them', () => {
        const store = useEditorStore.getState();
        const backgroundId = store.layers[0].id;
        store.addLayer({ name: 'Layer 1' });
        const topId = useEditorStore.getState().activeLayerId!;

        useEditorStore.getState().reorderLayers(0, 1);
        expect(useEditorStore.getState().layers[0].id).toBe(backgroundId);

        useEditorStore.getState().reorderLayers(1, 0);
        expect(useEditorStore.getState().layers[0].id).toBe(backgroundId);
        expect(useEditorStore.getState().layers[1].id).toBe(topId);
    });

    it('Background layers ignore opacity, fill, blend mode and transparent eraser changes', () => {
        const layer = useEditorStore.getState().layers[0];
        layer.ctx.fillStyle = '#ff0000';
        layer.ctx.fillRect(0, 0, layer.canvas.width, layer.canvas.height);

        useEditorStore.getState().setLayerOpacity(layer.id, 0.25);
        useEditorStore.getState().setLayerFill(layer.id, 0.4);
        useEditorStore.getState().setLayerBlendMode(layer.id, 'multiply');
        expect(layer.opacity).toBe(1);
        expect(layer.fill).toBe(1);
        expect(layer.blendMode).toBe('source-over');

        getTool('magic-eraser')!.onPointerDown!(makeToolPointerEvent({ canvasX: 4, canvasY: 4 }), ctx());
        expect(layerPixelAt(layer, 4, 4).a).toBe(255);
        expect(layerPixelAt(layer, 4, 4).r).toBe(255);
    });

    it('Layer > New > Background from Layer makes the chosen layer the bottom Background layer', () => {
        const store = useEditorStore.getState();
        const oldBackgroundId = store.activeLayerId!;
        store.convertBackgroundLayer(oldBackgroundId);
        store.addLayer({ name: 'Normal' });
        const normalId = useEditorStore.getState().activeLayerId!;

        useEditorStore.getState().backgroundFromLayer(normalId);

        const layers = useEditorStore.getState().layers;
        expect(layers[0].id).toBe(normalId);
        expect(layers[0].name).toBe('Background');
        expect(layers[0].isBackground).toBe(true);
        expect(layers.some(layer => layer.id === oldBackgroundId)).toBe(true);
        expect(layers.find(layer => layer.id === oldBackgroundId)?.isBackground).toBe(false);
    });
});
