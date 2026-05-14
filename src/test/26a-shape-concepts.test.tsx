import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { OptionsBar } from '../components/Panels/OptionsBar';
import { MenuBar } from '../components/layout/MenuBar';
import { Layer } from '../core/Layer';
import { useEditorStore } from '../store/editorStore';
import type { ShapeRectData } from '../store/types';
import { getPaths, clearPaths } from '../tools/pen';
import { getTool } from '../tools/registry';
import { setShapeOptions } from '../tools/shapes';
import { ensureStubsRegistered } from '../tools/stubs';
import { makeToolPointerEvent } from './simulator';

ensureStubsRegistered();

function resetStore() {
    clearPaths();
    useEditorStore.getState().clearHistory();
    useEditorStore.setState(state => ({
        ...state,
        width: 160,
        height: 120,
        layers: [],
        activeLayerId: null,
        selectedLayerIds: [],
        primaryColor: '#00ff00',
        activeTool: 'shape-rectangle',
    }));
    setShapeOptions({ mode: 'shape', fill: '#00ff00', stroke: null, strokeWidth: 1 });
}

function toolCtx() {
    return {
        store: useEditorStore.getState(),
        getStore: () => useEditorStore.getState(),
        requestRender: () => {},
    };
}

function dragRect(from = { x: 20, y: 20 }, to = { x: 70, y: 70 }) {
    const tool = getTool('shape-rectangle')!;
    tool.onPointerDown!(makeToolPointerEvent({ canvasX: from.x, canvasY: from.y }), toolCtx());
    tool.onPointerMove!(makeToolPointerEvent({ canvasX: to.x, canvasY: to.y }), toolCtx());
    tool.onPointerUp!(makeToolPointerEvent({ canvasX: to.x, canvasY: to.y }), toolCtx());
}

describe('26a shape concepts', () => {
    beforeEach(resetStore);
    afterEach(() => {
        cleanup();
        vi.restoreAllMocks();
    });

    it('Options Bar exposes Shape / Path / Pixels tool modes with Photoshop meanings', () => {
        const { getByTestId } = render(<OptionsBar />);

        expect(getByTestId('shape-tool-mode-shape').getAttribute('title')).toContain('vector Shape layer');
        fireEvent.click(getByTestId('shape-tool-mode-path'));
        expect(getByTestId('shape-tool-mode-path').className).toContain('active');
        fireEvent.click(getByTestId('shape-tool-mode-pixels'));
        expect(getByTestId('shape-tool-mode-pixels').className).toContain('active');
    });

    it('Shape, Path, and Pixels modes create the expected output surfaces', () => {
        setShapeOptions({ mode: 'shape' });
        dragRect();
        const shapeLayer = useEditorStore.getState().layers.at(-1)!;
        expect(shapeLayer.kind).toBe('shape');
        expect((shapeLayer.shapeData as ShapeRectData).kind).toBe('rect');

        useEditorStore.setState(state => ({ ...state, layers: [], activeLayerId: null, selectedLayerIds: [] }));
        setShapeOptions({ mode: 'path' });
        dragRect();
        expect(useEditorStore.getState().layers).toHaveLength(0);
        expect(getPaths()).toHaveLength(1);

        clearPaths();
        const raster = new Layer(160, 120, 'Raster');
        useEditorStore.setState(state => ({
            ...state,
            layers: [raster],
            activeLayerId: raster.id,
            selectedLayerIds: [raster.id],
        }));
        setShapeOptions({ mode: 'pixels', fill: '#00ff00' });
        dragRect();
        expect(useEditorStore.getState().layers).toHaveLength(1);
        expect(raster.shapeData).toBeNull();
        expect(raster.ctx.getImageData(30, 30, 1, 1).data[1]).toBeGreaterThan(200);
    });

    it('Pixels mode drawing is undoable without creating a Shape layer', () => {
        const raster = new Layer(160, 120, 'Raster');
        useEditorStore.setState(state => ({
            ...state,
            layers: [raster],
            activeLayerId: raster.id,
            selectedLayerIds: [raster.id],
        }));
        setShapeOptions({ mode: 'pixels', fill: '#00ff00' });

        dragRect();
        expect(raster.ctx.getImageData(30, 30, 1, 1).data[3]).toBeGreaterThan(0);

        useEditorStore.getState().undo();
        expect(raster.ctx.getImageData(30, 30, 1, 1).data[3]).toBe(0);
        expect(useEditorStore.getState().layers).toHaveLength(1);
    });

    it('Edit menu labels shape-layer transform as Free Transform Path', () => {
        setShapeOptions({ mode: 'shape' });
        dragRect();
        const noop = vi.fn();
        render(
            <MenuBar
                onNew={noop}
                onSaveAs={noop}
                onFreeTransform={noop}
                onWarp={noop}
                onOpenFile={noop}
                onPlaceEmbedded={noop}
                onLoadFilesIntoStack={noop}
                onClose={noop}
            />
        );

        fireEvent.mouseDown(screen.getByText('Edit'));

        expect(screen.getByText('Free Transform Path')).toBeTruthy();
    });
});
