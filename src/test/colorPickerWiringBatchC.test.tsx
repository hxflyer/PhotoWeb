import { describe, it, expect, beforeEach, vi } from 'vitest';
import { cleanup, fireEvent, render } from '@testing-library/react';
import { useEditorStore } from '../store/editorStore';
import { ensureStubsRegistered } from '../tools/stubs';
import { FillPathDialog } from '../components/Dialogs/FillPathDialog';
import { StrokePathDialog } from '../components/Dialogs/StrokePathDialog';
import { GradientEditorDialog } from '../components/Dialogs/GradientEditorDialog';
import type { GradientColorStop, GradientOpacityStop } from '../store/types';

ensureStubsRegistered();

function reset() {
    useEditorStore.setState((s) => ({
        ...s,
        layers: [],
        activeLayerId: null,
        gradientPresets: [],
        primaryColor: '#888888',
        secondaryColor: '#ffffff',
    }));
    useEditorStore.getState().clearHistory();
}

const baseColors: GradientColorStop[] = [
    { position: 0, color: '#000000' },
    { position: 1, color: '#ffffff' },
];
const baseOpacities: GradientOpacityStop[] = [
    { position: 0, opacity: 1 },
    { position: 1, opacity: 1 },
];

describe('Batch C: unified Color Picker across Fill / Stroke / Gradient', () => {
    beforeEach(() => { cleanup(); reset(); });

    it('FillPathDialog: clicking the Color swatch opens the photoweb ColorPickerDialog', () => {
        const { getByTestId, queryByTestId } = render(<FillPathDialog open onClose={() => {}} />);
        // Switch source to "color" so the swatch becomes visible.
        fireEvent.change(getByTestId('fill-path-source-select'), { target: { value: 'color' } });
        // Before clicking the swatch the picker shouldn't be mounted.
        expect(queryByTestId('color-picker-dialog')).toBeNull();
        // Native color input must be gone.
        expect(queryByTestId('fill-path-color-input')).toBeNull();
        fireEvent.click(getByTestId('fill-path-color-swatch'));
        // After click the photoweb ColorPickerDialog is mounted.
        expect(getByTestId('color-picker-dialog')).toBeTruthy();
        expect(getByTestId('color-picker-hex-input')).toBeTruthy();
    });

    it('StrokePathDialog: clicking the Color swatch opens the photoweb ColorPickerDialog', () => {
        const { getByTestId, queryByTestId } = render(<StrokePathDialog open onClose={() => {}} />);
        expect(queryByTestId('color-picker-dialog')).toBeNull();
        expect(queryByTestId('stroke-path-color-input')).toBeNull();
        fireEvent.click(getByTestId('stroke-path-color-swatch'));
        expect(getByTestId('color-picker-dialog')).toBeTruthy();
    });

    it('GradientEditorDialog: selecting a stop and clicking the color swatch opens the photoweb ColorPickerDialog', () => {
        const { getByTestId, queryByTestId } = render(
            <GradientEditorDialog
                isOpen
                initialColorStops={baseColors}
                initialOpacityStops={baseOpacities}
                onClose={vi.fn()}
                onConfirm={vi.fn()}
            />,
        );
        // Pick the first color stop.
        const peg = getByTestId('gradient-color-stop-0') as HTMLDivElement;
        fireEvent.pointerDown(peg, { clientX: 0, clientY: 8, pointerId: 1 });
        fireEvent.pointerUp(peg, { clientX: 0, clientY: 8, pointerId: 1 });
        expect(queryByTestId('color-picker-dialog')).toBeNull();
        fireEvent.click(getByTestId('gradient-selected-color'));
        expect(getByTestId('color-picker-dialog')).toBeTruthy();
    });

    it('GradientEditorDialog: double-clicking a color peg opens the photoweb ColorPickerDialog', () => {
        const { getByTestId, queryByTestId } = render(
            <GradientEditorDialog
                isOpen
                initialColorStops={baseColors}
                initialOpacityStops={baseOpacities}
                onClose={vi.fn()}
                onConfirm={vi.fn()}
            />,
        );
        expect(queryByTestId('color-picker-dialog')).toBeNull();
        const peg = getByTestId('gradient-color-stop-1') as HTMLDivElement;
        fireEvent.doubleClick(peg);
        expect(getByTestId('color-picker-dialog')).toBeTruthy();
    });
});
