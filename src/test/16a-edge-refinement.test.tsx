import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor, within, act } from '@testing-library/react';
import '../filters/index';
import App from '../App';
import { Layer } from '../core/Layer';
import { useEditorStore } from '../store/editorStore';

function resetStore(): void {
    const layer = new Layer(100, 100, 'Photo');
    layer.ctx.fillStyle = '#808080';
    layer.ctx.fillRect(0, 0, 100, 100);
    useEditorStore.setState(s => ({
        ...s,
        width: 100,
        height: 100,
        layers: [layer],
        activeLayerId: layer.id,
        selectedLayerIds: [layer.id],
        layerSelectionAnchorId: layer.id,
        quickMaskMode: false,
        quickMaskBuffer: null,
        dialogs: {
            ...s.dialogs,
            filterDialog: { isOpen: false, filterId: '', params: {} },
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

function selectCenterRect(): void {
    useEditorStore.getState().setSelectionOperations([{
        mode: 'add',
        type: 'rect',
        path: [{ x: 30, y: 30 }, { x: 70, y: 70 }],
    }]);
}

function alphaAt(image: ImageData, x: number, y: number): number {
    return image.data[(y * image.width + x) * 4 + 3];
}

function changeGaussianRadius(value: number): void {
    const row = screen.getByTestId('slider-row-radius');
    const input = within(row).getByRole('spinbutton') as HTMLInputElement;
    fireEvent.change(input, { target: { value: String(value) } });
}

describe('16a — Quick Mask edge refinement', () => {
    beforeEach(resetStore);
    afterEach(cleanup);

    it('Gaussian Blur previews against the Quick Mask buffer instead of layer pixels', async () => {
        selectCenterRect();
        const layer = useEditorStore.getState().layers[0];
        const beforePixel = layer.ctx.getImageData(20, 20, 1, 1).data[0];

        render(<App />);
        act(() => {
            const s = useEditorStore.getState();
            s.setQuickMaskMode(true);
            s.openFilterDialog('blur-gaussian', { radius: 1 });
        });

        await screen.findByTestId('filter-dialog');
        changeGaussianRadius(8);

        await waitFor(() => {
            const buffer = useEditorStore.getState().quickMaskBuffer;
            expect(buffer).not.toBeNull();
            expect(alphaAt(buffer!, 29, 50)).toBeGreaterThan(0);
            expect(alphaAt(buffer!, 29, 50)).toBeLessThan(255);
        });
        expect(layer.ctx.getImageData(20, 20, 1, 1).data[0]).toBe(beforePixel);
    });

    it('OK keeps the blurred mask and Q converts it to a soft selection', async () => {
        selectCenterRect();
        render(<App />);
        act(() => {
            const s = useEditorStore.getState();
            s.setQuickMaskMode(true);
            s.openFilterDialog('blur-gaussian', { radius: 1 });
        });

        await screen.findByTestId('filter-dialog');
        changeGaussianRadius(8);
        fireEvent.click(within(screen.getByTestId('filter-dialog')).getByText('OK'));

        act(() => useEditorStore.getState().setQuickMaskMode(false));
        const op = useEditorStore.getState().selection.operations[0];
        expect(op.mask).toBeTruthy();
        const edge = op.mask!.data[50 * op.mask!.width + 29];
        expect(edge).toBeGreaterThan(0);
        expect(edge).toBeLessThan(255);
    });

    it('Cancel restores the pre-dialog Quick Mask mask', async () => {
        selectCenterRect();
        render(<App />);
        act(() => {
            const s = useEditorStore.getState();
            s.setQuickMaskMode(true);
            s.openFilterDialog('blur-gaussian', { radius: 1 });
        });

        await screen.findByTestId('filter-dialog');
        changeGaussianRadius(8);
        await waitFor(() => {
            const buffer = useEditorStore.getState().quickMaskBuffer;
            expect(buffer).not.toBeNull();
            expect(alphaAt(buffer!, 29, 50)).toBeGreaterThan(0);
        });

        fireEvent.click(within(screen.getByTestId('filter-dialog')).getByText('Cancel'));
        await waitFor(() => {
            const restored = useEditorStore.getState().quickMaskBuffer;
            expect(restored).not.toBeNull();
            expect(alphaAt(restored!, 29, 50)).toBe(0);
            expect(alphaAt(restored!, 40, 50)).toBe(255);
        });
    });

    it('Quick Mask exit preserves partial selected coverage from the buffer', () => {
        const buffer = new ImageData(4, 1);
        buffer.data[3] = 0;
        buffer.data[7] = 96;
        buffer.data[11] = 192;
        buffer.data[15] = 255;

        const s = useEditorStore.getState();
        s.setQuickMaskMode(true);
        s.setQuickMaskBuffer(buffer);
        s.setQuickMaskMode(false);

        const op = useEditorStore.getState().selection.operations[0];
        expect(Array.from(op.mask!.data)).toEqual([0, 96, 192, 255]);
    });

    it('Select > Select and Mask opens the existing Refine Edge dialog', async () => {
        selectCenterRect();
        render(<App />);

        fireEvent.mouseDown(screen.getByText('Select'));
        fireEvent.click(await screen.findByText('Select and Mask…'));

        expect(await screen.findByTestId('refine-edge-dialog')).toBeTruthy();
    });
});
