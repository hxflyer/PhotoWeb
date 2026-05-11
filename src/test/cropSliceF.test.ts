import { describe, it, expect, beforeEach, vi } from 'vitest';
import { Layer } from '../core/Layer';
import { useEditorStore } from '../store/editorStore';
import { ensureStubsRegistered } from '../tools/stubs';
import { getTool } from '../tools/registry';
import type { ToolPointerEvent } from '../tools/Tool';
import { layerPixelAt } from './simulator';
import { setCropOptions, getCropRect } from '../tools/crop';

function pointer(x: number, y: number, mods: Partial<ToolPointerEvent> = {}): ToolPointerEvent {
    return {
        canvasX: x,
        canvasY: y,
        clientX: x,
        clientY: y,
        button: 0,
        buttons: 1,
        shift: false,
        alt: false,
        meta: false,
        ctrl: false,
        pressure: 1,
        pointerType: 'mouse',
        rawEvent: new MouseEvent('mousedown') as PointerEvent,
        ...mods,
    };
}

function toolCtx() {
    return {
        store: useEditorStore.getState(),
        getStore: () => useEditorStore.getState(),
        requestRender: vi.fn(),
    };
}

describe('Slice F — Crop tool', () => {
    beforeEach(() => {
        ensureStubsRegistered();
        useEditorStore.getState().clearHistory();
        const layer = new Layer(100, 80, 'L');
        layer.ctx.fillStyle = '#ff0000';
        layer.ctx.fillRect(0, 0, 100, 80);
        layer.ctx.fillStyle = '#0000ff';
        layer.ctx.fillRect(20, 20, 60, 40);
        useEditorStore.setState(s => ({ ...s, width: 100, height: 80, layers: [layer], activeLayerId: layer.id, zoom: 1 }));
        setCropOptions({ aspect: 'free', customRatio: { w: 1, h: 1 }, deleteCroppedPixels: true, straighten: false });
    });

    it('Shift+drag corner constrains crop rect to a square', () => {
        const crop = getTool('crop')!;
        const ctx = toolCtx();
        crop.onActivate!(ctx);
        // Crop rect starts as full doc (0,0,100,80). Drag the SE corner inward.
        crop.onPointerDown!(pointer(100, 80), ctx);
        crop.onPointerMove!(pointer(60, 70, { shift: true }), ctx);
        crop.onPointerUp!(pointer(60, 70, { shift: true }), ctx);
        const rect = getCropRect()!;
        // Shift forces a square — w must equal h.
        expect(Math.round(rect.w)).toBe(Math.round(rect.h));
    });

    it('aspect-ratio dropdown constrains drag to the chosen ratio', () => {
        setCropOptions({ aspect: '16:9' });
        const crop = getTool('crop')!;
        const ctx = toolCtx();
        crop.onActivate!(ctx);
        crop.onPointerDown!(pointer(100, 80), ctx);
        crop.onPointerMove!(pointer(40, 60), ctx);
        crop.onPointerUp!(pointer(40, 60), ctx);
        const rect = getCropRect()!;
        const ratio = rect.w / rect.h;
        expect(ratio).toBeCloseTo(16 / 9, 1);
    });

    it('Alt-drag grows the crop rect symmetrically about its center', () => {
        // Start with a smaller rect first by performing a tighten drag.
        const crop = getTool('crop')!;
        const ctx = toolCtx();
        crop.onActivate!(ctx);
        // Tighten to (10,10,80,60): drag NW corner inward 10, then SE inward 10.
        crop.onPointerDown!(pointer(0, 0), ctx);
        crop.onPointerMove!(pointer(10, 10), ctx);
        crop.onPointerUp!(pointer(10, 10), ctx);
        crop.onPointerDown!(pointer(100, 80), ctx);
        crop.onPointerMove!(pointer(90, 70), ctx);
        crop.onPointerUp!(pointer(90, 70), ctx);
        const before = getCropRect()!;
        const centerXBefore = before.x + before.w / 2;
        const centerYBefore = before.y + before.h / 2;

        // Now Alt-drag the east handle outward; the west edge should mirror.
        crop.onPointerDown!(pointer(before.x + before.w, before.y + before.h / 2), ctx);
        crop.onPointerMove!(pointer(before.x + before.w + 5, before.y + before.h / 2, { alt: true }), ctx);
        crop.onPointerUp!(pointer(before.x + before.w + 5, before.y + before.h / 2, { alt: true }), ctx);
        const after = getCropRect()!;
        const centerXAfter = after.x + after.w / 2;
        const centerYAfter = after.y + after.h / 2;
        // Center should be roughly preserved.
        expect(Math.abs(centerXAfter - centerXBefore)).toBeLessThan(2);
        expect(Math.abs(centerYAfter - centerYBefore)).toBeLessThan(2);
        // And rect grew on both sides — width increased ~10 px.
        expect(after.w).toBeGreaterThan(before.w);
    });

    it('deleteCroppedPixels = false preserves layer canvas at original size', () => {
        setCropOptions({ deleteCroppedPixels: false });
        const crop = getTool('crop')!;
        const ctx = toolCtx();
        crop.onActivate!(ctx);
        // Crop to (20,20,40,30).
        crop.onPointerDown!(pointer(0, 0), ctx);
        crop.onPointerMove!(pointer(20, 20), ctx);
        crop.onPointerUp!(pointer(20, 20), ctx);
        crop.onPointerDown!(pointer(100, 80), ctx);
        crop.onPointerMove!(pointer(60, 50), ctx);
        crop.onPointerUp!(pointer(60, 50), ctx);
        // Commit with Enter.
        const enterEvent = { key: 'Enter', shift: false, alt: false, meta: false, ctrl: false, rawEvent: new KeyboardEvent('keydown') } as never;
        crop.onKeyDown!(enterEvent, ctx);

        const store = useEditorStore.getState();
        expect(store.width).toBe(40);
        expect(store.height).toBe(30);
        const layer = store.layers[0];
        // Layer canvas should remain original size — pixels outside crop preserved.
        expect(layer.canvas.width).toBe(100);
        expect(layer.canvas.height).toBe(80);
    });

    it('deleteCroppedPixels = true (default) shrinks the layer canvas to crop size', () => {
        setCropOptions({ deleteCroppedPixels: true });
        const crop = getTool('crop')!;
        const ctx = toolCtx();
        crop.onActivate!(ctx);
        crop.onPointerDown!(pointer(0, 0), ctx);
        crop.onPointerMove!(pointer(20, 20), ctx);
        crop.onPointerUp!(pointer(20, 20), ctx);
        crop.onPointerDown!(pointer(100, 80), ctx);
        crop.onPointerMove!(pointer(60, 50), ctx);
        crop.onPointerUp!(pointer(60, 50), ctx);
        const enterEvent = { key: 'Enter', shift: false, alt: false, meta: false, ctrl: false, rawEvent: new KeyboardEvent('keydown') } as never;
        crop.onKeyDown!(enterEvent, ctx);

        const store = useEditorStore.getState();
        expect(store.width).toBe(40);
        expect(store.height).toBe(30);
        const layer = store.layers[0];
        expect(layer.canvas.width).toBe(40);
        expect(layer.canvas.height).toBe(30);
        // The blue rect should now sit at (0,0) of the shrunken layer.
        expect(layerPixelAt(layer, 5, 5).b).toBeGreaterThan(200);
    });
});
