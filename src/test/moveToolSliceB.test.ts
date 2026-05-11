import { describe, it, expect, beforeEach, vi } from 'vitest';
import { Layer } from '../core/Layer';
import { useEditorStore } from '../store/editorStore';
import { ensureStubsRegistered } from '../tools/stubs';
import { getTool } from '../tools/registry';
import type { ToolPointerEvent } from '../tools/Tool';
import { layerPixelAt } from './simulator';
import { setMoveOptions, getMoveOptions } from '../tools/move';

function pointer(x: number, y: number, mods: Partial<ToolPointerEvent> = {}): ToolPointerEvent {
    return {
        canvasX: x,
        canvasY: y,
        clientX: x,
        clientY: y,
        button: 0,
        buttons: 1,
        shift: false,
        alt: false,
        meta: false,
        ctrl: false,
        pressure: 1,
        pointerType: 'mouse',
        rawEvent: new MouseEvent('mousedown') as PointerEvent,
        ...mods,
    };
}

function moveCtx() {
    return {
        store: useEditorStore.getState(),
        getStore: () => useEditorStore.getState(),
        requestRender: vi.fn(),
    };
}

describe('Slice B — Move tool', () => {
    beforeEach(() => {
        ensureStubsRegistered();
        useEditorStore.getState().clearHistory();
        useEditorStore.setState(s => ({
            ...s,
            width: 16,
            height: 16,
            layers: [],
            activeLayerId: null,
            selection: { ...s.selection, hasSelection: false, path: [], operations: [], polyPoints: [], isDraggingSelection: false },
        }));
        setMoveOptions({ autoSelect: 'off', showTransformControls: false });
    });

    it('Alt-drag duplicates the active layer and moves the duplicate', () => {
        const layer = new Layer(16, 16, 'Original');
        layer.ctx.fillStyle = '#ff0000';
        layer.ctx.fillRect(2, 2, 2, 2);
        useEditorStore.setState(s => ({ ...s, layers: [layer], activeLayerId: layer.id }));

        const move = getTool('move')!;
        const ctx = moveCtx();
        move.onPointerDown?.(pointer(3, 3, { alt: true }), ctx);
        move.onPointerMove?.(pointer(8, 3, { alt: true }), ctx);
        move.onPointerUp?.(pointer(8, 3, { alt: true }), ctx);

        const layers = useEditorStore.getState().layers;
        expect(layers.length).toBe(2);
        // Original keeps its pixels at (2..3, 2..3).
        const orig = layers.find(l => l.id === layer.id)!;
        expect(layerPixelAt(orig, 2, 2).a).toBe(255);
        // Duplicate (now active) has its pixels translated to (7..8, 2..3).
        const dup = layers.find(l => l.id !== layer.id)!;
        expect(layerPixelAt(dup, 7, 2).a).toBe(255);
    });

    it('Shift-drag constrains motion to the nearest axis (H/V/45°)', () => {
        const layer = new Layer(16, 16, 'AxisConstrained');
        layer.ctx.fillStyle = '#00ff00';
        layer.ctx.fillRect(2, 2, 1, 1);
        useEditorStore.setState(s => ({ ...s, layers: [layer], activeLayerId: layer.id }));

        const move = getTool('move')!;
        const ctx = moveCtx();
        // Drag mostly horizontal with a small vertical wobble; Shift should
        // zero the small axis.
        move.onPointerDown?.(pointer(2, 2, { shift: true }), ctx);
        move.onPointerMove?.(pointer(10, 3, { shift: true }), ctx);
        move.onPointerUp?.(pointer(10, 3, { shift: true }), ctx);

        // Pixel ended up on the horizontal axis (y unchanged at 2).
        expect(layerPixelAt(layer, 10, 2).a).toBe(255);
        expect(layerPixelAt(layer, 10, 3).a).toBe(0);
    });

    it('Auto-Select picks the topmost non-transparent layer under the cursor', () => {
        const bottom = new Layer(16, 16, 'Bottom');
        bottom.ctx.fillStyle = '#222222';
        bottom.ctx.fillRect(0, 0, 16, 16);
        const top = new Layer(16, 16, 'Top');
        top.ctx.fillStyle = '#ff0000';
        top.ctx.fillRect(4, 4, 4, 4);
        useEditorStore.setState(s => ({
            ...s,
            layers: [bottom, top],
            activeLayerId: bottom.id, // Start with bottom as active.
        }));

        setMoveOptions({ autoSelect: 'layer', showTransformControls: false });
        const move = getTool('move')!;
        const ctx = moveCtx();
        move.onPointerDown?.(pointer(5, 5), ctx);
        // After pointer-down, active should be the top layer (the one with
        // non-transparent pixels at 5,5 — both layers cover, but top is on top).
        expect(useEditorStore.getState().activeLayerId).toBe(top.id);
        move.onPointerUp?.(pointer(5, 5), ctx);
    });

    it('Cmd-click temporarily auto-selects even when Auto-Select is off', () => {
        const bottom = new Layer(16, 16, 'Bottom');
        const top = new Layer(16, 16, 'Top');
        top.ctx.fillStyle = '#ff0000';
        top.ctx.fillRect(4, 4, 4, 4);
        useEditorStore.setState(s => ({
            ...s,
            layers: [bottom, top],
            activeLayerId: bottom.id,
        }));

        const move = getTool('move')!;
        const ctx = moveCtx();
        move.onPointerDown?.(pointer(5, 5, { meta: true }), ctx);
        expect(useEditorStore.getState().activeLayerId).toBe(top.id);
        move.onPointerUp?.(pointer(5, 5, { meta: true }), ctx);
    });

    it('setMoveOptions toggles autoSelect scope between layer and group', () => {
        setMoveOptions({ autoSelect: 'group' });
        expect(getMoveOptions().autoSelect).toBe('group');
        setMoveOptions({ autoSelect: 'off' });
        expect(getMoveOptions().autoSelect).toBe('off');
    });
});
