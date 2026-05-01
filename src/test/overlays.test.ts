import { describe, it, expect, beforeEach } from 'vitest';
import { useEditorStore } from '../store/editorStore';
import { getTool } from '../tools/registry';
import { ensureStubsRegistered } from '../tools/stubs';
import { makeToolPointerEvent, pixelAt } from './simulator';
import { renderPathOverlay } from '../tools/pen';

ensureStubsRegistered();

function reset() {
    useEditorStore.setState((s) => ({ ...s, layers: [], activeLayerId: null }));
    useEditorStore.getState().addLayer();
}

function ctxObj() {
    return {
        store: useEditorStore.getState(),
        getStore: () => useEditorStore.getState(),
        requestRender: () => {},
    };
}

function makeOverlayCanvas(w = 200, h = 200): { canvas: HTMLCanvasElement; ctx: CanvasRenderingContext2D } {
    const canvas = document.createElement('canvas');
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext('2d')!;
    ctx.clearRect(0, 0, w, h);
    return { canvas, ctx };
}

describe('tool overlays', () => {
    beforeEach(reset);

    it('pen overlay: 3 clicks produce 3 visible anchor markers', () => {
        const tool = getTool('pen')!;
        tool.onPointerDown!(makeToolPointerEvent({ canvasX: 30, canvasY: 30 }), ctxObj());
        tool.onPointerUp!(makeToolPointerEvent({ canvasX: 30, canvasY: 30 }), ctxObj());
        tool.onPointerDown!(makeToolPointerEvent({ canvasX: 100, canvasY: 30 }), ctxObj());
        tool.onPointerUp!(makeToolPointerEvent({ canvasX: 100, canvasY: 30 }), ctxObj());
        tool.onPointerDown!(makeToolPointerEvent({ canvasX: 65, canvasY: 100 }), ctxObj());
        tool.onPointerUp!(makeToolPointerEvent({ canvasX: 65, canvasY: 100 }), ctxObj());

        const { canvas, ctx } = makeOverlayCanvas(200, 200);
        renderPathOverlay({ ctx, canvasWidth: 200, canvasHeight: 200, zoom: 1 });

        // Each anchor center is filled white with a blue border. Sample at the center.
        [{ x: 30, y: 30 }, { x: 100, y: 30 }, { x: 65, y: 100 }].forEach(p => {
            const px = pixelAt(canvas, p.x, p.y);
            expect(px.r, `anchor at (${p.x},${p.y}) should be visibly drawn`).toBeGreaterThan(200);
            expect(px.a).toBeGreaterThan(0);
        });
        // A point far from any anchor should be untouched (transparent).
        const empty = pixelAt(canvas, 5, 5);
        expect(empty.a).toBe(0);
    });

    it('marquee-rect overlay: drag produces a dashed rect that touches the rect borders', () => {
        const tool = getTool('marquee-rect')!;
        tool.onPointerDown!(makeToolPointerEvent({ canvasX: 40, canvasY: 50 }), ctxObj());
        tool.onPointerMove!(makeToolPointerEvent({ canvasX: 140, canvasY: 130 }), ctxObj());

        const { canvas, ctx } = makeOverlayCanvas(200, 200);
        tool.renderOverlay!({ ctx, canvasWidth: 200, canvasHeight: 200, zoom: 1 }, ctxObj());

        let drawnPixels = 0;
        for (let x = 41; x < 140; x++) {
            if (pixelAt(canvas, x, 50).a > 0) drawnPixels++;
        }
        expect(drawnPixels).toBeGreaterThan(20);

        const interior = pixelAt(canvas, 90, 90);
        expect(interior.a).toBe(0);

        // Clean up: release drag so the next test starts fresh.
        tool.onPointerUp!(makeToolPointerEvent({ canvasX: 140, canvasY: 130 }), ctxObj());
    });

    it('lasso-poly overlay: 3 clicks produce 3 visible anchor dots', () => {
        const tool = getTool('lasso-poly')!;
        tool.onPointerDown!(makeToolPointerEvent({ canvasX: 30, canvasY: 30 }), ctxObj());
        tool.onPointerDown!(makeToolPointerEvent({ canvasX: 90, canvasY: 30 }), ctxObj());
        tool.onPointerDown!(makeToolPointerEvent({ canvasX: 60, canvasY: 90 }), ctxObj());

        const { canvas, ctx } = makeOverlayCanvas(200, 200);
        tool.renderOverlay!({ ctx, canvasWidth: 200, canvasHeight: 200, zoom: 1 }, ctxObj());

        [{ x: 30, y: 30 }, { x: 90, y: 30 }, { x: 60, y: 90 }].forEach(p => {
            const px = pixelAt(canvas, p.x, p.y);
            expect(px.a, `lasso-poly anchor at (${p.x},${p.y}) should be visible`).toBeGreaterThan(0);
        });
    });

    it('marquee-rect overlay: nothing drawn when no drag in progress', () => {
        const tool = getTool('marquee-rect')!;
        const { canvas, ctx } = makeOverlayCanvas(200, 200);
        tool.renderOverlay!({ ctx, canvasWidth: 200, canvasHeight: 200, zoom: 1 }, ctxObj());
        // Sample a few points, nothing should be drawn.
        const px = pixelAt(canvas, 50, 50);
        expect(px.a).toBe(0);
    });
});
