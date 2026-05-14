import { cleanup, fireEvent, render } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { OptionsBar } from '../components/Panels/OptionsBar';
import { Toolbar } from '../components/Panels/Toolbar';
import { useEditorStore } from '../store/editorStore';
import type { ShapeLineData, ShapePolygonData, ShapeRectData } from '../store/types';
import { getTool } from '../tools/registry';
import { getShapeOptions, setShapeOptions } from '../tools/shapes';
import { ensureStubsRegistered } from '../tools/stubs';
import { makeToolPointerEvent } from './simulator';

ensureStubsRegistered();

function resetStore() {
    useEditorStore.getState().clearHistory();
    useEditorStore.setState(state => ({
        ...state,
        width: 180,
        height: 140,
        layers: [],
        activeLayerId: null,
        selectedLayerIds: [],
        layerSelectionAnchorId: null,
        primaryColor: '#111111',
        activeTool: 'shape-rectangle',
        toolbarGroupActive: {},
    }));
    setShapeOptions({
        mode: 'shape',
        fill: '#00aa00',
        stroke: null,
        strokeWidth: 1,
        strokeOpacity: 1,
        strokeAlignment: 'center',
        cornerRadius: 0,
        polygonSides: 5,
        polygonStar: false,
        polygonStarRatio: 1,
        polygonSmoothCorners: false,
        polygonSmoothIndents: false,
        lineWeight: 2,
        lineArrowStart: false,
        lineArrowEnd: false,
        lineArrowSize: 4,
        customShapeId: null,
        combineMode: 'new',
    });
}

function toolCtx() {
    return {
        store: useEditorStore.getState(),
        getStore: () => useEditorStore.getState(),
        requestRender: () => {},
    };
}

function dragTool(toolId: string, from: { x: number; y: number }, to: { x: number; y: number }, modifiers: { shift?: boolean; alt?: boolean } = {}) {
    const tool = getTool(toolId)!;
    const ctx = toolCtx();
    tool.onPointerDown!(makeToolPointerEvent({ canvasX: from.x, canvasY: from.y, modifiers }), ctx);
    tool.onPointerMove!(makeToolPointerEvent({ canvasX: to.x, canvasY: to.y, modifiers }), ctx);
    tool.onPointerUp!(makeToolPointerEvent({ canvasX: to.x, canvasY: to.y, modifiers }), ctx);
}

describe('26b geometric shapes', () => {
    beforeEach(resetStore);
    afterEach(() => cleanup());

    it('adds the Triangle Tool to the U-shape flyout and creates a 3-sided live shape', () => {
        const { getByTestId } = render(<Toolbar />);

        fireEvent.contextMenu(getByTestId('toolbar-shape-rectangle'));
        fireEvent.click(getByTestId('toolbar-flyout-shape-triangle'));

        expect(useEditorStore.getState().activeTool).toBe('shape-triangle');

        setShapeOptions({ cornerRadius: 12 });
        dragTool('shape-triangle', { x: 30, y: 20 }, { x: 110, y: 100 }, { shift: true });
        const data = useEditorStore.getState().layers.at(-1)!.shapeData as ShapePolygonData;
        expect(data.kind).toBe('polygon');
        expect(data.sides).toBe(3);
        expect(data.cornerRadius).toBe(12);
        expect(data.smoothCorners).toBe(true);
    });

    it('exposes polygon sides, star ratio, and smooth controls in the Options Bar', () => {
        useEditorStore.setState(state => ({ ...state, activeTool: 'shape-polygon' }));
        const { getByTestId } = render(<OptionsBar />);

        fireEvent.change(getByTestId('shape-polygon-sides-input'), { target: { value: '5' } });
        fireEvent.click(getByTestId('shape-polygon-star-checkbox'));
        fireEvent.change(getByTestId('shape-polygon-star-ratio-input'), { target: { value: '47' } });
        fireEvent.click(getByTestId('shape-polygon-smooth-corners'));
        fireEvent.click(getByTestId('shape-polygon-smooth-indents'));

        const opts = getShapeOptions();
        expect(opts.polygonSides).toBe(5);
        expect(opts.polygonStar).toBe(true);
        expect(opts.polygonStarRatio).toBeCloseTo(0.47, 5);
        expect(opts.polygonSmoothCorners).toBe(true);
        expect(opts.polygonSmoothIndents).toBe(true);

        dragTool('shape-polygon', { x: 30, y: 20 }, { x: 130, y: 120 }, { shift: true });
        const data = useEditorStore.getState().layers.at(-1)!.shapeData as ShapePolygonData;
        expect(data.star).toBe(true);
        expect(data.sides).toBe(5);
        expect(data.starRatio).toBeCloseTo(0.47, 5);
        expect(data.smoothIndents).toBe(true);
    });

    it('uses the Line Tool stroke color, weight, and arrowhead options', () => {
        useEditorStore.setState(state => ({ ...state, activeTool: 'shape-line' }));
        const { getByTestId } = render(<OptionsBar />);

        setShapeOptions({ fill: '#00ff00', stroke: '#ff00ff' });
        fireEvent.change(getByTestId('shape-line-weight-input'), { target: { value: '9' } });
        fireEvent.click(getByTestId('shape-line-arrow-end'));
        fireEvent.change(getByTestId('shape-line-arrow-size-input'), { target: { value: '6' } });

        dragTool('shape-line', { x: 20, y: 80 }, { x: 150, y: 80 }, { shift: true });
        const data = useEditorStore.getState().layers.at(-1)!.shapeData as ShapeLineData;
        expect(data.kind).toBe('line');
        expect(data.stroke.color).toBe('#ff00ff');
        expect(data.weight).toBe(9);
        expect(data.arrowEnd).toBe(true);
        expect(data.arrowSize).toBe(6);
    });

    it('subtracts a new front shape from the active shape layer from the Options Bar', () => {
        dragTool('shape-rectangle', { x: 20, y: 20 }, { x: 100, y: 100 });
        const active = useEditorStore.getState().layers.at(-1)!;
        expect((active.shapeData as ShapeRectData).kind).toBe('rect');

        useEditorStore.setState(state => ({ ...state, activeTool: 'shape-ellipse' }));
        const { getByTestId } = render(<OptionsBar />);
        fireEvent.click(getByTestId('shape-op-subtract'));
        expect(getShapeOptions().combineMode).toBe('subtract');

        dragTool('shape-ellipse', { x: 50, y: 50 }, { x: 130, y: 130 });

        const layers = useEditorStore.getState().layers;
        expect(layers).toHaveLength(1);
        expect(layers[0].kind).toBe('raster');
        expect(layers[0].shapeData).toBeNull();
        expect(layers[0].ctx.getImageData(30, 30, 1, 1).data[3]).toBeGreaterThan(0);
        expect(layers[0].ctx.getImageData(75, 75, 1, 1).data[3]).toBe(0);
        expect(getShapeOptions().combineMode).toBe('new');
    });
});
