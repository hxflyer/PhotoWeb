import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import App from '../App';
import { Canvas2DCompositor } from '../compositor/Canvas2DCompositor';
import { LayersPanel } from '../components/Panels/LayersPanel';
import { useEditorStore } from '../store/editorStore';
import { ensureStubsRegistered } from '../tools/stubs';
import { defaultTextStyle, type TypeLayerData } from '../tools/type';
import { pixelAt } from './simulator';

ensureStubsRegistered();

function reset() {
    localStorage.clear();
    useEditorStore.getState().clearHistory();
    useEditorStore.setState((s) => ({
        ...s,
        layers: [],
        activeLayerId: null,
        selectedLayerIds: [],
        layerSelectionAnchorId: null,
        width: 80,
        height: 60,
        activeTool: 'move',
        dialogs: { ...s.dialogs, isNewLayerDialogOpen: false },
    }));
}

function makeClippingPair() {
    const store = useEditorStore.getState();
    store.addLayer({ name: 'Text Mask' });
    const base = useEditorStore.getState().layers[0];
    base.kind = 'type';
    base.typeData = {
        id: 'clip-type',
        text: 'SNOW',
        style: { ...defaultTextStyle, color: '#000000', fontSize: 28 },
        orientation: 'horizontal',
        textMode: 'point',
        transform: { x: 20, y: 15, width: 28, height: 28, rotation: 0 },
        bounds: { x: 20, y: 15, w: 28, h: 28 },
        targetLayerId: base.id,
    } satisfies TypeLayerData;
    base.ctx.clearRect(0, 0, 80, 60);
    base.ctx.fillStyle = '#000000';
    base.ctx.fillRect(20, 15, 28, 28);
    base.markDirty(null);

    useEditorStore.getState().addLayer({ name: 'Photo' });
    const photo = useEditorStore.getState().layers[1];
    photo.ctx.fillStyle = '#ff0000';
    photo.ctx.fillRect(0, 0, 80, 60);
    photo.markDirty(null);
    return { base, photo };
}

function compose(): HTMLCanvasElement {
    const target = document.createElement('canvas');
    target.width = 80;
    target.height = 60;
    const compositor = new Canvas2DCompositor();
    const state = useEditorStore.getState();
    compositor.render({
        layers: state.layers,
        activeLayerId: state.activeLayerId,
        viewport: { width: 80, height: 60, zoom: 1, pan: { x: 0, y: 0 } },
        target,
        globalLight: state.globalLight,
    });
    return target;
}

describe('18 clipping masks', () => {
    beforeEach(reset);
    afterEach(cleanup);

    it('clips the upper layer to non-transparent pixels on the layer below', () => {
        const { photo } = makeClippingPair();
        useEditorStore.getState().createClippingMask(photo.id);

        const target = compose();
        const inside = pixelAt(target, 25, 20);
        const outside = pixelAt(target, 5, 5);

        expect(inside.r).toBeGreaterThan(200);
        expect(inside.g).toBeLessThan(80);
        expect(outside.r).toBeLessThan(250);
        expect(outside.g).toBeGreaterThan(180);
        expect(useEditorStore.getState().layers[0].kind).toBe('type');
        expect(useEditorStore.getState().layers[0].typeData).toBeTruthy();
    });

    it('Layer menu and Cmd+Alt+G toggle create and release clipping mask', () => {
        const { photo } = makeClippingPair();
        render(<App />);

        fireEvent.mouseDown(screen.getAllByText('Layer')[0]);
        fireEvent.click(screen.getByText('Create Clipping Mask'));
        expect(useEditorStore.getState().layers.find(l => l.id === photo.id)?.clippedToBelow).toBe(true);

        fireEvent.keyDown(window, { key: 'g', metaKey: true, altKey: true });
        expect(useEditorStore.getState().layers.find(l => l.id === photo.id)?.clippedToBelow).toBe(false);
    });

    it('Alt-clicking the layer row toggles clipping and shows the Layers panel indicator', () => {
        const { photo } = makeClippingPair();
        const { getByTestId, queryByTestId } = render(<LayersPanel />);

        fireEvent.click(getByTestId(`layer-row-${photo.id}`), { altKey: true });

        expect(useEditorStore.getState().layers.find(l => l.id === photo.id)?.clippedToBelow).toBe(true);
        expect(getByTestId(`layer-row-${photo.id}`).getAttribute('data-layer-clipped')).toBe('true');
        expect(getByTestId(`layer-clipping-indicator-${photo.id}`)).toBeTruthy();

        fireEvent.click(getByTestId(`layer-row-${photo.id}`), { altKey: true });
        expect(useEditorStore.getState().layers.find(l => l.id === photo.id)?.clippedToBelow).toBe(false);
        expect(queryByTestId(`layer-clipping-indicator-${photo.id}`)).toBeNull();
    });
});
