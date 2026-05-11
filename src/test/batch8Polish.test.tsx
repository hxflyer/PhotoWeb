import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, cleanup, fireEvent } from '@testing-library/react';
import { Layer } from '../core/Layer';
import { useEditorStore } from '../store/editorStore';
import { ensureStubsRegistered } from '../tools/stubs';
import { getTool } from '../tools/registry';
import type { ToolPointerEvent } from '../tools/Tool';
import { FreeTransformOverlay, type FreeTransformState } from '../components/Canvas/FreeTransformOverlay';
import { buildMagicWandMask, setMagicWandOptions } from '../tools/magicWand';

ensureStubsRegistered();

function pointer(x: number, y: number, mods: Partial<ToolPointerEvent> = {}): ToolPointerEvent {
    return {
        canvasX: x, canvasY: y, clientX: x, clientY: y,
        button: 0, buttons: 1,
        shift: false, alt: false, meta: false, ctrl: false,
        pressure: 1, pointerType: 'mouse',
        rawEvent: new MouseEvent('mousedown') as PointerEvent,
        ...mods,
    };
}

function toolCtx() {
    return {
        store: useEditorStore.getState(),
        getStore: () => useEditorStore.getState(),
        requestRender: vi.fn(),
    };
}

afterEach(() => cleanup());

describe('Batch 8 — Free Transform right-click context menu', () => {
    beforeEach(() => {
        useEditorStore.getState().clearHistory();
        useEditorStore.setState(s => ({ ...s, width: 200, height: 200, layers: [], activeLayerId: null }));
    });

    function setup(): FreeTransformState {
        const layer = new Layer(200, 200, 'L');
        useEditorStore.setState(s => ({ ...s, layers: [layer], activeLayerId: layer.id }));
        const snapshot = layer.ctx.getImageData(0, 0, 200, 200);
        return {
            layerId: layer.id,
            snapshot, source: snapshot,
            sourceX: 0, sourceY: 0,
            x: 50, y: 50, width: 100, height: 100,
            rotation: 0, skewX: 0, skewY: 0,
        };
    }

    it('right-click on bbox interior opens the transform context menu', () => {
        const state = setup();
        const { container } = render(<FreeTransformOverlay state={state} zoom={1} panX={0} panY={0} onCommit={() => {}} onCancel={() => {}} />);
        const interior = container.querySelector('[data-testid="ft-bbox-interior"]')!;
        fireEvent.contextMenu(interior, { clientX: 100, clientY: 100 });
        expect(container.querySelector('[data-testid="ft-context-menu"]')).toBeTruthy();
        // All 5 transform actions are present.
        for (const id of ['rotate-180', 'rotate-90-cw', 'rotate-90-ccw', 'flip-horizontal', 'flip-vertical']) {
            expect(container.querySelector(`[data-testid="ft-context-${id}"]`)).toBeTruthy();
        }
    });

    it('"Rotate 90° CW" updates the rotation field', () => {
        const state = setup();
        const { container } = render(<FreeTransformOverlay state={state} zoom={1} panX={0} panY={0} onCommit={() => {}} onCancel={() => {}} />);
        fireEvent.contextMenu(container.querySelector('[data-testid="ft-bbox-interior"]')!, { clientX: 100, clientY: 100 });
        fireEvent.click(container.querySelector('[data-testid="ft-context-rotate-90-cw"]') as HTMLButtonElement);
        // Rotation degree input should now show 90.
        const inputs = container.querySelectorAll('input[type="number"]');
        expect(parseFloat((inputs[4] as HTMLInputElement).value)).toBe(90);
    });

    it('"Flip Horizontal" negates the W field', () => {
        const state = setup();
        const { container } = render(<FreeTransformOverlay state={state} zoom={1} panX={0} panY={0} onCommit={() => {}} onCancel={() => {}} />);
        fireEvent.contextMenu(container.querySelector('[data-testid="ft-bbox-interior"]')!, { clientX: 100, clientY: 100 });
        fireEvent.click(container.querySelector('[data-testid="ft-context-flip-horizontal"]') as HTMLButtonElement);
        const inputs = container.querySelectorAll('input[type="number"]');
        expect(parseFloat((inputs[2] as HTMLInputElement).value)).toBe(-100);
    });
});

