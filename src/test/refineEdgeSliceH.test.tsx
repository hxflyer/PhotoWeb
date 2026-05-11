import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { render, cleanup, fireEvent } from '@testing-library/react';
import { useEditorStore } from '../store/editorStore';
import { ensureStubsRegistered } from '../tools/stubs';
import { Layer } from '../core/Layer';
import { RefineEdgeDialog } from '../components/Dialogs/RefineEdgeDialog';
import { ColorRangeDialog } from '../components/Dialogs/ColorRangeDialog';
import { computeRefinedSelectionOperation } from '../utils/refineEdgePreview';
import { rasterizeSelectionOperations } from '../utils/selectionUtils';

ensureStubsRegistered();

function installDocumentWithRectSelection(): Layer {
    const layer = new Layer(50, 50, 'L');
    layer.ctx.fillStyle = '#888888';
    layer.ctx.fillRect(0, 0, 50, 50);
    useEditorStore.setState(s => ({
        ...s,
        width: 50,
        height: 50,
        layers: [layer],
        activeLayerId: layer.id,
        selection: {
            ...s.selection,
            hasSelection: true,
            path: [],
            operations: [{
                mode: 'add',
                type: 'rect',
                path: [{ x: 10, y: 10 }, { x: 30, y: 30 }],
            }],
            polyPoints: [],
            isDraggingSelection: false,
        },
    }));
    return layer;
}

afterEach(() => cleanup());

describe('Slice H — Refine Edge live preview', () => {
    beforeEach(() => {
        useEditorStore.getState().clearHistory();
    });

    it('computeRefinedSelectionOperation produces a mask when radius is non-zero', () => {
        const ops = [{ mode: 'add' as const, type: 'rect' as const, path: [{ x: 5, y: 5 }, { x: 15, y: 15 }] }];
        const refined = computeRefinedSelectionOperation(ops, { radius: 4, smooth: 0, feather: 0, contrast: 0, shiftEdge: 0, smartRadius: false }, 30, 30, null);
        expect(refined).not.toBeNull();
        expect(refined!.mask).toBeTruthy();
        expect(refined!.mask!.width).toBe(30);
        expect(refined!.mask!.height).toBe(30);
        // The blurred mask should have some intermediate (non-0, non-255) values
        // outside the original rect — that's the feathered border.
        const data = refined!.mask!.data;
        let intermediateCount = 0;
        for (let i = 0; i < data.length; i++) {
            if (data[i] > 0 && data[i] < 255) intermediateCount++;
        }
        expect(intermediateCount).toBeGreaterThan(0);
    });

    it('opening the dialog snapshots the original selection (cancel restores it)', () => {
        installDocumentWithRectSelection();
        const before = useEditorStore.getState().selection.operations.length;

        const { container, rerender } = render(<RefineEdgeDialog isOpen={true} onClose={() => {}} />);
        // Drag a slider to make the preview kick in (radius 20).
        const sliders = container.querySelectorAll('input[type="range"]');
        // Sliders: Radius, Smooth, Feather, Contrast, Shift Edge
        fireEvent.change(sliders[0], { target: { value: '20' } });
        // Now operations should be a refined op (still has selection).
        expect(useEditorStore.getState().selection.hasSelection).toBe(true);

        // Cancel the dialog by clicking the Cancel button.
        const buttons = container.querySelectorAll('button');
        const cancelBtn = Array.from(buttons).find(b => b.textContent === 'Cancel') as HTMLButtonElement;
        fireEvent.click(cancelBtn);

        // The original op count should be restored.
        expect(useEditorStore.getState().selection.operations.length).toBe(before);

        rerender(<RefineEdgeDialog isOpen={false} onClose={() => {}} />);
    });

    it('moving sliders updates the selection mask in real time (no history entries pile up)', () => {
        installDocumentWithRectSelection();
        const initialEntries = useEditorStore.getState().historyEntries.length;

        const { container } = render(<RefineEdgeDialog isOpen={true} onClose={() => {}} />);
        const sliders = container.querySelectorAll('input[type="range"]');
        fireEvent.change(sliders[0], { target: { value: '5' } });
        fireEvent.change(sliders[0], { target: { value: '10' } });
        fireEvent.change(sliders[3], { target: { value: '50' } });
        const finalEntries = useEditorStore.getState().historyEntries.length;
        expect(finalEntries).toBe(initialEntries);
    });

    it('the live-preview mask covers the original selection rectangle plus a feathered ring', () => {
        installDocumentWithRectSelection();
        const { container } = render(<RefineEdgeDialog isOpen={true} onClose={() => {}} />);
        const sliders = container.querySelectorAll('input[type="range"]');
        fireEvent.change(sliders[0], { target: { value: '6' } });
        // Now selection should be a mask-type op.
        const ops = useEditorStore.getState().selection.operations;
        expect(ops.length).toBe(1);
        expect(ops[0].mask).toBeTruthy();
        // Rasterize and verify center of original rect is still strongly selected.
        const state = useEditorStore.getState();
        const mask = rasterizeSelectionOperations(state.selection.operations, state.width, state.height);
        const centerIdx = 20 * state.width + 20;
        expect(mask[centerIdx]).toBeGreaterThan(200);
    });
});

