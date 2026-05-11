import { describe, it, expect, beforeEach, vi } from 'vitest';
import { Layer } from '../core/Layer';
import { useEditorStore } from '../store/editorStore';
import { ensureStubsRegistered } from '../tools/stubs';
import { getTool } from '../tools/registry';
import type { ToolPointerEvent } from '../tools/Tool';
import { layerPixelAt } from './simulator';

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

describe('Slice D — Dodge/Burn/Sponge history + Alt-swap', () => {
    beforeEach(() => {
        ensureStubsRegistered();
        useEditorStore.getState().clearHistory();
        useEditorStore.setState(s => ({
            ...s,
            width: 32,
            height: 32,
            layers: [],
            activeLayerId: null,
            brushSettings: { ...s.brushSettings, size: 8, hardness: 1, opacity: 1, flow: 0.5 },
        }));
    });

    it('Dodge stroke commits a history entry and is undoable', () => {
        const layer = new Layer(32, 32, 'L');
        layer.ctx.fillStyle = '#808080';
        layer.ctx.fillRect(0, 0, 32, 32);
        useEditorStore.setState(s => ({ ...s, layers: [layer], activeLayerId: layer.id }));

        const baselineLuma = layerPixelAt(layer, 16, 16).r;
        const dodge = getTool('dodge')!;
        const ctx = toolCtx();
        dodge.onPointerDown!(pointer(16, 16), ctx);
        dodge.onPointerMove!(pointer(20, 16), ctx);
        dodge.onPointerUp!(pointer(20, 16), ctx);

        // Pixel should be lighter than baseline.
        const afterLuma = layerPixelAt(layer, 16, 16).r;
        expect(afterLuma).toBeGreaterThan(baselineLuma);

        // Undo restores it.
        useEditorStore.getState().undo();
        const undoneLuma = layerPixelAt(layer, 16, 16).r;
        expect(undoneLuma).toBe(baselineLuma);
    });

    it('Burn stroke commits a history entry and is undoable', () => {
        const layer = new Layer(32, 32, 'L');
        layer.ctx.fillStyle = '#808080';
        layer.ctx.fillRect(0, 0, 32, 32);
        useEditorStore.setState(s => ({ ...s, layers: [layer], activeLayerId: layer.id }));

        const baseline = layerPixelAt(layer, 16, 16).r;
        const burn = getTool('burn')!;
        const ctx = toolCtx();
        burn.onPointerDown!(pointer(16, 16), ctx);
        burn.onPointerUp!(pointer(16, 16), ctx);

        const after = layerPixelAt(layer, 16, 16).r;
        expect(after).toBeLessThan(baseline);

        useEditorStore.getState().undo();
        expect(layerPixelAt(layer, 16, 16).r).toBe(baseline);
    });

    it('Sponge stroke commits a history entry and is undoable', () => {
        const layer = new Layer(32, 32, 'L');
        layer.ctx.fillStyle = '#cc4444';
        layer.ctx.fillRect(0, 0, 32, 32);
        useEditorStore.setState(s => ({ ...s, layers: [layer], activeLayerId: layer.id }));

        const before = layerPixelAt(layer, 16, 16);
        const sponge = getTool('sponge')!;
        const ctx = toolCtx();
        sponge.onPointerDown!(pointer(16, 16), ctx);
        sponge.onPointerUp!(pointer(16, 16), ctx);

        const after = layerPixelAt(layer, 16, 16);
        // Desaturate should reduce the R/G/B gap.
        const spreadBefore = Math.max(before.r, before.g, before.b) - Math.min(before.r, before.g, before.b);
        const spreadAfter = Math.max(after.r, after.g, after.b) - Math.min(after.r, after.g, after.b);
        expect(spreadAfter).toBeLessThan(spreadBefore);

        useEditorStore.getState().undo();
        const restored = layerPixelAt(layer, 16, 16);
        expect(restored.r).toBe(before.r);
    });

    it('Dodge with Alt held temporarily burns (darkens) instead of dodging', () => {
        const layer = new Layer(32, 32, 'L');
        layer.ctx.fillStyle = '#808080';
        layer.ctx.fillRect(0, 0, 32, 32);
        useEditorStore.setState(s => ({ ...s, layers: [layer], activeLayerId: layer.id }));

        const baseline = layerPixelAt(layer, 16, 16).r;
        const dodge = getTool('dodge')!;
        const ctx = toolCtx();
        dodge.onPointerDown!(pointer(16, 16, { alt: true }), ctx);
        dodge.onPointerUp!(pointer(16, 16, { alt: true }), ctx);

        // With Alt, dodge should DARKEN like burn.
        const after = layerPixelAt(layer, 16, 16).r;
        expect(after).toBeLessThan(baseline);
    });

    it('Burn with Alt held temporarily dodges (lightens) instead of burning', () => {
        const layer = new Layer(32, 32, 'L');
        layer.ctx.fillStyle = '#808080';
        layer.ctx.fillRect(0, 0, 32, 32);
        useEditorStore.setState(s => ({ ...s, layers: [layer], activeLayerId: layer.id }));

        const baseline = layerPixelAt(layer, 16, 16).r;
        const burn = getTool('burn')!;
        const ctx = toolCtx();
        burn.onPointerDown!(pointer(16, 16, { alt: true }), ctx);
        burn.onPointerUp!(pointer(16, 16, { alt: true }), ctx);

        const after = layerPixelAt(layer, 16, 16).r;
        expect(after).toBeGreaterThan(baseline);
    });
});
