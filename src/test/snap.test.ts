import { createElement } from 'react';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { Layer } from '../core/Layer';
import { useEditorStore } from '../store/editorStore';
import { ensureStubsRegistered } from '../tools/stubs';
import { getTool } from '../tools/registry';
import { buildSnapCandidates, snapPoint, type SnapTarget } from '../tools/snap';
import { makeToolPointerEvent } from './simulator';

function resetStore(width = 200, height = 200): void {
    useEditorStore.setState(s => ({
        ...s,
        width,
        height,
        layers: [],
        activeLayerId: null,
        guides: [],
        showGuides: true,
        showGrid: false,
        gridSize: 10,
        snapEnabled: false,
        activeSnapTargets: null,
        selection: {
            ...s.selection,
            hasSelection: false,
            path: [],
            operations: [],
            polyPoints: [],
            isDraggingSelection: false,
        },
    }));
    useEditorStore.getState().clearHistory();
}

describe('snapPoint', () => {
    it('snaps the x-coordinate to the nearest candidate inside hysteresis', () => {
        const candidates: SnapTarget[] = [
            { axis: 'x', value: 100, source: 'guide' },
            { axis: 'x', value: 200, source: 'guide' },
        ];
        const result = snapPoint({ x: 102, y: 50 }, candidates, 6);
        expect(result.x).toBe(100);
        expect(result.y).toBe(50);
        expect(result.xSnap).toEqual({ axis: 'x', value: 100, source: 'guide' });
        expect(result.ySnap).toBeUndefined();
    });

    it('returns the unsnapped point when the closest candidate is outside hysteresis', () => {
        const candidates: SnapTarget[] = [
            { axis: 'x', value: 100, source: 'guide' },
        ];
        const result = snapPoint({ x: 110, y: 50 }, candidates, 6);
        expect(result.x).toBe(110);
        expect(result.y).toBe(50);
        expect(result.xSnap).toBeUndefined();
        expect(result.ySnap).toBeUndefined();
    });

    it('picks the nearest candidate when several are within hysteresis', () => {
        const candidates: SnapTarget[] = [
            { axis: 'x', value: 100, source: 'guide' },
            { axis: 'x', value: 104, source: 'grid' },
        ];
        const result = snapPoint({ x: 103, y: 50 }, candidates, 6);
        expect(result.x).toBe(104);
        expect(result.xSnap?.value).toBe(104);
    });

    it('snaps both axes independently', () => {
        const candidates: SnapTarget[] = [
            { axis: 'x', value: 50, source: 'document' },
            { axis: 'y', value: 75, source: 'guide' },
        ];
        const result = snapPoint({ x: 48, y: 77 }, candidates, 6);
        expect(result.x).toBe(50);
        expect(result.y).toBe(75);
        expect(result.xSnap?.source).toBe('document');
        expect(result.ySnap?.source).toBe('guide');
    });
});

