/**
 * Batch A quick wins — simulator-driven coverage for the small dialog/panel
 * polish slice. Each describe-block exercises one item in order.
 */
import { describe, it, expect, afterEach } from 'vitest';
import { render, fireEvent, cleanup } from '@testing-library/react';
import { ColorPickerDialog } from '../components/Dialogs/ColorPickerDialog';
import { ScaleEffectsDialog } from '../components/Dialogs/ScaleEffectsDialog';
import { InputNumberDialog } from '../components/Dialogs/InputNumberDialog';
import { DefringeDialog } from '../components/Dialogs/DefringeDialog';
import { runScript } from './simulator';

describe('Batch A — TestDialog removal', () => {
    it('removes the dead Dialogs/TestDialog.tsx file', () => {
        // Vite glob: returns 0 entries when the module is not bundled. Fails
        // closed if anyone re-introduces the file.
        const matches = import.meta.glob('../components/Dialogs/TestDialog.tsx');
        expect(Object.keys(matches).length).toBe(0);
    });
});

afterEach(() => cleanup());

describe('Batch A — ColorPickerDialog hex + Enter + current swatch revert', () => {
    it('accepts 3-digit hex, leading #, and whitespace', () => {
        let committed = '';
        const { getByTestId } = render(
            <ColorPickerDialog
                isOpen
                initialColor="#000000"
                onConfirm={(c) => { committed = c; }}
                onClose={() => { /* noop */ }}
            />
        );
        const hex = getByTestId('color-picker-hex-input') as HTMLInputElement;
        // 3-digit form "f80" => "ff8800"
        fireEvent.change(hex, { target: { value: 'f80' } });
        // Pressing Enter commits via the dialog card handler.
        const dialog = getByTestId('color-picker-dialog');
        fireEvent.keyDown(dialog, { key: 'Enter' });
        expect(committed).toBe('#ff8800');
    });

    it('normalizes leading # and whitespace on 6-digit hex', () => {
        let committed = '';
        const { getByTestId } = render(
            <ColorPickerDialog
                isOpen
                initialColor="#000000"
                onConfirm={(c) => { committed = c; }}
                onClose={() => { /* noop */ }}
            />
        );
        const hex = getByTestId('color-picker-hex-input') as HTMLInputElement;
        fireEvent.change(hex, { target: { value: '  #ff0000  ' } });
        const dialog = getByTestId('color-picker-dialog');
        fireEvent.keyDown(dialog, { key: 'Enter' });
        expect(committed).toBe('#ff0000');
    });

    it('clicking current-color swatch reverts to initialColor', async () => {
        let committed = '';
        const { getByTestId } = render(
            <ColorPickerDialog
                isOpen
                initialColor="#112233"
                onConfirm={(c) => { committed = c; }}
                onClose={() => { /* noop */ }}
            />
        );
        // Change hex first.
        const hex = getByTestId('color-picker-hex-input') as HTMLInputElement;
        fireEvent.change(hex, { target: { value: 'ffffff' } });
        // Click current swatch -> reverts.
        await runScript([
            { type: 'click', target: getByTestId('color-picker-current-swatch') },
        ]);
        const dialog = getByTestId('color-picker-dialog');
        fireEvent.keyDown(dialog, { key: 'Enter' });
        expect(committed).toBe('#112233');
    });
});

describe('Batch A — ScaleEffectsDialog a11y + Preview + min 1%', () => {
    it('accepts 1% as the minimum value', () => {
        let committed = 0;
        const { getByTestId } = render(
            <ScaleEffectsDialog
                isOpen
                onClose={() => { /* noop */ }}
                onConfirm={(v) => { committed = v; }}
            />
        );
        const input = getByTestId('scale-effects-input') as HTMLInputElement;
        fireEvent.change(input, { target: { value: '1' } });
        fireEvent.click(getByTestId('scale-effects-ok'));
        expect(committed).toBe(1);
    });

    it('renders aria-modal and the Preview checkbox', () => {
        const { getByTestId } = render(
            <ScaleEffectsDialog isOpen onClose={() => { /* noop */ }} onConfirm={() => { /* noop */ }} />
        );
        const card = getByTestId('scale-effects-dialog');
        expect(card.getAttribute('aria-modal')).toBe('true');
        expect(card.getAttribute('role')).toBe('dialog');
        const preview = getByTestId('scale-effects-preview') as HTMLInputElement;
        expect(preview.checked).toBe(true);
    });

    it('Opt+P toggles the Preview checkbox', async () => {
        const { getByTestId } = render(
            <ScaleEffectsDialog isOpen onClose={() => { /* noop */ }} onConfirm={() => { /* noop */ }} />
        );
        await runScript([
            { type: 'keyDown', key: 'p', modifiers: { alt: true } },
        ]);
        const preview = getByTestId('scale-effects-preview') as HTMLInputElement;
        expect(preview.checked).toBe(false);
    });
});

describe('Batch A — InputNumberDialog OK label + suffix/step/decimals', () => {
    it('renders the confirm button as "OK" (not "Confirm")', () => {
        const { getByTestId } = render(
            <InputNumberDialog
                isOpen
                title="Feather"
                label="Radius"
                initialValue={5}
                onClose={() => { /* noop */ }}
                onConfirm={() => { /* noop */ }}
            />
        );
        expect(getByTestId('input-number-ok').textContent).toBe('OK');
    });

    it('renders the suffix when provided', () => {
        const { getByText } = render(
            <InputNumberDialog
                isOpen
                title="Feather"
                label="Radius"
                initialValue={5}
                suffix="px"
                onClose={() => { /* noop */ }}
                onConfirm={() => { /* noop */ }}
            />
        );
        expect(getByText('px')).toBeTruthy();
    });

    it('Defringe accepts up to 64 px and Enter confirms', () => {
        let committed = 0;
        const { getByTestId } = render(
            <DefringeDialog
                isOpen
                onClose={() => { /* noop */ }}
                onConfirm={(v) => { committed = v; }}
            />
        );
        const slider = getByTestId('defringe-width-slider') as HTMLInputElement;
        expect(slider.max).toBe('64');
        const numInput = getByTestId('defringe-width-input') as HTMLInputElement;
        fireEvent.change(numInput, { target: { value: '48' } });
        // Press Enter on the dialog card.
        const card = getByTestId('defringe-dialog');
        fireEvent.keyDown(card, { key: 'Enter' });
        expect(committed).toBe(48);
    });

    it('rounds to the given decimals on confirm', async () => {
        let committed = 0;
        const { getByTestId, container } = render(
            <InputNumberDialog
                isOpen
                title="Scale"
                label="Value"
                initialValue={1.2345}
                step={0.01}
                decimals={2}
                onClose={() => { /* noop */ }}
                onConfirm={(v) => { committed = v; }}
            />
        );
        const input = container.querySelector('input[type="number"]') as HTMLInputElement;
        fireEvent.change(input, { target: { value: '1.2345' } });
        fireEvent.click(getByTestId('input-number-ok'));
        expect(committed).toBe(1.23);
    });
});
