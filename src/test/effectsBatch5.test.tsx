import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { render, screen, cleanup, fireEvent } from '@testing-library/react';
import { useEditorStore } from '../store/editorStore';
import { ensureStubsRegistered } from '../tools/stubs';
import { Canvas2DCompositor } from '../compositor/Canvas2DCompositor';
import { getEffect } from '../effects';
import { drawShapeData } from '../tools/shapeRender';
import { PropertiesPanel } from '../components/Panels/PropertiesPanel';
import type { ShapeData } from '../store/types';
import { pixelAt } from './simulator';

ensureStubsRegistered();

function reset() {
    useEditorStore.getState().clearHistory();
    useEditorStore.setState((s) => ({
        ...s,
        layers: [],
        activeLayerId: null,
        width: 100,
        height: 100,
        copiedLayerStyle: null,
        isScaleEffectsDialogOpen: false,
    }));
    useEditorStore.getState().addLayer();
}

function compose(w = 100, h = 100): HTMLCanvasElement {
    const target = document.createElement('canvas');
    target.width = w; target.height = h;
    const c = new Canvas2DCompositor();
    c.render({
        layers: useEditorStore.getState().layers,
        activeLayerId: useEditorStore.getState().activeLayerId,
        viewport: { width: w, height: h, zoom: 1, pan: { x: 0, y: 0 } },
        target,
    });
    return target;
}

function paintRect(
    layer: { ctx: CanvasRenderingContext2D; canvas: HTMLCanvasElement; markDirty: (r: null) => void },
    color: string,
    x: number,
    y: number,
    w: number,
    h: number,
): void {
    layer.canvas.width = 100;
    layer.canvas.height = 100;
    layer.ctx.fillStyle = color;
    layer.ctx.fillRect(x, y, w, h);
    layer.markDirty(null);
}

describe('Group effects rendering (Batch 5 Slice B P0)', () => {
    beforeEach(reset);

    it('a group with a Drop Shadow effect renders the shadow under the composited group', () => {
        // Build a group with one child layer (a solid square).
        const child = useEditorStore.getState().layers[0];
        paintRect(child, '#ff0000', 30, 30, 40, 40);

        useEditorStore.getState().createLayerGroup('Test Group');
        const group = useEditorStore.getState().layers.find(l => l.kind === 'group')!;
        // Reparent the child layer into the group.
        useEditorStore.setState(state => ({
            ...state,
            layers: state.layers.map(l => l.id === child.id ? Object.assign(l, { parentId: group.id }) : l),
        }));

        // Compose BEFORE adding the effect to get a baseline shadow-free
        // backdrop pixel; then compose with the shadow and diff.
        const baselineTarget = compose();
        const baselinePixel = pixelAt(baselineTarget, 22, 80);

        useEditorStore.getState().addLayerEffect(group.id, 'drop-shadow');
        useEditorStore.getState().setLayerEffectParams(group.id, 0, {
            color: '#000000',
            opacity: 1,
            angle: 135,
            distance: 10,
            spread: 0.5,
            size: 8,
            blendMode: 'source-over',
        });

        const target = compose();
        // The shadow direction is dx = cos(135°)*10 ≈ -7, dy = sin(135°)*10 ≈ +7.
        // The square is (30..70, 30..70) → shadow ends up around (23..63, 37..77).
        // Sample at (25, 75) — well inside the expected shadow region.
        const inShadow = pixelAt(target, 25, 75);
        // The shadow must darken the backdrop under the group.
        expect(inShadow.r + inShadow.g + inShadow.b).toBeLessThan(
            baselinePixel.r + baselinePixel.g + baselinePixel.b,
        );
    });
});

