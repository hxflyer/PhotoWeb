import { describe, it, expect, beforeEach, vi } from 'vitest';
import { cleanup, fireEvent, render, act } from '@testing-library/react';
import { GradientEditorDialog, type GradientEditorResult } from '../components/Dialogs/GradientEditorDialog';
import { useEditorStore } from '../store/editorStore';
import { ensureStubsRegistered } from '../tools/stubs';
import type { GradientColorStop, GradientOpacityStop } from '../store/types';
import { getGradientOptions, setGradientOptions } from '../tools/gradient';
import { OptionsBar } from '../components/Panels/OptionsBar';

ensureStubsRegistered();

const baseColors: GradientColorStop[] = [
    { position: 0, color: '#000000' },
    { position: 1, color: '#ffffff' },
];
const baseOpacities: GradientOpacityStop[] = [
    { position: 0, opacity: 1 },
    { position: 1, opacity: 1 },
];

function reset() {
    useEditorStore.setState((s) => ({
        ...s,
        layers: [],
        activeLayerId: null,
        gradientPresets: [],
        width: 200,
        height: 100,
    }));
    useEditorStore.getState().clearHistory();
    setGradientOptions({
        type: 'linear', presetId: 'foreground-to-background',
        reverse: false, dither: false, method: 'classic', transparency: true,
        opacity: 1, mode: 'normal', stops: undefined, smoothness: undefined,
    });
}

function mockBoundingRect(el: HTMLElement, width: number) {
    el.getBoundingClientRect = () => ({
        left: 0, top: 0, right: width, bottom: 18, width, height: 18, x: 0, y: 0, toJSON: () => ({}),
    });
}

