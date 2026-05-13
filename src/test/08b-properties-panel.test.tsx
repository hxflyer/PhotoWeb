import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { cleanup, fireEvent, render } from '@testing-library/react';
import { Layer } from '../core/Layer';
import { PropertiesPanel } from '../components/Panels/PropertiesPanel';
import { useEditorStore } from '../store/editorStore';
import { ensureStubsRegistered } from '../tools/stubs';
import { commitTypeLayer, defaultTextStyle, type TypeLayerData } from '../tools/type';

ensureStubsRegistered();

function reset(width = 80, height = 60) {
    useEditorStore.getState().clearHistory();
    useEditorStore.setState((s) => ({
        ...s,
        layers: [],
        activeLayerId: null,
        selectedLayerIds: [],
        layerSelectionAnchorId: null,
        activeTool: 'move',
        width,
        height,
        resolution: 72,
        dialogs: {
            ...s.dialogs,
            isImageSizeOpen: false,
            isTrimOpen: false,
        },
    }));
}

function installLayer(layer: Layer) {
    useEditorStore.setState((s) => ({
        ...s,
        layers: [layer],
        activeLayerId: layer.id,
        selectedLayerIds: [layer.id],
        layerSelectionAnchorId: layer.id,
    }));
}

function pixelAlpha(layer: Layer, x: number, y: number): number {
    return layer.ctx.getImageData(x, y, 1, 1).data[3];
}

afterEach(() => cleanup());

describe('08b Properties panel contextual layer controls', () => {
    beforeEach(() => reset());

    it('shows Background document properties and quick actions', () => {
        const bg = new Layer(80, 60, 'Background');
        bg.isBackground = true;
        bg.ctx.fillStyle = '#ffffff';
        bg.ctx.fillRect(0, 0, 80, 60);
        bg.markDirty(null);
        installLayer(bg);

        const { getByTestId } = render(<PropertiesPanel />);
        expect(getByTestId('properties-document-size').textContent).toContain('80 × 60 px');

        fireEvent.click(getByTestId('properties-background-image-size'));
        expect(useEditorStore.getState().dialogs.isImageSizeOpen).toBe(true);

        fireEvent.click(getByTestId('properties-background-crop'));
        expect(useEditorStore.getState().activeTool).toBe('crop');

        fireEvent.click(getByTestId('properties-background-trim'));
        expect(useEditorStore.getState().dialogs.isTrimOpen).toBe(true);

        fireEvent.click(getByTestId('properties-background-rotate'));
        expect(useEditorStore.getState().width).toBe(60);
        expect(useEditorStore.getState().height).toBe(80);
    });

    it('edits raster pixel-layer transform fields through undoable layer-content commands', () => {
        const layer = new Layer(80, 60, 'Pixels');
        layer.ctx.fillStyle = '#ff0000';
        layer.ctx.fillRect(10, 5, 4, 4);
        layer.markDirty(null);
        installLayer(layer);

        const { getByTestId } = render(<PropertiesPanel />);
        fireEvent.change(getByTestId('properties-pixel-x'), { target: { value: '20' } });
        let current = useEditorStore.getState().layers[0];
        expect(pixelAlpha(current, 10, 5)).toBe(0);
        expect(pixelAlpha(current, 20, 5)).toBe(255);

        fireEvent.change(getByTestId('properties-pixel-width'), { target: { value: '8' } });
        current = useEditorStore.getState().layers[0];
        expect(pixelAlpha(current, 27, 5)).toBe(255);

        fireEvent.click(getByTestId('properties-pixel-flip-horizontal'));
        expect(useEditorStore.getState().currentHistoryIndex).toBeGreaterThan(0);
    });

    it('aligns a single raster layer to the canvas from Properties', () => {
        const layer = new Layer(80, 60, 'Pixels');
        layer.ctx.fillStyle = '#00ff00';
        layer.ctx.fillRect(0, 0, 10, 10);
        layer.markDirty(null);
        installLayer(layer);

        const { getByTestId } = render(<PropertiesPanel />);
        fireEvent.click(getByTestId('properties-align-canvas-h-center'));
        fireEvent.click(getByTestId('properties-align-canvas-v-center'));

        const current = useEditorStore.getState().layers[0];
        expect(pixelAlpha(current, 35, 25)).toBe(255);
        expect(pixelAlpha(current, 0, 0)).toBe(0);
    });

    it('exposes type transform, Character, Paragraph, Type Options, and Convert to Shape', () => {
        const layer = new Layer(200, 120, 'Type layer', 'type');
        const typeData: TypeLayerData = {
            id: 'type-08b',
            text: 'Props',
            style: { ...defaultTextStyle, fontSize: 24, color: '#ff0000' },
            orientation: 'horizontal',
            transform: { x: 10, y: 20, width: 120, height: 50, rotation: 0 },
            textMode: 'box',
            targetLayerId: layer.id,
        };
        commitTypeLayer(layer.canvas, typeData);
        layer.typeData = typeData;
        useEditorStore.setState((s) => ({
            ...s,
            width: 200,
            height: 120,
            layers: [layer],
            activeLayerId: layer.id,
            selectedLayerIds: [layer.id],
            layerSelectionAnchorId: layer.id,
        }));

        const { getByTestId } = render(<PropertiesPanel />);
        fireEvent.change(getByTestId('properties-type-x'), { target: { value: '30' } });
        fireEvent.change(getByTestId('properties-type-tracking'), { target: { value: '40' } });
        fireEvent.click(getByTestId('properties-type-all-caps'));
        fireEvent.change(getByTestId('properties-type-indent-left'), { target: { value: '12' } });
        fireEvent.change(getByTestId('properties-type-antialias'), { target: { value: 'smooth' } });

        let current = useEditorStore.getState().layers[0];
        const updatedType = current.typeData as TypeLayerData;
        expect(updatedType.transform.x).toBe(30);
        expect(updatedType.style.letterSpacing).toBe(40);
        expect(updatedType.style.allCaps).toBe(true);
        expect(updatedType.style.indentLeft).toBe(12);
        expect(updatedType.style.antiAlias).toBe('smooth');

        fireEvent.click(getByTestId('properties-type-convert-shape'));
        current = useEditorStore.getState().layers[0];
        expect(current.kind).toBe('shape');
        expect((current.shapeData as { kind?: string } | null)?.kind).toBe('custom');
    });
});
