import { describe, it, expect, afterEach } from 'vitest';
import { render, cleanup, fireEvent } from '@testing-library/react';
import { FilterDialog } from '../components/Dialogs/FilterDialog';
import '../filters/index'; // ensure filter registry is populated

afterEach(() => cleanup());

function flatImage(r: number, g: number, b: number, w = 8, h = 8): ImageData {
    const arr = new Uint8ClampedArray(w * h * 4);
    for (let i = 0; i < arr.length; i += 4) {
        arr[i] = r; arr[i + 1] = g; arr[i + 2] = b; arr[i + 3] = 255;
    }
    return new ImageData(arr, w, h);
}

describe('Batch E — FilterDialog visual parity', () => {
    it('renders OK, Cancel, Reset, and Preview checkbox controls', () => {
        const { getByTestId } = render(
            <FilterDialog
                isOpen={true}
                filterId="blur-gaussian"
                sourceImage={flatImage(200, 200, 200)}
                onConfirm={() => { /* noop */ }}
                onClose={() => { /* noop */ }}
            />
        );
        expect(getByTestId('filter-confirm')).toBeTruthy();
        expect(getByTestId('filter-reset')).toBeTruthy();
        expect(getByTestId('filter-preview-checkbox')).toBeTruthy();
    });

    it('Preview checkbox toggles via Alt+P shortcut', () => {
        const { getByTestId } = render(
            <FilterDialog
                isOpen={true}
                filterId="blur-gaussian"
                sourceImage={flatImage(50, 50, 50)}
                onConfirm={() => { /* noop */ }}
                onClose={() => { /* noop */ }}
            />
        );
        const checkbox = getByTestId('filter-preview-checkbox') as HTMLInputElement;
        expect(checkbox.checked).toBe(true);
        fireEvent.keyDown(window, { key: 'p', altKey: true });
        expect(checkbox.checked).toBe(false);
        fireEvent.keyDown(window, { key: 'p', altKey: true });
        expect(checkbox.checked).toBe(true);
    });

    it('Reset button restores defaults; OK confirms current params', () => {
        let confirmedParams: Record<string, unknown> | null = null;
        const { getByTestId } = render(
            <FilterDialog
                isOpen={true}
                filterId="blur-gaussian"
                sourceImage={flatImage(120, 120, 120)}
                initialParams={{ radius: 7 }}
                onConfirm={(p) => { confirmedParams = p; }}
                onClose={() => { /* noop */ }}
            />
        );
        fireEvent.click(getByTestId('filter-reset'));
        fireEvent.click(getByTestId('filter-confirm'));
        expect(confirmedParams).not.toBeNull();
        // Default radius for blur-gaussian is 2.
        expect((confirmedParams as unknown as { radius: number }).radius).toBe(2);
    });

    it('Gaussian Blur filter renderUI uses the shared SliderRow with numeric input', () => {
        const { getByTestId } = render(
            <FilterDialog
                isOpen={true}
                filterId="blur-gaussian"
                sourceImage={flatImage(120, 120, 120)}
                onConfirm={() => { /* noop */ }}
                onClose={() => { /* noop */ }}
            />
        );
        expect(getByTestId('slider-row-radius')).toBeTruthy();
    });
});