describe('GradientEditorDialog', () => {
    beforeEach(() => { cleanup(); reset(); });

    it('renders two color-stop pegs for a two-stop gradient', () => {
        const { getByTestId } = render(
            <GradientEditorDialog
                isOpen
                initialColorStops={baseColors}
                initialOpacityStops={baseOpacities}
                onClose={vi.fn()}
                onConfirm={vi.fn()}
            />,
        );
        expect(getByTestId('gradient-color-stop-0')).toBeTruthy();
        expect(getByTestId('gradient-color-stop-1')).toBeTruthy();
        expect(() => getByTestId('gradient-color-stop-2')).toThrow();
    });

    it('clicking the color row at 50% adds a stop and commit returns 3 stops', () => {
        const onConfirm = vi.fn();
        const { getByTestId } = render(
            <GradientEditorDialog
                isOpen
                initialColorStops={baseColors}
                initialOpacityStops={baseOpacities}
                onClose={vi.fn()}
                onConfirm={onConfirm}
            />,
        );
        const row = getByTestId('gradient-color-row') as HTMLDivElement;
        mockBoundingRect(row, 360);
        fireEvent.click(row, { clientX: 180, clientY: 8 });
        fireEvent.click(getByTestId('gradient-editor-ok'));
        expect(onConfirm).toHaveBeenCalledTimes(1);
        const result: GradientEditorResult = onConfirm.mock.calls[0][0];
        expect(result.colorStops).toHaveLength(3);
        const middle = result.colorStops[1];
        expect(middle.position).toBeGreaterThan(0.45);
        expect(middle.position).toBeLessThan(0.55);
    });

    it('drag a stop from 50% to 75% commits position 0.75', () => {
        const initial: GradientColorStop[] = [
            { position: 0, color: '#000000' },
            { position: 0.5, color: '#ff0000' },
            { position: 1, color: '#ffffff' },
        ];
        const onConfirm = vi.fn();
        const { getByTestId } = render(
            <GradientEditorDialog
                isOpen
                initialColorStops={initial}
                initialOpacityStops={baseOpacities}
                onClose={vi.fn()}
                onConfirm={onConfirm}
            />,
        );
        const row = getByTestId('gradient-color-row') as HTMLDivElement;
        mockBoundingRect(row, 360);
        const peg = getByTestId('gradient-color-stop-1') as HTMLDivElement;
        fireEvent.pointerDown(peg, { clientX: 180, clientY: 8, pointerId: 1 });
        fireEvent.pointerMove(peg, { clientX: 270, clientY: 8, pointerId: 1 });
        fireEvent.pointerUp(peg, { clientX: 270, clientY: 8, pointerId: 1 });
        fireEvent.click(getByTestId('gradient-editor-ok'));
        const result: GradientEditorResult = onConfirm.mock.calls[0][0];
        const moved = result.colorStops.find(s => s.color === '#ff0000');
        expect(moved).toBeTruthy();
        expect(moved!.position).toBeGreaterThan(0.7);
        expect(moved!.position).toBeLessThan(0.8);
    });

    it('changing a color via the selected-stop color picker updates the stop', () => {
        const onConfirm = vi.fn();
        const { getByTestId } = render(
            <GradientEditorDialog
                isOpen
                initialColorStops={baseColors}
                initialOpacityStops={baseOpacities}
                onClose={vi.fn()}
                onConfirm={onConfirm}
            />,
        );
        const peg = getByTestId('gradient-color-stop-0') as HTMLDivElement;
        fireEvent.pointerDown(peg, { clientX: 0, clientY: 8, pointerId: 1 });
        fireEvent.pointerUp(peg, { clientX: 0, clientY: 8, pointerId: 1 });
        // Click the selected-stop color swatch to open the ColorPickerDialog.
        fireEvent.click(getByTestId('gradient-selected-color'));
        // Type a hex value into the picker's hex input and Enter to commit.
        const hex = getByTestId('color-picker-hex-input') as HTMLInputElement;
        fireEvent.change(hex, { target: { value: 'ff0000' } });
        const pickerCard = getByTestId('color-picker-dialog');
        fireEvent.keyDown(pickerCard, { key: 'Enter' });
        fireEvent.click(getByTestId('gradient-editor-ok'));
        const result: GradientEditorResult = onConfirm.mock.calls[0][0];
        const updated = result.colorStops.find(s => Math.abs(s.position) < 0.001);
        expect(updated?.color).toBe('#ff0000');
    });

    it('Delete key removes the selected stop', () => {
        const initial: GradientColorStop[] = [
            { position: 0, color: '#000000' },
            { position: 0.5, color: '#ff0000' },
            { position: 1, color: '#ffffff' },
        ];
        const onConfirm = vi.fn();
        const { getByTestId } = render(
            <GradientEditorDialog
                isOpen
                initialColorStops={initial}
                initialOpacityStops={baseOpacities}
                onClose={vi.fn()}
                onConfirm={onConfirm}
            />,
        );
        const peg = getByTestId('gradient-color-stop-1') as HTMLDivElement;
        fireEvent.pointerDown(peg, { clientX: 180, clientY: 8, pointerId: 1 });
        fireEvent.pointerUp(peg, { clientX: 180, clientY: 8, pointerId: 1 });
        act(() => {
            fireEvent.keyDown(window, { key: 'Delete' });
        });
        fireEvent.click(getByTestId('gradient-editor-ok'));
        const result: GradientEditorResult = onConfirm.mock.calls[0][0];
        expect(result.colorStops).toHaveLength(2);
        expect(result.colorStops.find(s => s.color === '#ff0000')).toBeUndefined();
    });

    it('saving a preset adds an entry to gradientPresets', () => {
        const { getByTestId } = render(
            <GradientEditorDialog
                isOpen
                initialColorStops={baseColors}
                initialOpacityStops={baseOpacities}
                onClose={vi.fn()}
                onConfirm={vi.fn()}
            />,
        );
        const nameInput = getByTestId('gradient-preset-name') as HTMLInputElement;
        fireEvent.change(nameInput, { target: { value: 'My Gradient' } });
        fireEvent.click(getByTestId('gradient-save-preset'));
        expect(useEditorStore.getState().gradientPresets).toHaveLength(1);
        expect(useEditorStore.getState().gradientPresets[0].name).toBe('My Gradient');
    });

    it('applying a saved preset replaces the editor stops', () => {
        const presetColors: GradientColorStop[] = [
            { position: 0, color: '#ff0000' },
            { position: 0.5, color: '#00ff00' },
            { position: 1, color: '#0000ff' },
        ];
        useEditorStore.getState().saveGradientPreset('Rainbow', presetColors, baseOpacities, 80);
        const onConfirm = vi.fn();
        const { container, getByTestId } = render(
            <GradientEditorDialog
                isOpen
                initialColorStops={baseColors}
                initialOpacityStops={baseOpacities}
                onClose={vi.fn()}
                onConfirm={onConfirm}
            />,
        );
        const presetId = useEditorStore.getState().gradientPresets[0].id;
        fireEvent.click(getByTestId(`gradient-preset-${presetId}`));
        const debug = container.querySelector('[data-testid="gradient-debug-counts"]') as HTMLElement;
        expect(debug.getAttribute('data-color-count')).toBe('3');
        fireEvent.click(getByTestId('gradient-editor-ok'));
        const result: GradientEditorResult = onConfirm.mock.calls[0][0];
        expect(result.colorStops.map(s => s.color)).toEqual(['#ff0000', '#00ff00', '#0000ff']);
        expect(result.smoothness).toBe(80);
    });

    it('OptionsBar: opening editor from the gradient tool, committing a change writes to getGradientOptions().stops', async () => {
        useEditorStore.getState().setTool('gradient');
        const { getByTestId } = render(<OptionsBar />);
        fireEvent.click(getByTestId('gradient-edit-open'));
        const row = getByTestId('gradient-color-row') as HTMLDivElement;
        mockBoundingRect(row, 360);
        fireEvent.click(row, { clientX: 180, clientY: 8 });
        fireEvent.click(getByTestId('gradient-editor-ok'));
        const stops = getGradientOptions().stops;
        expect(stops).toBeTruthy();
        expect(stops!.length).toBeGreaterThanOrEqual(3);
    });

    it('OptionsBar: preview reflects custom stops and preset selection clears them', () => {
        useEditorStore.getState().setTool('gradient');
        setGradientOptions({
            presetId: 'black-to-white',
            stops: [
                { position: 0, color: '#ff0000', opacity: 1 },
                { position: 0.5, color: '#00ff00', opacity: 1 },
                { position: 1, color: '#0000ff', opacity: 1 },
            ],
        });
        const { getByTestId } = render(<OptionsBar />);

        expect((getByTestId('gradient-preview') as HTMLDivElement).style.background).toContain('0, 255, 0');

        fireEvent.change(getByTestId('gradient-preset-select'), { target: { value: 'black-to-white' } });
        expect(getGradientOptions().stops).toBeUndefined();
    });
});
