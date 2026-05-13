/**
 * 04b-file-new — File > New dialog and Cmd+A → Cmd+C → Cmd+N choreography.
 *
 * Covers F1 (clipboard-driven W/H/Resolution prefill), F2 (tabs), F3
 * (orientation swap), F4 (custom background), F5 (name + saved presets).
 */
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, cleanup, fireEvent } from '@testing-library/react';
import App from '../App';
import { NewDocumentDialog } from '../components/Dialogs/NewDocumentDialog';
import { useEditorStore } from '../store/editorStore';
import { ensureStubsRegistered } from '../tools/stubs';
import { copyActiveDocumentForClipboard } from '../utils/copyImageForClipboard';
import {
    __resetNewDocPresetsForTests,
    listSavedPresets,
    peekNextUntitledIndex,
    listRecentPresets,
} from '../utils/newDocPresets';
import { runScript } from './simulator';

ensureStubsRegistered();

function resetStore() {
    useEditorStore.getState().clearHistory();
    useEditorStore.setState((s) => ({
        ...s,
        layers: [],
        activeLayerId: null,
        selectedLayerIds: [],
        layerSelectionAnchorId: null,
        clipboardImageInfo: null,
        selection: {
            ...s.selection,
            hasSelection: false,
            operations: [],
        },
        width: 640,
        height: 400,
    }));
    useEditorStore.getState().newDocument(640, 400, '#ffffff');
    useEditorStore.getState().markDocumentClean();
}

beforeEach(() => {
    __resetNewDocPresetsForTests();
    resetStore();
    vi.spyOn(window, 'confirm').mockReturnValue(true);
});

afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
    __resetNewDocPresetsForTests();
});

describe('04b — clipboard-driven W/H prefill (F1)', () => {
    it('Cmd+A → Cmd+C → Cmd+N opens dialog with full-doc dimensions prefilled', async () => {
        render(<App />);
        // The Cmd+A → Cmd+C key path bubbles through App's keyboard handler
        // and ends up calling copyActiveDocumentForClipboard, which records
        // clipboardImageInfo. Cmd+N then opens the dialog.
        await runScript([
            { type: 'keyDown', key: 'a', modifiers: { meta: true } },
            { type: 'keyDown', key: 'c', modifiers: { meta: true } },
            { type: 'keyDown', key: 'n', modifiers: { meta: true } },
        ]);
        const dialog = document.querySelector('[data-testid="new-document-dialog"]');
        expect(dialog).not.toBeNull();
        const wInput = document.querySelector('[data-testid="new-doc-width"]') as HTMLInputElement;
        const hInput = document.querySelector('[data-testid="new-doc-height"]') as HTMLInputElement;
        expect(wInput.value).toBe('640');
        expect(hInput.value).toBe('400');
    });

    it('Copy with a marquee selection records the bbox dimensions, not the full doc', () => {
        const s = useEditorStore.getState();
        s.setHasSelection(true);
        s.setSelectionOperations([{ mode: 'add', type: 'rect', path: [{ x: 50, y: 30 }, { x: 250, y: 180 }] }]);
        copyActiveDocumentForClipboard(useEditorStore.getState());
        const info = useEditorStore.getState().clipboardImageInfo;
        expect(info).not.toBeNull();
        expect(info!.width).toBe(200);
        expect(info!.height).toBe(150);
    });

    it('Opening the dialog without a prior Copy uses the default 1920×1080', () => {
        const { container } = render(<NewDocumentDialog isOpen={true} onClose={() => { /* noop */ }} />);
        const wInput = container.querySelector('[data-testid="new-doc-width"]') as HTMLInputElement;
        const hInput = container.querySelector('[data-testid="new-doc-height"]') as HTMLInputElement;
        expect(wInput.value).toBe('1920');
        expect(hInput.value).toBe('1080');
    });

    it('Cmd+C while typing in a dialog input does NOT capture clipboard info', async () => {
        // The keyboard handler bails on INPUT focus so the system Cmd+C
        // (browser default text-copy) wins. We assert by checking that
        // clipboardImageInfo stays null after a focused-input Cmd+C.
        render(<App />);
        // Open dialog first (Cmd+N)
        await runScript([{ type: 'keyDown', key: 'n', modifiers: { meta: true } }]);
        const wInput = document.querySelector('[data-testid="new-doc-width"]') as HTMLInputElement;
        wInput.focus();
        fireEvent.keyDown(wInput, { key: 'c', metaKey: true });
        expect(useEditorStore.getState().clipboardImageInfo).toBeNull();
    });
});

