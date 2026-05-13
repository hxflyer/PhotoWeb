/**
 * 05a-image-size — Image Size dialog pixels, resolution, and resampling.
 */
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, cleanup, fireEvent } from '@testing-library/react';
import App from '../App';
import { ImageSizeDialog } from '../components/Dialogs/ImageSizeDialog';
import { NewDocumentDialog } from '../components/Dialogs/NewDocumentDialog';
import { saveDocument, loadDocument } from '../core/persistence';
import { useEditorStore } from '../store/editorStore';
import { ensureStubsRegistered } from '../tools/stubs';
import { runScript, layerPixelAt } from './simulator';

ensureStubsRegistered();

function resetDocument(width = 200, height = 100, resolution = 72) {
    useEditorStore.getState().clearHistory();
    useEditorStore.setState((s) => ({
        ...s,
        layers: [],
        activeLayerId: null,
        selectedLayerIds: [],
        layerSelectionAnchorId: null,
        width,
        height,
        resolution,
        dialogs: {
            ...s.dialogs,
            isImageSizeOpen: false,
            isNewDocumentOpen: false,
        },
        selection: {
            ...s.selection,
            hasSelection: false,
            operations: [],
        },
    }));
    useEditorStore.getState().newDocument(width, height, '#ffffff', 'Image Size Test', resolution);
    useEditorStore.getState().clearHistory();
    useEditorStore.getState().markDocumentClean();
}

beforeEach(() => {
    resetDocument();
    vi.spyOn(window, 'confirm').mockReturnValue(true);
});

afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
});

describe('05a — Image Size dialog', () => {
    it('Cmd+Alt+I opens Image Size, linked Width edits Height, and OK resamples in one history step', async () => {
        render(<App />);

        await runScript([{ type: 'keyDown', key: 'i', modifiers: { meta: true, alt: true } }]);
        expect(document.querySelector('[role="dialog"]')?.textContent).toContain('Image Size');

        const wInput = document.querySelector('[data-testid="img-size-w"]') as HTMLInputElement;
        const hInput = document.querySelector('[data-testid="img-size-h"]') as HTMLInputElement;
        fireEvent.change(wInput, { target: { value: '400' } });
        fireEvent.blur(wInput);
        expect(hInput.value).toBe('200');

        await runScript([{ type: 'click', target: '[data-testid="img-size-ok"]' }]);

        const state = useEditorStore.getState();
        expect(state.width).toBe(400);
        expect(state.height).toBe(200);
        expect(state.resolution).toBe(72);
        expect(state.historyEntries.at(-1)?.action.label).toBe('Image Size');
        expect(state.historyEntries.length).toBe(1);
        expect(state.layers[0].canvas.width).toBe(400);
        expect(state.layers[0].canvas.height).toBe(200);
    });

    it('Resample off changes resolution only, updates Document Dimensions, and undo/redo restores ppi', async () => {
        resetDocument(800, 600, 300);
        useEditorStore.getState().setStatusBarInfoMode('documentDimensions');
        render(<App />);

        await runScript([{ type: 'keyDown', key: 'i', modifiers: { meta: true, alt: true } }]);
        await runScript([{ type: 'click', target: '[data-testid="img-size-resample-toggle"]' }]);

        const widthUnit = document.querySelector('[data-testid="img-size-w-unit"]') as HTMLSelectElement;
        const dimensions = document.querySelector('[data-testid="img-size-dimensions"]') as HTMLElement;
        const resolutionInput = document.querySelector('[data-testid="img-size-resolution"]') as HTMLInputElement;
        expect(widthUnit.value).toBe('inches');
        expect(dimensions.textContent).toBe('800 px x 600 px');

        fireEvent.change(resolutionInput, { target: { value: '72' } });
        fireEvent.blur(resolutionInput);
        await runScript([{ type: 'click', target: '[data-testid="img-size-ok"]' }]);

        let state = useEditorStore.getState();
        expect(state.width).toBe(800);
        expect(state.height).toBe(600);
        expect(state.resolution).toBe(72);
        expect(state.layers[0].canvas.width).toBe(800);
        expect(document.querySelector('[data-testid="status-info-text"]')?.textContent).toBe('800 px × 600 px (72 ppi)');

        state.undo();
        state = useEditorStore.getState();
        expect(state.width).toBe(800);
        expect(state.height).toBe(600);
        expect(state.resolution).toBe(300);

        state.redo();
        expect(useEditorStore.getState().resolution).toBe(72);
    });

    it('Nearest Neighbor (hard edges) keeps pixel-art blocks crisp when upscaling', () => {
        const captured: { w: number; h: number; method: string }[] = [];
        const { container } = render(
            <ImageSizeDialog
                isOpen={true}
                currentWidth={2}
                currentHeight={2}
                currentResolution={72}
                onConfirm={(w, h, _resolution, method) => { captured.push({ w, h, method }); }}
                onClose={() => { /* noop */ }}
            />,
        );
        const method = container.querySelector('[data-testid="img-size-resample"]') as HTMLSelectElement;
        expect(Array.from(method.options).map(o => o.text)).toContain('Nearest Neighbor (hard edges)');

        fireEvent.change(method, { target: { value: 'nearest' } });
        const wInput = container.querySelector('[data-testid="img-size-w"]') as HTMLInputElement;
        fireEvent.change(wInput, { target: { value: '4' } });
        fireEvent.blur(wInput);
        fireEvent.click(container.querySelector('[data-testid="img-size-ok"]') as HTMLButtonElement);
        expect(captured[0]).toEqual({ w: 4, h: 4, method: 'nearest' });
    });
});

