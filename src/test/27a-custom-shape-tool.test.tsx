import { cleanup, fireEvent, render } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { OptionsBar } from '../components/Panels/OptionsBar';
import { ShapesPanel } from '../components/Panels/ShapesPanel';
import { useEditorStore } from '../store/editorStore';
import type { ShapeCustomData } from '../store/types';
import { getCustomShapeGroups, getCustomShapeLibrary } from '../tools/customShapes';
import { addCustomShapeLayerFromPreset, getShapeOptions, setShapeOptions } from '../tools/shapes';
import { ensureStubsRegistered } from '../tools/stubs';

ensureStubsRegistered();

function resetStore() {
    cleanup();
    useEditorStore.getState().clearHistory();
    useEditorStore.setState(state => ({
        ...state,
        width: 220,
        height: 180,
        layers: [],
        activeLayerId: null,
        selectedLayerIds: [],
        layerSelectionAnchorId: null,
        activeTool: 'shape-custom',
        primaryColor: '#2244cc',
        panelVisibility: {
            ...state.panelVisibility,
            shapes: true,
        },
    }));
    setShapeOptions({
        mode: 'shape',
        fill: '#dd3355',
        stroke: null,
        strokeWidth: 1,
        customShapeId: 'heart',
        combineMode: 'new',
    });
}

describe('27a custom shape tool and Shapes panel', () => {
    beforeEach(resetStore);
    afterEach(() => cleanup());

    it('exposes grouped default custom shape sets including Animals, Arrows, and Banners', () => {
        const groups = getCustomShapeGroups();
        expect(groups.map(group => group.id)).toEqual(expect.arrayContaining(['animals', 'arrows', 'banners']));
        expect(groups.find(group => group.id === 'animals')?.shapes.map(shape => shape.id)).toContain('paw-print');
        expect(getCustomShapeLibrary().map(shape => shape.id)).toEqual(expect.arrayContaining(['heart', 'arrow-right', 'banner-ribbon', 'fish']));
    });

    it('loads picker sets from the Custom Shape picker menu in the Options Bar', () => {
        const { getByTestId, queryByTestId } = render(<OptionsBar />);

        fireEvent.click(getByTestId('custom-shape-picker-gear'));
        expect(getByTestId('custom-shape-picker-menu')).toBeTruthy();
        fireEvent.click(getByTestId('custom-shape-load-animals'));

        expect(queryByTestId('custom-shape-picker-menu')).toBeNull();
        expect(getByTestId('custom-shape-preset-paw-print')).toBeTruthy();
        expect(getShapeOptions().customShapeId).toBe('paw-print');
    });

    it('Shapes panel groups collapse and selecting a shape arms the Custom Shape Tool', () => {
        const { getByTestId, queryByTestId } = render(<ShapesPanel />);

        fireEvent.click(getByTestId('shapes-panel-group-toggle-animals'));
        expect(queryByTestId('shapes-panel-shape-fish')).toBeNull();
        fireEvent.click(getByTestId('shapes-panel-group-toggle-animals'));
        fireEvent.click(getByTestId('shapes-panel-shape-fish'));

        expect(useEditorStore.getState().activeTool).toBe('shape-custom');
        expect(getShapeOptions().customShapeId).toBe('fish');
    });

    it('double-clicking a Shapes panel thumbnail adds a centered Shape layer', () => {
        const { getByTestId } = render(<ShapesPanel />);

        fireEvent.doubleClick(getByTestId('shapes-panel-shape-banner-ribbon'));

        const layer = useEditorStore.getState().layers.at(-1)!;
        expect(layer.kind).toBe('shape');
        const data = layer.shapeData as ShapeCustomData;
        expect(data.kind).toBe('custom');
        expect(data.presetId).toBe('banner-ribbon');
        expect(data.bounds.x + data.bounds.w / 2).toBeCloseTo(110, 5);
        expect(data.bounds.y + data.bounds.h / 2).toBeCloseTo(90, 5);
    });

    it('adds custom shapes from a preset id with undoable layer creation', () => {
        const id = addCustomShapeLayerFromPreset('arrow-right', { x: 60, y: 70 }, 48);
        expect(id).toBeTruthy();
        const layer = useEditorStore.getState().layers.at(-1)!;
        expect(layer.id).toBe(id);
        expect((layer.shapeData as ShapeCustomData).presetId).toBe('arrow-right');

        useEditorStore.getState().undo();
        expect(useEditorStore.getState().layers).toHaveLength(0);
        useEditorStore.getState().redo();
        expect(useEditorStore.getState().layers.at(-1)?.id).toBe(id);
    });
});
