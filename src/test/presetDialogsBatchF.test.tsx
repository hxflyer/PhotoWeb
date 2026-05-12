import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { render, cleanup, fireEvent } from '@testing-library/react';
import { useEditorStore } from '../store/editorStore';
import { ensureStubsRegistered } from '../tools/stubs';
import { BrushPresetsPanel } from '../components/Panels/BrushPresetsPanel';
import { NewBrushPresetDialog } from '../components/Dialogs/NewBrushPresetDialog';
import { DefinePatternDialog } from '../components/Dialogs/DefinePatternDialog';

ensureStubsRegistered();

function resetState() {
    useEditorStore.getState().clearHistory();
    useEditorStore.setState((s) => ({
        ...s,
        layers: [],
        activeLayerId: null,
        brushPresets: [],
        patternPresets: [],
        width: 100,
        height: 100,
    }));
    useEditorStore.getState().addLayer();
}

describe('NewBrushPresetDialog (Batch F)', () => {
    afterEach(cleanup);
    beforeEach(resetState);

    it('does not render when closed', () => {
        const { queryByTestId } = render(
            <NewBrushPresetDialog isOpen={false} onCancel={() => {}} onCommit={() => {}} />
        );
        expect(queryByTestId('new-brush-preset-dialog')).toBeNull();
    });

    it('renders preview swatch, name input, and capture toggles', () => {
        const { getByTestId } = render(
            <NewBrushPresetDialog isOpen={true} onCancel={() => {}} onCommit={() => {}} />
        );
        expect(getByTestId('new-brush-preset-dialog')).toBeTruthy();
        expect(getByTestId('new-brush-preset-preview')).toBeTruthy();
        expect(getByTestId('new-brush-preset-name')).toBeTruthy();
        expect(getByTestId('new-brush-preset-capture-size')).toBeTruthy();
        expect(getByTestId('new-brush-preset-capture-color')).toBeTruthy();
    });

    it('OK calls onCommit with the entered name', () => {
        let result: { name: string; captureSize: boolean; captureColor: boolean } | null = null;
        const { getByTestId } = render(
            <NewBrushPresetDialog
                isOpen={true}
                onCancel={() => {}}
                onCommit={(p) => { result = p; }}
            />
        );
        const input = getByTestId('new-brush-preset-name') as HTMLInputElement;
        fireEvent.change(input, { target: { value: 'My Preset' } });
        fireEvent.click(getByTestId('new-brush-preset-ok'));
        expect(result).not.toBeNull();
        expect(result!.name).toBe('My Preset');
    });

    it('Cancel calls onCancel and does not commit', () => {
        let cancelled = false;
        let committed = false;
        const { getByTestId } = render(
            <NewBrushPresetDialog
                isOpen={true}
                onCancel={() => { cancelled = true; }}
                onCommit={() => { committed = true; }}
            />
        );
        fireEvent.click(getByTestId('new-brush-preset-cancel'));
        expect(cancelled).toBe(true);
        expect(committed).toBe(false);
    });
});

describe('BrushPresetsPanel new-preset dialog wiring (Batch F)', () => {
    afterEach(cleanup);
    beforeEach(resetState);

    it('clicking the New Preset footer opens the real dialog (not window.prompt)', () => {
        const { getByTestId, queryByTestId } = render(<BrushPresetsPanel />);
        expect(queryByTestId('new-brush-preset-dialog')).toBeNull();
        // Footer button has text "New Preset"; find via test id pattern.
        const newBtn = getByTestId('brush-presets-new');
        fireEvent.click(newBtn);
        expect(getByTestId('new-brush-preset-dialog')).toBeTruthy();
    });
});

describe('DefinePatternDialog (Batch F)', () => {
    afterEach(cleanup);
    beforeEach(resetState);

    it('does not render when closed', () => {
        const { queryByTestId } = render(
            <DefinePatternDialog isOpen={false} onCancel={() => {}} onCommit={() => {}} />
        );
        expect(queryByTestId('define-pattern-dialog')).toBeNull();
    });

    it('renders the preview canvas + name input', () => {
        const { getByTestId } = render(
            <DefinePatternDialog isOpen={true} onCancel={() => {}} onCommit={() => {}} />
        );
        expect(getByTestId('define-pattern-dialog')).toBeTruthy();
        expect(getByTestId('define-pattern-preview')).toBeTruthy();
        expect(getByTestId('define-pattern-name')).toBeTruthy();
    });

    it('OK commits the name', () => {
        let result: { name: string } | null = null;
        const { getByTestId } = render(
            <DefinePatternDialog isOpen={true} onCancel={() => {}} onCommit={(p) => { result = p; }} />
        );
        const input = getByTestId('define-pattern-name') as HTMLInputElement;
        fireEvent.change(input, { target: { value: 'Tile A' } });
        fireEvent.click(getByTestId('define-pattern-ok'));
        expect(result).not.toBeNull();
        expect(result!.name).toBe('Tile A');
    });
});