describe('04b — category tabs (F2)', () => {
    it('renders Recent / Saved / Photo / Web tabs', () => {
        const { container } = render(<NewDocumentDialog isOpen={true} onClose={() => { /* noop */ }} />);
        expect(container.querySelector('[data-testid="tab-recent"]')).not.toBeNull();
        expect(container.querySelector('[data-testid="tab-saved"]')).not.toBeNull();
        expect(container.querySelector('[data-testid="tab-photo"]')).not.toBeNull();
        expect(container.querySelector('[data-testid="tab-web"]')).not.toBeNull();
    });

    it('clicking a tab swaps the gallery contents', () => {
        const { container } = render(<NewDocumentDialog isOpen={true} onClose={() => { /* noop */ }} />);
        const gallery = container.querySelector('[data-testid="preset-gallery"]')!;
        // Default opens with Photo (no Recent items exist after reset)
        const photoTab = container.querySelector('[data-testid="tab-photo"]')!;
        fireEvent.click(photoTab);
        expect(gallery.textContent).toContain('Default photo');

        const webTab = container.querySelector('[data-testid="tab-web"]')!;
        fireEvent.click(webTab);
        expect(gallery.textContent).toContain('1920');
        expect(gallery.textContent).not.toContain('Default photo');
    });

    it('Create pushes the chosen size onto Recent', () => {
        const { container, rerender } = render(<NewDocumentDialog isOpen={true} onClose={() => { /* noop */ }} />);
        const createBtn = container.querySelector('[data-testid="new-document-create-btn"]') as HTMLButtonElement;
        fireEvent.click(createBtn);
        const recents = listRecentPresets();
        expect(recents.length).toBe(1);
        expect(recents[0].width).toBe(1920);
        expect(recents[0].height).toBe(1080);

        rerender(<NewDocumentDialog isOpen={false} onClose={() => { /* noop */ }} />);
        rerender(<NewDocumentDialog isOpen={true} onClose={() => { /* noop */ }} />);
        const recentTab = container.querySelector('[data-testid="tab-recent"]')!;
        expect(recentTab.textContent).toMatch(/\(1\)/);
    });
});

describe('04b — orientation toggle (F3)', () => {
    it('clicking Portrait swaps W and H when Landscape is active', () => {
        const { container } = render(<NewDocumentDialog isOpen={true} onClose={() => { /* noop */ }} />);
        const wInput = container.querySelector('[data-testid="new-doc-width"]') as HTMLInputElement;
        const hInput = container.querySelector('[data-testid="new-doc-height"]') as HTMLInputElement;
        // Default 1920×1080 → Landscape is active.
        expect(wInput.value).toBe('1920');
        expect(hInput.value).toBe('1080');
        const portraitBtn = container.querySelector('[data-testid="orientation-portrait"]') as HTMLButtonElement;
        fireEvent.click(portraitBtn);
        expect(wInput.value).toBe('1080');
        expect(hInput.value).toBe('1920');
        expect(portraitBtn.getAttribute('aria-pressed')).toBe('true');
    });

    it('clicking the already-active orientation is a no-op', () => {
        const { container } = render(<NewDocumentDialog isOpen={true} onClose={() => { /* noop */ }} />);
        const landscapeBtn = container.querySelector('[data-testid="orientation-landscape"]') as HTMLButtonElement;
        fireEvent.click(landscapeBtn);
        const wInput = container.querySelector('[data-testid="new-doc-width"]') as HTMLInputElement;
        const hInput = container.querySelector('[data-testid="new-doc-height"]') as HTMLInputElement;
        expect(wInput.value).toBe('1920');
        expect(hInput.value).toBe('1080');
    });
});

describe('04b — custom background color (F4)', () => {
    it('swatch reflects the dropdown choice', () => {
        const { container } = render(<NewDocumentDialog isOpen={true} onClose={() => { /* noop */ }} />);
        const swatch = container.querySelector('[data-testid="new-doc-bg-swatch"]') as HTMLButtonElement;
        expect(swatch.getAttribute('data-bg')).toBe('white');
        const bgSelect = container.querySelector('[data-testid="new-doc-bg"]') as HTMLSelectElement;
        fireEvent.change(bgSelect, { target: { value: 'transparent' } });
        expect(swatch.getAttribute('data-bg')).toBe('transparent');
        fireEvent.change(bgSelect, { target: { value: 'black' } });
        expect(swatch.getAttribute('data-bg')).toBe('black');
    });

    it('Custom color fills the new document with the chosen RGB', async () => {
        const { container } = render(<NewDocumentDialog isOpen={true} onClose={() => { /* noop */ }} />);
        const bgSelect = container.querySelector('[data-testid="new-doc-bg"]') as HTMLSelectElement;
        fireEvent.change(bgSelect, { target: { value: 'custom' } });
        const colorInput = container.querySelector('[data-testid="new-doc-bg-custom-input"]') as HTMLInputElement;
        fireEvent.input(colorInput, { target: { value: '#ff0040' } });
        // Use a small W/H to keep the test fast.
        const wInput = container.querySelector('[data-testid="new-doc-width"]') as HTMLInputElement;
        const hInput = container.querySelector('[data-testid="new-doc-height"]') as HTMLInputElement;
        fireEvent.change(wInput, { target: { value: '40' } });
        fireEvent.blur(wInput);
        fireEvent.change(hInput, { target: { value: '40' } });
        fireEvent.blur(hInput);
        const createBtn = container.querySelector('[data-testid="new-document-create-btn"]') as HTMLButtonElement;
        fireEvent.click(createBtn);
        const state = useEditorStore.getState();
        const layer = state.layers.find(l => l.id === state.activeLayerId)!;
        const data = layer.ctx.getImageData(5, 5, 1, 1).data;
        expect(data[0]).toBe(0xff);
        expect(data[1]).toBe(0x00);
        expect(data[2]).toBe(0x40);
    });
});

