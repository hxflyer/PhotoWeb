import { act, cleanup, fireEvent, render } from '@testing-library/react';
import { beforeEach, describe, expect, it } from 'vitest';
import App from '../App';
import { applyFilterToLayer } from '../filters/applyFilter';
import { getFilter } from '../filters/registry';
import { useEditorStore } from '../store/editorStore';
import { getPatternTile } from '../store/toolsSlice';
import { ensureStubsRegistered } from '../tools/stubs';
import { defineActiveLayerAsPattern, fillActiveLayer } from '../tools/patterns';

ensureStubsRegistered();

function reset(width = 24, height = 24) {
    cleanup();
    localStorage.clear();
    useEditorStore.setState(s => ({
        ...s,
        width,
        height,
        layers: [],
        activeLayerId: null,
        selectedLayerIds: [],
        layerSelectionAnchorId: null,
        patternPresets: [],
        activePatternId: null,
        primaryColor: '#ff0000',
        secondaryColor: '#0000ff',
    }));
    useEditorStore.getState().clearSelection();
    useEditorStore.getState().clearHistory();
    useEditorStore.getState().addLayer();
}

function makeCheckerTile(): HTMLCanvasElement {
    const tile = document.createElement('canvas');
    tile.width = 2;
    tile.height = 2;
    const ctx = tile.getContext('2d')!;
    ctx.fillStyle = '#ff0000';
    ctx.fillRect(0, 0, 1, 1);
    ctx.fillRect(1, 1, 1, 1);
    ctx.fillStyle = '#0000ff';
    ctx.fillRect(1, 0, 1, 1);
    ctx.fillRect(0, 1, 1, 1);
    return tile;
}

function pixelAt(x: number, y: number, layer = useEditorStore.getState().layers[0]) {
    const data = layer.ctx.getImageData(x, y, 1, 1).data;
    return { r: data[0], g: data[1], b: data[2], a: data[3] };
}

describe('28-patterns', () => {
    beforeEach(() => reset());

    it('defines a pattern from the selected tile bounds', () => {
        const store = useEditorStore.getState();
        const layer = store.layers[0];
        layer.ctx.fillStyle = '#111111';
        layer.ctx.fillRect(0, 0, 24, 24);
        layer.ctx.fillStyle = '#22cc88';
        layer.ctx.fillRect(6, 7, 4, 5);
        store.setHasSelection(true);
        store.setSelectionOperations([{ mode: 'add', type: 'rect', path: [{ x: 6, y: 7 }, { x: 10, y: 12 }] }]);

        const id = defineActiveLayerAsPattern('Selected Tile');

        expect(id).toBeTruthy();
        const preset = useEditorStore.getState().patternPresets.find(item => item.id === id)!;
        expect(preset.width).toBe(4);
        expect(preset.height).toBe(5);
        expect(useEditorStore.getState().activePatternId).toBe(id);
        const tile = getPatternTile(id!);
        expect(tile?.width).toBe(4);
        const sample = tile!.getContext('2d')!.getImageData(1, 1, 1, 1).data;
        expect(sample[1]).toBe(0xcc);
    });

    it('fills the active selection with the active pattern', () => {
        const store = useEditorStore.getState();
        const id = store.definePattern('Checker 2x2', makeCheckerTile());
        store.setActivePatternId(id);
        store.setHasSelection(true);
        store.setSelectionOperations([{ mode: 'add', type: 'rect', path: [{ x: 0, y: 0 }, { x: 6, y: 6 }] }]);

        const ok = fillActiveLayer({ use: 'pattern', patternId: id });

        expect(ok).toBe(true);
        expect(pixelAt(0, 0).r).toBe(255);
        expect(pixelAt(1, 0).b).toBe(255);
        expect(pixelAt(7, 7).a).toBe(0);
        expect(useEditorStore.getState().historyEntries.at(-1)?.action.label).toBe('Fill Pattern');
    });

    it('opens Edit Fill as a dialog and applies foreground color', async () => {
        const { findByTestId, queryByTestId } = render(<App />);
        act(() => {
            window.dispatchEvent(new Event('photoweb:open-fill'));
        });
        const dialog = await findByTestId('fill-dialog');
        expect(dialog).toBeTruthy();
        fireEvent.change(await findByTestId('fill-use'), { target: { value: 'foreground' } });
        fireEvent.click(await findByTestId('fill-ok'));
        expect(pixelAt(2, 2).r).toBe(255);
        expect(queryByTestId('fill-dialog')).toBeNull();
    });

    it('offset filter wraps pixels for seamless tile recipes', () => {
        reset(4, 4);
        const layer = useEditorStore.getState().layers[0];
        layer.ctx.fillStyle = '#ff0000';
        layer.ctx.fillRect(0, 0, 1, 1);
        expect(getFilter('other-offset')?.label).toBe('Offset');

        const ok = applyFilterToLayer(
            layer,
            'other-offset',
            { horizontal: 2, vertical: 2, undefinedAreas: 'wrap' },
            useEditorStore.getState().selection,
        );

        expect(ok).toBe(true);
        expect(pixelAt(2, 2, layer).r).toBe(255);
        expect(pixelAt(0, 0, layer).a).toBe(0);
    });
});