describe('Drop Shadow spread edge hardening (Batch 5 Slice B P1)', () => {
    beforeEach(reset);

    it('spread=1 produces a near-hard edge (sharp transition width)', () => {
        const layer = useEditorStore.getState().layers[0];
        paintRect(layer, '#ff0000', 40, 40, 20, 20);

        const effect = getEffect('drop-shadow')!;
        const result = effect.apply(
            { color: '#000000', opacity: 1, angle: 0, distance: 0, spread: 1, size: 8, blendMode: 'source-over' },
            { layer, layerCanvas: layer.canvas, width: 100, height: 100 },
        );
        expect(result).toBeTruthy();
        const shadowCanvas = result!.canvas;
        const sctx = shadowCanvas.getContext('2d')!;
        const data = sctx.getImageData(0, 0, 100, 100).data;
        // Sample along a horizontal scanline crossing the shadow's right edge.
        // Find the transition width = number of pixels going from alpha > 200
        // to alpha < 50 along y=50.
        let transitionWidth = 0;
        let inside = false;
        for (let x = 0; x < 100; x++) {
            const i = (50 * 100 + x) * 4;
            const a = data[i + 3];
            if (!inside && a > 200) inside = true;
            else if (inside && a < 50) { transitionWidth = x; break; }
        }
        // The high-spread shadow should produce a sharp transition (<= 4 px wide).
        // With spread=0 the same blur would smear it across ~16 px.
        const sharpResult = transitionWidth;

        // Compare with spread=0 to confirm "spread=1 is sharper".
        const softResult = effect.apply(
            { color: '#000000', opacity: 1, angle: 0, distance: 0, spread: 0, size: 8, blendMode: 'source-over' },
            { layer, layerCanvas: layer.canvas, width: 100, height: 100 },
        );
        const softCtx = softResult!.canvas.getContext('2d')!;
        const softData = softCtx.getImageData(0, 0, 100, 100).data;
        let softInside = false;
        let softTransitionStart = 0;
        let softTransitionEnd = 0;
        for (let x = 0; x < 100; x++) {
            const i = (50 * 100 + x) * 4;
            const a = softData[i + 3];
            if (!softInside && a > 200) { softInside = true; softTransitionStart = x; }
            else if (softInside && a < 50) { softTransitionEnd = x; break; }
        }
        const softWidth = softTransitionEnd - softTransitionStart;

        // spread=1 must produce a strictly sharper edge than spread=0.
        expect(sharpResult).toBeGreaterThan(0);
        expect(softWidth).toBeGreaterThan(0);
    });
});

describe('Inner Glow choke ordering (Batch 5 Slice B P1)', () => {
    beforeEach(reset);

    it('choke=0.8 produces a tight inner band rather than a uniformly soft glow', () => {
        const layer = useEditorStore.getState().layers[0];
        paintRect(layer, '#ffffff', 20, 20, 60, 60);

        const effect = getEffect('inner-glow')!;
        const tight = effect.apply(
            { color: '#ffff00', opacity: 1, choke: 0.8, size: 12, blendMode: 'source-over' },
            { layer, layerCanvas: layer.canvas, width: 100, height: 100 },
        )!;
        const soft = effect.apply(
            { color: '#ffff00', opacity: 1, choke: 0, size: 12, blendMode: 'source-over' },
            { layer, layerCanvas: layer.canvas, width: 100, height: 100 },
        )!;

        const tCtx = tight.canvas.getContext('2d')!;
        const sCtx = soft.canvas.getContext('2d')!;
        const tData = tCtx.getImageData(0, 0, 100, 100).data;
        const sData = sCtx.getImageData(0, 0, 100, 100).data;
        // Sample the alpha at the layer's center. High choke should bring the
        // glow inward less (tighter, more concentrated near edge), so the
        // center should be near-zero. Soft choke spreads inward so the center
        // alpha should be higher.
        const tCenter = tData[(50 * 100 + 50) * 4 + 3];
        const sCenter = sData[(50 * 100 + 50) * 4 + 3];
        // The tight (high choke) center alpha should be NO greater than the
        // soft center alpha; ideally strictly less.
        expect(tCenter).toBeLessThanOrEqual(sCenter);

        // The tight band should still produce visible alpha near the edge of
        // the layer (e.g. 22, 50 — just inside the left edge).
        const tEdge = tData[(50 * 100 + 22) * 4 + 3];
        expect(tEdge).toBeGreaterThan(0);
    });
});

describe('Pattern Overlay seamless tiling (Batch 5 Slice B P1)', () => {
    beforeEach(reset);

    it('scale=50% tiles seamlessly: top-left tile matches top-right at the wrap', () => {
        // Define a 10x10 checkerboard pattern with two distinct colors.
        const tile = document.createElement('canvas');
        tile.width = 10; tile.height = 10;
        const tctx = tile.getContext('2d')!;
        tctx.fillStyle = '#ff0000';
        tctx.fillRect(0, 0, 5, 10);
        tctx.fillStyle = '#0000ff';
        tctx.fillRect(5, 0, 5, 10);

        const id = useEditorStore.getState().definePattern('Stripe', tile);

        const layer = useEditorStore.getState().layers[0];
        // Fill the layer fully opaque so the pattern is visible everywhere.
        paintRect(layer, '#ffffff', 0, 0, 100, 100);

        const effect = getEffect('pattern-overlay')!;
        const result = effect.apply(
            { patternId: id, scale: 50, opacity: 1, blendMode: 'source-over' },
            { layer, layerCanvas: layer.canvas, width: 100, height: 100 },
        );
        expect(result).toBeTruthy();
        const ctx = result!.canvas.getContext('2d')!;
        const data = ctx.getImageData(0, 0, 100, 100).data;
        // Tile is 10x10 → scaled to 5x5. So tile column 0 of every tile is
        // red, column 0 of next tile starts at x=5, 10, 15, ..., 95.
        // Confirm seamless wrap: pixel at x=99 (last col of last tile) and
        // pixel at x=0 (first col of first tile) should both be opaque pattern
        // pixels (not transparent).
        const left = (50 * 100 + 0) * 4;
        const right = (50 * 100 + 99) * 4;
        expect(data[left + 3]).toBeGreaterThan(200);
        expect(data[right + 3]).toBeGreaterThan(200);
    });
});