describe('buildSnapCandidates', () => {
    beforeEach(() => {
        resetStore(300, 200);
    });

    it('always emits document bounds and midpoints', () => {
        const cands = buildSnapCandidates(useEditorStore.getState());
        const xs = cands.filter(c => c.axis === 'x' && c.source === 'document').map(c => c.value).sort((a, b) => a - b);
        const ys = cands.filter(c => c.axis === 'y' && c.source === 'document').map(c => c.value).sort((a, b) => a - b);
        expect(xs).toEqual([0, 150, 300]);
        expect(ys).toEqual([0, 100, 200]);
    });

    it('adds grid candidates only when showGrid + snapEnabled', () => {
        const baseline = buildSnapCandidates(useEditorStore.getState()).filter(c => c.source === 'grid');
        expect(baseline).toHaveLength(0);

        useEditorStore.setState(s => ({ ...s, snapEnabled: true, showGrid: true, gridSize: 50 }));
        const withGrid = buildSnapCandidates(useEditorStore.getState()).filter(c => c.source === 'grid');
        const xs = withGrid.filter(c => c.axis === 'x').map(c => c.value).sort((a, b) => a - b);
        const ys = withGrid.filter(c => c.axis === 'y').map(c => c.value).sort((a, b) => a - b);
        expect(xs).toEqual([0, 50, 100, 150, 200, 250, 300]);
        expect(ys).toEqual([0, 50, 100, 150, 200]);
    });

    it('adds guide candidates only when showGuides + snapEnabled', () => {
        useEditorStore.setState(s => ({
            ...s,
            guides: [{ orientation: 'vertical', position: 60 }, { orientation: 'horizontal', position: 80 }],
        }));
        const without = buildSnapCandidates(useEditorStore.getState()).filter(c => c.source === 'guide');
        expect(without).toHaveLength(0);

        useEditorStore.setState(s => ({ ...s, snapEnabled: true }));
        const cands = buildSnapCandidates(useEditorStore.getState()).filter(c => c.source === 'guide');
        expect(cands).toEqual(expect.arrayContaining([
            { axis: 'x', value: 60, source: 'guide' },
            { axis: 'y', value: 80, source: 'guide' },
        ]));
    });

    it('emits layer-edge and layer-center candidates for visible non-active layers', () => {
        const docked = new Layer(300, 200, 'Other');
        docked.ctx.fillStyle = '#ff0000';
        docked.ctx.fillRect(40, 30, 60, 40);
        const active = new Layer(300, 200, 'Active');
        useEditorStore.setState(s => ({
            ...s,
            layers: [docked, active],
            activeLayerId: active.id,
        }));
        const cands = buildSnapCandidates(useEditorStore.getState());
        const edges = cands.filter(c => c.source === 'layer-edge');
        const centers = cands.filter(c => c.source === 'layer-center');
        const edgeXs = edges.filter(c => c.axis === 'x').map(c => c.value).sort((a, b) => a - b);
        const edgeYs = edges.filter(c => c.axis === 'y').map(c => c.value).sort((a, b) => a - b);
        // Layer fills 60x40 starting at (40,30) -> right edge inclusive of last drawn pixel column.
        expect(edgeXs[0]).toBe(40);
        expect(edgeXs[edgeXs.length - 1]).toBeGreaterThanOrEqual(99);
        expect(edgeYs[0]).toBe(30);
        expect(edgeYs[edgeYs.length - 1]).toBeGreaterThanOrEqual(69);
        expect(centers).toHaveLength(2);
    });
});

describe('move tool snap integration', () => {
    beforeEach(() => {
        ensureStubsRegistered();
        resetStore(200, 200);
    });

    it('snaps the active-layer drag to a vertical guide when snapEnabled', () => {
        const layer = new Layer(200, 200, 'Mover');
        layer.ctx.fillStyle = '#00ff00';
        layer.ctx.fillRect(10, 10, 20, 20);
        useEditorStore.setState(s => ({
            ...s,
            layers: [layer],
            activeLayerId: layer.id,
            // Guide at x=70 (not on a document midpoint) so the snap target
            // is unambiguously the guide.
            guides: [{ orientation: 'vertical', position: 70 }],
            snapEnabled: true,
            showGuides: true,
        }));

        const move = getTool('move')!;
        const requestRender = vi.fn();
        const ctx = { store: useEditorStore.getState(), getStore: () => useEditorStore.getState(), requestRender };
        move.onPointerDown!(makeToolPointerEvent({ canvasX: 15, canvasY: 15 }), ctx);
        // Layer left edge is at x=10; drag by +58 brings left to x=68, within
        // hysteresis of guide x=70.
        move.onPointerMove!(makeToolPointerEvent({ canvasX: 73, canvasY: 15 }), ctx);
        const targets = useEditorStore.getState().activeSnapTargets;
        expect(targets).toBeTruthy();
        expect(targets!.some(t => t.axis === 'x' && t.value === 70 && t.source === 'guide')).toBe(true);
        move.onPointerUp!(makeToolPointerEvent({ canvasX: 73, canvasY: 15 }), ctx);
        expect(useEditorStore.getState().activeSnapTargets).toBeNull();
    });

    it('does not snap to the guide when snapEnabled is off', () => {
        const layer = new Layer(200, 200, 'Mover');
        layer.ctx.fillStyle = '#00ff00';
        layer.ctx.fillRect(10, 10, 20, 20);
        useEditorStore.setState(s => ({
            ...s,
            layers: [layer],
            activeLayerId: layer.id,
            guides: [{ orientation: 'vertical', position: 100 }],
            snapEnabled: false,
            showGuides: true,
        }));

        const move = getTool('move')!;
        const requestRender = vi.fn();
        const ctx = { store: useEditorStore.getState(), getStore: () => useEditorStore.getState(), requestRender };
        move.onPointerDown!(makeToolPointerEvent({ canvasX: 15, canvasY: 15 }), ctx);
        move.onPointerMove!(makeToolPointerEvent({ canvasX: 103, canvasY: 15 }), ctx);
        expect(useEditorStore.getState().activeSnapTargets).toBeNull();
        move.onPointerUp!(makeToolPointerEvent({ canvasX: 103, canvasY: 15 }), ctx);
    });

    it('clears activeSnapTargets on pointer-up', () => {
        useEditorStore.getState().setActiveSnapTargets([{ axis: 'x', value: 50, source: 'document' }]);
        expect(useEditorStore.getState().activeSnapTargets).toHaveLength(1);

        const layer = new Layer(200, 200, 'Mover');
        layer.ctx.fillStyle = '#00ff00';
        layer.ctx.fillRect(10, 10, 20, 20);
        useEditorStore.setState(s => ({
            ...s,
            layers: [layer],
            activeLayerId: layer.id,
            snapEnabled: true,
        }));
        const move = getTool('move')!;
        const ctx = { store: useEditorStore.getState(), getStore: () => useEditorStore.getState(), requestRender: vi.fn() };
        move.onPointerDown!(makeToolPointerEvent({ canvasX: 15, canvasY: 15 }), ctx);
        move.onPointerMove!(makeToolPointerEvent({ canvasX: 20, canvasY: 18 }), ctx);
        move.onPointerUp!(makeToolPointerEvent({ canvasX: 20, canvasY: 18 }), ctx);
        expect(useEditorStore.getState().activeSnapTargets).toBeNull();
    });
});

