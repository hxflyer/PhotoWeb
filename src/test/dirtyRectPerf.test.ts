import { describe, it, expect, beforeEach } from 'vitest';
import { useEditorStore } from '../store/editorStore';
import { ensureStubsRegistered } from '../tools/stubs';
import { brushTool } from '../tools/brush';
import { makeToolPointerEvent, pixelAt } from './simulator';
import { Layer } from '../core/Layer';
import { Canvas2DCompositor } from '../compositor/Canvas2DCompositor';
import { getFilter } from '../filters/registry';
import { applyFilterToLayer } from '../filters/applyFilter';
// Import filter modules so registerFilter side effects run before the tests
// look them up by id.
import '../filters/blurFilters';
import '../filters/noiseFilters';

ensureStubsRegistered();

function reset(width = 256, height = 256) {
    useEditorStore.getState().clearHistory();
    useEditorStore.setState(s => ({
        ...s,
        layers: [],
        activeLayerId: null,
        width,
        height,
        brushSettings: { size: 10, hardness: 1, opacity: 1, flow: 1 },
        selection: { ...s.selection, hasSelection: false, operations: [], path: [] },
    }));
    useEditorStore.getState().addLayer();
}

describe('Batch 6 Slice A · dirty-rect plumbing', () => {
    beforeEach(() => reset());

    // ── Paint stroke commits a bounded history dirty rect ────────────────────
    it('a 50-pixel brush stroke commits a history dirtyRect tight to the stroke bbox on a 4000x3000 layer', () => {
        // The history-action dirtyRect is what filters / persistence / undo use
        // to localize work. The action rect must be tight to the stroke bbox,
        // not the full canvas — that is the guarantee Batch 6 relies on.
        const W = 4000, H = 3000;
        reset(W, H);
        useEditorStore.setState(s => ({ ...s, primaryColor: '#000000' }));
        const ctxObj = {
            store: useEditorStore.getState(),
            getStore: () => useEditorStore.getState(),
            requestRender: () => {},
        };
        const x0 = 1000, y0 = 1500, x1 = 1050, y1 = 1500;
        brushTool.onPointerDown?.(makeToolPointerEvent({ canvasX: x0, canvasY: y0 }), ctxObj);
        brushTool.onPointerMove?.(makeToolPointerEvent({ canvasX: (x0 + x1) / 2, canvasY: (y0 + y1) / 2 }), ctxObj);
        brushTool.onPointerMove?.(makeToolPointerEvent({ canvasX: x1, canvasY: y1 }), ctxObj);
        brushTool.onPointerUp?.(makeToolPointerEvent({ canvasX: x1, canvasY: y1 }), ctxObj);

        const entries = useEditorStore.getState().historyEntries;
        const top = entries[entries.length - 1];
        if (top.action.kind !== 'pixel') throw new Error('expected pixel action');
        const rect = top.action.dirtyRect;
        // Tight bbox around the 50-pixel horizontal stroke at y≈1500
        expect(rect.x).toBeGreaterThanOrEqual(x0 - 20);
        expect(rect.x).toBeLessThanOrEqual(x0 + 5);
        expect(rect.width).toBeGreaterThan(40);
        expect(rect.width).toBeLessThan(120);
        expect(rect.height).toBeLessThan(40);
        // Must be a tiny fraction of the canvas — the perf claim of Batch 6.
        expect(rect.width * rect.height).toBeLessThan((W * H) / 1000);
    });

    // ── Gaussian Blur honors dirtyRect ───────────────────────────────────────
    it('Gaussian Blur with a non-null dirtyRect leaves pixels outside the rect unchanged', () => {
        const w = 200, h = 200;
        const src = new Uint8ClampedArray(w * h * 4);
        // Fill with a vertical edge: left half red, right half blue, so any
        // blur visibly changes the boundary column.
        for (let y = 0; y < h; y++) {
            for (let x = 0; x < w; x++) {
                const i = (y * w + x) * 4;
                if (x < w / 2) { src[i] = 255; src[i + 1] = 0;   src[i + 2] = 0;   src[i + 3] = 255; }
                else            { src[i] = 0;   src[i + 1] = 0;   src[i + 2] = 255; src[i + 3] = 255; }
            }
        }
        const image = new ImageData(new Uint8ClampedArray(src), w, h);
        const filter = getFilter('blur-gaussian')!;
        // Localize to a 40x40 box around the centre of the edge.
        const dirtyRect = { x: 80, y: 80, width: 40, height: 40 };
        const result = filter.apply({ radius: 5 }, {
            image,
            width: w,
            height: h,
            selectionMask: null,
            dirtyRect,
        });

        // Inside dirty rect, the edge column should have blended.
        const inside = (100 * w + 100) * 4;
        expect(result.data[inside]).not.toBe(src[inside]);

        // Outside dirty rect, far from the rect, pixels must be identical.
        const farIndices = [
            (10 * w + 10) * 4,
            (10 * w + 190) * 4,
            (190 * w + 10) * 4,
            (190 * w + 190) * 4,
            (50 * w + 100) * 4,  // above the dirty rect, on the edge
            (150 * w + 100) * 4, // below the dirty rect, on the edge
        ];
        for (const idx of farIndices) {
            expect(result.data[idx]).toBe(src[idx]);
            expect(result.data[idx + 1]).toBe(src[idx + 1]);
            expect(result.data[idx + 2]).toBe(src[idx + 2]);
            expect(result.data[idx + 3]).toBe(src[idx + 3]);
        }
    });

    // ── Median honors dirtyRect ──────────────────────────────────────────────
    it('Median with a non-null dirtyRect leaves pixels outside the rect unchanged', () => {
        const w = 100, h = 100;
        const src = new Uint8ClampedArray(w * h * 4);
        // Salt-and-pepper-ish: every 7th pixel is white, others are mid-grey.
        for (let i = 0; i < src.length; i += 4) {
            const speckle = ((i / 4) % 7) === 0;
            const v = speckle ? 255 : 100;
            src[i] = v; src[i + 1] = v; src[i + 2] = v; src[i + 3] = 255;
        }
        const image = new ImageData(new Uint8ClampedArray(src), w, h);
        const filter = getFilter('noise-median')!;
        const dirtyRect = { x: 40, y: 40, width: 20, height: 20 };
        const result = filter.apply({ radius: 2 }, {
            image,
            width: w,
            height: h,
            selectionMask: null,
            dirtyRect,
        });

        // Outside dirty rect: identical to src.
        const outsideIdx = (5 * w + 5) * 4;
        expect(result.data[outsideIdx]).toBe(src[outsideIdx]);
        // Inside dirty rect: at least some pixels should have been changed by
        // the median (speckles smoothed away).
        let changedInside = 0;
        for (let y = 40; y < 60; y++) {
            for (let x = 40; x < 60; x++) {
                const i = (y * w + x) * 4;
                if (result.data[i] !== src[i]) changedInside++;
            }
        }
        expect(changedInside).toBeGreaterThan(0);
    });

    // ── Surface Blur honors dirtyRect ────────────────────────────────────────
    it('Surface Blur with a non-null dirtyRect leaves pixels outside the rect unchanged', () => {
        const w = 100, h = 100;
        const src = new Uint8ClampedArray(w * h * 4);
        for (let y = 0; y < h; y++) {
            for (let x = 0; x < w; x++) {
                const i = (y * w + x) * 4;
                // gradient + a noisy 2px-wide vertical stripe in the middle so
                // the bilateral filter has something to smooth.
                const v = Math.abs(x - 50) < 2 ? 100 : (120 + x);
                src[i] = v; src[i + 1] = v; src[i + 2] = v; src[i + 3] = 255;
            }
        }
        const image = new ImageData(new Uint8ClampedArray(src), w, h);
        const filter = getFilter('blur-surface')!;
        const dirtyRect = { x: 40, y: 40, width: 20, height: 20 };
        const result = filter.apply({ radius: 3, threshold: 30 }, {
            image,
            width: w,
            height: h,
            selectionMask: null,
            dirtyRect,
        });

        // Far from the rect, pixels are untouched.
        const farIdx = (5 * w + 5) * 4;
        expect(result.data[farIdx]).toBe(src[farIdx]);
        expect(result.data[farIdx + 1]).toBe(src[farIdx + 1]);
        expect(result.data[farIdx + 2]).toBe(src[farIdx + 2]);
    });

    // ── Backwards-compat: full-canvas walk when dirtyRect is null ─────────────
    it('Gaussian Blur with dirtyRect=null produces the same result as a full-rect dirtyRect (regression guard for the convolution helper)', () => {
        // Sharp pattern so the kernel has something to blur into.
        const w = 40, h = 40;
        const src = new Uint8ClampedArray(w * h * 4);
        for (let y = 0; y < h; y++) {
            for (let x = 0; x < w; x++) {
                const i = (y * w + x) * 4;
                // Black & white checker so corners blend visibly.
                const on = ((x >> 2) + (y >> 2)) & 1;
                const v = on ? 255 : 0;
                src[i] = v; src[i + 1] = v; src[i + 2] = v; src[i + 3] = 255;
            }
        }
        const filter = getFilter('blur-gaussian')!;
        const nullCtx = {
            image: new ImageData(new Uint8ClampedArray(src), w, h),
            width: w, height: h, selectionMask: null, dirtyRect: null,
        };
        const fullCtx = {
            image: new ImageData(new Uint8ClampedArray(src), w, h),
            width: w, height: h, selectionMask: null,
            dirtyRect: { x: 0, y: 0, width: w, height: h },
        };
        const a = filter.apply({ radius: 2 }, nullCtx);
        const b = filter.apply({ radius: 2 }, fullCtx);
        // Every byte should match — the two code paths must converge for a
        // full-canvas dirty rect.
        for (let i = 0; i < a.data.length; i++) {
            if (a.data[i] !== b.data[i]) {
                throw new Error(`mismatch at byte ${i}: null=${a.data[i]} full=${b.data[i]}`);
            }
        }
        // The full-walk result must visibly blur the checker corners.
        const corner = ((4 * w) + 4) * 4;
        expect(a.data[corner]).toBeGreaterThan(0);
        expect(a.data[corner]).toBeLessThan(255);
    });

    it('applyFilterToLayer with layer.dirtyRect=null still produces a full-canvas filter result (regression guard)', () => {
        const layer = useEditorStore.getState().layers[0];
        layer.ctx.fillStyle = '#000000';
        layer.ctx.fillRect(0, 0, layer.canvas.width, layer.canvas.height);
        // A single 50x50 white square in the top-left so we can confirm the
        // filter touched pixels far from any sub-region.
        layer.ctx.fillStyle = '#ffffff';
        layer.ctx.fillRect(20, 20, 50, 50);
        layer.clearDirty();
        const noSelection = useEditorStore.getState().selection;
        const before = pixelAt(layer.canvas, 70, 70); // black, just outside the square
        const applied = applyFilterToLayer(layer, 'blur-gaussian', { radius: 4 }, noSelection);
        expect(applied).toBe(true);
        const after = pixelAt(layer.canvas, 70, 70);
        // A 4px Gaussian blur of a sharp white square next to black must lift
        // the just-outside-corner pixel slightly above its black baseline.
        expect(after.r).toBeGreaterThan(before.r);
    });

    // ── Compositor unionDirtyRect ────────────────────────────────────────────
    it('Canvas2DCompositor.unionDirtyRect returns a bbox covering all visible layers dirty rects, padded by 1 px', () => {
        const c = new Canvas2DCompositor();
        const l1 = new Layer(200, 200, 'A');
        const l2 = new Layer(200, 200, 'B');
        const l3 = new Layer(200, 200, 'C');
        l1.dirtyRect = { x: 10, y: 10, width: 20, height: 20 };
        l2.dirtyRect = { x: 100, y: 50, width: 30, height: 40 };
        l3.dirtyRect = { x: 60, y: 130, width: 10, height: 10 };
        const union = c.unionDirtyRect([l1, l2, l3], 200, 200, 1);
        expect(union).not.toBeNull();
        expect(union!.x).toBe(9);
        expect(union!.y).toBe(9);
        expect(union!.x + union!.width).toBe(131);
        expect(union!.y + union!.height).toBe(141);
    });

    it('Canvas2DCompositor.unionDirtyRect ignores invisible layers', () => {
        const c = new Canvas2DCompositor();
        const l1 = new Layer(200, 200, 'A');
        const l2 = new Layer(200, 200, 'B');
        l1.dirtyRect = { x: 10, y: 10, width: 20, height: 20 };
        l2.dirtyRect = { x: 100, y: 100, width: 30, height: 30 };
        l2.visible = false;
        const union = c.unionDirtyRect([l1, l2], 200, 200, 0);
        expect(union).toEqual({ x: 10, y: 10, width: 20, height: 20 });
    });

    it('Canvas2DCompositor.unionDirtyRect returns null when no visible layer has a dirty rect set', () => {
        const c = new Canvas2DCompositor();
        const l1 = new Layer(200, 200, 'A');
        const l2 = new Layer(200, 200, 'B');
        l1.dirtyRect = null;
        l2.dirtyRect = null;
        const union = c.unionDirtyRect([l1, l2], 200, 200);
        expect(union).toBeNull();
    });

    // ── markClean after render ───────────────────────────────────────────────
    it('after compositor.render every layer dirtyRect is null', () => {
        const c = new Canvas2DCompositor();
        const l1 = new Layer(50, 50, 'A');
        l1.ctx.fillStyle = '#ff0000';
        l1.ctx.fillRect(0, 0, 50, 50);
        l1.markDirty(null);
        const target = document.createElement('canvas');
        target.width = 50; target.height = 50;
        c.beginFrame(target);
        c.render({
            layers: [l1],
            activeLayerId: l1.id,
            viewport: { width: 50, height: 50, zoom: 1, pan: { x: 0, y: 0 } },
            target,
        });
        expect(l1.dirtyRect).toBeNull();
    });

    it('compositor full repaint still produces a correct composite (regression guard)', () => {
        const c = new Canvas2DCompositor();
        const l1 = new Layer(50, 50, 'A');
        l1.ctx.fillStyle = '#ff0000';
        l1.ctx.fillRect(0, 0, 50, 50);
        l1.markDirty(null);
        const target = document.createElement('canvas');
        target.width = 50; target.height = 50;
        c.beginFrame(target);
        c.render({
            layers: [l1],
            activeLayerId: l1.id,
            viewport: { width: 50, height: 50, zoom: 1, pan: { x: 0, y: 0 } },
            target,
        });
        const px = pixelAt(target, 25, 25);
        expect(px.r).toBe(255);
        expect(px.g).toBe(0);
        expect(px.b).toBe(0);
    });

    it('compositor clipped composite only touches pixels inside the union of dirty rects', () => {
        const c = new Canvas2DCompositor();
        const l1 = new Layer(80, 80, 'A');
        l1.ctx.fillStyle = '#ff0000';
        l1.ctx.fillRect(0, 0, 80, 80);
        l1.markDirty(null);
        const target = document.createElement('canvas');
        target.width = 80; target.height = 80;
        c.beginFrame(target);
        c.render({
            layers: [l1],
            activeLayerId: l1.id,
            viewport: { width: 80, height: 80, zoom: 1, pan: { x: 0, y: 0 } },
            target,
        });
        // Now paint blue on a small region of the layer and mark only that area
        // dirty. Without calling beginFrame between renders, the compositor
        // should perform a clipped composite — leaving the on-screen target's
        // red pixels intact outside the dirty area, and showing blue inside it.
        l1.ctx.fillStyle = '#0000ff';
        l1.ctx.fillRect(30, 30, 10, 10);
        l1.dirtyRect = { x: 30, y: 30, width: 10, height: 10 };
        c.render({
            layers: [l1],
            activeLayerId: l1.id,
            viewport: { width: 80, height: 80, zoom: 1, pan: { x: 0, y: 0 } },
            target,
        });
        const blueInside = pixelAt(target, 35, 35);
        expect(blueInside.b).toBeGreaterThan(200);
        expect(blueInside.r).toBeLessThan(50);
        const redOutside = pixelAt(target, 5, 5);
        expect(redOutside.r).toBeGreaterThan(200);
        expect(redOutside.b).toBeLessThan(50);
    });
});
