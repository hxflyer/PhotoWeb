import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { cleanup, fireEvent, render } from '@testing-library/react';
import { Layer } from '../core/Layer';
import { DocumentTab } from '../components/layout/DocumentTab';
import { useEditorStore } from '../store/editorStore';
import { ensureStubsRegistered } from '../tools/stubs';

ensureStubsRegistered();

function reset() {
    useEditorStore.getState().clearHistory();
    useEditorStore.setState((s) => ({
        ...s,
        layers: [],
        activeLayerId: null,
        selectedLayerIds: [],
        layerSelectionAnchorId: null,
        activeDocumentId: null,
        openDocuments: [],
        documentName: '',
        width: 0,
        height: 0,
        isDirty: false,
        transferLayerClipboard: null,
    }));
}

function paintActiveLayer(color: string, x = 0, y = 0, size = 8) {
    const layer = useEditorStore.getState().layers.at(-1)!;
    layer.ctx.fillStyle = color;
    layer.ctx.fillRect(x, y, size, size);
    layer.markDirty(null);
}

function addSourceLayer(name: string, color: string) {
    const layer = new Layer(useEditorStore.getState().width, useEditorStore.getState().height, name);
    layer.ctx.fillStyle = color;
    layer.ctx.fillRect(2, 2, 8, 8);
    layer.markDirty(null);
    useEditorStore.setState((s) => ({
        ...s,
        layers: [...s.layers, layer],
        activeLayerId: layer.id,
        selectedLayerIds: [layer.id],
        layerSelectionAnchorId: layer.id,
    }));
    return layer;
}

afterEach(() => cleanup());

describe('08c moving layers between documents', () => {
    beforeEach(reset);

    it('keeps multiple open documents and switches through the document tabs', () => {
        useEditorStore.getState().newDocument(32, 24, '#ffffff', 'Portrait');
        const firstId = useEditorStore.getState().activeDocumentId!;
        paintActiveLayer('#ff0000');
        useEditorStore.getState().newDocument(32, 24, '#ffffff', 'Texture');
        const secondId = useEditorStore.getState().activeDocumentId!;

        expect(useEditorStore.getState().openDocuments.map(doc => doc.name)).toEqual(['Portrait', 'Texture']);
        expect(useEditorStore.getState().documentName).toBe('Texture');

        const { getByTestId } = render(<DocumentTab />);
        fireEvent.click(getByTestId(`document-tab-${firstId}`));

        expect(useEditorStore.getState().activeDocumentId).toBe(firstId);
        expect(useEditorStore.getState().documentName).toBe('Portrait');
        expect(useEditorStore.getState().openDocuments.some(doc => doc.id === secondId)).toBe(true);
    });

    it('duplicates the active layer into another open document destination', () => {
        useEditorStore.getState().newDocument(32, 24, '#ffffff', 'Portrait');
        const portraitId = useEditorStore.getState().activeDocumentId!;
        useEditorStore.getState().newDocument(32, 24, '#ffffff', 'Texture');
        const texture = addSourceLayer('Texture Layer', '#0000ff');

        useEditorStore.getState().duplicateLayerToDocument(texture.id, portraitId, 'Texture copy');
        useEditorStore.getState().switchDocument(portraitId);

        const state = useEditorStore.getState();
        expect(state.documentName).toBe('Portrait');
        expect(state.layers.map(layer => layer.name)).toContain('Texture copy');
        const copied = state.layers.find(layer => layer.name === 'Texture copy')!;
        expect(copied.ctx.getImageData(2, 2, 1, 1).data[2]).toBe(255);
    });

    it('copies a layer internally and pastes it into the active destination document', () => {
        useEditorStore.getState().newDocument(40, 30, '#ffffff', 'Source');
        const pastedSource = addSourceLayer('Copied Layer', '#00ff00');
        expect(useEditorStore.getState().activeLayerId).toBe(pastedSource.id);
        expect(useEditorStore.getState().copyActiveLayerForTransfer()).toBe(true);

        useEditorStore.getState().newDocument(40, 30, '#ffffff', 'Destination');
        expect(useEditorStore.getState().pasteTransferredLayer()).toBe(true);

        const pasted = useEditorStore.getState().layers.find(layer => layer.name === 'Copied Layer')!;
        expect(pasted).toBeTruthy();
        expect(pasted.ctx.getImageData(2, 2, 1, 1).data[1]).toBe(255);
    });

    it('records Window > Arrange state for tabbed and 2-up workflows', () => {
        expect(useEditorStore.getState().documentLayout).toBe('tabs');
        useEditorStore.getState().arrangeDocuments('2-up-vertical');
        expect(useEditorStore.getState().documentLayout).toBe('2-up-vertical');
        useEditorStore.getState().arrangeDocuments('tabs');
        expect(useEditorStore.getState().documentLayout).toBe('tabs');
    });
});
