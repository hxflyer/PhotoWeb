/**
 * 04c-file-save-close — File > Close, Close All, save-on-close prompt,
 * Save As with Format selector + JPEG Options.
 */
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, cleanup, fireEvent } from '@testing-library/react';
import App from '../App';
import { SaveAsDialog } from '../components/Dialogs/SaveAsDialog';
import { useEditorStore } from '../store/editorStore';
import { ensureStubsRegistered } from '../tools/stubs';
import { runScript } from './simulator';

ensureStubsRegistered();

function resetStore() {
    useEditorStore.getState().clearHistory();
    useEditorStore.setState(s => ({
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
        width: 64,
        height: 48,
    }));
    useEditorStore.getState().newDocument(64, 48, '#ffffff', 'My Doc');
    useEditorStore.getState().markDocumentClean();
}

beforeEach(() => {
    resetStore();
    vi.spyOn(window, 'confirm').mockReturnValue(true);
});

afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
});

describe('04c — File > Close (F1)', () => {
    it('Cmd+W on a clean doc closes it without prompting', async () => {
        render(<App />);
        expect(useEditorStore.getState().layers.length).toBeGreaterThan(0);
        await runScript([{ type: 'keyDown', key: 'w', modifiers: { meta: true } }]);
        expect(document.querySelector('[data-testid="close-confirm-dialog"]')).toBeNull();
        expect(useEditorStore.getState().layers.length).toBe(0);
        expect(useEditorStore.getState().documentName).toBe('');
    });

    it('Cmd+W on a dirty doc opens the save-on-close prompt with the doc name', async () => {
        render(<App />);
        useEditorStore.getState().markDocumentDirty();
        await runScript([{ type: 'keyDown', key: 'w', modifiers: { meta: true } }]);
        const dialog = document.querySelector('[data-testid="close-confirm-dialog"]');
        expect(dialog).not.toBeNull();
        const title = document.querySelector('[data-testid="close-confirm-title"]');
        expect(title?.textContent).toContain('My Doc');
        // Doc is still open at this point.
        expect(useEditorStore.getState().layers.length).toBeGreaterThan(0);
    });

    it("Don't Save discards changes and closes without saving", async () => {
        render(<App />);
        useEditorStore.getState().markDocumentDirty();
        await runScript([{ type: 'keyDown', key: 'w', modifiers: { meta: true } }]);
        const saveSpy = vi.spyOn(useEditorStore.getState(), 'saveFile');
        const dontSave = document.querySelector('[data-testid="close-confirm-dont-save"]') as HTMLButtonElement;
        fireEvent.click(dontSave);
        expect(saveSpy).not.toHaveBeenCalled();
        expect(useEditorStore.getState().layers.length).toBe(0);
        expect(document.querySelector('[data-testid="close-confirm-dialog"]')).toBeNull();
    });

    it('Cancel keeps the doc open and dialog dismissed', async () => {
        render(<App />);
        useEditorStore.getState().markDocumentDirty();
        await runScript([{ type: 'keyDown', key: 'w', modifiers: { meta: true } }]);
        const cancel = document.querySelector('[data-testid="close-confirm-cancel"]') as HTMLButtonElement;
        fireEvent.click(cancel);
        expect(document.querySelector('[data-testid="close-confirm-dialog"]')).toBeNull();
        expect(useEditorStore.getState().layers.length).toBeGreaterThan(0);
        expect(useEditorStore.getState().isDirty).toBe(true);
    });

    it('Save saves then closes', async () => {
        render(<App />);
        useEditorStore.getState().markDocumentDirty();
        await runScript([{ type: 'keyDown', key: 'w', modifiers: { meta: true } }]);
        const saveSpy = vi.spyOn(useEditorStore.getState(), 'saveFile').mockResolvedValue();
        const saveBtn = document.querySelector('[data-testid="close-confirm-save"]') as HTMLButtonElement;
        fireEvent.click(saveBtn);
        // Wait for the promise chain to flush.
        await Promise.resolve();
        await Promise.resolve();
        expect(saveSpy).toHaveBeenCalledWith('My Doc');
        expect(useEditorStore.getState().layers.length).toBe(0);
    });

    it('Esc on the prompt dismisses it and leaves the doc open', async () => {
        render(<App />);
        useEditorStore.getState().markDocumentDirty();
        await runScript([{ type: 'keyDown', key: 'w', modifiers: { meta: true } }]);
        fireEvent.keyDown(document.querySelector('[data-testid="close-confirm-dialog"]') as Element, { key: 'Escape' });
        expect(useEditorStore.getState().layers.length).toBeGreaterThan(0);
    });

    it('Document Tab × button on dirty doc opens the same prompt', () => {
        render(<App />);
        useEditorStore.getState().markDocumentDirty();
        const closeBtn = document.querySelector('[data-testid="document-tab-close"]') as HTMLButtonElement;
        expect(closeBtn).not.toBeNull();
        fireEvent.click(closeBtn);
        expect(document.querySelector('[data-testid="close-confirm-dialog"]')).not.toBeNull();
    });
});

