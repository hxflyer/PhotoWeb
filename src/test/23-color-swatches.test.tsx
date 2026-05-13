import { cleanup, fireEvent, render } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { useEditorStore } from '../store/editorStore';
import { Layer } from '../core/Layer';
import { OptionsBar } from '../components/Panels/OptionsBar';
import { SwatchesPanel } from '../components/Panels/SwatchesPanel';
import { getTool } from '../tools/registry';
import { ensureStubsRegistered } from '../tools/stubs';
import { getEyedropperOptions, setEyedropperOptions } from '../tools/eyedropper';
import { getFilter } from '../filters/registry';
import '../filters/index';
import { makeToolPointerEvent } from './simulator';

ensureStubsRegistered();

function resetStore() {
    const layer = new Layer(6, 6, 'Background');
    useEditorStore.setState((state) => ({
        ...state,
        width: 6,
        height: 6,
        layers: [layer],
        activeLayerId: layer.id,
        selectedLayerIds: [layer.id],
        activeTool: 'eyedropper',
        primaryColor: '#000000',
        secondaryColor: '#ffffff',
        swatches: [],
        swatchGroups: [{
            id: 'test-group',
            name: 'Test Group',
            collapsed: false,
            swatches: [],
        }],
        selectedSwatchGroupId: 'test-group',
    }));
    useEditorStore.getState().clearHistory();
    setEyedropperOptions({ sampleSize: 1, sample: 'current-layer' });
}

function toolCtx() {
    return {
        store: useEditorStore.getState(),
        getStore: () => useEditorStore.getState(),
        requestRender: () => {},
    };
}

afterEach(() => {
    cleanup();
});

describe('23 color swatches and eyedropper', () => {
    beforeEach(resetStore);

    it('wires Eyedropper Options Bar sample size and source into the tool options', () => {
        const { getByTestId } = render(<OptionsBar />);

        fireEvent.change(getByTestId('eyedropper-sample-size'), { target: { value: '5' } });
        fireEvent.change(getByTestId('eyedropper-sample-source'), { target: { value: 'all-layers' } });

        expect(getEyedropperOptions()).toMatchObject({ sampleSize: 5, sample: 'all-layers' });
    });

    it('samples averaged color and Alt samples into the background color', () => {
        const layer = useEditorStore.getState().layers[0];
        layer.ctx.fillStyle = '#ff0000';
        layer.ctx.fillRect(1, 1, 1, 1);
        layer.ctx.fillStyle = '#00ff00';
        layer.ctx.fillRect(2, 1, 1, 1);
        layer.ctx.fillStyle = '#0000ff';
        layer.ctx.fillRect(1, 2, 1, 1);
        layer.ctx.fillStyle = '#ffffff';
        layer.ctx.fillRect(2, 2, 1, 1);
        setEyedropperOptions({ sampleSize: 3 });

        getTool('eyedropper')!.onPointerDown!(makeToolPointerEvent({ canvasX: 2, canvasY: 2 }), toolCtx());
        expect(useEditorStore.getState().primaryColor).toBe('#808080');

        getTool('eyedropper')!.onPointerDown!(makeToolPointerEvent({ canvasX: 2, canvasY: 2, modifiers: { alt: true } }), toolCtx());
        expect(useEditorStore.getState().secondaryColor).toBe('#808080');
    });

    it('keeps swatches in groups and uses Cmd/Ctrl-click for background color', () => {
        useEditorStore.getState().addSwatch('#112233', 'Ink');
        useEditorStore.getState().addSwatch('#445566', 'Shadow');
        const { getByTestId } = render(<SwatchesPanel />);

        fireEvent.click(getByTestId('swatch-test-group-0'));
        expect(useEditorStore.getState().primaryColor).toBe('#112233');

        fireEvent.click(getByTestId('swatch-test-group-1'), { metaKey: true });
        expect(useEditorStore.getState().secondaryColor).toBe('#445566');
    });

    it('Cmd/Ctrl-clicking a group arrow collapses all swatch groups', () => {
        useEditorStore.getState().addSwatchGroup('Second Group');
        const firstGroup = useEditorStore.getState().swatchGroups[0].id;
        const { getByTestId } = render(<SwatchesPanel />);

        fireEvent.click(getByTestId(`swatch-group-toggle-${firstGroup}`), { metaKey: true });
        expect(useEditorStore.getState().swatchGroups.every(group => group.collapsed)).toBe(true);
    });

    it('registers Filter > Pixelate > Mosaic behavior by averaging each cell', () => {
        const filter = getFilter('pixelate-mosaic');
        expect(filter?.label).toBe('Mosaic');
        const image = new ImageData(2, 2);
        image.data.set([
            255, 0, 0, 255,
            0, 255, 0, 255,
            0, 0, 255, 255,
            255, 255, 255, 255,
        ]);

        const result = filter!.apply({ cellSize: 2 }, {
            image,
            width: 2,
            height: 2,
            selectionMask: null,
            dirtyRect: null,
        });

        expect(Array.from(result.data.slice(0, 4))).toEqual([128, 128, 128, 255]);
        expect(Array.from(result.data.slice(12, 16))).toEqual([128, 128, 128, 255]);
    });
});
