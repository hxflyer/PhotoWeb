import { describe, it, expect, beforeEach } from 'vitest';
import { useEditorStore } from '../store/editorStore';
import { getTool } from '../tools/registry';
import { ensureStubsRegistered } from '../tools/stubs';
import { setPenOptions, getPaths } from '../tools/pen';
import { layerPixelAt, makeToolPointerEvent } from './simulator';

ensureStubsRegistered();

function reset() {
    useEditorStore.setState((s) => ({
        ...s,
        layers: [],
        activeLayerId: null,
        primaryColor: '#ff0000',
        width: 200,
        height: 200,
        brushSettings: { size: 4, hardness: 1, opacity: 1, flow: 1 },
    }));
    useEditorStore.getState().addLayer();
    useEditorStore.getState().clearHistory();
    setPenOptions({ mode: 'path' });
    // Reset all paths from previous tests.
    while (getPaths().length > 0) getPaths().pop();
}

function ctx() {
    return {
        store: useEditorStore.getState(),
        getStore: () => useEditorStore.getState(),
        requestRender: () => {},
    };
}

function buildTriangle() {
    const tool = getTool('pen')!;
    tool.onPointerDown!(makeToolPointerEvent({ canvasX: 50, canvasY: 50 }), ctx());
    tool.onPointerUp!(makeToolPointerEvent({ canvasX: 50, canvasY: 50 }), ctx());
    tool.onPointerDown!(makeToolPointerEvent({ canvasX: 150, canvasY: 50 }), ctx());
    tool.onPointerUp!(makeToolPointerEvent({ canvasX: 150, canvasY: 50 }), ctx());
    tool.onPointerDown!(makeToolPointerEvent({ canvasX: 100, canvasY: 150 }), ctx());
    tool.onPointerUp!(makeToolPointerEvent({ canvasX: 100, canvasY: 150 }), ctx());
}

function pressEnter() {
    const tool = getTool('pen')!;
    const enterEvent: KeyboardEvent = new KeyboardEvent('keydown', { key: 'Enter' });
    tool.onKeyDown!({ key: 'Enter', shift: false, alt: false, meta: false, ctrl: false, rawEvent: enterEvent }, ctx());
}

describe('pen modes', () => {
    beforeEach(reset);

    it('path mode: pressing Enter closes the path and leaves an entry in the path store', () => {
        setPenOptions({ mode: 'path' });
        buildTriangle();
        pressEnter();
        const paths = getPaths();
        expect(paths.length).toBeGreaterThan(0);
        expect(paths[paths.length - 1].closed).toBe(true);
        // No pixels were committed.
        const layer = useEditorStore.getState().layers[0];
        const px = layerPixelAt(layer, 100, 100);
        expect(px.a).toBe(0);
    });

    it('shape mode: creates a new kind:shape layer with custom shapeData and discards the path entry', () => {
        setPenOptions({ mode: 'shape' });
        const layersBefore = useEditorStore.getState().layers.length;
        buildTriangle();
        const pathsBefore = getPaths().length;
        pressEnter();
        const layers = useEditorStore.getState().layers;
        // A new shape layer was appended above the original raster layer.
        expect(layers.length).toBe(layersBefore + 1);
        const created = layers.at(-1)!;
        expect(created.kind).toBe('shape');
        const data = created.shapeData as { kind: string; pathD: string };
        expect(data?.kind).toBe('custom');
        expect(typeof data?.pathD).toBe('string');
        expect((data?.pathD ?? '').length).toBeGreaterThan(0);
        expect(getPaths().length).toBeLessThan(pathsBefore + 1); // discarded after creating the shape layer
    });

    it('pixels mode: strokes the path at brush size and discards the path entry', () => {
        setPenOptions({ mode: 'pixels' });
        useEditorStore.getState().setBrushSize(8);
        buildTriangle();
        const pathsBefore = getPaths().length;
        pressEnter();
        const layer = useEditorStore.getState().layers[0];
        // A point on the top edge of the triangle should be painted red.
        const onEdge = layerPixelAt(layer, 100, 50);
        expect(onEdge.r).toBe(255);
        expect(onEdge.a).toBeGreaterThan(0);
        // Centre of the triangle is empty (stroke only, not fill).
        const centre = layerPixelAt(layer, 100, 110);
        expect(centre.a).toBe(0);
        expect(getPaths().length).toBeLessThan(pathsBefore + 1);
    });
});