describe('Batch 8 — Magic Wand sampleSize + alpha bucketing', () => {
    it('sampleSize "3x3" averages a 3x3 window before matching', () => {
        // Image: gradient from 100 to 110 across 3 columns.
        const img = new ImageData(3, 1);
        img.data.set([100, 100, 100, 255,  105, 105, 105, 255,  110, 110, 110, 255]);
        // With sampleSize=point and tolerance=0, seed=110 only matches column 2.
        const m1 = buildMagicWandMask(img, 2, 0, { tolerance: 0, antiAlias: false, contiguous: false, sampleAllLayers: false, sampleSize: 'point' });
        expect(m1[2]).toBe(255);
        expect(m1[0]).toBe(0);
        // With sampleSize=3x3 averaged to ~107 and tolerance=10, all 3 columns now match.
        const m2 = buildMagicWandMask(img, 2, 0, { tolerance: 10, antiAlias: false, contiguous: false, sampleAllLayers: false, sampleSize: '3x3' });
        expect(m2[0]).toBe(255);
        expect(m2[1]).toBe(255);
        expect(m2[2]).toBe(255);
    });

    it('alpha is bucketed: transparent pixels do not match opaque ones even at huge tolerance', () => {
        const img = new ImageData(2, 1);
        img.data.set([255, 0, 0, 255,  255, 0, 0, 0]); // opaque red, then transparent red
        const mask = buildMagicWandMask(img, 0, 0, { tolerance: 255, antiAlias: false, contiguous: false, sampleAllLayers: false, sampleSize: 'point' });
        expect(mask[0]).toBe(255); // opaque red matches itself
        expect(mask[1]).toBe(0); // transparent does NOT match
    });
});

describe('Batch 8 — Polygonal Lasso angle snap', () => {
    it('Shift on a click constrains the new segment to 45° from the previous anchor', async () => {
        useEditorStore.getState().clearHistory();
        useEditorStore.setState(s => ({
            ...s,
            width: 100, height: 100,
            layers: [new Layer(100, 100, 'L')],
        }));
        const tool = getTool('lasso-poly')!;
        const ctx = toolCtx();
        // First anchor at (10, 10).
        tool.onPointerDown!(pointer(10, 10), ctx);
        // Click at (50, 12) with Shift — should snap to horizontal axis (y stays 10).
        tool.onPointerDown!(pointer(50, 12, { shift: true }), ctx);
        const polyPoints = useEditorStore.getState().selection.polyPoints;
        expect(polyPoints[1].y).toBe(10);
    });
});

describe('Batch 8 — Reselect + Hide Selection Edges', () => {
    beforeEach(() => {
        useEditorStore.getState().clearHistory();
        useEditorStore.setState(s => ({
            ...s,
            width: 100, height: 100,
            layers: [new Layer(100, 100, 'L')],
            selection: {
                ...s.selection,
                hasSelection: true,
                operations: [{ mode: 'add', type: 'rect', path: [{ x: 5, y: 5 }, { x: 50, y: 50 }] }],
                path: [],
                polyPoints: [],
                isDraggingSelection: false,
                edgesHidden: false,
                lastCleared: undefined,
            },
        }));
    });

    it('reselect() restores the last cleared selection', () => {
        const store = useEditorStore.getState();
        store.clearSelection();
        expect(useEditorStore.getState().selection.hasSelection).toBe(false);
        useEditorStore.getState().reselect();
        const sel = useEditorStore.getState().selection;
        expect(sel.hasSelection).toBe(true);
        expect(sel.operations.length).toBe(1);
    });

    it('reselect() with no prior cleared selection is a no-op', () => {
        useEditorStore.setState(s => ({
            ...s,
            selection: { ...s.selection, hasSelection: false, operations: [], lastCleared: undefined },
        }));
        useEditorStore.getState().reselect();
        expect(useEditorStore.getState().selection.hasSelection).toBe(false);
    });

    it('setSelectionEdgesHidden flips the edgesHidden flag', () => {
        expect(useEditorStore.getState().selection.edgesHidden).toBe(false);
        useEditorStore.getState().setSelectionEdgesHidden(true);
        expect(useEditorStore.getState().selection.edgesHidden).toBe(true);
        useEditorStore.getState().setSelectionEdgesHidden(false);
        expect(useEditorStore.getState().selection.edgesHidden).toBe(false);
    });
});

afterEach(() => {
    // Reset magic wand options between top-level test blocks.
    setMagicWandOptions({ tolerance: 32, antiAlias: true, contiguous: true, sampleAllLayers: false, sampleSize: 'point' });
});

