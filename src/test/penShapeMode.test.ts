import { describe, it, expect, beforeEach } from 'vitest';
import { useEditorStore } from '../store/editorStore';
import { getTool } from '../tools/registry';
import { ensureStubsRegistered } from '../tools/stubs';
import { setPenOptions, getPaths, clearPaths } from '../tools/pen';
import type { ShapeCustomData } from '../store/types';
import { makeToolPointerEvent } from './simulator';
import { convertActiveLayerToShape } from '../tools/typeCommands';

ensureStubsRegistered();

function reset() {
    useEditorStore.getState().clearHistory();
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
    setPenOptions({ mode: 'path' });
    clearPaths();
}

function toolCtx() {
    return {
        store: useEditorStore.getState(),
        getStore: () => useEditorStore.getState(),
        requestRender: () => {},
    };
}

function clickAt(x: number, y: number) {
    const tool = getTool('pen')!;
    tool.onPointerDown!(makeToolPointerEvent({ canvasX: x, canvasY: y }), toolCtx());
    tool.onPointerUp!(makeToolPointerEvent({ canvasX: x, canvasY: y }), toolCtx());
}

function pressEnter() {
    const tool = getTool('pen')!;
    const ev = new KeyboardEvent('keydown', { key: 'Enter' });
    tool.onKeyDown!({ key: 'Enter', shift: false, alt: false, meta: false, ctrl: false, rawEvent: ev }, toolCtx());
}

describe('Pen Shape mode produces a custom shape layer', () => {
    beforeEach(reset);

    it('shape mode: closing a 4-anchor path creates a kind:shape layer with shapeData.kind === custom and a non-empty pathD', () => {
        setPenOptions({ mode: 'shape' });
        clickAt(20, 20);
        clickAt(180, 20);
        clickAt(180, 180);
        clickAt(20, 180);
        const layersBefore = useEditorStore.getState().layers.length;
        pressEnter();
        const layers = useEditorStore.getState().layers;
        expect(layers.length).toBe(layersBefore + 1);
        const created = layers.at(-1)!;
        expect(created.kind).toBe('shape');
        const data = created.shapeData as ShapeCustomData;
        expect(data.kind).toBe('custom');
        expect(typeof data.pathD).toBe('string');
        expect(data.pathD.length).toBeGreaterThan(0);
        expect(data.pathD.includes('M')).toBe(true);
        expect(data.pathD.includes('Z')).toBe(true);
        expect(data.bounds.w).toBeGreaterThan(0);
        expect(data.bounds.h).toBeGreaterThan(0);
        expect(data.fill?.type).toBe('solid');
    });

    it('path mode: closing a path leaves a new entry in pathStore.paths and no new layer', () => {
        setPenOptions({ mode: 'path' });
        const layersBefore = useEditorStore.getState().layers.length;
        clickAt(20, 20);
        clickAt(180, 20);
        clickAt(180, 180);
        clickAt(20, 180);
        const pathsBefore = getPaths().length;
        pressEnter();
        const layers = useEditorStore.getState().layers;
        expect(layers.length).toBe(layersBefore);
        const paths = getPaths();
        expect(paths.length).toBe(pathsBefore);
        expect(paths.at(-1)!.closed).toBe(true);
    });

    it('Convert to Shape: a type-like layer with opaque pixels becomes a kind:shape layer with non-empty pathD', () => {
        // Simulate a "type layer" by drawing a black square into the active raster
        // layer and marking kind as 'type' with typeData.
        const layer = useEditorStore.getState().layers[0];
        layer.ctx.fillStyle = '#000000';
        layer.ctx.fillRect(40, 40, 100, 100);
        (layer as unknown as { kind: string }).kind = 'type';
        layer.typeData = { text: 'A', style: { color: '#000000' }, x: 0, y: 0 } as unknown as null;
        layer.markDirty(null);

        const ok = convertActiveLayerToShape();
        expect(ok).toBe(true);

        const after = useEditorStore.getState().layers[0];
        expect(after.kind).toBe('shape');
        expect(after.typeData).toBeNull();
        const data = after.shapeData as ShapeCustomData;
        expect(data.kind).toBe('custom');
        expect(data.pathD.length).toBeGreaterThan(0);
        // pathD must contain at least one M (move) and one Z (close) — a
        // properly-traced contour.
        expect(data.pathD.includes('M')).toBe(true);
        expect(data.pathD.includes('Z')).toBe(true);
        // Bounds reflect the original opaque region (within tracing tolerance).
        expect(data.bounds.x).toBeGreaterThanOrEqual(38);
        expect(data.bounds.x).toBeLessThanOrEqual(42);
        expect(data.bounds.y).toBeGreaterThanOrEqual(38);
        expect(data.bounds.y).toBeLessThanOrEqual(42);
        expect(data.bounds.w).toBeGreaterThanOrEqual(98);
        expect(data.bounds.h).toBeGreaterThanOrEqual(98);
        expect(data.fill?.type).toBe('solid');
    });

    it('Convert to Shape: undo restores the original raster pixels and kind', () => {
        const layer = useEditorStore.getState().layers[0];
        layer.ctx.fillStyle = '#000000';
        layer.ctx.fillRect(40, 40, 100, 100);
        (layer as unknown as { kind: string }).kind = 'type';
        const typeSnapshot = { text: 'A', style: { color: '#000000' }, x: 0, y: 0 };
        layer.typeData = typeSnapshot as unknown as null;
        layer.markDirty(null);
        // Capture the pre-conversion pixels for the round-trip assertion.
        const beforeAlpha = layer.canvas.getContext('2d')!.getImageData(90, 90, 1, 1).data[3];
        expect(beforeAlpha).toBeGreaterThan(0);

        const ok = convertActiveLayerToShape();
        expect(ok).toBe(true);
        expect(useEditorStore.getState().layers[0].kind).toBe('shape');

        useEditorStore.getState().undo();
        const reverted = useEditorStore.getState().layers[0];
        expect(reverted.kind).toBe('type');
        expect(reverted.typeData).toEqual(typeSnapshot);
        // Original pixels are restored (the converter snapshots and the revert
        // path putImageData's them back).
        const afterAlpha = reverted.canvas.getContext('2d')!.getImageData(90, 90, 1, 1).data[3];
        expect(afterAlpha).toBe(beforeAlpha);
    });
});
