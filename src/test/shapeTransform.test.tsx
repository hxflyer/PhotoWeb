/**
 * Batch 5 Slice C — shape + type transform preservation.
 *
 * Move Tool and Free Transform must keep `shapeData` editable instead of
 * rasterizing. Type re-edit overlay must mirror the layer's rotation. Custom
 * shapes at non-1:1 aspect ratios must letterbox so the stroke does not pinch.
 * Shape Combine / Subtract / Intersect / Exclude buttons set the next-shape
 * combineMode (MVP scope — combining existing layers is deferred).
 */
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { cleanup, render } from '@testing-library/react';
import { useEditorStore } from '../store/editorStore';
import { ensureStubsRegistered } from '../tools/stubs';
import { getTool } from '../tools/registry';
import { Layer } from '../core/Layer';
import { rerenderShapeLayer } from '../tools/shapeRender';
import { moveShapeTarget } from '../tools/shapeCommands';
import { setShapeOptions, getShapeOptions } from '../tools/shapes';
import { TextEditOverlay } from '../components/Canvas/TextEditOverlay';
import { makeToolPointerEvent } from './simulator';
import { commitTypeLayer, defaultTextStyle, setEditingType, cancelEditingType, type TypeLayerData } from '../tools/type';
import type { ShapeRectData, ShapeEllipseData, ShapePolygonData, ShapeLineData, ShapeCustomData } from '../store/types';

ensureStubsRegistered();

