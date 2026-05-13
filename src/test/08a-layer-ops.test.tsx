import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, cleanup, fireEvent } from '@testing-library/react';
import App from '../App';
import { OptionsBar } from '../components/Panels/OptionsBar';
import { LayersPanel } from '../components/Panels/LayersPanel';
import { Layer } from '../core/Layer';
import { useEditorStore } from '../store/editorStore';
import { ensureStubsRegistered } from '../tools/stubs';

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
        zoom: 1,
    }));
}

function makeLayer(name: string, x: number, y: number, color: string): Layer {
    const layer = new Layer(80, 60, name);
    layer.ctx.fillStyle = color;
    layer.ctx.fillRect(x, y, 4, 4);
    layer.markDirty(null);
    return layer;
}

function pixelAt(layer: Layer, x: number, y: number) {
    return layer.ctx.getImageData(x, y, 1, 1).data;
}

afterEach(() => cleanup());

describe('08a layer operations', () => {
    beforeEach(() => reset());

    it('Cmd+G groups the selected layers instead of creating only an empty group', () => {
        const first = makeLayer('First', 5, 5, '#ff0000');
        const second = makeLayer('Second', 20, 5, '#00ff00');
        useEditorStore.setState((s) => ({
            ...s,
            layers: [first, second],
            activeLayerId: second.id,
            selectedLayerIds: [first.id, second.id],
            layerSelectionAnchorId: first.id,
        }));

        render(<App />);
        fireEvent.keyDown(window, { key: 'g', metaKey: true });

        const state = useEditorStore.getState();
        const group = state.layers.find(layer => layer.kind === 'group');
        expect(group).toBeTruthy();
        expect(state.layers.find(layer => layer.id === first.id)?.parentId).toBe(group?.id);
        expect(state.layers.find(layer => layer.id === second.id)?.parentId).toBe(group?.id);
    });

    it('semicolon toggles active layer visibility exactly once', () => {
        const layer = makeLayer('Visible', 5, 5, '#ff0000');
        useEditorStore.setState((s) => ({
            ...s,
            layers: [layer],
            activeLayerId: layer.id,
            selectedLayerIds: [layer.id],
            layerSelectionAnchorId: layer.id,
        }));

        render(<App />);
        fireEvent.keyDown(window, { key: ';' });

        expect(useEditorStore.getState().layers[0].visible).toBe(false);
    });

    it('Move Tool options expose align and distribute buttons that act on selected layers', () => {
        const left = makeLayer('Left', 10, 5, '#ff0000');
        const middle = makeLayer('Middle', 25, 5, '#00ff00');
        const right = makeLayer('Right', 50, 5, '#0000ff');
        useEditorStore.setState((s) => ({
            ...s,
            layers: [left, middle, right],
            selectedLayerIds: [left.id, middle.id, right.id],
            activeLayerId: right.id,
            layerSelectionAnchorId: left.id,
        }));

        const { getByTestId } = render(<OptionsBar />);
        fireEvent.click(getByTestId('move-distribute-horizontal-center'));
        const distributedMiddle = useEditorStore.getState().layers.find(layer => layer.id === middle.id)!;
        expect(pixelAt(distributedMiddle, 25, 5)[3]).toBe(0);
        expect(pixelAt(distributedMiddle, 30, 5)[3]).toBe(255);

        fireEvent.click(getByTestId('move-align-left'));
        const movedRight = useEditorStore.getState().layers.find(layer => layer.id === right.id)!;
        expect(pixelAt(movedRight, 10, 5)[3]).toBe(255);
    });

    it('Alt-dragging an fx badge copies all effects to the dropped-on layer', () => {
        const source = makeLayer('Source', 5, 5, '#ff0000');
        const target = makeLayer('Target', 20, 5, '#00ff00');
        useEditorStore.setState((s) => ({
            ...s,
            layers: [source, target],
            activeLayerId: target.id,
            selectedLayerIds: [target.id],
            layerSelectionAnchorId: target.id,
        }));
        useEditorStore.getState().addLayerEffect(source.id, 'drop-shadow');
        useEditorStore.getState().setLayerEffectParams(source.id, 0, { color: '#123456', size: 12 });

        const { getByTestId } = render(<LayersPanel />);
        const dataTransfer = {
            effectAllowed: 'copy',
            dropEffect: 'copy',
            setData: vi.fn(),
            getData: vi.fn(),
        };

        fireEvent.dragStart(getByTestId(`layer-fx-${source.id}`), { altKey: true, dataTransfer });
        fireEvent.dragOver(getByTestId(`layer-row-${target.id}`), { dataTransfer });
        fireEvent.drop(getByTestId(`layer-row-${target.id}`), { dataTransfer });

        const copied = useEditorStore.getState().layers.find(layer => layer.id === target.id)!;
        expect(copied.effects).toHaveLength(1);
        expect(copied.effects[0].kind).toBe('drop-shadow');
        expect(copied.effects[0].params.color).toBe('#123456');
        expect(copied.effects[0].params.size).toBe(12);
    });
});