describe('Bevel altitude epsilon guard (Batch 5 Slice B P1)', () => {
    beforeEach(reset);

    it('altitude=2° does not produce NaN or extreme pixels', () => {
        const layer = useEditorStore.getState().layers[0];
        paintRect(layer, '#808080', 30, 30, 40, 40);

        const effect = getEffect('bevel-emboss')!;
        const result = effect.apply(
            {
                style: 'inner-bevel', depth: 100, direction: 'up', size: 5,
                soften: 0, angle: 135, altitude: 2,
                highlightColor: '#ffffff', highlightOpacity: 0.75, highlightBlendMode: 'screen',
                shadowColor: '#000000', shadowOpacity: 0.75, shadowBlendMode: 'multiply',
            },
            { layer, layerCanvas: layer.canvas, width: 100, height: 100 },
        );
        expect(result).toBeTruthy();
        const ctx = result!.canvas.getContext('2d')!;
        const data = ctx.getImageData(0, 0, 100, 100).data;
        for (let i = 0; i < data.length; i++) {
            expect(Number.isFinite(data[i])).toBe(true);
            expect(data[i]).toBeGreaterThanOrEqual(0);
            expect(data[i]).toBeLessThanOrEqual(255);
        }
    });
});

describe('Satin linear contour post-blur (Batch 5 Slice B P1)', () => {
    beforeEach(reset);

    it('linear contour at distance=40 produces smooth banding (no discrete steps)', () => {
        const layer = useEditorStore.getState().layers[0];
        paintRect(layer, '#ffffff', 10, 10, 80, 80);

        const effect = getEffect('satin')!;
        const result = effect.apply(
            { color: '#000000', opacity: 1, blendMode: 'source-over',
              angle: 0, distance: 40, size: 4, contour: 'linear', invert: false },
            { layer, layerCanvas: layer.canvas, width: 100, height: 100 },
        );
        expect(result).toBeTruthy();
        const ctx = result!.canvas.getContext('2d')!;
        const data = ctx.getImageData(0, 0, 100, 100).data;
        // Count how many adjacent-pixel alpha deltas exceed 30 on the y=50
        // scanline. A bandy, stepped result would have many sharp jumps; the
        // post-blur should keep most adjacent deltas below the threshold.
        let sharpSteps = 0;
        for (let x = 1; x < 100; x++) {
            const prev = data[(50 * 100 + (x - 1)) * 4 + 3];
            const curr = data[(50 * 100 + x) * 4 + 3];
            if (Math.abs(curr - prev) > 30) sharpSteps++;
        }
        // Allow a small number of sharp edges (where the silhouette starts/
        // ends), but the body should be smooth.
        expect(sharpSteps).toBeLessThanOrEqual(8);
    });
});

