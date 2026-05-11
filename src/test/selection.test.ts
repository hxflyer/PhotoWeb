import { describe, it, expect, beforeEach } from 'vitest';
import { useEditorStore } from '../store/editorStore';
import { getTool } from '../tools/registry';
import { ensureStubsRegistered } from '../tools/stubs';
import { defaultMagicWandOptions, setMagicWandOptions } from '../tools/magicWand';
import { setQuickSelectionOptions } from '../tools/quickSelection';
import { makeToolPointerEvent } from './simulator';

ensureStubsRegistered();

function reset() {
    useEditorStore.getState().clearHistory();
    useEditorStore.setState((s) => ({
        ...s,
        layers: [],
        activeLayerId: null,
        selection: {
            ...s.selection,
            hasSelection: false,
            path: [],
            polyPoints: [],
            operations: [],
            isDraggingSelection: false,
            feather: 0,
        },
    }));
    setMagicWandOptions(defaultMagicWandOptions);
    setQuickSelectionOptions({ size: 30, sampleAllLayers: false, autoEnhance: true });
    useEditorStore.getState().addLayer();
    useEditorStore.getState().clearHistory();
}

function ctx() {
    return {
        store: useEditorStore.getState(),
        getStore: () => useEditorStore.getState(),
        requestRender: () => {},
    };
}

function paintSplitLayer() {
    const store = useEditorStore.getState();
    store.setCanvasSize(10, 10);
    const layer = store.layers.find(l => l.id === store.activeLayerId);
    if (!layer) throw new Error('missing active layer');
    layer.ctx.clearRect(0, 0, 10, 10);
    layer.ctx.fillStyle = '#ff0000';
    layer.ctx.fillRect(0, 0, 5, 10);
    layer.ctx.fillStyle = '#0000ff';
    layer.ctx.fillRect(5, 0, 5, 10);
    layer.markDirty(null);
}

function selectedPixels(mask: Uint8ClampedArray | undefined): number {
    if (!mask) return 0;
    return Array.from(mask).filter(Boolean).length;
}

