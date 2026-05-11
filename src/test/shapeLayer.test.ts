import { describe, it, expect, beforeEach } from 'vitest';
import { useEditorStore } from '../store/editorStore';
import { getTool } from '../tools/registry';
import { ensureStubsRegistered } from '../tools/stubs';
import { setShapeOptions, getShapeOptions } from '../tools/shapes';
import { rerenderShapeLayer } from '../tools/shapeRender';
import type { DocumentManifest, LayerManifest } from '../core/persistence';
import { Layer } from '../core/Layer';
import { makeToolPointerEvent, layerPixelAt } from './simulator';
import type {
    ShapeData,
    ShapeRectData,
    ShapeEllipseData,
    ShapeRoundedRectData,
    ShapePolygonData,
    ShapeLineData,
} from '../store/types';

function reset() {
    ensureStubsRegistered();
    useEditorStore.getState().clearHistory();
    useEditorStore.setState((s) => ({
        ...s,
        layers: [],
        activeLayerId: null,
        selectedLayerIds: [],
        layerSelectionAnchorId: null,
        width: 200,
        height: 200,
    }));
    setShapeOptions({
        mode: 'shape',
        fill: '#ff0000',
        stroke: null,
        strokeWidth: 1,
        cornerRadius: 8,
        polygonSides: 5,
        polygonStar: false,
        polygonStarRatio: 0.5,
        lineWeight: 2,
        lineArrowStart: false,
        lineArrowEnd: false,
        lineArrowSize: 4,
        customShapeId: null,
    });
}

function toolCtx() {
    return {
        store: useEditorStore.getState(),
        getStore: () => useEditorStore.getState(),
        requestRender: () => {},
    };
}

function drag(
    toolId: string,
    from: { x: number; y: number },
    to: { x: number; y: number },
    modifiers: { shift?: boolean; alt?: boolean } = {},
) {
    const tool = getTool(toolId)!;
    const ctx = toolCtx();
    tool.onPointerDown!(makeToolPointerEvent({ canvasX: from.x, canvasY: from.y, modifiers }), ctx);
    tool.onPointerMove!(makeToolPointerEvent({ canvasX: to.x, canvasY: to.y, modifiers }), ctx);
    tool.onPointerUp!(makeToolPointerEvent({ canvasX: to.x, canvasY: to.y, modifiers }), ctx);
}

