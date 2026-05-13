import { describe, it, expect, beforeEach, vi } from 'vitest';
import { Layer } from '../core/Layer';
import { useEditorStore } from '../store/editorStore';
import { ensureStubsRegistered } from '../tools/stubs';
import { getTool } from '../tools/registry';
import type { ToolPointerEvent, ToolKeyEvent } from '../tools/Tool';
import { setMagneticLassoOptions, getMagneticLassoOptions } from '../tools/magneticLasso';

ensureStubsRegistered();

function pointer(x: number, y: number): ToolPointerEvent {
    return {
        canvasX: x, canvasY: y, clientX: x, clientY: y,
        button: 0, buttons: 1,
        shift: false, alt: false, meta: false, ctrl: false,
        pressure: 1, pointerType: 'mouse',
        rawEvent: new MouseEvent('mousedown') as PointerEvent,
    };
}

function pointerWith(x: number, y: number, modifiers: Partial<Pick<ToolPointerEvent, 'shift' | 'alt' | 'meta' | 'ctrl'>>): ToolPointerEvent {
    return { ...pointer(x, y), ...modifiers };
}

function keyEvt(key: string): ToolKeyEvent {
    return {
        key,
        shift: false, alt: false, ctrl: false, meta: false,
        rawEvent: new KeyboardEvent('keydown', { key }),
    };
}

function toolCtx() {
    return {
        store: useEditorStore.getState(),
        getStore: () => useEditorStore.getState(),
        requestRender: vi.fn(),
    };
}

describe('Magnetic Lasso tool', () => {
    beforeEach(() => {
        useEditorStore.getState().clearHistory();
        // High-contrast horizontal edge at y=20: bright on top, dark on bottom.
        const layer = new Layer(80, 40, 'L');
        layer.ctx.fillStyle = '#ffffff';
        layer.ctx.fillRect(0, 0, 80, 20);
        layer.ctx.fillStyle = '#000000';
        layer.ctx.fillRect(0, 20, 80, 20);
        useEditorStore.setState(s => ({
            ...s,
            width: 80, height: 40,
            layers: [layer], activeLayerId: layer.id,
            selection: { ...s.selection, hasSelection: false, path: [], operations: [], polyPoints: [], isDraggingSelection: false },
        }));
        setMagneticLassoOptions({ width: 8, contrast: 10, frequency: 100 });
    });

    it('options round-trip', () => {
        setMagneticLassoOptions({ width: 25, contrast: 30, frequency: 60 });
        const opts = getMagneticLassoOptions();
        expect(opts.width).toBe(25);
        expect(opts.contrast).toBe(30);
        expect(opts.frequency).toBe(60);
    });

    it('bracket and comma/period keys adjust width and contrast', () => {
        const tool = getTool('magnetic-lasso')!;
        const ctx = toolCtx();
        setMagneticLassoOptions({ width: 10, contrast: 10 });
        tool.onKeyDown!(keyEvt(']'), ctx);
        tool.onKeyDown!(keyEvt('.'), ctx);
        expect(getMagneticLassoOptions()).toMatchObject({ width: 11, contrast: 11 });
        tool.onKeyDown!(keyEvt('['), ctx);
        tool.onKeyDown!(keyEvt(','), ctx);
        expect(getMagneticLassoOptions()).toMatchObject({ width: 10, contrast: 10 });
    });

    it('first click plants the seed anchor, second click anchors near the edge', () => {
        const tool = getTool('magnetic-lasso')!;
        const ctx = toolCtx();
        // Click at (10, 25) — well below the white/black boundary.
        tool.onPointerDown!(pointer(10, 25), ctx);
        // Move horizontally near the edge — snap should pull y toward 20.
        tool.onPointerMove!(pointer(20, 25), ctx);
        tool.onPointerMove!(pointer(30, 25), ctx);
        tool.onPointerMove!(pointer(40, 25), ctx);
        // Press Enter to commit.
        tool.onKeyDown!(keyEvt('Enter'), ctx);
        const ops = useEditorStore.getState().selection.operations;
        expect(ops.length).toBe(1);
        expect(ops[0].path.length).toBeGreaterThanOrEqual(2);
    });

    it('Escape abandons the in-progress polyline', () => {
        const tool = getTool('magnetic-lasso')!;
        const ctx = toolCtx();
        tool.onPointerDown!(pointer(10, 25), ctx);
        tool.onPointerMove!(pointer(40, 25), ctx);
        tool.onKeyDown!(keyEvt('Escape'), ctx);
        const ops = useEditorStore.getState().selection.operations;
        expect(ops.length).toBe(0);
    });

    it('Backspace removes the last anchor', () => {
        const tool = getTool('magnetic-lasso')!;
        const ctx = toolCtx();
        tool.onPointerDown!(pointer(10, 25), ctx);
        tool.onPointerDown!(pointer(30, 25), ctx);
        tool.onPointerDown!(pointer(50, 25), ctx);
        tool.onKeyDown!(keyEvt('Backspace'), ctx);
        tool.onKeyDown!(keyEvt('Enter'), ctx);
        // After Backspace we should have at most 2 anchors → not enough to commit.
        // Enter only fires when anchors.length >= 3, so a non-commit means no op.
        const ops = useEditorStore.getState().selection.operations;
        expect(ops.length).toBe(0);
    });

    it('clicking the first anchor closes the loop and commits', () => {
        const tool = getTool('magnetic-lasso')!;
        const ctx = toolCtx();
        tool.onPointerDown!(pointer(10, 25), ctx);
        tool.onPointerDown!(pointer(40, 25), ctx);
        tool.onPointerDown!(pointer(40, 35), ctx);
        // Click back near the first anchor (within 10px).
        tool.onPointerDown!(pointer(11, 26), ctx);
        const ops = useEditorStore.getState().selection.operations;
        expect(ops.length).toBe(1);
        expect(ops[0].type).toBe('lasso');
    });

    it('captures subtract operation on the first click even if Alt is released before commit', () => {
        useEditorStore.getState().setSelectionOperations([
            { mode: 'add', type: 'rect', path: [{ x: 0, y: 0 }, { x: 79, y: 39 }] },
        ]);
        const tool = getTool('magnetic-lasso')!;
        const ctx = toolCtx();
        tool.onPointerDown!(pointerWith(10, 25, { alt: true }), ctx);
        tool.onPointerDown!(pointer(40, 25), ctx);
        tool.onPointerDown!(pointer(40, 35), ctx);
        tool.onPointerDown!(pointer(11, 26), ctx);
        const ops = useEditorStore.getState().selection.operations;
        expect(ops.at(-1)?.mode).toBe('sub');
    });
});
