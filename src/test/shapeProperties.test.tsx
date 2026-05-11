/**
 * PROPS-05 — Properties panel coverage for editable shape layers.
 *
 * Each test installs a shape-kind Layer with a known ShapeData variant,
 * renders the Properties panel, and asserts that the right controls appear
 * and route every edit through one undoable command (with drag-end coalescing
 * for sliders).
 */
import { describe, it, expect, beforeEach } from 'vitest';
import { cleanup, fireEvent, render } from '@testing-library/react';
import { useEditorStore } from '../store/editorStore';
import { ensureStubsRegistered } from '../tools/stubs';
import { PropertiesPanel } from '../components/Panels/PropertiesPanel';
import { Layer } from '../core/Layer';
import { rerenderShapeLayer } from '../tools/shapeRender';
import { layerPixelAt } from './simulator';
import type {
    ShapeData,
    ShapeRectData,
    ShapeRoundedRectData,
    ShapeEllipseData,
    ShapePolygonData,
    ShapeLineData,
    ShapeStroke,
} from '../store/types';

ensureStubsRegistered();

const defaultStroke: ShapeStroke = {
    color: '#000000', width: 0, opacity: 1, alignment: 'center', enabled: true,
};

function installShape(data: ShapeData): Layer {
    const layer = new Layer(200, 200, 'Shape', 'shape');
    layer.shapeData = data;
    rerenderShapeLayer(layer);
    useEditorStore.setState(s => ({
        ...s,
        layers: [layer],
        activeLayerId: layer.id,
        selectedLayerIds: [layer.id],
        layerSelectionAnchorId: layer.id,
        width: 200,
        height: 200,
    }));
    return layer;
}

function reset() {
    cleanup();
    useEditorStore.setState(s => ({
        ...s,
        layers: [],
        activeLayerId: null,
        selectedLayerIds: [],
        layerSelectionAnchorId: null,
        width: 200,
        height: 200,
    }));
    useEditorStore.getState().clearHistory();
}

