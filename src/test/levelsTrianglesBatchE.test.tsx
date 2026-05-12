import { describe, it, expect, afterEach } from 'vitest';
import { render, cleanup, fireEvent } from '@testing-library/react';
import { AdjustmentDialog } from '../components/Dialogs/AdjustmentDialog';
import { levels } from '../adjustments/levels';
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

describe('Batch E — Levels triangle slider', () => {
    it('renders the three input triangle handles and the two output handles', () => {
        const img = flatImage(128, 128, 128);
        const { getByTestId } = render(
            <AdjustmentDialog
                isOpen={true}
                adjustmentId="levels"
                sourceImage={img}
                selection={emptySelection}
                onConfirm={() => { /* noop */ }}
                onClose={() => { /* noop */ }}
            />
        );
        expect(getByTestId('levels-handle-black')).toBeTruthy();
        expect(getByTestId('levels-handle-gamma')).toBeTruthy();
        expect(getByTestId('levels-handle-white')).toBeTruthy();
        expect(getByTestId('levels-handle-out-black')).toBeTruthy();
        expect(getByTestId('levels-handle-out-white')).toBeTruthy();
    });

    it('numeric Input Black field updates when typed, and applying clamps layer pixels', () => {
        const img = flatImage(40, 40, 40);
        let confirmedParams: Record<string, unknown> | null = null;
        const { getByTestId } = render(
            <AdjustmentDialog
                isOpen={true}
                adjustmentId="levels"
                sourceImage={img}
                selection={emptySelection}
                onConfirm={(params) => { confirmedParams = params; }}
                onClose={() => { /* noop */ }}
            />
        );
        const input = getByTestId('levels-input-black') as HTMLInputElement;
        fireEvent.change(input, { target: { value: '64' } });
        const confirmBtn = getByTestId('adjustment-confirm') as HTMLButtonElement;
        fireEvent.click(confirmBtn);
        expect(confirmedParams).not.toBeNull();
        expect(confirmedParams!.inputBlack).toBe(64);

        const out = levels.apply(
            { ...levels.defaultParams, inputBlack: 64 },
            { image: img, width: img.width, height: img.height, selectionMask: null, dirtyRect: null },
        );
        // With inputBlack=64 and input pixel=40 (below black point), output clamps to 0.
        expect(out.data[0]).toBe(0);
    });

    it('Output triangle handles render with output Black/White fields', () => {
        const img = flatImage(200, 200, 200);
        const { getByTestId } = render(
            <AdjustmentDialog
                isOpen={true}
                adjustmentId="levels"
                sourceImage={img}
                selection={emptySelection}
                onConfirm={() => { /* noop */ }}
                onClose={() => { /* noop */ }}
            />
        );
        expect((getByTestId('levels-output-black') as HTMLInputElement).value).toBe('0');
        expect((getByTestId('levels-output-white') as HTMLInputElement).value).toBe('255');
    });
});
