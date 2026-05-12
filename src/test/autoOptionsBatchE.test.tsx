import { describe, it, expect, afterEach } from 'vitest';
import { render, cleanup, fireEvent } from '@testing-library/react';
import { AutoOptionsDialog } from '../components/Dialogs/AutoOptionsDialog';
import { autoOptionsToAdjustmentId, DEFAULT_AUTO_OPTIONS, loadAutoOptions, saveAutoOptions } from '../utils/autoOptions';

afterEach(() => cleanup());

describe('Batch E — Auto Options sub-dialog', () => {
    it('renders the four enhancement-mode radios + Snap Neutral Midtones', () => {
        const { getByTestId } = render(
            <AutoOptionsDialog isOpen={true} onConfirm={() => { /* noop */ }} onClose={() => { /* noop */ }} />
        );
        expect(getByTestId('auto-mode-find-dark-light')).toBeTruthy();
        expect(getByTestId('auto-mode-per-channel-contrast')).toBeTruthy();
        expect(getByTestId('auto-mode-monochromatic-contrast')).toBeTruthy();
        expect(getByTestId('auto-mode-brightness-contrast')).toBeTruthy();
        expect(getByTestId('auto-snap-neutral')).toBeTruthy();
    });

    it('selecting a mode and confirming invokes onConfirm with that mode', () => {
        let captured: { mode: string } | null = null;
        const { getByTestId } = render(
            <AutoOptionsDialog isOpen={true} onConfirm={(opts) => { captured = opts; }} onClose={() => { /* noop */ }} />
        );
        fireEvent.click(getByTestId('auto-mode-monochromatic-contrast'));
        fireEvent.click(getByTestId('auto-options-confirm'));
        expect(captured).not.toBeNull();
        expect(captured!.mode).toBe('monochromatic-contrast');
    });

    it('shadow / highlight clip percent fields update via numeric input', () => {
        let captured: { shadowsClipPercent: number; highlightsClipPercent: number } | null = null;
        const { getByTestId } = render(
            <AutoOptionsDialog isOpen={true} onConfirm={(opts) => { captured = opts; }} onClose={() => { /* noop */ }} />
        );
        const shadow = getByTestId('auto-shadow-clip') as HTMLInputElement;
        const highlight = getByTestId('auto-highlight-clip') as HTMLInputElement;
        fireEvent.change(shadow, { target: { value: '0.5' } });
        fireEvent.change(highlight, { target: { value: '1.25' } });
        fireEvent.click(getByTestId('auto-options-confirm'));
        expect(captured!.shadowsClipPercent).toBe(0.5);
        expect(captured!.highlightsClipPercent).toBe(1.25);
    });

    it('autoOptionsToAdjustmentId maps modes to existing auto adjustments', () => {
        expect(autoOptionsToAdjustmentId('find-dark-light')).toBe('auto-color');
        expect(autoOptionsToAdjustmentId('per-channel-contrast')).toBe('auto-tone');
        expect(autoOptionsToAdjustmentId('monochromatic-contrast')).toBe('auto-contrast');
        expect(autoOptionsToAdjustmentId('brightness-contrast')).toBe('auto-contrast');
    });

    it('saveAutoOptions then loadAutoOptions round-trips when localStorage is available', () => {
        if (typeof localStorage === 'undefined' || typeof localStorage.getItem !== 'function' || typeof localStorage.setItem !== 'function') {
            return;
        }
        // Verify the API is functional (some test envs swallow setItem silently).
        try {
            localStorage.setItem('__probe__', '1');
            if (localStorage.getItem('__probe__') !== '1') return;
            localStorage.removeItem('__probe__');
        } catch { return; }
        const next = { ...DEFAULT_AUTO_OPTIONS, mode: 'per-channel-contrast' as const, shadowsClipPercent: 0.25 };
        saveAutoOptions(next);
        const loaded = loadAutoOptions();
        expect(loaded.mode).toBe('per-channel-contrast');
        expect(loaded.shadowsClipPercent).toBe(0.25);
    });
});
