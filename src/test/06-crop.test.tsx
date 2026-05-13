/**
 * 06-crop — Crop Tool shortcuts, Perspective Crop entry, and Image > Crop.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render } from '@testing-library/react';
import App from '../App';
import { Layer } from '../core/Layer';
import { useEditorStore } from '../store/editorStore';
import type { ToolContext, ToolKeyEvent } from '../tools/Tool';
import { getTool } from '../tools/registry';
import { getCropOptions, getCropRect, setCropOptions } from '../tools/crop';
import { ensureStubsRegistered } from '../tools/stubs';
import { layerPixelAt, makeToolPointerEvent, runScript } from './simulator';

ensureStubsRegistered();

function resetDocument(width = 100, height = 80): Layer {
    const layer = new Layer(width, height, 'Crop Test');
    layer.ctx.fillStyle = '#ff0000';
    layer.ctx.fillRect(0, 0, width, height);
    layer.ctx.fillStyle = '#0000ff';
    layer.ctx.fillRect(20, 10, 5, 5);
    layer.markDirty(null);
    useEditorStore.setState(s => ({
        ...s,
        width,
        height,
        activeTool: 'brush',
        layers: [layer],
        activeLayerId: layer.id,
        selectedLayerIds: [layer.id],
        layerSelectionAnchorId: layer.id,
        selection: {
            ...s.selection,
            hasSelection: false,
            operations: [],
            path: [],
            polyPoints: [],
        },
    }));
    useEditorStore.getState().clearHistory();
    useEditorStore.getState().markDocumentClean();
    setCropOptions({
        aspect: 'free',
        customRatio: { w: 1, h: 1 },
        deleteCroppedPixels: true,
        overlay: 'rule-of-thirds',
        straighten: false,
        classicMode: false,
        hideCroppedArea: false,
    });
    return layer;
}

function toolCtx(): ToolContext {
    return {
        store: useEditorStore.getState(),
        getStore: () => useEditorStore.getState(),
        requestRender: vi.fn(),
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

describe('06 — Crop Tool shortcuts and options', () => {
    beforeEach(() => resetDocument());
    afterEach(() => cleanup());

    it('X swaps crop orientation around the center', () => {
        const crop = getTool('crop')!;
        const ctx = toolCtx();
        crop.onActivate?.(ctx);
        crop.onPointerDown?.(makeToolPointerEvent({ canvasX: 100, canvasY: 80 }), ctx);
        crop.onPointerMove?.(makeToolPointerEvent({ canvasX: 80, canvasY: 40 }), ctx);
        crop.onPointerUp?.(makeToolPointerEvent({ canvasX: 80, canvasY: 40 }), ctx);
        const before = getCropRect()!;

        crop.onKeyDown?.(keyEvent('x'), ctx);

        const after = getCropRect()!;
        expect(Math.round(after.w)).toBe(Math.round(before.h));
        expect(Math.round(after.h)).toBe(Math.round(before.w));
    });

    it('H hides cropped area and P toggles Classic Mode', () => {
        const crop = getTool('crop')!;
        const ctx = toolCtx();
        crop.onActivate?.(ctx);

        crop.onKeyDown?.(keyEvent('h'), ctx);
        expect(getCropOptions().hideCroppedArea).toBe(true);

        crop.onKeyDown?.(keyEvent('p'), ctx);
        expect(getCropOptions().classicMode).toBe(true);
    });

    it('Shift+C cycles from Crop Tool to Perspective Crop Tool', async () => {
        render(<App />);
        await runScript([
            { type: 'keyDown', key: 'c' },
            { type: 'keyDown', key: 'c', modifiers: { shift: true } },
        ]);
        expect(useEditorStore.getState().activeTool).toBe('perspective-crop');
    });

    it('Perspective Crop Tool commits the crop rectangle with Enter', () => {
        const tool = getTool('perspective-crop')!;
        const ctx = toolCtx();
        tool.onActivate?.(ctx);
        tool.onPointerDown?.(makeToolPointerEvent({ canvasX: 100, canvasY: 80 }), ctx);
        tool.onPointerMove?.(makeToolPointerEvent({ canvasX: 60, canvasY: 50 }), ctx);
        tool.onPointerUp?.(makeToolPointerEvent({ canvasX: 60, canvasY: 50 }), ctx);
        tool.onKeyDown?.(keyEvent('Enter'), ctx);

        const state = useEditorStore.getState();
        expect(state.width).toBe(60);
        expect(state.height).toBe(50);
        expect(state.historyEntries.at(-1)?.action.label).toBe('Crop');
    });
});

describe('06 — Image > Crop from selections', () => {
    beforeEach(() => resetDocument());
    afterEach(() => cleanup());

    it('crops the document to the active rectangular selection bounds', () => {
        useEditorStore.setState(s => ({
            selection: {
                ...s.selection,
                hasSelection: true,
                mode: 'rect',
                path: [{ x: 20, y: 10 }, { x: 60, y: 50 }],
                operations: [{
                    mode: 'add',
                    type: 'rect',
                    path: [{ x: 20, y: 10 }, { x: 60, y: 50 }],
                }],
            },
        }));

        useEditorStore.getState().cropToSelection();

        const state = useEditorStore.getState();
        expect(state.width).toBe(40);
        expect(state.height).toBe(40);
        expect(state.selection.hasSelection).toBe(false);
        expect(layerPixelAt(state.layers[0], 0, 0)).toMatchObject({ r: 0, g: 0, b: 255, a: 255 });
    });
});
