import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, cleanup, act, fireEvent } from '@testing-library/react';
import { FontPicker } from '../components/Panels/FontPicker';
import {
    __setAvailableFontsForTest,
    resolveFontFamily,
    shouldEmitFallbackToast,
    resetFontFallbackToastTracking,
} from '../utils/fontList';

const KNOWN_FONTS = ['Arial', 'Helvetica', 'Georgia', 'Courier New', 'Verdana'];

function setup(initialValue: string, onChange = vi.fn(), onCommit = vi.fn()) {
    __setAvailableFontsForTest(KNOWN_FONTS);
    const utils = render(
        <FontPicker
            value={initialValue}
            onChange={onChange}
            onCommit={onCommit}
            testIdPrefix="test-font-picker"
        />,
    );
    const input = utils.getByTestId('test-font-picker-input') as HTMLInputElement;
    return { ...utils, input, onChange, onCommit };
}

describe('FontPicker', () => {
    beforeEach(() => {
        cleanup();
        resetFontFallbackToastTracking();
    });

    it('typing "ar" filters the dropdown to fonts containing "ar"', () => {
        const { input, getByTestId, queryByTestId } = setup('Arial');
        act(() => { fireEvent.focus(input); });
        act(() => { fireEvent.change(input, { target: { value: 'ar' } }); });
        // Listbox should be open with filtered fonts.
        expect(getByTestId('test-font-picker-listbox')).toBeTruthy();
        // Arial contains "ar", but "Georgia" does not (it has "g","e","o","r","g","i","a" so includes "r" but not "ar"). Verify behavior:
        expect(queryByTestId('test-font-picker-option-Arial')).toBeTruthy();
        // Verdana does not contain "ar"
        expect(queryByTestId('test-font-picker-option-Verdana')).toBeNull();
        // Helvetica does not contain "ar"
        expect(queryByTestId('test-font-picker-option-Helvetica')).toBeNull();
    });

    it('ArrowDown then Enter selects the highlighted font', () => {
        const { input, onChange } = setup('');
        act(() => { fireEvent.focus(input); });
        // Default highlight is 0; press ArrowDown once to move to index 1, then Enter.
        act(() => { fireEvent.keyDown(input, { key: 'ArrowDown' }); });
        act(() => { fireEvent.keyDown(input, { key: 'Enter' }); });
        // With an empty value the filter is empty so all fonts are listed in the
        // order __setAvailableFontsForTest received them: Arial(0) → Courier New(1).
        expect(onChange).toHaveBeenCalledTimes(1);
        expect(onChange.mock.calls[0][0]).toBe(KNOWN_FONTS[1]);
    });

    it('Escape restores the prior value and closes the dropdown', () => {
        const { input, queryByTestId } = setup('Arial');
        act(() => { fireEvent.focus(input); });
        act(() => { fireEvent.change(input, { target: { value: 'helv' } }); });
        expect(queryByTestId('test-font-picker-listbox')).toBeTruthy();
        act(() => { fireEvent.keyDown(input, { key: 'Escape' }); });
        expect(queryByTestId('test-font-picker-listbox')).toBeNull();
        // After Escape the input mirrors the prop value.
        expect(input.value).toBe('Arial');
    });

    it('clicking an option commits that font', () => {
        const { input, onChange, getByTestId } = setup('');
        act(() => { fireEvent.focus(input); });
        const option = getByTestId('test-font-picker-option-Georgia');
        act(() => { fireEvent.click(option); });
        expect(onChange).toHaveBeenCalledWith('Georgia');
    });
});

describe('resolveFontFamily', () => {
    beforeEach(() => {
        __setAvailableFontsForTest([...KNOWN_FONTS, 'sans-serif']);
    });

    it('returns the requested font when it exists', () => {
        const r = resolveFontFamily('Arial');
        expect(r.resolved).toBe('Arial');
        expect(r.isFallback).toBe(false);
    });

    it('returns sans-serif + isFallback for a missing font', () => {
        const r = resolveFontFamily('NonExistentFont');
        expect(r.resolved).toBe('sans-serif');
        expect(r.isFallback).toBe(true);
    });
});

describe('missing-font fallback toast', () => {
    beforeEach(() => { resetFontFallbackToastTracking(); });

    it('fires once per layer per session', () => {
        expect(shouldEmitFallbackToast('layer-a')).toBe(true);
        expect(shouldEmitFallbackToast('layer-a')).toBe(false);
        expect(shouldEmitFallbackToast('layer-b')).toBe(true);
        expect(shouldEmitFallbackToast('layer-a')).toBe(false);
    });
});