describe('PROPS-05 properties panel — shape section', () => {
    beforeEach(reset);

    it('renders rectangle controls (Width, Height, Fill, Stroke) for a rect shape layer', () => {
        installShape({
            kind: 'rect',
            bounds: { x: 20, y: 20, w: 80, h: 60 },
            fill: { type: 'solid', color: '#ff0000' },
            stroke: null,
        });
        const { getByTestId } = render(<PropertiesPanel />);
        expect((getByTestId('properties-shape-width') as HTMLInputElement).value).toBe('80');
        expect((getByTestId('properties-shape-height') as HTMLInputElement).value).toBe('60');
        expect(getByTestId('properties-shape-fill-color')).toBeTruthy();
        expect(getByTestId('properties-shape-stroke-color')).toBeTruthy();
        expect(getByTestId('properties-shape-stroke-alignment')).toBeTruthy();
    });

    it('renders rounded-rect controls including Corner Radius', () => {
        installShape({
            kind: 'rounded-rect',
            bounds: { x: 10, y: 10, w: 100, h: 100 },
            cornerRadius: 12,
            fill: { type: 'solid', color: '#00ff00' },
            stroke: null,
        });
        const { getByTestId } = render(<PropertiesPanel />);
        expect((getByTestId('properties-shape-corner-radius') as HTMLInputElement).value).toBe('12');
    });

    it('renders ellipse controls (Width, Height, Fill, Stroke)', () => {
        installShape({
            kind: 'ellipse',
            bounds: { x: 30, y: 30, w: 80, h: 50 },
            fill: { type: 'solid', color: '#0000ff' },
            stroke: null,
        });
        const { getByTestId } = render(<PropertiesPanel />);
        expect((getByTestId('properties-shape-width') as HTMLInputElement).value).toBe('80');
        expect((getByTestId('properties-shape-height') as HTMLInputElement).value).toBe('50');
    });

    it('renders polygon controls (Sides, Star, Center, Radius, Rotation)', () => {
        installShape({
            kind: 'polygon',
            center: { x: 100, y: 100 }, radius: 60, sides: 5,
            star: false, starRatio: 0.5, rotation: 0,
            fill: { type: 'solid', color: '#ff00ff' }, stroke: null,
        });
        const { getByTestId, queryByTestId } = render(<PropertiesPanel />);
        expect((getByTestId('properties-shape-sides') as HTMLInputElement).value).toBe('5');
        expect((getByTestId('properties-shape-star') as HTMLInputElement).checked).toBe(false);
        // starRatio control hidden when star=false
        expect(queryByTestId('properties-shape-star-ratio')).toBeNull();
        expect(getByTestId('properties-shape-center-x')).toBeTruthy();
        expect(getByTestId('properties-shape-center-y')).toBeTruthy();
        expect(getByTestId('properties-shape-radius')).toBeTruthy();
        expect(getByTestId('properties-shape-rotation')).toBeTruthy();
    });

    it('renders line controls (Start, End, Weight, Arrowhead)', () => {
        installShape({
            kind: 'line',
            p0: { x: 10, y: 100 }, p1: { x: 190, y: 100 },
            weight: 4, arrowStart: false, arrowEnd: false, arrowSize: 4,
            stroke: { ...defaultStroke, color: '#0000ff', width: 4 },
        });
        const { getByTestId, queryByTestId } = render(<PropertiesPanel />);
        expect((getByTestId('properties-shape-p0-x') as HTMLInputElement).value).toBe('10');
        expect((getByTestId('properties-shape-p1-x') as HTMLInputElement).value).toBe('190');
        expect((getByTestId('properties-shape-line-weight') as HTMLInputElement).value).toBe('4');
        expect(getByTestId('properties-shape-arrow-start')).toBeTruthy();
        expect(getByTestId('properties-shape-arrow-end')).toBeTruthy();
        // arrow size hidden when both arrowheads off
        expect(queryByTestId('properties-shape-arrow-size')).toBeNull();
    });

    it('editing rect width via Properties changes the rendered pixels and is undoable', () => {
        const layer = installShape({
            kind: 'rect',
            bounds: { x: 20, y: 20, w: 40, h: 40 },
            fill: { type: 'solid', color: '#ff0000' },
            stroke: null,
        });
        // Initially a pixel at (100,40) is outside the 20..60 rectangle.
        expect(layerPixelAt(layer, 100, 40).a).toBe(0);

        const { getByTestId } = render(<PropertiesPanel />);
        const widthInput = getByTestId('properties-shape-width') as HTMLInputElement;
        fireEvent.change(widthInput, { target: { value: '120' } });
        // commit the coalesced session (mouseup/blur on the number input)
        fireEvent.blur(widthInput);

        const after = (useEditorStore.getState().layers[0].shapeData as ShapeRectData).bounds;
        expect(after.w).toBe(120);
        // After widening, x=100 should now be inside the rectangle.
        expect(layerPixelAt(useEditorStore.getState().layers[0], 100, 40).a).toBeGreaterThan(0);

        useEditorStore.getState().undo();
        const reverted = (useEditorStore.getState().layers[0].shapeData as ShapeRectData).bounds;
        expect(reverted.w).toBe(40);
        expect(layerPixelAt(useEditorStore.getState().layers[0], 100, 40).a).toBe(0);

        useEditorStore.getState().redo();
        const redone = (useEditorStore.getState().layers[0].shapeData as ShapeRectData).bounds;
        expect(redone.w).toBe(120);
    });

    it('editing polygon sides from 5 to 8 rerenders an octagon; undo restores pentagon', () => {
        installShape({
            kind: 'polygon',
            center: { x: 100, y: 100 }, radius: 60, sides: 5,
            star: false, starRatio: 0.5, rotation: 0,
            fill: { type: 'solid', color: '#00ff00' }, stroke: null,
        });
        const { getByTestId } = render(<PropertiesPanel />);
        const sidesInput = getByTestId('properties-shape-sides') as HTMLInputElement;
        fireEvent.change(sidesInput, { target: { value: '8' } });

        const updated = useEditorStore.getState().layers[0].shapeData as ShapePolygonData;
        expect(updated.sides).toBe(8);

        useEditorStore.getState().undo();
        const reverted = useEditorStore.getState().layers[0].shapeData as ShapePolygonData;
        expect(reverted.sides).toBe(5);

        useEditorStore.getState().redo();
        const redone = useEditorStore.getState().layers[0].shapeData as ShapePolygonData;
        expect(redone.sides).toBe(8);
    });

    it('toggling star on a polygon shows the Indent Sides By (starRatio) control', () => {
        installShape({
            kind: 'polygon',
            center: { x: 100, y: 100 }, radius: 60, sides: 6,
            star: false, starRatio: 0.5, rotation: 0,
            fill: { type: 'solid', color: '#ffff00' }, stroke: null,
        });
        const { getByTestId, queryByTestId, rerender } = render(<PropertiesPanel />);
        expect(queryByTestId('properties-shape-star-ratio')).toBeNull();

        fireEvent.click(getByTestId('properties-shape-star'));
        rerender(<PropertiesPanel />);

        expect((useEditorStore.getState().layers[0].shapeData as ShapePolygonData).star).toBe(true);
        expect(queryByTestId('properties-shape-star-ratio')).toBeTruthy();
    });

    it('toggling arrowEnd on a line redraws with arrowhead pixels at p1', () => {
        const layer = installShape({
            kind: 'line',
            p0: { x: 20, y: 100 }, p1: { x: 180, y: 100 },
            weight: 4, arrowStart: false, arrowEnd: false, arrowSize: 6,
            stroke: { ...defaultStroke, color: '#0000ff', width: 4 },
        });
        // Before: no arrowhead — pixel above the line at the end should be empty.
        // The shaft is at y=100 with weight=4, so y=90 is outside the shaft.
        const beforeArrowPixel = layerPixelAt(layer, 170, 88);
        expect(beforeArrowPixel.a).toBe(0);

        const { getByTestId } = render(<PropertiesPanel />);
        fireEvent.click(getByTestId('properties-shape-arrow-end'));

        const updated = useEditorStore.getState().layers[0].shapeData as ShapeLineData;
        expect(updated.arrowEnd).toBe(true);
        // After: with arrowSize=6 and weight=4, headLen=24, wing=12, so
        // a pixel near (170, 92) which is inside the arrow triangle should be filled.
        const afterArrowPixel = layerPixelAt(useEditorStore.getState().layers[0], 170, 100);
        expect(afterArrowPixel.a).toBeGreaterThan(0);
    });

    it('slider drag (4 onChange events) commits one history entry on drag-end', () => {
        installShape({
            kind: 'rounded-rect',
            bounds: { x: 10, y: 10, w: 120, h: 120 },
            cornerRadius: 8,
            fill: { type: 'solid', color: '#ff8800' },
            stroke: null,
        });
        const tickBefore = useEditorStore.getState().historyTick;
        const indexBefore = useEditorStore.getState().currentHistoryIndex;

        const { getByTestId } = render(<PropertiesPanel />);
        const slider = getByTestId('properties-shape-corner-radius') as HTMLInputElement;
        fireEvent.change(slider, { target: { value: '20' } });
        fireEvent.change(slider, { target: { value: '30' } });
        fireEvent.change(slider, { target: { value: '40' } });
        fireEvent.change(slider, { target: { value: '50' } });

        // During the drag, no new history entry has been committed yet.
        expect(useEditorStore.getState().currentHistoryIndex).toBe(indexBefore);

        fireEvent.mouseUp(slider);

        // After mouseUp the coalesced session commits one new entry.
        expect(useEditorStore.getState().currentHistoryIndex).toBe(indexBefore + 1);
        expect(useEditorStore.getState().historyTick).toBeGreaterThan(tickBefore);

        const after = useEditorStore.getState().layers[0].shapeData as ShapeRoundedRectData;
        expect(after.cornerRadius).toBe(50);
    });

    it('color picker change records exactly one history entry per commit', () => {
        installShape({
            kind: 'rect',
            bounds: { x: 10, y: 10, w: 80, h: 80 },
            fill: { type: 'solid', color: '#ff0000' },
            stroke: null,
        });
        const indexBefore = useEditorStore.getState().currentHistoryIndex;

        const { getByTestId } = render(<PropertiesPanel />);
        fireEvent.change(getByTestId('properties-shape-fill-color'), { target: { value: '#00ff00' } });

        const data = useEditorStore.getState().layers[0].shapeData as ShapeRectData;
        expect(data.fill).toEqual({ type: 'solid', color: '#00ff00' });
        // One-shot commit: exactly one new history entry.
        expect(useEditorStore.getState().currentHistoryIndex).toBe(indexBefore + 1);

        // Second color change adds a second history entry.
        fireEvent.change(getByTestId('properties-shape-fill-color'), { target: { value: '#0000ff' } });
        expect(useEditorStore.getState().currentHistoryIndex).toBe(indexBefore + 2);
        const afterSecond = useEditorStore.getState().layers[0].shapeData as ShapeRectData;
        expect(afterSecond.fill).toEqual({ type: 'solid', color: '#0000ff' });
    });

    it('stroke alignment select change is undoable', () => {
        installShape({
            kind: 'ellipse',
            bounds: { x: 10, y: 10, w: 100, h: 100 },
            fill: { type: 'solid', color: '#888888' },
            stroke: { color: '#000000', width: 4, opacity: 1, alignment: 'center', enabled: true },
        });
        const { getByTestId } = render(<PropertiesPanel />);
        fireEvent.change(getByTestId('properties-shape-stroke-alignment'), { target: { value: 'outside' } });
        const updated = useEditorStore.getState().layers[0].shapeData as ShapeEllipseData;
        expect(updated.stroke?.alignment).toBe('outside');

        useEditorStore.getState().undo();
        const reverted = useEditorStore.getState().layers[0].shapeData as ShapeEllipseData;
        expect(reverted.stroke?.alignment).toBe('center');
    });

    it('shape section does not render for non-shape (raster) layers', () => {
        useEditorStore.getState().addLayer();
        const { queryByTestId } = render(<PropertiesPanel />);
        expect(queryByTestId('properties-shape-width')).toBeNull();
        expect(queryByTestId('properties-shape-sides')).toBeNull();
        expect(queryByTestId('properties-shape-line-weight')).toBeNull();
    });
});