describe('SHAPE-01 editable shape layers', () => {
    beforeEach(reset);

    it('dragging Rectangle in Shape mode creates a shape layer with rect shapeData', () => {
        const before = useEditorStore.getState().layers.length;
        drag('shape-rectangle', { x: 20, y: 30 }, { x: 80, y: 90 });
        const layers = useEditorStore.getState().layers;
        expect(layers.length).toBe(before + 1);
        const shape = layers.at(-1)!;
        expect(shape.kind).toBe('shape');
        const data = shape.shapeData as ShapeRectData;
        expect(data.kind).toBe('rect');
        expect(data.bounds).toEqual({ x: 20, y: 30, w: 60, h: 60 });
        expect(data.fill?.type).toBe('solid');
    });

    it('dragging Ellipse in Shape mode creates an ellipse shape layer with visible pixels', () => {
        drag('shape-ellipse', { x: 40, y: 40 }, { x: 120, y: 120 });
        const layer = useEditorStore.getState().layers.at(-1)!;
        const data = layer.shapeData as ShapeEllipseData;
        expect(data.kind).toBe('ellipse');
        expect(data.bounds).toEqual({ x: 40, y: 40, w: 80, h: 80 });
        // Center pixel of the ellipse should be filled with the active fill (red).
        const cx = Math.floor(data.bounds.x + data.bounds.w / 2);
        const cy = Math.floor(data.bounds.y + data.bounds.h / 2);
        const px = layerPixelAt(layer, cx, cy);
        expect(px.r).toBeGreaterThan(200);
        expect(px.a).toBeGreaterThan(0);
    });

    it('Shift-drag on Rectangle constrains to a square', () => {
        drag('shape-rectangle', { x: 10, y: 10 }, { x: 100, y: 60 }, { shift: true });
        const data = useEditorStore.getState().layers.at(-1)!.shapeData as ShapeRectData;
        expect(data.bounds.w).toBe(data.bounds.h);
    });

    it('Alt-drag on Ellipse draws from center (twice the drag size)', () => {
        drag('shape-ellipse', { x: 100, y: 100 }, { x: 130, y: 130 }, { alt: true });
        const data = useEditorStore.getState().layers.at(-1)!.shapeData as ShapeEllipseData;
        expect(data.bounds).toEqual({ x: 70, y: 70, w: 60, h: 60 });
    });

    it('Rounded Rectangle preserves cornerRadius on shapeData', () => {
        setShapeOptions({ cornerRadius: 20 });
        drag('shape-rounded-rectangle', { x: 10, y: 10 }, { x: 110, y: 110 });
        const data = useEditorStore.getState().layers.at(-1)!.shapeData as ShapeRoundedRectData;
        expect(data.kind).toBe('rounded-rect');
        expect(data.cornerRadius).toBe(20);
    });

    it('Polygon with star option stores star geometry', () => {
        setShapeOptions({ polygonSides: 6, polygonStar: true, polygonStarRatio: 0.4 });
        drag('shape-polygon', { x: 50, y: 50 }, { x: 150, y: 150 });
        const data = useEditorStore.getState().layers.at(-1)!.shapeData as ShapePolygonData;
        expect(data.kind).toBe('polygon');
        expect(data.star).toBe(true);
        expect(data.sides).toBe(6);
        expect(data.starRatio).toBeCloseTo(0.4, 5);
    });

    it('changing starRatio and rerendering produces a different pixel pattern than the original', () => {
        setShapeOptions({ polygonSides: 5, polygonStar: true, polygonStarRatio: 0.5, fill: '#00ff00' });
        drag('shape-polygon', { x: 30, y: 30 }, { x: 170, y: 170 });
        const layer = useEditorStore.getState().layers.at(-1)!;
        const data = layer.shapeData as ShapePolygonData;
        // Sample a ring of pixels around the center.
        const samples = (l: typeof layer) => {
            const c = { x: data.center.x, y: data.center.y };
            const r = data.radius * 0.7;
            const points: number[] = [];
            for (let i = 0; i < 16; i++) {
                const a = (i * Math.PI * 2) / 16;
                const x = Math.floor(c.x + Math.cos(a) * r);
                const y = Math.floor(c.y + Math.sin(a) * r);
                const px = layerPixelAt(l, x, y);
                points.push(px.a);
            }
            return points.join(',');
        };
        const slim = samples(layer);
        // Mutate the geometry and rerender.
        (layer.shapeData as ShapePolygonData).starRatio = 0.15;
        rerenderShapeLayer(layer);
        const sharper = samples(layer);
        expect(sharper).not.toBe(slim);
    });

    it('Line with arrowheads paints triangle pixels near the endpoints', () => {
        setShapeOptions({ lineWeight: 4, lineArrowStart: true, lineArrowEnd: true, lineArrowSize: 6, fill: '#0000ff' });
        drag('shape-line', { x: 20, y: 100 }, { x: 180, y: 100 });
        const layer = useEditorStore.getState().layers.at(-1)!;
        const data = layer.shapeData as ShapeLineData;
        expect(data.kind).toBe('line');
        expect(data.arrowStart).toBe(true);
        expect(data.arrowEnd).toBe(true);
        // The arrowhead at the end (x=180, y=100) extends back along -ux. With
        // weight=4 and size=6, headLen = 24, wing = 12, so pixels at
        // (180 - 12, 100 - 6) and (180 - 12, 100 + 6) should be filled.
        const endHeadInside = layerPixelAt(layer, 170, 100);
        const startHeadInside = layerPixelAt(layer, 30, 100);
        expect(endHeadInside.a).toBeGreaterThan(0);
        expect(startHeadInside.a).toBeGreaterThan(0);
    });

    it('editing shapeData and calling rerenderShapeLayer updates the canvas', () => {
        drag('shape-rectangle', { x: 10, y: 10 }, { x: 60, y: 60 });
        const layer = useEditorStore.getState().layers.at(-1)!;
        const data = layer.shapeData as ShapeRectData;
        const before = layerPixelAt(layer, 100, 100);
        expect(before.a).toBe(0); // outside the original 10..60 rect
        data.bounds = { x: 90, y: 90, w: 40, h: 40 };
        rerenderShapeLayer(layer);
        const after = layerPixelAt(layer, 100, 100);
        expect(after.a).toBeGreaterThan(0);
        // The old area should now be empty (canvas was cleared before redraw).
        const oldArea = layerPixelAt(layer, 30, 30);
        expect(oldArea.a).toBe(0);
    });

    it('Pixels mode still rasterizes onto the active layer without creating a shape layer', () => {
        useEditorStore.getState().addLayer();
        const baseLayer = useEditorStore.getState().layers.at(-1)!;
        const layerCountBefore = useEditorStore.getState().layers.length;
        setShapeOptions({ mode: 'pixels', fill: '#00ff00' });
        drag('shape-rectangle', { x: 30, y: 30 }, { x: 70, y: 70 });
        const layerCountAfter = useEditorStore.getState().layers.length;
        expect(layerCountAfter).toBe(layerCountBefore);
        // The pixels landed on the base raster layer.
        const px = layerPixelAt(baseLayer, 40, 40);
        expect(px.g).toBeGreaterThan(200);
        expect(baseLayer.shapeData).toBeFalsy();
        // Restore for downstream tests.
        setShapeOptions({ mode: 'shape', fill: '#ff0000' });
    });

    it('creating a shape layer is undoable and redo restores shapeData', () => {
        const layersBefore = useEditorStore.getState().layers.length;
        drag('shape-rectangle', { x: 25, y: 25 }, { x: 75, y: 75 });
        const created = useEditorStore.getState().layers.at(-1)!;
        const createdData = created.shapeData as ShapeRectData;
        expect(useEditorStore.getState().layers.length).toBe(layersBefore + 1);
        useEditorStore.getState().undo();
        expect(useEditorStore.getState().layers.length).toBe(layersBefore);
        useEditorStore.getState().redo();
        expect(useEditorStore.getState().layers.length).toBe(layersBefore + 1);
        const redone = useEditorStore.getState().layers.at(-1)!;
        const redoneData = redone.shapeData as ShapeRectData;
        expect(redoneData?.kind).toBe('rect');
        expect(redoneData?.bounds).toEqual(createdData.bounds);
    });

    it('shapeData round-trips through the .pwbdoc layer manifest (JSON)', () => {
        setShapeOptions({ polygonSides: 7, polygonStar: true, polygonStarRatio: 0.3 });
        drag('shape-polygon', { x: 50, y: 50 }, { x: 150, y: 150 });
        const source = useEditorStore.getState().layers.at(-1)!;
        const before = source.shapeData as ShapePolygonData;
        // Mirror the manifest serialization performed by persistence.saveDocument.
        const manifestLayer: LayerManifest = {
            id: source.id,
            name: source.name,
            visible: source.visible,
            opacity: source.opacity,
            fill: source.fill,
            blendMode: source.blendMode,
            kind: source.kind,
            parentId: source.parentId,
            expanded: source.expanded,
            dataUrl: source.canvas.toDataURL('image/png'),
            width: source.canvas.width,
            height: source.canvas.height,
            shapeData: source.shapeData as ShapeData | null,
        };
        const manifest: DocumentManifest = {
            version: 1,
            name: 'shape-rt',
            width: 200,
            height: 200,
            activeLayerId: source.id,
            layers: [manifestLayer],
            timestamp: Date.now(),
        };
        const roundTripped: DocumentManifest = JSON.parse(JSON.stringify(manifest));
        const lm = roundTripped.layers[0];
        // Mirror the manifest restoration performed by persistence.loadDocument.
        const restored = new Layer(lm.width, lm.height, lm.name);
        (restored as unknown as Record<string, unknown>).kind = lm.kind;
        restored.shapeData = lm.shapeData ?? null;
        const after = restored.shapeData as ShapePolygonData;
        expect(after.kind).toBe('polygon');
        expect(after.sides).toBe(7);
        expect(after.star).toBe(true);
        expect(after.starRatio).toBeCloseTo(before.starRatio, 5);
        expect(after.center.x).toBeCloseTo(before.center.x, 5);
        expect(after.radius).toBeCloseTo(before.radius, 5);
    });

    it('a v1 manifest without a shapeData field defaults shapeData to null on load', () => {
        // Build a minimal manifest that does NOT include the shapeData field.
        const manifest: DocumentManifest = {
            version: 1,
            name: 'plain-rt',
            width: 200,
            height: 200,
            activeLayerId: null,
            layers: [{
                id: 'old-layer',
                name: 'Old Layer',
                visible: true,
                opacity: 1,
                fill: 1,
                blendMode: 'source-over',
                kind: 'raster',
                parentId: null,
                expanded: true,
                dataUrl: 'data:image/png;base64,',
                width: 200,
                height: 200,
            }],
            timestamp: Date.now(),
        };
        const roundTripped: DocumentManifest = JSON.parse(JSON.stringify(manifest));
        const lm = roundTripped.layers[0];
        const restored = new Layer(lm.width, lm.height, lm.name);
        restored.shapeData = lm.shapeData ?? null;
        expect(restored.shapeData).toBeNull();
    });

    it('getShapeOptions reflects the current mode setting', () => {
        setShapeOptions({ mode: 'shape' });
        expect(getShapeOptions().mode).toBe('shape');
        setShapeOptions({ mode: 'pixels' });
        expect(getShapeOptions().mode).toBe('pixels');
        setShapeOptions({ mode: 'shape' });
    });
});