describe('Slice H — Color Range on-canvas eyedropper', () => {
    beforeEach(() => {
        useEditorStore.getState().clearHistory();
        // Place a layer with a red box at (10..14, 10..14) on a black background.
        const layer = new Layer(40, 40, 'L');
        layer.ctx.fillStyle = '#000000';
        layer.ctx.fillRect(0, 0, 40, 40);
        layer.ctx.fillStyle = '#ff0000';
        layer.ctx.fillRect(10, 10, 5, 5);
        useEditorStore.setState(s => ({
            ...s,
            width: 40,
            height: 40,
            zoom: 1,
            layers: [layer],
            activeLayerId: layer.id,
            dialogs: { ...s.dialogs, isColorRangeDialogOpen: true },
        }));
    });

    it('clicking on the document canvas while the Color Range dialog is open samples a pixel', async () => {
        const doc = document.createElement('div');
        doc.setAttribute('data-photoweb-document', '');
        Object.defineProperty(doc, 'getBoundingClientRect', {
            value: () => ({ left: 0, top: 0, width: 40, height: 40, right: 40, bottom: 40, x: 0, y: 0, toJSON: () => ({}) }),
        });
        document.body.appendChild(doc);
        render(<ColorRangeDialog />);
        // Wait a microtask so the dialog's window-mousedown listener attaches.
        await new Promise(resolve => setTimeout(resolve, 0));
        fireEvent.mouseDown(doc, { clientX: 12, clientY: 12 });
        const colorInput = document.querySelector('[data-testid="color-range-color-input"]') as HTMLInputElement;
        expect(colorInput.value.toLowerCase()).toBe('#ff0000');
        document.body.removeChild(doc);
    });

    it('Shift+click on the canvas appends an "add" sample instead of replacing', async () => {
        const doc = document.createElement('div');
        doc.setAttribute('data-photoweb-document', '');
        Object.defineProperty(doc, 'getBoundingClientRect', {
            value: () => ({ left: 0, top: 0, width: 40, height: 40, right: 40, bottom: 40, x: 0, y: 0, toJSON: () => ({}) }),
        });
        document.body.appendChild(doc);
        render(<ColorRangeDialog />);
        await new Promise(resolve => setTimeout(resolve, 0));
        fireEvent.mouseDown(doc, { clientX: 5, clientY: 5 });
        fireEvent.mouseDown(doc, { clientX: 12, clientY: 12, shiftKey: true });
        const summary = document.body.textContent ?? '';
        expect(summary).toContain('2 add samples');
        document.body.removeChild(doc);
    });
});
