import { describe, it, expect, beforeEach } from 'vitest';
import { useEditorStore } from '../store/editorStore';
import { getTool } from '../tools/registry';
import { ensureStubsRegistered } from '../tools/stubs';
import { setMarqueeOptions, rasterizeBinaryEllipseMask } from '../tools/marquee';
import { makeToolPointerEvent } from './simulator';

ensureStubsRegistered();

function reset() {
    useEditorStore.setState((s) => ({
        ...s,
        layers: [],
        activeLayerId: null,
        width: 200,
        height: 200,
    }));
    useEditorStore.getState().addLayer();
    useEditorStore.getState().clearSelection();
    setMarqueeOptions({ feather: 0, antiAlias: true });
}

function ctx() {
    return {
        store: useEditorStore.getState(),
        getStore: () => useEditorStore.getState(),
        requestRender: () => {},
    };
}

describe('marquee feather + ellipse anti-alias wiring', () => {
    beforeEach(reset);

    it('feathered marquee writes feather radius into the selection state', () => {
        setMarqueeOptions({ feather: 5, antiAlias: true });
        const tool = getTool('marquee-rect')!;
        tool.onPointerDown!(makeToolPointerEvent({ canvasX: 20, canvasY: 20 }), ctx());
        tool.onPointerMove!(makeToolPointerEvent({ canvasX: 80, canvasY: 80 }), ctx());
        tool.onPointerUp!(makeToolPointerEvent({ canvasX: 80, canvasY: 80 }), ctx());
        expect(useEditorStore.getState().selection.feather).toBe(5);
    });

    it('default antiAlias commits a path-based ellipse op (no rasterized mask)', () => {
        setMarqueeOptions({ antiAlias: true });
        const tool = getTool('marquee-ellipse')!;
        tool.onPointerDown!(makeToolPointerEvent({ canvasX: 50, canvasY: 50 }), ctx());
        tool.onPointerMove!(makeToolPointerEvent({ canvasX: 150, canvasY: 150 }), ctx());
        tool.onPointerUp!(makeToolPointerEvent({ canvasX: 150, canvasY: 150 }), ctx());
        const ops = useEditorStore.getState().selection.operations;
        expect(ops.length).toBe(1);
        expect(ops[0].mask).toBeUndefined();
    });

    it('antiAlias=false ellipse commits with a rasterized binary mask', () => {
        setMarqueeOptions({ antiAlias: false });
        const tool = getTool('marquee-ellipse')!;
        tool.onPointerDown!(makeToolPointerEvent({ canvasX: 50, canvasY: 50 }), ctx());
        tool.onPointerMove!(makeToolPointerEvent({ canvasX: 150, canvasY: 150 }), ctx());
        tool.onPointerUp!(makeToolPointerEvent({ canvasX: 150, canvasY: 150 }), ctx());
        const ops = useEditorStore.getState().selection.operations;
        expect(ops.length).toBe(1);
        expect(ops[0].mask).toBeDefined();
        const mask = ops[0].mask!;
        // Every value in a binary mask is exactly 0 or 255.
        for (const v of mask.data) expect(v === 0 || v === 255).toBe(true);
    });

    it('rasterizeBinaryEllipseMask covers the centre and excludes the corners', () => {
        const mask = rasterizeBinaryEllipseMask({ x: 50, y: 50, width: 100, height: 100 }, 200, 200);
        // Centre is solid.
        expect(mask!.data[100 * 200 + 100]).toBe(255);
        // Just-inside top is solid.
        expect(mask!.data[55 * 200 + 100]).toBe(255);
        // Outside the bounding rect is empty.
        expect(mask!.data[10 * 200 + 10]).toBe(0);
        // Corner of bounding box (x=51,y=51) is outside the ellipse.
        expect(mask!.data[51 * 200 + 51]).toBe(0);
    });
});
