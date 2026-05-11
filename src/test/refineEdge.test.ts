import { describe, it, expect, beforeEach } from 'vitest';
import { useEditorStore } from '../store/editorStore';
import { ensureStubsRegistered } from '../tools/stubs';

ensureStubsRegistered();

function reset() {
    useEditorStore.getState().clearHistory();
    useEditorStore.setState((s) => ({
        ...s,
        layers: [],
        activeLayerId: null,
        width: 60,
        height: 60,
        selection: {
            ...s.selection,
            hasSelection: true,
            path: [],
            polyPoints: [],
            operations: [
                { mode: 'add', type: 'rect', path: [{ x: 20, y: 20 }, { x: 40, y: 40 }] },
            ],
            isDraggingSelection: false,
            feather: 0,
        },
    }));
    useEditorStore.getState().addLayer();
}

describe('refine edge — radius / smooth / contrast actually apply', () => {
    beforeEach(reset);

    it('radius widens the alpha-edge transition (more partially-selected pixels)', () => {
        useEditorStore.getState().refineEdge({ radius: 0, smooth: 0, feather: 0, contrast: 0, shiftEdge: 0 });
        const sharpMask = useEditorStore.getState().selection.operations[0].mask!;
        let sharpEdge = 0;
        for (const v of sharpMask.data) if (v > 0 && v < 255) sharpEdge++;

        // Reset to fresh rect and apply with a non-zero radius.
        useEditorStore.getState().setSelectionOperations([
            { mode: 'add', type: 'rect', path: [{ x: 20, y: 20 }, { x: 40, y: 40 }] },
        ]);
        useEditorStore.getState().setHasSelection(true);
        useEditorStore.getState().refineEdge({ radius: 6, smooth: 0, feather: 0, contrast: 0, shiftEdge: 0 });
        const blurMask = useEditorStore.getState().selection.operations[0].mask!;
        let blurEdge = 0;
        for (const v of blurMask.data) if (v > 0 && v < 255) blurEdge++;

        expect(blurEdge).toBeGreaterThan(sharpEdge);
    });

    it('contrast 100 produces a binary mask (0 or 255 only)', () => {
        useEditorStore.getState().refineEdge({ radius: 5, smooth: 0, feather: 0, contrast: 100, shiftEdge: 0 });
        const mask = useEditorStore.getState().selection.operations[0].mask!;
        for (const v of mask.data) expect(v === 0 || v === 255).toBe(true);
    });

    it('feather slider is recorded on the selection state', () => {
        useEditorStore.getState().refineEdge({ radius: 0, smooth: 0, feather: 7, contrast: 0, shiftEdge: 0 });
        expect(useEditorStore.getState().selection.feather).toBe(7);
    });

    it('shift-edge positive expands, negative contracts the bounds of the mask', () => {
        useEditorStore.getState().refineEdge({ radius: 0, smooth: 0, feather: 0, contrast: 0, shiftEdge: 30 });
        const expanded = useEditorStore.getState().selection.operations[0].mask!;
        let expandedCount = 0;
        for (const v of expanded.data) if (v > 0) expandedCount++;

        useEditorStore.getState().setSelectionOperations([
            { mode: 'add', type: 'rect', path: [{ x: 20, y: 20 }, { x: 40, y: 40 }] },
        ]);
        useEditorStore.getState().setHasSelection(true);
        useEditorStore.getState().refineEdge({ radius: 0, smooth: 0, feather: 0, contrast: 0, shiftEdge: -30 });
        const contracted = useEditorStore.getState().selection.operations[0].mask!;
        let contractedCount = 0;
        for (const v of contracted.data) if (v > 0) contractedCount++;

        expect(expandedCount).toBeGreaterThan(contractedCount);
    });
});
