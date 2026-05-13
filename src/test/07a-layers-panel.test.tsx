import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { render, cleanup, fireEvent } from '@testing-library/react';
import { useEditorStore } from '../store/editorStore';
import { ensureStubsRegistered } from '../tools/stubs';
import App from '../App';
import { LayersPanel } from '../components/Panels/LayersPanel';

ensureStubsRegistered();

function resetLayers() {
    useEditorStore.getState().clearHistory();
    useEditorStore.setState((s) => ({
        ...s,
        layers: [],
        activeLayerId: null,
        selectedLayerIds: [],
        layerSelectionAnchorId: null,
        width: 120,
        height: 90,
        dialogs: {
            ...s.dialogs,
            isNewLayerDialogOpen: false,
        },
    }));
    localStorage.clear();
    useEditorStore.getState().addLayer({ insert: 'top', name: 'Base' });
}

describe('07a Layers panel Photoshop habits', () => {
    beforeEach(resetLayers);
    afterEach(cleanup);

    it('Shift+Cmd+N opens New Layer dialog and creates a named layer with settings', () => {
        const before = useEditorStore.getState().layers.length;
        const { getByTestId } = render(<App />);

        fireEvent.keyDown(window, { key: 'n', metaKey: true, shiftKey: true });

        expect(getByTestId('new-layer-dialog')).toBeTruthy();
        fireEvent.change(getByTestId('new-layer-name'), { target: { value: 'Retouch' } });
        fireEvent.change(getByTestId('new-layer-mode'), { target: { value: 'multiply' } });
        fireEvent.change(getByTestId('new-layer-opacity'), { target: { value: '65' } });
        fireEvent.change(getByTestId('new-layer-fill'), { target: { value: '40' } });
        fireEvent.click(getByTestId('new-layer-ok'));

        const layer = useEditorStore.getState().layers.at(-1)!;
        expect(useEditorStore.getState().layers.length).toBe(before + 1);
        expect(layer.name).toBe('Retouch');
        expect(layer.blendMode).toBe('multiply');
        expect(layer.opacity).toBeCloseTo(0.65);
        expect(layer.fill).toBeCloseTo(0.4);
    });

    it('Shift+Cmd+Option+N bypasses the dialog and adds a generic layer', () => {
        const before = useEditorStore.getState().layers.length;
        const { queryByTestId } = render(<App />);

        fireEvent.keyDown(window, { key: 'n', metaKey: true, shiftKey: true, altKey: true });

        expect(queryByTestId('new-layer-dialog')).toBeNull();
        expect(useEditorStore.getState().layers.length).toBe(before + 1);
        expect(useEditorStore.getState().layers.at(-1)?.name).toMatch(/^Layer /);
    });

    it('Cmd+brackets moves the active layer through the stack and Shift jumps to the end', () => {
        const store = useEditorStore.getState();
        store.addLayer({ name: 'Middle' });
        const middleId = useEditorStore.getState().activeLayerId!;
        store.addLayer({ name: 'Top' });
        store.setActiveLayer(middleId);
        render(<App />);

        fireEvent.keyDown(window, { key: ']', metaKey: true });
        expect(useEditorStore.getState().layers.at(-1)?.id).toBe(middleId);

        fireEvent.keyDown(window, { key: '[', metaKey: true, shiftKey: true });
        expect(useEditorStore.getState().layers[0].id).toBe(middleId);
    });

    it('semicolon toggles the active layer visibility eye', () => {
        const id = useEditorStore.getState().activeLayerId!;
        render(<App />);

        fireEvent.keyDown(window, { key: ';' });

        expect(useEditorStore.getState().layers.find(layer => layer.id === id)?.visible).toBe(false);
    });

    it('Layers Panel Options can turn preview thumbnails off', () => {
        const id = useEditorStore.getState().activeLayerId!;
        const { getByTestId, queryByTestId } = render(<LayersPanel />);
        expect(getByTestId(`layer-thumb-${id}`)).toBeTruthy();

        fireEvent.click(getByTestId('layers-panel-flyout'));
        fireEvent.click(getByTestId('panel-flyout-item-panel-options'));
        fireEvent.click(getByTestId('layers-panel-thumbnail-none'));
        fireEvent.click(getByTestId('layers-panel-options-ok'));

        expect(queryByTestId(`layer-thumb-${id}`)).toBeNull();
    });

    it('Option-clicking the New Layer button opens the dialog; plain click adds above the active layer', () => {
        const id = useEditorStore.getState().activeLayerId!;
        const { getByTitle, getByTestId } = render(<LayersPanel />);

        fireEvent.click(getByTitle('New Layer'), { altKey: true });
        expect(useEditorStore.getState().dialogs.isNewLayerDialogOpen).toBe(true);

        useEditorStore.getState().closeNewLayerDialog();
        const before = useEditorStore.getState().layers.length;
        fireEvent.click(getByTitle('New Layer'));

        const layers = useEditorStore.getState().layers;
        expect(layers.length).toBe(before + 1);
        expect(layers.findIndex(layer => layer.id === layers.at(-1)?.id)).toBeGreaterThan(layers.findIndex(layer => layer.id === id));
        expect(getByTestId(`layer-row-${layers.at(-1)!.id}`)).toBeTruthy();
    });
});