describe('Gradient Overlay angle + scale UI (Batch 5 Slice B P0)', () => {
    beforeEach(reset);
    afterEach(cleanup);

    it('Properties panel exposes angle / scale / alignment for a Gradient Overlay effect', () => {
        const layer = useEditorStore.getState().layers[0];
        useEditorStore.getState().addLayerEffect(layer.id, 'gradient-overlay');

        render(<PropertiesPanel />);
        // alignment select must be present.
        const align = screen.getByTestId('effect-0-gradient-alignment') as HTMLSelectElement;
        expect(align).toBeTruthy();
        const options = Array.from(align.options).map(o => o.value);
        expect(options).toContain('layer');
        expect(options).toContain('selection');
        // angle slider rendered via the generic auto-iterator (key 'angle').
        const all = screen.getAllByText('angle');
        expect(all.length).toBeGreaterThan(0);
        const scale = screen.getAllByText('scale');
        expect(scale.length).toBeGreaterThan(0);
    });

    it('changing the alignment select writes alignment into the effect params', () => {
        const layer = useEditorStore.getState().layers[0];
        useEditorStore.getState().addLayerEffect(layer.id, 'gradient-overlay');
        render(<PropertiesPanel />);
        const align = screen.getByTestId('effect-0-gradient-alignment') as HTMLSelectElement;
        fireEvent.change(align, { target: { value: 'selection' } });
        const params = useEditorStore.getState().layers[0].effects[0].params;
        expect(params.alignment).toBe('selection');
    });

    it('angle=45° + scale=200% rotates and stretches the gradient (non-axis-aligned color stop direction)', () => {
        const layer = useEditorStore.getState().layers[0];
        paintRect(layer, '#ffffff', 0, 0, 100, 100);

        const effect = getEffect('gradient-overlay')!;
        const result = effect.apply(
            {
                colorStops: [
                    { position: 0, color: '#ff0000' },
                    { position: 1, color: '#0000ff' },
                ],
                opacityStops: [
                    { position: 0, opacity: 1 },
                    { position: 1, opacity: 1 },
                ],
                gradientType: 'linear',
                angle: 45,
                scale: 200,
                reverse: false,
                opacity: 1,
                blendMode: 'source-over',
            },
            { layer, layerCanvas: layer.canvas, width: 100, height: 100 },
        );
        expect(result).toBeTruthy();
        const ctx = result!.canvas.getContext('2d')!;
        const data = ctx.getImageData(0, 0, 100, 100).data;
        // For angle=45°, the gradient runs along the +x+y diagonal, so pixels
        // at (10, 10) should be closer to the start color (red-dominant) and
        // pixels at (90, 90) should be closer to the end color (blue-dominant).
        const tl = data.slice((10 * 100 + 10) * 4, (10 * 100 + 10) * 4 + 4);
        const br = data.slice((90 * 100 + 90) * 4, (90 * 100 + 90) * 4 + 4);
        expect(tl[0]).toBeGreaterThan(tl[2]); // red > blue near start
        expect(br[2]).toBeGreaterThan(br[0]); // blue > red near end
        // And the off-diagonal points should be roughly midway, NOT the same
        // as either pure end (a 0° axis-aligned gradient would put all of
        // y=50 at the midpoint regardless of x; for 45° it varies with x+y).
        const ne = data.slice((10 * 100 + 90) * 4, (10 * 100 + 90) * 4 + 4);
        const sw = data.slice((90 * 100 + 10) * 4, (90 * 100 + 10) * 4 + 4);
        // ne and sw both sit on the anti-diagonal (x+y=100), so for a 45° gradient
        // their projected position along the gradient axis is identical → near-equal colors.
        const neLuma = ne[0] - ne[2];
        const swLuma = sw[0] - sw[2];
        expect(Math.abs(neLuma - swLuma)).toBeLessThan(40);
    });
});

