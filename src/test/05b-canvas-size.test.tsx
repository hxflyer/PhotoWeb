import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render } from '@testing-library/react';
import App from '../App';
import { CanvasSizeDialog } from '../components/Dialogs/CanvasSizeDialog';
import { Layer } from '../core/Layer';
import { useEditorStore } from '../store/editorStore';
import type { ToolContext, ToolKeyEvent } from '../tools/Tool';
import { getTool } from '../tools/registry';
import { getCropRect, setCropOptions } from '../tools/crop';
import { ensureStubsRegistered } from '../tools/stubs';
import { layerPixelAt, makeToolPointerEvent, runScript } from './simulator';

ensureStubsRegistered();

function resetDocument(width = 500, height = 300): Layer {
    const layer = new Layer(width, height, 'Layer 0');
    layer.ctx.fillStyle = '#ff0000';
    layer.ctx.fillRect(0, 0, width, height);
    layer.ctx.fillStyle = '#0000ff';
    layer.ctx.fillRect(width - 5, height - 10, 1, 1);
    layer.markDirty(null);

    useEditorStore.setState(s => ({
        ...s,
        width,
        height,
        zoom: 1,
        activeTool: 'brush',
        layers: [layer],
        activeLayerId: layer.id,
        selectedLayerIds: [layer.id],
        layerSelectionAnchorId: layer.id,
        dialogs: {
            ...s.dialogs,
            isCanvasSizeOpen: false,
        },
    }));
    useEditorStore.getState().clearHistory();
    useEditorStore.getState().markDocumentClean();
    setCropOptions({ aspect: 'free', deleteCroppedPixels: true, overlay: 'rule-of-thirds', straighten: false });
    return layer;
}

function toolCtx(requestRender = vi.fn()): ToolContext {
    return {
        store: useEditorStore.getState(),
        getStore: () => useEditorStore.getState(),
        requestRender,
    };
}

function keyEvent(key: string): ToolKeyEvent {
    return {
        key,
        shift: false,
        alt: false,
        ctrl: false,
        meta: false,
        rawEvent: new KeyboardEvent('keydown', { key, bubbles: true, cancelable: true }),
    };
}

describe('05b — Canvas Size dialog', () => {
    beforeEach(() => resetDocument());
    afterEach(() => cleanup());

    it('Cmd+Alt+C opens Canvas Size and percent units commit through the dialog', async () => {
        render(<App />);

        await runScript([{ type: 'keyDown', key: 'c', modifiers: { meta: true, alt: true } }]);

        const wInput = document.querySelector('[data-testid="canvas-size-w"]') as HTMLInputElement;
        const hInput = document.querySelector('[data-testid="canvas-size-h"]') as HTMLInputElement;
        const unit = document.querySelector('[data-testid="canvas-size-unit"]') as HTMLSelectElement;
        expect(wInput).not.toBeNull();

        fireEvent.change(unit, { target: { value: 'percent' } });
        expect(wInput.value).toBe('100');
        expect(hInput.value).toBe('100');

        fireEvent.change(wInput, { target: { value: '120' } });
        await runScript([{ type: 'click', target: '[data-testid="canvas-size-ok"]' }]);

        const store = useEditorStore.getState();
        expect(store.width).toBe(600);
        expect(store.height).toBe(300);
        expect(store.layers[0].canvas.width).toBe(600);
        expect(store.layers[0].canvas.height).toBe(300);
    });

    it('switching Canvas Size units preserves the current pixel dimensions', async () => {
        let captured: { w: number; h: number } | null = null;
        const { container } = render(
            <CanvasSizeDialog
                isOpen
                currentWidth={144}
                currentHeight={72}
                onConfirm={(w, h) => { captured = { w, h }; }}
                onClose={() => { /* noop */ }}
            />,
        );

        const unit = container.querySelector('[data-testid="canvas-size-unit"]') as HTMLSelectElement;
        const wInput = container.querySelector('[data-testid="canvas-size-w"]') as HTMLInputElement;
        fireEvent.change(unit, { target: { value: 'in' } });

        expect(wInput.value).toBe('2');
        await runScript([{ type: 'click', target: '[data-testid="canvas-size-ok"]' }], container);
        expect(captured).toEqual({ w: 144, h: 72 });
    });
});

describe('05b — Crop Tool canvas expansion', () => {
    beforeEach(() => {
        resetDocument(100, 80);
        getTool('crop')?.onKeyDown?.(keyEvent('Escape'), toolCtx());
    });
    afterEach(() => cleanup());

    it('Shift+Alt corner drag expands from center while preserving the original ratio', () => {
        const crop = getTool('crop')!;
        const ctx = toolCtx();

        crop.onActivate?.(ctx);
        crop.onPointerDown?.(makeToolPointerEvent({ canvasX: 100, canvasY: 80 }), ctx);
        crop.onPointerMove?.(makeToolPointerEvent({
            canvasX: 130,
            canvasY: 104,
            modifiers: { shift: true, alt: true },
        }), ctx);
        crop.onPointerUp?.(makeToolPointerEvent({
            canvasX: 130,
            canvasY: 104,
            modifiers: { shift: true, alt: true },
        }), ctx);

        expect(getCropRect()).toEqual({ x: -30, y: -24, w: 160, h: 128 });

        crop.onKeyDown?.(keyEvent('Enter'), ctx);

        const store = useEditorStore.getState();
        const layer = store.layers[0];
        expect(store.width).toBe(160);
        expect(store.height).toBe(128);
        expect(layerPixelAt(layer, 125, 94)).toMatchObject({ r: 0, g: 0, b: 255, a: 255 });
        expect(layerPixelAt(layer, 5, 5)).toMatchObject({ a: 0 });
    });

    it('Escape cancels an outward crop expansion without resizing the document', () => {
        const crop = getTool('crop')!;
        const ctx = toolCtx();

        crop.onActivate?.(ctx);
        crop.onPointerDown?.(makeToolPointerEvent({ canvasX: 100, canvasY: 80 }), ctx);
        crop.onPointerMove?.(makeToolPointerEvent({ canvasX: 130, canvasY: 100 }), ctx);
        crop.onPointerUp?.(makeToolPointerEvent({ canvasX: 130, canvasY: 100 }), ctx);
        expect(getCropRect()).toEqual({ x: 0, y: 0, w: 130, h: 100 });

        crop.onKeyDown?.(keyEvent('Escape'), ctx);

        const store = useEditorStore.getState();
        expect(getCropRect()).toBeNull();
        expect(store.width).toBe(100);
        expect(store.height).toBe(80);
        expect(store.historyEntries.length).toBe(0);
    });
});