describe('selection tools', () => {
    beforeEach(reset);

    it('marquee-rect: drag from (10,20) to (110,80) yields a rect path', () => {
        const tool = getTool('marquee-rect');
        if (!tool) throw new Error('marquee-rect not registered');
        tool.onPointerDown!(makeToolPointerEvent({ canvasX: 10, canvasY: 20 }), ctx());
        tool.onPointerMove!(makeToolPointerEvent({ canvasX: 110, canvasY: 80 }), ctx());
        tool.onPointerUp!(makeToolPointerEvent({ canvasX: 110, canvasY: 80 }), ctx());
        const sel = useEditorStore.getState().selection;
        expect(sel.hasSelection).toBe(true);
        expect(sel.operations.length).toBe(1);
        const op = sel.operations[0];
        expect(op.type).toBe('rect');
        expect(op.path).toEqual([{ x: 10, y: 20 }, { x: 110, y: 80 }]);
    });

    it('marquee-rect clears an existing selection immediately on mouse-down outside it', () => {
        const tool = getTool('marquee-rect')!;
        useEditorStore.getState().setSelectionOperations([
            { mode: 'add', type: 'rect', path: [{ x: 10, y: 10 }, { x: 50, y: 50 }] },
        ]);

        tool.onPointerDown!(makeToolPointerEvent({ canvasX: 70, canvasY: 70 }), ctx());

        expect(useEditorStore.getState().selection.hasSelection).toBe(false);
        expect(useEditorStore.getState().selection.operations).toEqual([]);
    });

    it('marquee-rect drags an existing selection outline when mouse starts inside it', () => {
        const tool = getTool('marquee-rect')!;
        useEditorStore.getState().setSelectionOperations([
            { mode: 'add', type: 'rect', path: [{ x: 10, y: 10 }, { x: 50, y: 50 }] },
        ]);

        tool.onPointerDown!(makeToolPointerEvent({ canvasX: 20, canvasY: 20 }), ctx());
        tool.onPointerMove!(makeToolPointerEvent({ canvasX: 35, canvasY: 30 }), ctx());

        expect(useEditorStore.getState().selection.operations[0].path).toEqual([
            { x: 25, y: 20 },
            { x: 65, y: 60 },
        ]);

        tool.onPointerUp!(makeToolPointerEvent({ canvasX: 35, canvasY: 30 }), ctx());
        expect(useEditorStore.getState().selection.hasSelection).toBe(true);
    });

    it('undo and redo restore committed selection operations', () => {
        const op = { mode: 'add' as const, type: 'rect' as const, path: [{ x: 0, y: 0 }, { x: 20, y: 20 }] };
        useEditorStore.getState().setSelectionOperations([op]);
        expect(useEditorStore.getState().selection.operations).toHaveLength(1);

        useEditorStore.getState().undo();
        expect(useEditorStore.getState().selection.operations).toHaveLength(0);

        useEditorStore.getState().redo();
        expect(useEditorStore.getState().selection.operations).toEqual([op]);
    });

    it('marquee-rect with Shift constrains to a square', () => {
        const tool = getTool('marquee-rect')!;
        tool.onPointerDown!(makeToolPointerEvent({ canvasX: 0, canvasY: 0 }), ctx());
        tool.onPointerUp!(makeToolPointerEvent({ canvasX: 80, canvasY: 30, modifiers: { shift: true } }), ctx());
        const op = useEditorStore.getState().selection.operations[0];
        const w = op.path[1].x - op.path[0].x;
        const h = op.path[1].y - op.path[0].y;
        expect(w).toBe(h);
    });

    it('marquee-rect with Alt draws from center', () => {
        const tool = getTool('marquee-rect')!;
        tool.onPointerDown!(makeToolPointerEvent({ canvasX: 100, canvasY: 100 }), ctx());
        tool.onPointerUp!(makeToolPointerEvent({ canvasX: 130, canvasY: 120, modifiers: { alt: true } }), ctx());
        const op = useEditorStore.getState().selection.operations[0];
        // From-center: anchor at (100,100), |dx|=30 |dy|=20, so rect spans (70,80)-(130,120) — width 60, height 40
        expect(op.path[1].x - op.path[0].x).toBe(60);
        expect(op.path[1].y - op.path[0].y).toBe(40);
        expect(op.path[0].x).toBe(70);
        expect(op.path[0].y).toBe(80);
    });

    it('lasso: drag traces a polyline path with hasSelection=true', () => {
        const tool = getTool('lasso')!;
        tool.onPointerDown!(makeToolPointerEvent({ canvasX: 10, canvasY: 10 }), ctx());
        tool.onPointerMove!(makeToolPointerEvent({ canvasX: 50, canvasY: 30 }), ctx());
        tool.onPointerMove!(makeToolPointerEvent({ canvasX: 60, canvasY: 80 }), ctx());
        tool.onPointerUp!(makeToolPointerEvent({ canvasX: 60, canvasY: 80 }), ctx());
        const sel = useEditorStore.getState().selection;
        expect(sel.hasSelection).toBe(true);
        expect(sel.operations[0].type).toBe('lasso');
        expect(sel.operations[0].path.length).toBeGreaterThanOrEqual(3);
    });

    it('lasso click outside the existing selection dismisses it and starts a fresh lasso path', () => {
        const rect = getTool('marquee-rect')!;
        rect.onPointerDown!(makeToolPointerEvent({ canvasX: 10, canvasY: 20 }), ctx());
        rect.onPointerMove!(makeToolPointerEvent({ canvasX: 110, canvasY: 80 }), ctx());
        rect.onPointerUp!(makeToolPointerEvent({ canvasX: 110, canvasY: 80 }), ctx());

        const lasso = getTool('lasso')!;
        // Click clearly outside the (10..110, 20..80) rect — outside-dismiss applies.
        lasso.onPointerDown!(makeToolPointerEvent({ canvasX: 200, canvasY: 200 }), ctx());
        lasso.onPointerMove!(makeToolPointerEvent({ canvasX: 250, canvasY: 200 }), ctx());
        lasso.onPointerMove!(makeToolPointerEvent({ canvasX: 250, canvasY: 250 }), ctx());
        lasso.onPointerUp!(makeToolPointerEvent({ canvasX: 200, canvasY: 250 }), ctx());

        const sel = useEditorStore.getState().selection;
        expect(sel.operations).toHaveLength(1);
        expect(sel.operations[0].type).toBe('lasso');
    });

    it('shift held from mouse-down adds a second selection operation', () => {
        const rect = getTool('marquee-rect')!;
        rect.onPointerDown!(makeToolPointerEvent({ canvasX: 10, canvasY: 20 }), ctx());
        rect.onPointerMove!(makeToolPointerEvent({ canvasX: 110, canvasY: 80 }), ctx());
        rect.onPointerUp!(makeToolPointerEvent({ canvasX: 110, canvasY: 80 }), ctx());

        // Photoshop: Shift on pointer-down resolves to "add"; the modifier is
        // captured on pointer-up so consistency between down and up matters.
        rect.onPointerDown!(makeToolPointerEvent({ canvasX: 130, canvasY: 20, modifiers: { shift: true } }), ctx());
        rect.onPointerMove!(makeToolPointerEvent({ canvasX: 180, canvasY: 80, modifiers: { shift: true } }), ctx());
        rect.onPointerUp!(makeToolPointerEvent({ canvasX: 180, canvasY: 80, modifiers: { shift: true } }), ctx());

        const sel = useEditorStore.getState().selection;
        expect(sel.operations).toHaveLength(2);
        expect(sel.operations[1].mode).toBe('add');
    });

    it('cmd/ctrl held from mouse-down subtracts for marquee selections', () => {
        const rect = getTool('marquee-rect')!;
        rect.onPointerDown!(makeToolPointerEvent({ canvasX: 10, canvasY: 20 }), ctx());
        rect.onPointerMove!(makeToolPointerEvent({ canvasX: 110, canvasY: 80 }), ctx());
        rect.onPointerUp!(makeToolPointerEvent({ canvasX: 110, canvasY: 80 }), ctx());

        rect.onPointerDown!(makeToolPointerEvent({ canvasX: 40, canvasY: 30, modifiers: { meta: true } }), ctx());
        rect.onPointerMove!(makeToolPointerEvent({ canvasX: 70, canvasY: 60, modifiers: { meta: true } }), ctx());
        rect.onPointerUp!(makeToolPointerEvent({ canvasX: 70, canvasY: 60, modifiers: { meta: true } }), ctx());

        const sel = useEditorStore.getState().selection;
        expect(sel.operations).toHaveLength(2);
        expect(sel.operations[1].mode).toBe('sub');
    });

    it('lasso-poly: click 3 points then Enter commits', () => {
        const tool = getTool('lasso-poly')!;
        tool.onPointerDown!(makeToolPointerEvent({ canvasX: 0, canvasY: 0 }), ctx());
        tool.onPointerDown!(makeToolPointerEvent({ canvasX: 50, canvasY: 0 }), ctx());
        tool.onPointerDown!(makeToolPointerEvent({ canvasX: 25, canvasY: 50 }), ctx());
        tool.onKeyDown!({ key: 'Enter', shift: false, alt: false, meta: false, ctrl: false, rawEvent: new KeyboardEvent('keydown') }, ctx());
        const sel = useEditorStore.getState().selection;
        expect(sel.hasSelection).toBe(true);
        expect(sel.operations[0].type).toBe('lasso-poly');
        expect(sel.operations[0].path.length).toBe(3);
    });

    it('magic-wand commits a raster mask instead of an unordered lasso path', () => {
        setMagicWandOptions({ antiAlias: false });
        paintSplitLayer();
        const tool = getTool('magic-wand')!;
        tool.onPointerDown!(makeToolPointerEvent({ canvasX: 2, canvasY: 2 }), ctx());

        const op = useEditorStore.getState().selection.operations[0];
        expect(op.type).toBe('lasso');
        expect(op.path).toEqual([]);
        expect(op.mask?.width).toBe(10);
        expect(op.mask?.height).toBe(10);
        expect(selectedPixels(op.mask?.data)).toBe(50);
    });

    it('plain magic-wand replaces an existing selection', () => {
        setMagicWandOptions({ antiAlias: false });
        const rect = getTool('marquee-rect')!;
        rect.onPointerDown!(makeToolPointerEvent({ canvasX: 0, canvasY: 0 }), ctx());
        rect.onPointerUp!(makeToolPointerEvent({ canvasX: 4, canvasY: 4 }), ctx());
        paintSplitLayer();

        const tool = getTool('magic-wand')!;
        tool.onPointerDown!(makeToolPointerEvent({ canvasX: 7, canvasY: 2 }), ctx());

        const sel = useEditorStore.getState().selection;
        expect(sel.operations).toHaveLength(1);
        expect(sel.operations[0].mask).toBeDefined();
        expect(selectedPixels(sel.operations[0].mask?.data)).toBe(50);
    });

    it('magic-wand tolerance changes which similar colors are selected', () => {
        const store = useEditorStore.getState();
        store.setCanvasSize(3, 1);
        const layer = store.layers.find(l => l.id === store.activeLayerId)!;
        const img = layer.ctx.createImageData(3, 1);
        img.data.set([
            100, 0, 0, 255,
            110, 0, 0, 255,
            150, 0, 0, 255,
        ]);
        layer.ctx.putImageData(img, 0, 0);

        const tool = getTool('magic-wand')!;
        setMagicWandOptions({ tolerance: 5, antiAlias: false, contiguous: false });
        tool.onPointerDown!(makeToolPointerEvent({ canvasX: 0, canvasY: 0 }), ctx());
        expect(selectedPixels(useEditorStore.getState().selection.operations[0].mask?.data)).toBe(1);

        // Selection inside the wand area now means a second click at the same
        // point would enter move-mode; deselect first to test re-sampling.
        useEditorStore.getState().clearSelection();
        setMagicWandOptions({ tolerance: 15, antiAlias: false, contiguous: false });
        tool.onPointerDown!(makeToolPointerEvent({ canvasX: 0, canvasY: 0 }), ctx());
        expect(selectedPixels(useEditorStore.getState().selection.operations[0].mask?.data)).toBe(2);
    });

    it('magic-wand contiguous option controls disconnected matching regions', () => {
        const store = useEditorStore.getState();
        store.setCanvasSize(3, 1);
        const layer = store.layers.find(l => l.id === store.activeLayerId)!;
        const img = layer.ctx.createImageData(3, 1);
        img.data.set([
            255, 0, 0, 255,
            0, 0, 255, 255,
            255, 0, 0, 255,
        ]);
        layer.ctx.putImageData(img, 0, 0);

        const tool = getTool('magic-wand')!;
        setMagicWandOptions({ tolerance: 0, antiAlias: false, contiguous: true });
        tool.onPointerDown!(makeToolPointerEvent({ canvasX: 0, canvasY: 0 }), ctx());
        expect(selectedPixels(useEditorStore.getState().selection.operations[0].mask?.data)).toBe(1);

        useEditorStore.getState().clearSelection();
        setMagicWandOptions({ tolerance: 0, antiAlias: false, contiguous: false });
        tool.onPointerDown!(makeToolPointerEvent({ canvasX: 0, canvasY: 0 }), ctx());
        expect(selectedPixels(useEditorStore.getState().selection.operations[0].mask?.data)).toBe(2);
    });

    it('magic-wand sample-all-layers samples visible composite instead of only the active layer', () => {
        paintSplitLayer();
        const store = useEditorStore.getState();
        store.addLayer();
        const tool = getTool('magic-wand')!;

        setMagicWandOptions({ tolerance: 0, antiAlias: false, contiguous: true, sampleAllLayers: false });
        tool.onPointerDown!(makeToolPointerEvent({ canvasX: 2, canvasY: 2 }), ctx());
        expect(selectedPixels(useEditorStore.getState().selection.operations[0].mask?.data)).toBe(100);

        useEditorStore.getState().clearSelection();
        setMagicWandOptions({ tolerance: 0, antiAlias: false, contiguous: true, sampleAllLayers: true });
        tool.onPointerDown!(makeToolPointerEvent({ canvasX: 2, canvasY: 2 }), ctx());
        expect(selectedPixels(useEditorStore.getState().selection.operations[0].mask?.data)).toBe(50);
    });

    it('quick-selection commits accumulated raster masks', () => {
        setQuickSelectionOptions({ size: 1, autoEnhance: false });
        paintSplitLayer();
        const tool = getTool('quick-selection')!;
        tool.onPointerDown!(makeToolPointerEvent({ canvasX: 2, canvasY: 2 }), ctx());
        tool.onPointerMove!(makeToolPointerEvent({ canvasX: 7, canvasY: 2, buttons: 1 }), ctx());
        tool.onPointerUp!(makeToolPointerEvent({ canvasX: 7, canvasY: 2 }), ctx());

        const op = useEditorStore.getState().selection.operations[0];
        expect(op.mask?.width).toBe(10);
        expect(op.mask?.height).toBe(10);
        expect(selectedPixels(op.mask?.data)).toBe(100);
    });

    it('quick-selection size controls brush sampling radius', () => {
        paintSplitLayer();
        const tool = getTool('quick-selection')!;

        setQuickSelectionOptions({ size: 1, autoEnhance: false });
        tool.onPointerDown!(makeToolPointerEvent({ canvasX: 2, canvasY: 2 }), ctx());
        tool.onPointerUp!(makeToolPointerEvent({ canvasX: 2, canvasY: 2 }), ctx());
        expect(selectedPixels(useEditorStore.getState().selection.operations[0].mask?.data)).toBe(50);

        // Clear the existing selection so the next pointer-down doesn't enter
        // move-mode (clicking inside a selection moves it).
        useEditorStore.getState().clearSelection();
        setQuickSelectionOptions({ size: 6, autoEnhance: false });
        tool.onPointerDown!(makeToolPointerEvent({ canvasX: 4, canvasY: 2 }), ctx());
        tool.onPointerUp!(makeToolPointerEvent({ canvasX: 4, canvasY: 2 }), ctx());
        expect(selectedPixels(useEditorStore.getState().selection.operations[0].mask?.data)).toBe(100);
    });

    it('clearSelection wipes path + operations', () => {
        useEditorStore.getState().addSelectionOperation({ mode: 'add', path: [{ x: 0, y: 0 }, { x: 10, y: 10 }], type: 'rect' });
        useEditorStore.getState().setHasSelection(true);
        useEditorStore.getState().clearSelection();
        const sel = useEditorStore.getState().selection;
        expect(sel.hasSelection).toBe(false);
        expect(sel.operations).toEqual([]);
    });
});