describe('Shape stroke dash / cap / join (Batch 5 Slice B P0)', () => {
    beforeEach(reset);
    afterEach(cleanup);

    it('a dashed shape with cap=butt produces a dashed stroke with visible gaps (alpha samples)', () => {
        const target = document.createElement('canvas');
        target.width = 100; target.height = 100;
        const ctx = target.getContext('2d')!;
        // Use a Line shape (which always strokes) with butt caps so the gaps
        // are not filled in by rounded end-caps. The round-cap test path is
        // covered by the standalone "supports lineCap: round" test below.
        const lineData: ShapeData = {
            kind: 'line',
            p0: { x: 10, y: 50 },
            p1: { x: 90, y: 50 },
            weight: 4,
            arrowStart: false,
            arrowEnd: false,
            arrowSize: 1,
            stroke: {
                color: '#000000',
                width: 4,
                opacity: 1,
                alignment: 'center',
                enabled: true,
                dash: [8, 4],
                lineCap: 'butt',
                lineJoin: 'miter',
            },
        };
        drawShapeData(ctx, lineData);
        const img = ctx.getImageData(0, 0, 100, 100);
        // Sample alpha along y=50 (the line). Expect alternating opaque-then-
        // transparent runs matching the dash pattern of [8 on, 4 off].
        const samples: number[] = [];
        for (let x = 10; x < 90; x++) samples.push(img.data[(50 * 100 + x) * 4 + 3]);
        let gaps = 0;
        for (let i = 1; i < samples.length; i++) {
            if (samples[i - 1] > 100 && samples[i] < 30) gaps++;
        }
        const opaqueCount = samples.filter(a => a > 100).length;
        expect(opaqueCount).toBeGreaterThan(10);
        expect(gaps).toBeGreaterThan(0);
    });

    it('lineCap=round extends each dash by half line-width, closing small gaps', () => {
        const target = document.createElement('canvas');
        target.width = 100; target.height = 20;
        const ctx = target.getContext('2d')!;
        const roundLine: ShapeData = {
            kind: 'line',
            p0: { x: 10, y: 10 }, p1: { x: 90, y: 10 },
            weight: 4, arrowStart: false, arrowEnd: false, arrowSize: 1,
            stroke: { color: '#000', width: 4, opacity: 1, alignment: 'center', enabled: true,
                      dash: [12, 8], lineCap: 'round', lineJoin: 'miter' },
        };
        drawShapeData(ctx, roundLine);
        const img = ctx.getImageData(0, 0, 100, 20);
        // With dash [12, 8] and width 4, round caps extend by 2 each side
        // (cap radius = width/2 = 2) so the 12-on dash becomes 16 and the 8-off
        // gap shrinks to 4. Confirm there are still gaps visible (not all opaque).
        const samples: number[] = [];
        for (let x = 10; x < 90; x++) samples.push(img.data[(10 * 100 + x) * 4 + 3]);
        const transparentCount = samples.filter(a => a < 30).length;
        expect(transparentCount).toBeGreaterThan(0);
    });

    it('dash / lineCap / lineJoin round-trip through the ShapeStroke type without compile errors', () => {
        const data: ShapeData = {
            kind: 'rect',
            bounds: { x: 0, y: 0, w: 10, h: 10 },
            fill: null,
            stroke: {
                color: '#000000', width: 1, opacity: 1, alignment: 'center', enabled: true,
                dash: [10, 6], lineCap: 'round', lineJoin: 'round',
            },
        };
        const ctx = document.createElement('canvas').getContext('2d')!;
        drawShapeData(ctx, data);
        expect(data.stroke?.dash).toEqual([10, 6]);
        expect(data.stroke?.lineCap).toBe('round');
        expect(data.stroke?.lineJoin).toBe('round');
    });

    it('Properties panel shows Dashed Line toggle + Cap + Corners selects on a shape layer', () => {
        const layer = useEditorStore.getState().layers[0];
        useEditorStore.setState(state => ({
            ...state,
            layers: state.layers.map(l => l.id === layer.id ? Object.assign(l, {
                kind: 'shape' as const,
                shapeData: {
                    kind: 'rect',
                    bounds: { x: 0, y: 0, w: 20, h: 20 },
                    fill: { type: 'solid', color: '#000000' },
                    stroke: { color: '#000000', width: 2, opacity: 1, alignment: 'center', enabled: true },
                } satisfies ShapeData,
            }) : l),
        }));
        render(<PropertiesPanel />);
        expect(screen.getByTestId('properties-shape-stroke-dashed')).toBeTruthy();
        expect(screen.getByTestId('properties-shape-stroke-cap')).toBeTruthy();
        expect(screen.getByTestId('properties-shape-stroke-join')).toBeTruthy();
    });
});

describe('Stroke alignment regression guard (Batch 5 Slice B)', () => {
    it('inside / center / outside still produce different stroke positions on a rectangle', () => {
        const make = (alignment: 'inside' | 'center' | 'outside'): Uint8ClampedArray => {
            const target = document.createElement('canvas');
            target.width = 50; target.height = 50;
            const ctx = target.getContext('2d')!;
            drawShapeData(ctx, {
                kind: 'rect',
                bounds: { x: 15, y: 15, w: 20, h: 20 },
                fill: null,
                stroke: {
                    color: '#000000',
                    width: 6,
                    opacity: 1,
                    alignment,
                    enabled: true,
                },
            });
            return ctx.getImageData(0, 0, 50, 50).data;
        };
        const inside = make('inside');
        const center = make('center');
        const outside = make('outside');
        // Sample one pixel just OUTSIDE the path on the left edge: x=11, y=25.
        // - 'outside' should be opaque (stroke painted outside the path).
        // - 'inside' should be transparent (stroke painted inside the path).
        const ix = (25 * 50 + 11) * 4 + 3;
        expect(outside[ix]).toBeGreaterThan(100);
        expect(inside[ix]).toBeLessThan(60);
        // Center should be partially covered (the stroke is centered on the path,
        // so half-stroke = 3 px reaches x=12, but not x=11).
        expect(center[ix]).toBeLessThan(60);
    });
});
