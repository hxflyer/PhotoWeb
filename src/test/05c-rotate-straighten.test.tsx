/**
 * 05c-rotate-straighten — Image Rotation, Crop Straighten, and Ruler Tool.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render } from '@testing-library/react';
import App from '../App';
import { Layer } from '../core/Layer';
import { useEditorStore } from '../store/editorStore';
import type { ToolContext, ToolKeyEvent } from '../tools/Tool';
import { getTool } from '../tools/registry';
import { getCropOptions, setCropOptions } from '../tools/crop';
import { clearRulerMeasurement, getRulerMeasurement } from '../tools/ruler';
import { ensureStubsRegistered } from '../tools/stubs';
import { layerPixelAt, makeToolPointerEvent, runScript } from './simulator';

ensureStubsRegistered();

function resetDocument(width = 80, height = 40): Layer {
    const layer = new Layer(width, height, 'Straighten Test');
    layer.ctx.fillStyle = '#ff0000';
    layer.ctx.fillRect(0, 0, width, height);
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
        dialogs: {
            ...s.dialogs,
            isArbitraryRotationOpen: false,
        },
    }));
    useEditorStore.getState().clearHistory();
    useEditorStore.getState().markDocumentClean();
    setCropOptions({ aspect: 'free', deleteCroppedPixels: true, overlay: 'rule-of-thirds', straighten: false });
    clearRulerMeasurement();
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

describe('05c — Image Rotation Arbitrary', () => {
    beforeEach(() => resetDocument());
    afterEach(() => cleanup());

    it('opens Arbitrary and commits one rotation history step', async () => {
        useEditorStore.getState().openArbitraryRotationDialog();
        render(<App />);

        const input = document.querySelector('[data-testid="arbitrary-rotation-angle"]') as HTMLInputElement;
        expect(input).not.toBeNull();
        fireEvent.change(input, { target: { value: '30' } });
        await runScript([{ type: 'click', target: '[data-testid="arbitrary-rotation-ok"]' }]);

        const state = useEditorStore.getState();
        expect(state.width).toBeGreaterThan(80);
        expect(state.height).toBeGreaterThan(40);
        expect(state.historyEntries).toHaveLength(1);
        expect(state.historyEntries[0].action.label).toContain('Rotate Canvas');
    });

    it('undo and redo restore arbitrary rotation dimensions', () => {
        resetDocument(80, 40);
        const s = useEditorStore.getState();
        s.rotateCanvas(30);
        const rotated = { width: useEditorStore.getState().width, height: useEditorStore.getState().height };
        expect(rotated.width).toBeGreaterThan(80);

        useEditorStore.getState().undo();
        expect(useEditorStore.getState().width).toBe(80);
        expect(useEditorStore.getState().height).toBe(40);

        useEditorStore.getState().redo();
        expect(useEditorStore.getState().width).toBe(rotated.width);
        expect(useEditorStore.getState().height).toBe(rotated.height);
    });
});

describe('05c — Crop Straighten', () => {
    beforeEach(() => resetDocument(100, 80));
    afterEach(() => cleanup());

    it('Ctrl/Cmd drag temporarily straightens without arming the Options Bar toggle', () => {
        const crop = getTool('crop')!;
        const ctx = toolCtx();
        crop.onActivate?.(ctx);
        crop.onPointerDown?.(makeToolPointerEvent({ canvasX: 10, canvasY: 20, modifiers: { ctrl: true } }), ctx);
        crop.onPointerMove?.(makeToolPointerEvent({ canvasX: 80, canvasY: 35, modifiers: { ctrl: true } }), ctx);
        crop.onPointerUp?.(makeToolPointerEvent({ canvasX: 80, canvasY: 35, modifiers: { ctrl: true } }), ctx);

        const state = useEditorStore.getState();
        expect(getCropOptions().straighten).toBe(false);
        expect(state.historyEntries.at(-1)?.action.label).toContain('Rotate Canvas');
        expect(state.width).toBeGreaterThan(100);
    });

    it('uses the nearest axis, so a near-vertical guide stays near the original document bounds', () => {
        const crop = getTool('crop')!;
        const ctx = toolCtx();
        crop.onActivate?.(ctx);
        crop.onPointerDown?.(makeToolPointerEvent({ canvasX: 40, canvasY: 5, modifiers: { meta: true } }), ctx);
        crop.onPointerMove?.(makeToolPointerEvent({ canvasX: 47, canvasY: 70, modifiers: { meta: true } }), ctx);
        crop.onPointerUp?.(makeToolPointerEvent({ canvasX: 47, canvasY: 70, modifiers: { meta: true } }), ctx);

        const state = useEditorStore.getState();
        expect(state.width).toBeLessThan(115);
        expect(state.height).toBeLessThan(95);
    });
});

describe('05c — Ruler Tool', () => {
    beforeEach(() => resetDocument(60, 40));
    afterEach(() => cleanup());

    it('Shift+I activates Ruler, measurement straightens only the active layer, and document bounds stay fixed', async () => {
        render(<App />);
        await runScript([
            { type: 'keyDown', key: 'i' },
            { type: 'keyDown', key: 'i', modifiers: { shift: true } },
        ]);
        expect(useEditorStore.getState().activeTool).toBe('ruler');

        const ruler = getTool('ruler')!;
        const ctx = toolCtx();
        ruler.onPointerDown?.(makeToolPointerEvent({ canvasX: 8, canvasY: 18 }), ctx);
        ruler.onPointerMove?.(makeToolPointerEvent({ canvasX: 52, canvasY: 26 }), ctx);
        ruler.onPointerUp?.(makeToolPointerEvent({ canvasX: 52, canvasY: 26 }), ctx);

        await runScript([{ type: 'click', target: '[data-testid="ruler-straighten-layer"]' }]);
        const state = useEditorStore.getState();
        expect(state.width).toBe(60);
        expect(state.height).toBe(40);
        expect(state.historyEntries.at(-1)?.action.label).toBe('Straighten Layer');
        expect(layerPixelAt(state.layers[0], 0, 0).a).toBe(0);
    });

    it('lets users adjust an endpoint before straightening', () => {
        const ruler = getTool('ruler')!;
        const ctx = toolCtx();
        ruler.onPointerDown?.(makeToolPointerEvent({ canvasX: 10, canvasY: 10 }), ctx);
        ruler.onPointerMove?.(makeToolPointerEvent({ canvasX: 50, canvasY: 20 }), ctx);
        ruler.onPointerUp?.(makeToolPointerEvent({ canvasX: 50, canvasY: 20 }), ctx);

        ruler.onPointerDown?.(makeToolPointerEvent({ canvasX: 10, canvasY: 10 }), ctx);
        ruler.onPointerMove?.(makeToolPointerEvent({ canvasX: 15, canvasY: 18 }), ctx);
        ruler.onPointerUp?.(makeToolPointerEvent({ canvasX: 15, canvasY: 18 }), ctx);

        expect(getRulerMeasurement()?.start).toEqual({ x: 15, y: 18 });
    });

    it('Escape clears the current ruler measurement without history', () => {
        const ruler = getTool('ruler')!;
        const ctx = toolCtx();
        ruler.onPointerDown?.(makeToolPointerEvent({ canvasX: 10, canvasY: 10 }), ctx);
        ruler.onPointerMove?.(makeToolPointerEvent({ canvasX: 50, canvasY: 20 }), ctx);
        ruler.onPointerUp?.(makeToolPointerEvent({ canvasX: 50, canvasY: 20 }), ctx);
        expect(getRulerMeasurement()).not.toBeNull();

        ruler.onKeyDown?.(keyEvent('Escape'), ctx);

        expect(getRulerMeasurement()).toBeNull();
        expect(useEditorStore.getState().historyEntries).toHaveLength(0);
    });
});