describe('04b — document name + saved presets (F5)', () => {
    it('typed name lands on the created document', () => {
        const { container } = render(<NewDocumentDialog isOpen={true} onClose={() => { /* noop */ }} />);
        const nameInput = container.querySelector('[data-testid="new-doc-name"]') as HTMLInputElement;
        fireEvent.change(nameInput, { target: { value: 'Hero Banner' } });
        const createBtn = container.querySelector('[data-testid="new-document-create-btn"]') as HTMLButtonElement;
        fireEvent.click(createBtn);
        expect(useEditorStore.getState().documentName).toBe('Hero Banner');
    });

    it('Untitled-N increments after each Create that kept the default name', () => {
        // First open: Untitled-1
        const { rerender, container } = render(<NewDocumentDialog isOpen={true} onClose={() => { /* noop */ }} />);
        const nameInput = container.querySelector('[data-testid="new-doc-name"]') as HTMLInputElement;
        expect(nameInput.value).toBe('Untitled-1');
        fireEvent.click(container.querySelector('[data-testid="new-document-create-btn"]') as HTMLButtonElement);
        expect(peekNextUntitledIndex()).toBe(2);

        // Reopen: Untitled-2
        rerender(<NewDocumentDialog isOpen={false} onClose={() => { /* noop */ }} />);
        rerender(<NewDocumentDialog isOpen={true} onClose={() => { /* noop */ }} />);
        const nameInput2 = container.querySelector('[data-testid="new-doc-name"]') as HTMLInputElement;
        expect(nameInput2.value).toBe('Untitled-2');
    });

    it('clicking Save Preset adds an entry visible under Saved tab', () => {
        const { container } = render(<NewDocumentDialog isOpen={true} onClose={() => { /* noop */ }} />);
        const nameInput = container.querySelector('[data-testid="new-doc-name"]') as HTMLInputElement;
        fireEvent.change(nameInput, { target: { value: 'My layout' } });
        const saveBtn = container.querySelector('[data-testid="new-doc-save-preset"]') as HTMLButtonElement;
        fireEvent.click(saveBtn);
        const saved = listSavedPresets();
        expect(saved.length).toBe(1);
        expect(saved[0].name).toBe('My layout');
        // The component switches to the Saved tab and renders the tile.
        const tile = container.querySelector(`[data-testid="preset-tile-saved-${saved[0].id}"]`);
        expect(tile).not.toBeNull();
    });

    it('hovering a saved preset reveals a trash icon that deletes it', () => {
        const { container } = render(<NewDocumentDialog isOpen={true} onClose={() => { /* noop */ }} />);
        // Save one
        const nameInput = container.querySelector('[data-testid="new-doc-name"]') as HTMLInputElement;
        fireEvent.change(nameInput, { target: { value: 'Will be deleted' } });
        fireEvent.click(container.querySelector('[data-testid="new-doc-save-preset"]') as HTMLButtonElement);
        const saved = listSavedPresets();
        const tile = container.querySelector(`[data-testid="preset-tile-saved-${saved[0].id}"]`)!;
        fireEvent.mouseEnter(tile);
        const trash = container.querySelector(`[data-testid="preset-tile-saved-${saved[0].id}-trash"]`) as HTMLButtonElement;
        expect(trash).not.toBeNull();
        fireEvent.click(trash);
        expect(listSavedPresets().length).toBe(0);
        expect(container.querySelector(`[data-testid="preset-tile-saved-${saved[0].id}"]`)).toBeNull();
    });

    it('Save Preset with empty name is rejected with a toast', () => {
        const { container } = render(<NewDocumentDialog isOpen={true} onClose={() => { /* noop */ }} />);
        const nameInput = container.querySelector('[data-testid="new-doc-name"]') as HTMLInputElement;
        fireEvent.change(nameInput, { target: { value: '   ' } });
        const saveBtn = container.querySelector('[data-testid="new-doc-save-preset"]') as HTMLButtonElement;
        fireEvent.click(saveBtn);
        expect(listSavedPresets().length).toBe(0);
        const toasts = useEditorStore.getState().toasts;
        expect(toasts.some(t => t.type === 'error' && /name/i.test(t.message))).toBe(true);
    });
});
