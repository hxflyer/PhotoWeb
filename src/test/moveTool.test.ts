import { describe, expect, it, beforeEach, vi } from 'vitest';
import { Layer } from '../core/Layer';
import { useEditorStore } from '../store/editorStore';
import { ensureStubsRegistered } from '../tools/stubs';
import { getTool } from '../tools/registry';
import type { ToolPointerEvent } from '../tools/Tool';
import { layerPixelAt } from './simulator';

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
        }));
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
});
