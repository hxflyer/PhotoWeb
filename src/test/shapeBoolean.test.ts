import { describe, it, expect, beforeEach } from 'vitest';
import { useEditorStore } from '../store/editorStore';
import { ensureStubsRegistered } from '../tools/stubs';
import { renderCombinedShapeCanvas } from '../utils/shapeBoolean';
import type { ShapeRectData, ShapeEllipseData } from '../store/types';

ensureStubsRegistered();

function pixelAt(canvas: HTMLCanvasElement, x: number, y: number): { r: number; g: number; b: number; a: number } {
    const data = canvas.getContext('2d')!.getImageData(x, y, 1, 1).data;
    return { r: data[0], g: data[1], b: data[2], a: data[3] };
}

describe('renderCombinedShapeCanvas — raster boolean ops', () => {
    beforeEach(() => {
        useEditorStore.getState().clearHistory();
        useEditorStore.setState(s => ({ ...s, width: 80, height: 80, layers: [], activeLayerId: null }));
    });

    function rect(x: number, y: number, w: number, h: number, fill = '#ff0000'): ShapeRectData {
        return { kind: 'rect', bounds: { x, y, w, h }, fill: { type: 'solid', color: fill }, stroke: null };
    }

    function ellipse(x: number, y: number, w: number, h: number, fill = '#0000ff'): ShapeEllipseData {
        return { kind: 'ellipse', bounds: { x, y, w, h }, fill: { type: 'solid', color: fill }, stroke: null };
    }

    it('combine (union) merges two overlapping rectangles', () => {
        const result = renderCombinedShapeCanvas(rect(10, 10, 30, 30), rect(25, 25, 30, 30), 'combine', 80, 80);
        expect(result).not.toBeNull();
        // A's top-left and B's bottom-right should both be filled.
        expect(pixelAt(result!, 15, 15).a).toBeGreaterThan(0);
        expect(pixelAt(result!, 50, 50).a).toBeGreaterThan(0);
    });

    it('subtract removes the incoming shape from the existing shape', () => {
        const result = renderCombinedShapeCanvas(rect(10, 10, 40, 40), rect(25, 25, 40, 40), 'subtract', 80, 80);
        expect(result).not.toBeNull();
        expect(pixelAt(result!, 12, 12).a).toBeGreaterThan(0); // A only
        expect(pixelAt(result!, 40, 40).a).toBe(0);            // overlap
    });

    it('intersect keeps only the overlap of the two shapes', () => {
        const result = renderCombinedShapeCanvas(rect(10, 10, 40, 40), rect(30, 30, 40, 40), 'intersect', 80, 80);
        expect(result).not.toBeNull();
        expect(pixelAt(result!, 40, 40).a).toBeGreaterThan(0); // overlap
        expect(pixelAt(result!, 12, 12).a).toBe(0);            // A only
        expect(pixelAt(result!, 65, 65).a).toBe(0);            // B only
    });

    it('exclude (XOR) keeps non-overlapping regions of both shapes', () => {
        const result = renderCombinedShapeCanvas(rect(10, 10, 30, 30), rect(25, 25, 30, 30), 'exclude', 80, 80);
        expect(result).not.toBeNull();
        expect(pixelAt(result!, 12, 12).a).toBeGreaterThan(0); // A exclusive
        expect(pixelAt(result!, 50, 50).a).toBeGreaterThan(0); // B exclusive
        expect(pixelAt(result!, 32, 32).a).toBe(0);            // overlap cancelled
    });

    it('combine works on rect + ellipse heterogeneous pair', () => {
        const result = renderCombinedShapeCanvas(rect(10, 10, 40, 40), ellipse(30, 30, 30, 30), 'combine', 80, 80);
        expect(result).not.toBeNull();
        expect(pixelAt(result!, 20, 20).a).toBeGreaterThan(0); // rect center
        expect(pixelAt(result!, 45, 45).a).toBeGreaterThan(0); // ellipse center
    });
});