function reset() {
    cleanup();
    cancelEditingType();
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

function installShapeLayer<T extends { kind: string }>(data: T): Layer {
    const layer = new Layer(200, 200, 'Shape', 'shape');
    layer.shapeData = data as unknown as Layer['shapeData'];
    rerenderShapeLayer(layer);
    useEditorStore.setState(s => ({
        ...s,
        layers: [layer],
        activeLayerId: layer.id,
        selectedLayerIds: [layer.id],
        layerSelectionAnchorId: layer.id,
    }));
    return layer;
}

describe('Slice C — shape + type transform preservation', () => {
    beforeEach(reset);

    it('Move Tool dragging a rect shape layer shifts shapeData.bounds and preserves kind="shape"', () => {
        const layer = installShapeLayer<ShapeRectData>({
            kind: 'rect',
            bounds: { x: 20, y: 30, w: 40, h: 40 },
            fill: { type: 'solid', color: '#ff0000' },
            stroke: null,
        });
        const move = getTool('move')!;
        const ctx = toolCtx();
        move.onPointerDown!(makeToolPointerEvent({ canvasX: 30, canvasY: 40 }), ctx);
        move.onPointerMove!(makeToolPointerEvent({ canvasX: 60, canvasY: 70 }), ctx);
        move.onPointerUp!(makeToolPointerEvent({ canvasX: 60, canvasY: 70 }), ctx);

        expect(layer.kind).toBe('shape');
        const data = layer.shapeData as ShapeRectData;
        expect(data.kind).toBe('rect');
        expect(data.bounds.x).toBe(50);
        expect(data.bounds.y).toBe(60);
        expect(data.bounds.w).toBe(40);
        expect(data.bounds.h).toBe(40);
    });

    it('Move Tool drag commits exactly one history entry on pointerUp, not one per move', () => {
        const layer = installShapeLayer<ShapeRectData>({
            kind: 'rect',
            bounds: { x: 10, y: 10, w: 20, h: 20 },
            fill: { type: 'solid', color: '#ff0000' },
            stroke: null,
        });
        const before = useEditorStore.getState().historyEntries.length;
        const move = getTool('move')!;
        const ctx = toolCtx();
        move.onPointerDown!(makeToolPointerEvent({ canvasX: 20, canvasY: 20 }), ctx);
        move.onPointerMove!(makeToolPointerEvent({ canvasX: 30, canvasY: 25 }), ctx);
        move.onPointerMove!(makeToolPointerEvent({ canvasX: 40, canvasY: 30 }), ctx);
        move.onPointerMove!(makeToolPointerEvent({ canvasX: 50, canvasY: 35 }), ctx);
        // No history entries while the drag is in flight.
        expect(useEditorStore.getState().historyEntries.length).toBe(before);
        move.onPointerUp!(makeToolPointerEvent({ canvasX: 50, canvasY: 35 }), ctx);
        // Exactly one entry on release.
        expect(useEditorStore.getState().historyEntries.length).toBe(before + 1);
        // Active layer's shapeData reflects the drag.
        const data = layer.shapeData as ShapeRectData;
        expect(data.bounds.x).toBe(40);
        expect(data.bounds.y).toBe(25);
    });

    it('Undo after Move Tool drag restores prior shape geometry', () => {
        const layer = installShapeLayer<ShapeRectData>({
            kind: 'rect',
            bounds: { x: 20, y: 30, w: 40, h: 40 },
            fill: { type: 'solid', color: '#ff0000' },
            stroke: null,
        });
        const move = getTool('move')!;
        const ctx = toolCtx();
        move.onPointerDown!(makeToolPointerEvent({ canvasX: 30, canvasY: 40 }), ctx);
        move.onPointerMove!(makeToolPointerEvent({ canvasX: 80, canvasY: 90 }), ctx);
        move.onPointerUp!(makeToolPointerEvent({ canvasX: 80, canvasY: 90 }), ctx);
        expect((layer.shapeData as ShapeRectData).bounds.x).toBe(70);

        useEditorStore.getState().undo();
        const data = layer.shapeData as ShapeRectData;
        expect(data.kind).toBe('rect');
        expect(data.bounds.x).toBe(20);
        expect(data.bounds.y).toBe(30);
        expect(data.bounds.w).toBe(40);
        expect(data.bounds.h).toBe(40);
    });

    it('moveShapeTarget on a polygon scales radius by avg(scaleX, scaleY)', () => {
        const input: ShapePolygonData = {
            kind: 'polygon',
            center: { x: 100, y: 100 },
            radius: 30,
            sides: 5,
            star: false,
            starRatio: 0.5,
            rotation: 0,
            fill: { type: 'solid', color: '#ff0000' },
            stroke: null,
        };
        const out = moveShapeTarget(input, 0, 0, 2, 2, 0) as ShapePolygonData;
        expect(out.kind).toBe('polygon');
        expect(out.radius).toBe(60);
        expect(out.center).toEqual({ x: 200, y: 200 });
    });

    it('moveShapeTarget on a line rotates endpoints around their midpoint', () => {
        const input: ShapeLineData = {
            kind: 'line',
            p0: { x: 50, y: 100 },
            p1: { x: 150, y: 100 },
            weight: 2,
            arrowStart: false,
            arrowEnd: false,
            arrowSize: 4,
            stroke: { color: '#ff0000', width: 2, opacity: 1, alignment: 'center', enabled: true },
        };
        const out = moveShapeTarget(input, 0, 0, 1, 1, Math.PI / 2) as ShapeLineData;
        // Midpoint is (100, 100). Rotating (50,100) by +90° around (100,100) → (100, 50).
        // Rotating (150,100) by +90° → (100, 150).
        expect(out.p0.x).toBeCloseTo(100, 4);
        expect(out.p0.y).toBeCloseTo(50, 4);
        expect(out.p1.x).toBeCloseTo(100, 4);
        expect(out.p1.y).toBeCloseTo(150, 4);
    });

    it('moveShapeTarget translates a custom shape bounds and tolerates non-uniform scale', () => {
        const input: ShapeCustomData = {
            kind: 'custom',
            presetId: 'heart',
            pathD: 'M0,0 L100,0 L100,100 L0,100 Z',
            bounds: { x: 10, y: 20, w: 50, h: 50 },
            fill: { type: 'solid', color: '#ff0000' },
            stroke: null,
        };
        const out = moveShapeTarget(input, 5, 5, 2, 1, 0) as ShapeCustomData;
        expect(out.kind).toBe('custom');
        expect(out.bounds.x).toBe(25); // 10*2 + 5
        expect(out.bounds.y).toBe(25); // 20*1 + 5
        expect(out.bounds.w).toBe(100);
        expect(out.bounds.h).toBe(50);
    });

    it('Custom shape at 2:1 aspect ratio letterboxes (uniform scale, axis-symmetric stroke width)', async () => {
        // Path2D is not implemented in node-canvas, so we verify the
        // letterbox math by spying on the context's translate/scale calls.
        // For a 100x100 viewbox letterboxed into a 200x100 bounds the renderer
        // must: translate by (bounds.x + 50, bounds.y + 0) and scale by (1, 1)
        // on BOTH axes — i.e., a single uniform factor rather than (2, 1) which
        // would pinch the stroke horizontally.
        const { drawShapeData } = await import('../tools/shapeRender');
        const calls: string[] = [];
        const fakeCtx = {
            save() { calls.push('save'); },
            restore() { calls.push('restore'); },
            translate(x: number, y: number) { calls.push(`translate(${x},${y})`); },
            scale(sx: number, sy: number) { calls.push(`scale(${sx},${sy})`); },
            beginPath() {},
            closePath() {},
            moveTo() {},
            lineTo() {},
            quadraticCurveTo() {},
            ellipse() {},
            rect() {},
            stroke() {},
            fill() {},
            setLineDash() {},
            set fillStyle(_v: string) { void _v; },
            set strokeStyle(_v: string) { void _v; },
            set lineWidth(_v: number) { void _v; },
            set globalAlpha(_v: number) { void _v; },
            get globalAlpha() { return 1; },
            set lineCap(_v: CanvasLineCap) { void _v; },
            set lineJoin(_v: CanvasLineJoin) { void _v; },
        } as unknown as CanvasRenderingContext2D;
        // Stub Path2D for the require path inside drawCustomShape.
        const prev = (globalThis as { Path2D?: unknown }).Path2D;
        (globalThis as { Path2D?: unknown }).Path2D = class { constructor(d: string) { void d; } };
        try {
            drawShapeData(fakeCtx, {
                kind: 'custom',
                presetId: 'square',
                pathD: 'M0,0 L100,0 L100,100 L0,100 Z',
                bounds: { x: 0, y: 0, w: 200, h: 100 },
                fill: { type: 'solid', color: '#ff0000' },
                stroke: { color: '#000', width: 2, opacity: 1, alignment: 'center', enabled: true },
            });
        } finally {
            (globalThis as { Path2D?: unknown }).Path2D = prev;
        }
        // Translate should account for the X-axis gutter ((200 - 100*uniform) / 2 = 50).
        const translateCall = calls.find(c => c.startsWith('translate('));
        const scaleCall = calls.find(c => c.startsWith('scale('));
        expect(translateCall).toBe('translate(50,0)');
        // Both axes should receive the same uniform scale (no pinching).
        expect(scaleCall).toBe('scale(1,1)');
    });

    it('Free Transform on a type layer updates typeData.transform.rotation and re-edit overlay mounts at that angle', () => {
        const layer = new Layer(300, 200, 'Type', 'type');
        const data: TypeLayerData = {
            id: 'type-1',
            text: 'Hello',
            style: { ...defaultTextStyle, fontSize: 24, color: '#000000' },
            orientation: 'horizontal',
            transform: { x: 50, y: 60, width: 100, height: 30, rotation: 0 },
            textMode: 'point',
            targetLayerId: layer.id,
        };
        commitTypeLayer(layer.canvas, data);
        layer.typeData = data;

        // Simulate Free Transform's rotation effect on typeData directly (matches
        // FreeTransformOverlay's type branch math). 30 degrees → 30 * π / 180 rad.
        const rot30deg = (30 * Math.PI) / 180;
        const updated: TypeLayerData = {
            ...structuredClone(data),
            transform: { ...data.transform, rotation: rot30deg },
        };
        layer.typeData = updated;

        expect((layer.typeData as TypeLayerData).transform.rotation).toBeCloseTo(rot30deg, 6);

        // Mount the TextEditOverlay against the updated typeData and assert the
        // CSS transform string includes the rotation in radians.
        setEditingType({ ...updated });
        const { container } = render(
            <TextEditOverlay
                visible
                transform={{
                    x: updated.transform.x,
                    y: updated.transform.y,
                    width: updated.transform.width,
                    height: updated.transform.height,
                    rotation: updated.transform.rotation,
                }}
                style={updated.style}
                initialValue={updated.text}
                zoom={1}
                onCommit={vi.fn()}
                onCancel={vi.fn()}
            />,
        );
        const root = container.firstChild as HTMLElement | null;
        expect(root).toBeTruthy();
        // jsdom should reflect inline `transform: translate(...) rotate(<rad>rad)`.
        const css = (root as HTMLElement).style.transform;
        expect(css).toContain('rotate');
        expect(css).toContain(`${rot30deg}rad`);
    });

    it('Shape Combine button during shape-tool drag only sets combineMode on the new layer (MVP)', () => {
        // Simulate the Options Bar button click: set combineMode = 'combine'.
        setShapeOptions({ combineMode: 'combine' });
        expect(getShapeOptions().combineMode).toBe('combine');

        // Now drag a new rectangle.
        const tool = getTool('shape-rectangle')!;
        const ctx = toolCtx();
        tool.onPointerDown!(makeToolPointerEvent({ canvasX: 20, canvasY: 20 }), ctx);
        tool.onPointerMove!(makeToolPointerEvent({ canvasX: 60, canvasY: 60 }), ctx);
        tool.onPointerUp!(makeToolPointerEvent({ canvasX: 60, canvasY: 60 }), ctx);

        const layers = useEditorStore.getState().layers;
        const newest = layers.at(-1)!;
        const data = newest.shapeData as ShapeRectData;
        expect(data.combineMode).toBe('combine');

        // After creation, combineMode resets to 'new' so subsequent shapes are
        // independent layers (MVP behavior — no cross-layer composition).
        expect(getShapeOptions().combineMode).toBe('new');

        // Confirm a follow-up shape records combineMode = 'new'.
        tool.onPointerDown!(makeToolPointerEvent({ canvasX: 100, canvasY: 100 }), ctx);
        tool.onPointerMove!(makeToolPointerEvent({ canvasX: 140, canvasY: 140 }), ctx);
        tool.onPointerUp!(makeToolPointerEvent({ canvasX: 140, canvasY: 140 }), ctx);
        const second = useEditorStore.getState().layers.at(-1)!;
        expect((second.shapeData as ShapeRectData).combineMode).toBe('new');
    });

    it('Free Transform on a polygon scales shapeData.radius (geometry preserved, not rasterized)', () => {
        const layer = installShapeLayer<ShapePolygonData>({
            kind: 'polygon',
            center: { x: 100, y: 100 },
            radius: 25,
            sides: 6,
            star: false,
            starRatio: 0.5,
            rotation: 0,
            fill: { type: 'solid', color: '#00ff00' },
            stroke: null,
        });
        const before = (layer.shapeData as ShapePolygonData).radius;

        // Compose the transform the way FreeTransformOverlay would (scale 2x
        // around the polygon's bounding box):
        const next = moveShapeTarget(
            layer.shapeData as ShapePolygonData,
            0, 0, 2, 2, 0,
        );
        layer.shapeData = next;
        rerenderShapeLayer(layer);

        expect((layer.shapeData as ShapePolygonData).kind).toBe('polygon');
        expect((layer.shapeData as ShapePolygonData).radius).toBe(before * 2);
    });

    it('Free Transform on an ellipse keeps shapeData.kind === "ellipse"', () => {
        const layer = installShapeLayer<ShapeEllipseData>({
            kind: 'ellipse',
            bounds: { x: 20, y: 20, w: 60, h: 40 },
            fill: { type: 'solid', color: '#0000ff' },
            stroke: null,
        });
        const next = moveShapeTarget(layer.shapeData as ShapeEllipseData, 10, 10, 1.5, 1.5, 0);
        layer.shapeData = next;
        rerenderShapeLayer(layer);
        const data = layer.shapeData as ShapeEllipseData;
        expect(data.kind).toBe('ellipse');
        expect(data.bounds.w).toBe(90);
        expect(data.bounds.h).toBe(60);
    });
});
