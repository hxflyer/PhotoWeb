import { describe, expect, it, beforeEach, vi } from 'vitest';
import { Layer } from '../core/Layer';
import { useEditorStore } from '../store/editorStore';
import { ensureStubsRegistered } from '../tools/stubs';
import { getTool } from '../tools/registry';
import type { ToolPointerEvent } from '../tools/Tool';
import { layerPixelAt } from './simulator';
import { commitTypeLayer, defaultTextStyle, type TypeLayerData } from '../tools/type';
import { moveSelectedPixelsBy } from '../tools/move';

function pointer(x: number, y: number, button = 0): ToolPointerEvent {
    return {
        canvasX: x,
        canvasY: y,
        clientX: x,
        clientY: y,
        button,
        buttons: button === 0 ? 1 : 0,
        shift: false,
        alt: false,
        meta: false,
        ctrl: false,
        pressure: 0.5,
        pointerType: 'mouse',
        rawEvent: new MouseEvent('mousedown') as PointerEvent,
    };
}

describe('move tool', () => {
    beforeEach(() => {
        ensureStubsRegistered();
        useEditorStore.setState(s => ({
            ...s,
            width: 8,
            height: 8,
            layers: [],
            activeLayerId: null,
            selection: {
                ...s.selection,
                hasSelection: false,
                path: [],
                operations: [],
                polyPoints: [],
                isDraggingSelection: false,
            },
        }));
        useEditorStore.getState().clearHistory();
    });

    it('drags the active layer pixels instead of panning the viewport', () => {
        const layer = new Layer(8, 8, 'Move target');
        layer.ctx.fillStyle = '#ff0000';
        layer.ctx.fillRect(1, 1, 1, 1);
        useEditorStore.setState(s => ({
            ...s,
            layers: [layer],
            activeLayerId: layer.id,
            pan: { x: 0, y: 0 },
        }));
        const move = getTool('move');
        expect(move).toBeTruthy();
        const requestRender = vi.fn();
        const ctx = {
            store: useEditorStore.getState(),
            getStore: () => useEditorStore.getState(),
            requestRender,
        };

        move!.onPointerDown?.(pointer(1, 1), ctx);
        move!.onPointerMove?.(pointer(4, 3), ctx);
        move!.onPointerUp?.(pointer(4, 3), ctx);

        expect(layerPixelAt(layer, 1, 1)).toMatchObject({ a: 0 });
        expect(layerPixelAt(layer, 4, 3)).toMatchObject({ r: 255, g: 0, b: 0, a: 255 });
        expect(useEditorStore.getState().pan).toEqual({ x: 0, y: 0 });
        expect(requestRender).toHaveBeenCalled();
    });

    it('moves only selected pixels when dragging inside an active selection', () => {
        const layer = new Layer(8, 8, 'Selected pixels');
        layer.ctx.fillStyle = '#ff0000';
        layer.ctx.fillRect(1, 1, 1, 1);
        layer.ctx.fillStyle = '#0000ff';
        layer.ctx.fillRect(6, 6, 1, 1);
        useEditorStore.setState(s => ({
            ...s,
            layers: [layer],
            activeLayerId: layer.id,
            selection: {
                ...s.selection,
                hasSelection: true,
                mode: 'rect',
                path: [{ x: 1, y: 1 }, { x: 2, y: 2 }],
                operations: [{ mode: 'add', type: 'rect', path: [{ x: 1, y: 1 }, { x: 2, y: 2 }] }],
            },
        }));
        const move = getTool('move')!;
        const ctx = {
            store: useEditorStore.getState(),
            getStore: () => useEditorStore.getState(),
            requestRender: vi.fn(),
        };

        move.onPointerDown?.(pointer(1, 1), ctx);
        move.onPointerMove?.(pointer(3, 2), ctx);
        move.onPointerUp?.(pointer(3, 2), ctx);

        expect(layerPixelAt(layer, 1, 1)).toMatchObject({ a: 0 });
        expect(layerPixelAt(layer, 3, 2)).toMatchObject({ r: 255, g: 0, b: 0, a: 255 });
        expect(layerPixelAt(layer, 6, 6)).toMatchObject({ r: 0, g: 0, b: 255, a: 255 });
        expect(useEditorStore.getState().selection.operations[0].path[0]).toEqual({ x: 3, y: 2 });

        useEditorStore.getState().undo();
        expect(layerPixelAt(layer, 1, 1)).toMatchObject({ r: 255, g: 0, b: 0, a: 255 });
        expect(layerPixelAt(layer, 3, 2)).toMatchObject({ a: 0 });
        expect(layerPixelAt(layer, 6, 6)).toMatchObject({ r: 0, g: 0, b: 255, a: 255 });
        expect(useEditorStore.getState().selection.operations[0].path[0]).toEqual({ x: 1, y: 1 });

        useEditorStore.getState().redo();
        expect(layerPixelAt(layer, 3, 2)).toMatchObject({ r: 255, g: 0, b: 0, a: 255 });
        expect(useEditorStore.getState().selection.operations[0].path[0]).toEqual({ x: 3, y: 2 });
    });

    it('nudges selected pixels with arrow-key semantics', () => {
        const layer = new Layer(8, 8, 'Nudge pixels');
        layer.ctx.fillStyle = '#ff0000';
        layer.ctx.fillRect(1, 1, 1, 1);
        layer.ctx.fillStyle = '#0000ff';
        layer.ctx.fillRect(6, 6, 1, 1);
        useEditorStore.setState(s => ({
            ...s,
            layers: [layer],
            activeLayerId: layer.id,
            activeTool: 'move',
            selection: {
                ...s.selection,
                hasSelection: true,
                mode: 'rect',
                path: [{ x: 1, y: 1 }, { x: 2, y: 2 }],
                operations: [{ mode: 'add', type: 'rect', path: [{ x: 1, y: 1 }, { x: 2, y: 2 }] }],
            },
        }));

        expect(moveSelectedPixelsBy(1, 0, useEditorStore.getState())).toBe(true);
        expect(layerPixelAt(layer, 1, 1)).toMatchObject({ a: 0 });
        expect(layerPixelAt(layer, 2, 1)).toMatchObject({ r: 255, g: 0, b: 0, a: 255 });
        expect(layerPixelAt(layer, 6, 6)).toMatchObject({ r: 0, g: 0, b: 255, a: 255 });
        expect(useEditorStore.getState().selection.operations[0].path[0]).toEqual({ x: 2, y: 1 });

        useEditorStore.getState().undo();
        expect(layerPixelAt(layer, 1, 1)).toMatchObject({ r: 255, g: 0, b: 0, a: 255 });
        expect(layerPixelAt(layer, 2, 1)).toMatchObject({ a: 0 });
        expect(useEditorStore.getState().selection.operations[0].path[0]).toEqual({ x: 1, y: 1 });
    });

    it('moves editable type-layer metadata with the rendered text', () => {
        const layer = new Layer(160, 120, 'Type target', 'type');
        const typeData: TypeLayerData = {
            id: 'type-target',
            text: 'Move me',
            style: { ...defaultTextStyle, fontSize: 24, color: '#000000' },
            orientation: 'horizontal',
            transform: { x: 20, y: 30, width: 120, height: 40, rotation: 0 },
            textMode: 'box',
            targetLayerId: layer.id,
        };
        commitTypeLayer(layer.canvas, typeData);
        layer.typeData = typeData;
        useEditorStore.setState(s => ({
            ...s,
            width: 160,
            height: 120,
            layers: [layer],
            activeLayerId: layer.id,
        }));
        const move = getTool('move')!;
        const ctx = {
            store: useEditorStore.getState(),
            getStore: () => useEditorStore.getState(),
            requestRender: vi.fn(),
        };

        move.onPointerDown?.(pointer(20, 30), ctx);
        move.onPointerMove?.(pointer(35, 38), ctx);
        move.onPointerUp?.(pointer(35, 38), ctx);

        expect((layer.typeData as TypeLayerData).transform).toMatchObject({ x: 35, y: 38 });
        expect((layer.typeData as TypeLayerData).bounds).toMatchObject({ x: 35, y: 38 });

        useEditorStore.getState().undo();
        expect((layer.typeData as TypeLayerData).transform).toMatchObject({ x: 20, y: 30 });

        useEditorStore.getState().redo();
        expect((layer.typeData as TypeLayerData).transform).toMatchObject({ x: 35, y: 38 });
    });
});