describe('05a — Resolution state', () => {
    it('New Document stores the selected Resolution in document state', () => {
        const { container } = render(<NewDocumentDialog isOpen={true} onClose={() => { /* noop */ }} />);
        const wInput = container.querySelector('[data-testid="new-doc-width"]') as HTMLInputElement;
        const hInput = container.querySelector('[data-testid="new-doc-height"]') as HTMLInputElement;
        const resolutionInput = container.querySelector('[data-testid="new-doc-resolution"]') as HTMLInputElement;

        fireEvent.change(wInput, { target: { value: '40' } });
        fireEvent.blur(wInput);
        fireEvent.change(hInput, { target: { value: '20' } });
        fireEvent.blur(hInput);
        fireEvent.change(resolutionInput, { target: { value: '150' } });
        fireEvent.blur(resolutionInput);
        fireEvent.click(container.querySelector('[data-testid="new-document-create-btn"]') as HTMLButtonElement);

        const state = useEditorStore.getState();
        expect(state.width).toBe(40);
        expect(state.height).toBe(20);
        expect(state.resolution).toBe(150);
    });

    it('store resizeImage with Nearest Neighbor preserves source color blocks', () => {
        resetDocument(2, 2, 72);
        const layer = useEditorStore.getState().layers[0];
        const data = layer.ctx.createImageData(2, 2);
        data.data.set([
            0, 0, 0, 255,
            255, 255, 255, 255,
            255, 255, 255, 255,
            0, 0, 0, 255,
        ]);
        layer.ctx.putImageData(data, 0, 0);

        useEditorStore.getState().resizeImage(4, 4, 'nearest', 72, true);

        expect(layerPixelAt(useEditorStore.getState().layers[0], 0, 0).r).toBe(0);
        expect(layerPixelAt(useEditorStore.getState().layers[0], 3, 0).r).toBe(255);
        expect(layerPixelAt(useEditorStore.getState().layers[0], 0, 3).r).toBe(255);
        expect(layerPixelAt(useEditorStore.getState().layers[0], 3, 3).r).toBe(0);
    });

    it('persists document Resolution in .pwbdoc manifests and restores old files to 72 ppi', async () => {
        const originalLocalStorage = window.localStorage;
        let storage: Record<string, string> = {};
        Object.defineProperty(window, 'localStorage', {
            value: {
                setItem: (k: string, v: string) => { storage[k] = v; },
                getItem: (k: string) => storage[k] ?? null,
                removeItem: (k: string) => { delete storage[k]; },
                clear: () => { storage = {}; },
                key: (i: number) => Object.keys(storage)[i] ?? null,
                get length() { return Object.keys(storage).length; },
            } as unknown as Storage,
            configurable: true,
            writable: true,
        });

        try {
            resetDocument(40, 20, 144);
            await saveDocument(useEditorStore.getState(), 'resolution-rt', { silent: true });
            expect(JSON.parse(storage['pwbdoc:resolution-rt']).resolution).toBe(144);

            storage['pwbdoc:old-resolution'] = JSON.stringify({
                version: 1,
                name: 'old-resolution',
                width: 11,
                height: 7,
                activeLayerId: null,
                layers: [],
                timestamp: Date.now(),
            });
            await loadDocument(
                'old-resolution',
                () => useEditorStore.getState(),
                (partial) => useEditorStore.setState(partial as Parameters<typeof useEditorStore.setState>[0]),
            );
            expect(useEditorStore.getState().resolution).toBe(72);

            storage['pwbdoc:new-resolution'] = JSON.stringify({
                version: 1,
                name: 'new-resolution',
                width: 11,
                height: 7,
                resolution: 220,
                activeLayerId: null,
                layers: [],
                timestamp: Date.now(),
            });
            await loadDocument(
                'new-resolution',
                () => useEditorStore.getState(),
                (partial) => useEditorStore.setState(partial as Parameters<typeof useEditorStore.setState>[0]),
            );
            expect(useEditorStore.getState().resolution).toBe(220);
        } finally {
            Object.defineProperty(window, 'localStorage', {
                value: originalLocalStorage,
                configurable: true,
                writable: true,
            });
        }
    });
});
