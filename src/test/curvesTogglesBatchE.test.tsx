import { describe, it, expect, afterEach } from 'vitest';
import { render, cleanup, fireEvent } from '@testing-library/react';
import { AdjustmentDialog } from '../components/Dialogs/AdjustmentDialog';
import type { SelectionState } from '../store/types';

afterEach(() => cleanup());

const emptySelection: SelectionState = {
    hasSelection: false,
    mode: 'rect',
    path: [],
    polyPoints: [],
    operations: [],
    isDraggingSelection: false,
    feather: 0,
    isFreeEditMode: false,
};

function flatImage(r: number, g: number, b: number, w = 8, h = 8): ImageData {
    const arr = new Uint8ClampedArray(w * h * 4);
    for (let i = 0; i < arr.length; i += 4) {
        arr[i] = r; arr[i + 1] = g; arr[i + 2] = b; arr[i + 3] = 255;
    }
    return new ImageData(arr, w, h);
}

describe('Batch E — Curves dialog toggles', () => {
    it('renders Channel Overlays / Histogram / Baseline / Intersection / Clipping toggles', () => {
        const { getByTestId } = render(
            <AdjustmentDialog
                isOpen={true}
                adjustmentId="curves"
                sourceImage={flatImage(128, 128, 128)}
                selection={emptySelection}
                onConfirm={() => { /* noop */ }}
                onClose={() => { /* noop */ }}
            />
        );
        expect(getByTestId('curves-toggle-channel-overlays')).toBeTruthy();
        expect(getByTestId('curves-toggle-histogram')).toBeTruthy();
        expect(getByTestId('curves-toggle-baseline')).toBeTruthy();
        expect(getByTestId('curves-toggle-intersection')).toBeTruthy();
        expect(getByTestId('curves-toggle-clipping')).toBeTruthy();
    });

    it('Grid Size toggle alternates between 4×4 and 10×10 labels', () => {
        const { getByTestId } = render(
            <AdjustmentDialog
                isOpen={true}
                adjustmentId="curves"
                sourceImage={flatImage(128, 128, 128)}
                selection={emptySelection}
                onConfirm={() => { /* noop */ }}
                onClose={() => { /* noop */ }}
            />
        );
        const btn = getByTestId('curves-grid-toggle') as HTMLButtonElement;
        expect(btn.textContent).toBe('4×4');
        fireEvent.click(btn);
        expect(btn.textContent).toBe('10×10');
        fireEvent.click(btn);
        expect(btn.textContent).toBe('4×4');
    });

    it('Curves Input/Output readout placeholder renders', () => {
        const { getByTestId } = render(
            <AdjustmentDialog
                isOpen={true}
                adjustmentId="curves"
                sourceImage={flatImage(128, 128, 128)}
                selection={emptySelection}
                onConfirm={() => { /* noop */ }}
                onClose={() => { /* noop */ }}
            />
        );
        const readout = getByTestId('curves-readout');
        expect(readout.textContent).toContain('Input:');
        expect(readout.textContent).toContain('Output:');
    });
});