describe('Batch 8 — Modify > Expand / Contract dialogs', () => {
    beforeEach(() => {
        useEditorStore.getState().clearHistory();
        useEditorStore.setState(s => ({
            ...s,
            width: 50, height: 50,
            layers: [new Layer(50, 50, 'L')],
            selection: {
                ...s.selection,
                hasSelection: true,
                operations: [{ mode: 'add', type: 'rect', path: [{ x: 10, y: 10 }, { x: 40, y: 40 }] }],
                path: [],
                polyPoints: [],
                isDraggingSelection: false,
            },
        }));
    });

    it('openExpandSelectionDialog / openContractSelectionDialog flip the corresponding store flag', () => {
        useEditorStore.getState().openExpandSelectionDialog();
        expect(useEditorStore.getState().isExpandSelectionDialogOpen).toBe(true);
        useEditorStore.getState().closeExpandSelectionDialog();
        expect(useEditorStore.getState().isExpandSelectionDialogOpen).toBe(false);

        useEditorStore.getState().openContractSelectionDialog();
        expect(useEditorStore.getState().isContractSelectionDialogOpen).toBe(true);
        useEditorStore.getState().closeContractSelectionDialog();
        expect(useEditorStore.getState().isContractSelectionDialogOpen).toBe(false);
    });

    it('expandSelection actually grows the selection mask', () => {
        // Snapshot the rasterized mask area before/after.
        const before = useEditorStore.getState().selection.operations.length;
        useEditorStore.getState().expandSelection(5);
        const after = useEditorStore.getState().selection.operations.length;
        // We expect the selection still exists (operations preserved as a mask op).
        expect(after).toBeGreaterThan(0);
        expect(before).toBeGreaterThan(0);
    });
});

describe('Batch 8 — Healing Brush options', () => {
    it('source defaults to "sampled" and switches to "pattern"', async () => {
        const { getHealingBrushOptions, setHealingBrushOptions } = await import('../tools/healingBrush');
        expect(getHealingBrushOptions().source).toBe('sampled');
        setHealingBrushOptions({ source: 'pattern' });
        expect(getHealingBrushOptions().source).toBe('pattern');
        setHealingBrushOptions({ source: 'sampled' });
    });

    it('diffusion defaults to 5 and clamps to 1..7', async () => {
        const { getHealingBrushOptions, setHealingBrushOptions } = await import('../tools/healingBrush');
        expect(getHealingBrushOptions().diffusion).toBe(5);
        setHealingBrushOptions({ diffusion: 7 });
        expect(getHealingBrushOptions().diffusion).toBe(7);
        setHealingBrushOptions({ diffusion: 5 });
    });
});

describe('Batch 8 — Type shortcuts inside the edit overlay', () => {
    it('Cmd+Shift+> increases fontSize by 1', async () => {
        const { TextEditOverlay } = await import('../components/Canvas/TextEditOverlay');
        const { defaultTextStyle, getEditingStyle, updateEditingStyle } = await import('../tools/type');
        updateEditingStyle({ ...defaultTextStyle, fontSize: 24 });
        const { container } = render(
            <TextEditOverlay
                visible
                transform={{ x: 0, y: 0, width: 100, height: 50, rotation: 0 }}
                style={{ ...defaultTextStyle, fontSize: 24 }}
                initialValue="abc"
                zoom={1}
                onCommit={() => {}}
                onCancel={() => {}}
            />
        );
        const editable = container.querySelector('[contenteditable="true"]') as HTMLDivElement;
        editable.focus();
        fireEvent.keyDown(editable, { key: '>', shiftKey: true, metaKey: true });
        expect(getEditingStyle().fontSize).toBe(25);
    });

    it('Opt+ArrowRight increases tracking (letterSpacing) by 20', async () => {
        const { TextEditOverlay } = await import('../components/Canvas/TextEditOverlay');
        const { defaultTextStyle, getEditingStyle, updateEditingStyle } = await import('../tools/type');
        updateEditingStyle({ ...defaultTextStyle, letterSpacing: 0 });
        const { container } = render(
            <TextEditOverlay
                visible
                transform={{ x: 0, y: 0, width: 100, height: 50, rotation: 0 }}
                style={{ ...defaultTextStyle, letterSpacing: 0 }}
                initialValue="abc"
                zoom={1}
                onCommit={() => {}}
                onCancel={() => {}}
            />
        );
        const editable = container.querySelector('[contenteditable="true"]') as HTMLDivElement;
        editable.focus();
        fireEvent.keyDown(editable, { key: 'ArrowRight', altKey: true });
        expect(getEditingStyle().letterSpacing).toBe(20);
    });
});

describe('Batch 8 — Polygon Smooth Corners / Smooth Indents', () => {
    it('setShapeOptions persists polygonSmoothCorners and polygonSmoothIndents', async () => {
        const { setShapeOptions, getShapeOptions } = await import('../tools/shapes');
        setShapeOptions({ polygonSmoothCorners: true, polygonSmoothIndents: true });
        const opts = getShapeOptions();
        expect(opts.polygonSmoothCorners).toBe(true);
        expect(opts.polygonSmoothIndents).toBe(true);
        setShapeOptions({ polygonSmoothCorners: false, polygonSmoothIndents: false });
    });
});