describe('viewSlice activeSnapTargets', () => {
    beforeEach(() => resetStore());

    it('setter updates the slice and round-trips back to null', () => {
        const target: SnapTarget = { axis: 'y', value: 25, source: 'guide' };
        useEditorStore.getState().setActiveSnapTargets([target]);
        expect(useEditorStore.getState().activeSnapTargets).toEqual([target]);
        useEditorStore.getState().setActiveSnapTargets(null);
        expect(useEditorStore.getState().activeSnapTargets).toBeNull();
    });
});

describe('Viewport smart-guide overlay', () => {
    beforeEach(() => resetStore(80, 60));

    it('draws magenta dashed lines for each active snap target', async () => {
        const { render, cleanup } = await import('@testing-library/react');
        const { Viewport } = await import('../components/Canvas/Viewport');
        cleanup();
        const layer = new Layer(80, 60, 'Bg');
        layer.ctx.fillStyle = '#222';
        layer.ctx.fillRect(0, 0, 80, 60);
        useEditorStore.setState(s => ({
            ...s,
            layers: [layer],
            activeLayerId: layer.id,
            activeSnapTargets: [
                { axis: 'x', value: 40, source: 'guide' },
                { axis: 'y', value: 30, source: 'guide' },
            ],
        }));
        const { container } = render(createElement(Viewport));
        // The main composited canvas is the first canvas inside the viewport.
        const canvas = container.querySelector('canvas') as HTMLCanvasElement | null;
        expect(canvas).toBeTruthy();
        const ctx = canvas!.getContext('2d')!;
        // Scan the canvas for a magenta-ish pixel — the dashed smart-guide
        // line is anti-aliased and blended over the dark background, so the
        // exact RGB lands around (145, 17, 145). Look for R≫G and B≫G.
        const img = ctx.getImageData(0, 0, canvas!.width, canvas!.height).data;
        let magentaFound = false;
        for (let i = 0; i < img.length; i += 4) {
            const r = img[i];
            const g = img[i + 1];
            const b = img[i + 2];
            if (r >= 120 && b >= 120 && g <= 60 && r > g + 80 && b > g + 80) {
                magentaFound = true;
                break;
            }
        }
        expect(magentaFound).toBe(true);
    });
});
