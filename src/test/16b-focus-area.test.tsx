import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { act, cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import App from '../App';
import { Layer } from '../core/Layer';
import { useEditorStore } from '../store/editorStore';
import { computeFocusAreaMask } from '../utils/focusArea';

function makeFocusImage(width = 80, height = 60): ImageData {
    const image = new ImageData(width, height);
    for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
            const i = (y * width + x) * 4;
            let v = 128;
            if (x >= 25 && x < 55 && y >= 15 && y < 45) {
                v = ((x + y) % 4 < 2) ? 20 : 235;
            }
            image.data[i] = v;
            image.data[i + 1] = v;
            image.data[i + 2] = v;
            image.data[i + 3] = 255;
        }
    }
    return image;
}

function resetStore(): void {
    const image = makeFocusImage();
    const layer = new Layer(image.width, image.height, 'Focus photo');
    layer.ctx.putImageData(image, 0, 0);
    useEditorStore.setState(s => ({
        ...s,
        width: image.width,
        height: image.height,
        layers: [layer],
        activeLayerId: layer.id,
        selectedLayerIds: [layer.id],
        layerSelectionAnchorId: layer.id,
        dialogs: {
            ...s.dialogs,
            isFocusAreaDialogOpen: false,
            isRefineEdgeDialogOpen: false,
        },
        selection: {
            hasSelection: false,
            mode: 'rect',
            path: [],
            polyPoints: [],
            operations: [],
            isDraggingSelection: false,
            isFreeEditMode: false,
            feather: 0,
        },
        isDirty: false,
    }));
}

function countSelected(mask: Uint8ClampedArray): number {
    return mask.reduce((sum, value) => sum + (value > 127 ? 1 : 0), 0);
}

function openFocusAreaFromMenu(): void {
    fireEvent.mouseDown(screen.getByText('Select'));
    fireEvent.click(screen.getByText('Focus Area…'));
}

describe('16b — Focus Area', () => {
    beforeEach(resetStore);
    afterEach(cleanup);

    it('computes a larger focus mask as In-Focus Range increases', () => {
        const image = makeFocusImage();
        const narrow = computeFocusAreaMask(image, { range: 15, noiseLevel: 0, softenEdges: false });
        const broad = computeFocusAreaMask(image, { range: 90, noiseLevel: 0, softenEdges: false });

        expect(countSelected(narrow)).toBeGreaterThan(0);
        expect(countSelected(broad)).toBeGreaterThan(countSelected(narrow));
    });

    it('Soften Edges creates partial alpha along the focus mask', () => {
        const image = makeFocusImage();
        const softened = computeFocusAreaMask(image, { range: 55, noiseLevel: 0, softenEdges: true });

        expect(Array.from(softened).some(v => v > 0 && v < 255)).toBe(true);
    });

    it('Select > Focus Area opens the dialog and OK outputs a selection', () => {
        render(<App />);
        openFocusAreaFromMenu();

        expect(screen.getByTestId('focus-area-dialog')).toBeTruthy();
        fireEvent.change(screen.getByTestId('focus-area-range'), { target: { value: '85' } });
        fireEvent.click(screen.getByTestId('focus-area-ok'));

        const selection = useEditorStore.getState().selection;
        expect(selection.hasSelection).toBe(true);
        expect(selection.operations[0].mask).toBeTruthy();
        expect(countSelected(selection.operations[0].mask!.data)).toBeGreaterThan(0);
    });

    it('subtract brush refinement removes painted coverage before output', () => {
        render(<App />);
        act(() => useEditorStore.getState().openFocusAreaDialog());

        fireEvent.change(screen.getByTestId('focus-area-brush-size'), { target: { value: '30' } });
        fireEvent.click(screen.getByTestId('focus-area-sub-tool'));
        const hitbox = screen.getByTestId('focus-area-preview-hitbox');
        Object.defineProperty(hitbox, 'getBoundingClientRect', {
            value: () => ({ left: 0, top: 0, width: 320, height: 220, right: 320, bottom: 220, x: 0, y: 0, toJSON: () => ({}) }),
            configurable: true,
        });
        fireEvent.pointerDown(hitbox, { clientX: 160, clientY: 110, bubbles: true });
        fireEvent.click(screen.getByTestId('focus-area-ok'));

        const op = useEditorStore.getState().selection.operations[0];
        const center = 30 * op.mask!.width + 40;
        expect(op.mask!.data[center]).toBe(0);
    });

    it('can output a new layer with a layer mask', () => {
        render(<App />);
        act(() => useEditorStore.getState().openFocusAreaDialog());

        fireEvent.change(screen.getByTestId('focus-area-output'), { target: { value: 'new-layer-with-mask' } });
        fireEvent.click(screen.getByTestId('focus-area-ok'));

        const state = useEditorStore.getState();
        expect(state.layers).toHaveLength(2);
        expect(state.layers[1].mask).toBeTruthy();
        expect(state.activeLayerId).toBe(state.layers[1].id);
    });

    it('Refine Edge handoff applies the Focus Area mask then opens Refine Edge', () => {
        render(<App />);
        act(() => useEditorStore.getState().openFocusAreaDialog());

        fireEvent.click(screen.getByTestId('focus-area-refine-edge'));

        const state = useEditorStore.getState();
        expect(state.dialogs.isFocusAreaDialogOpen).toBe(false);
        expect(state.dialogs.isRefineEdgeDialogOpen).toBe(true);
        expect(state.selection.hasSelection).toBe(true);
        expect(screen.getByTestId('refine-edge-dialog')).toBeTruthy();
    });

    it('keyboard shortcuts cycle view, preview, brush mode, and brush size', () => {
        render(<App />);
        act(() => useEditorStore.getState().openFocusAreaDialog());

        const view = screen.getByTestId('focus-area-view-mode') as HTMLSelectElement;
        const preview = screen.getByTestId('focus-area-preview') as HTMLInputElement;
        const addButton = screen.getByTestId('focus-area-add-tool');
        const brushSize = screen.getByTestId('focus-area-brush-size') as HTMLInputElement;

        fireEvent.keyDown(window, { key: 'f' });
        expect(view.value).not.toBe('on-white');
        fireEvent.keyDown(window, { key: 'p' });
        expect(preview.checked).toBe(false);
        fireEvent.keyDown(window, { key: 'e' });
        expect(within(addButton).queryByText('Add')).toBeTruthy();
        expect(addButton.getAttribute('aria-pressed')).toBe('false');
        fireEvent.keyDown(window, { key: ']' });
        expect(Number(brushSize.value)).toBeGreaterThan(20);
    });
});