describe('04c — File > Close All (F2)', () => {
    it('Cmd+Alt+W on a clean doc closes it', async () => {
        render(<App />);
        await runScript([{ type: 'keyDown', key: 'w', modifiers: { meta: true, alt: true } }]);
        expect(useEditorStore.getState().layers.length).toBe(0);
    });

    it('Cmd+Alt+W on a dirty doc opens the same prompt', async () => {
        render(<App />);
        useEditorStore.getState().markDocumentDirty();
        await runScript([{ type: 'keyDown', key: 'w', modifiers: { meta: true, alt: true } }]);
        expect(document.querySelector('[data-testid="close-confirm-dialog"]')).not.toBeNull();
    });
});

describe('04c — Save As Format selector (F3)', () => {
    it('renders Name input + Format select + Save button', () => {
        const { container } = render(<SaveAsDialog isOpen={true} initialName="hero" onClose={() => { /* noop */ }} />);
        expect(container.querySelector('[data-testid="save-as-name"]')).not.toBeNull();
        expect(container.querySelector('[data-testid="save-as-format"]')).not.toBeNull();
        expect(container.querySelector('[data-testid="save-as-save-btn"]')).not.toBeNull();
    });

    it('filename preview reflects Name + Format', () => {
        const { container } = render(<SaveAsDialog isOpen={true} initialName="hero" onClose={() => { /* noop */ }} />);
        const preview = container.querySelector('[data-testid="save-as-filename-preview"]')!;
        expect(preview.textContent).toContain('hero.pwbdoc');
        const format = container.querySelector('[data-testid="save-as-format"]') as HTMLSelectElement;
        fireEvent.change(format, { target: { value: 'jpeg' } });
        expect(preview.textContent).toContain('hero.jpg');
        fireEvent.change(format, { target: { value: 'png' } });
        expect(preview.textContent).toContain('hero.png');
    });

    it('picking JPEG and clicking Save opens JPEG Options', () => {
        const { container } = render(<SaveAsDialog isOpen={true} initialName="hero" onClose={() => { /* noop */ }} />);
        const format = container.querySelector('[data-testid="save-as-format"]') as HTMLSelectElement;
        fireEvent.change(format, { target: { value: 'jpeg' } });
        const saveBtn = container.querySelector('[data-testid="save-as-save-btn"]') as HTMLButtonElement;
        fireEvent.click(saveBtn);
        expect(document.querySelector('[data-testid="jpeg-options-dialog"]')).not.toBeNull();
    });

    it('JPEG Options OK triggers a download with .jpg extension', async () => {
        // jsdom does not implement toBlob; stub it so the export resolves.
        const proto = HTMLCanvasElement.prototype as unknown as { toBlob: (cb: (b: Blob) => void, type: string, q?: number) => void };
        const origToBlob = proto.toBlob;
        proto.toBlob = function patchedToBlob(cb) {
            cb(new Blob(['x'], { type: 'image/jpeg' }));
        };
        const objUrlSpy = vi.spyOn(URL, 'createObjectURL').mockReturnValue('blob:test');
        vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => { /* noop */ });
        let captured = '';
        const origClick = HTMLAnchorElement.prototype.click;
        HTMLAnchorElement.prototype.click = function patchedClick(this: HTMLAnchorElement) {
            captured = this.download;
        };
        try {
            const { container } = render(<SaveAsDialog isOpen={true} initialName="hero" onClose={() => { /* noop */ }} />);
            const format = container.querySelector('[data-testid="save-as-format"]') as HTMLSelectElement;
            fireEvent.change(format, { target: { value: 'jpeg' } });
            fireEvent.click(container.querySelector('[data-testid="save-as-save-btn"]') as HTMLButtonElement);
            // Set quality via the number input then OK.
            const qInput = document.querySelector('[data-testid="jpeg-quality-readout"]') as HTMLInputElement;
            fireEvent.change(qInput, { target: { value: '10' } });
            fireEvent.click(document.querySelector('[data-testid="jpeg-options-ok"]') as HTMLButtonElement);
            await Promise.resolve();
            await Promise.resolve();
            await Promise.resolve();
            expect(objUrlSpy).toHaveBeenCalled();
            expect(captured).toBe('hero.jpg');
        } finally {
            proto.toBlob = origToBlob;
            HTMLAnchorElement.prototype.click = origClick;
        }
    });

    it('PNG saves immediately without JPEG Options', async () => {
        const proto = HTMLCanvasElement.prototype as unknown as { toBlob: (cb: (b: Blob) => void, type: string) => void };
        const origToBlob = proto.toBlob;
        proto.toBlob = function patchedToBlob(cb) {
            cb(new Blob(['x'], { type: 'image/png' }));
        };
        vi.spyOn(URL, 'createObjectURL').mockReturnValue('blob:test');
        vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => { /* noop */ });
        let captured = '';
        const origClick = HTMLAnchorElement.prototype.click;
        HTMLAnchorElement.prototype.click = function patchedClick(this: HTMLAnchorElement) { captured = this.download; };
        try {
            const { container } = render(<SaveAsDialog isOpen={true} initialName="hero" onClose={() => { /* noop */ }} />);
            const format = container.querySelector('[data-testid="save-as-format"]') as HTMLSelectElement;
            fireEvent.change(format, { target: { value: 'png' } });
            fireEvent.click(container.querySelector('[data-testid="save-as-save-btn"]') as HTMLButtonElement);
            await Promise.resolve();
            await Promise.resolve();
            await Promise.resolve();
            expect(document.querySelector('[data-testid="jpeg-options-dialog"]')).toBeNull();
            expect(captured).toBe('hero.png');
        } finally {
            proto.toBlob = origToBlob;
            HTMLAnchorElement.prototype.click = origClick;
        }
    });

    it('Photoshop Document Save As goes through saveFile', async () => {
        const saveSpy = vi.spyOn(useEditorStore.getState(), 'saveFile').mockResolvedValue();
        const { container } = render(<SaveAsDialog isOpen={true} initialName="hero" onClose={() => { /* noop */ }} />);
        fireEvent.click(container.querySelector('[data-testid="save-as-save-btn"]') as HTMLButtonElement);
        await Promise.resolve();
        await Promise.resolve();
        expect(saveSpy).toHaveBeenCalledWith('hero');
    });

    it('Name with an existing extension swaps to the chosen format', () => {
        const { container } = render(<SaveAsDialog isOpen={true} initialName="hero.jpg" onClose={() => { /* noop */ }} />);
        const preview = container.querySelector('[data-testid="save-as-filename-preview"]')!;
        // stripImageExtension trims .jpg, then format adds .pwbdoc by default.
        expect(preview.textContent).toContain('hero.pwbdoc');
        const format = container.querySelector('[data-testid="save-as-format"]') as HTMLSelectElement;
        fireEvent.change(format, { target: { value: 'png' } });
        expect(preview.textContent).toContain('hero.png');
    });

    it('Empty name disables the Save button', () => {
        const { container } = render(<SaveAsDialog isOpen={true} initialName="hero" onClose={() => { /* noop */ }} />);
        const nameInput = container.querySelector('[data-testid="save-as-name"]') as HTMLInputElement;
        fireEvent.change(nameInput, { target: { value: '   ' } });
        const saveBtn = container.querySelector('[data-testid="save-as-save-btn"]') as HTMLButtonElement;
        expect(saveBtn.disabled).toBe(true);
    });
});
