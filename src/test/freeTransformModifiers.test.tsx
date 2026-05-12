import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { cleanup, render, fireEvent } from '@testing-library/react';
import { useEditorStore } from '../store/editorStore';
import { ensureStubsRegistered } from '../tools/stubs';
import { Layer } from '../core/Layer';
import { FreeTransformOverlay, type FreeTransformState } from '../components/Canvas/FreeTransformOverlay';
import { drawQuadWarp } from '../utils/quadWarp';

ensureStubsRegistered();

function setupLayerAndState(): FreeTransformState {
    const layer = new Layer(200, 200, 'L');
    layer.ctx.fillStyle = '#ff0000';
    layer.ctx.fillRect(50, 50, 100, 100);
    useEditorStore.setState(s => ({
        ...s,
        width: 200, height: 200,
        layers: [layer], activeLayerId: layer.id,
    }));
    const snapshot = layer.ctx.getImageData(0, 0, 200, 200);
    return {
        layerId: layer.id, snapshot, source: snapshot,
        sourceX: 0, sourceY: 0,
        x: 50, y: 50, width: 100, height: 100,
        rotation: 0, skewX: 0, skewY: 0,
    };
}

afterEach(() => cleanup());

describe('FreeTransform modifier-driven distort/skew/perspective', () => {
    beforeEach(() => {
        useEditorStore.getState().clearHistory();
    });

    it('Cmd-drag on a corner enters distort mode and moves only that corner', () => {
        const state = setupLayerAndState();
        const { container } = render(<FreeTransformOverlay state={state} zoom={1} panX={0} panY={0} onCommit={() => {}} onCancel={() => {}} />);
        const seHandle = Array.from(container.querySelectorAll('rect'))
            .find(r => r.getAttribute('fill') === 'white'
                && parseFloat(r.getAttribute('x') ?? '0') > 100
                && parseFloat(r.getAttribute('y') ?? '0') > 100);
        expect(seHandle).toBeTruthy();
        // Cmd-mousedown on SE.
        fireEvent.mouseDown(seHandle!, { clientX: 150, clientY: 150, metaKey: true });
        fireEvent.mouseMove(window, { clientX: 180, clientY: 160, metaKey: true });
        fireEvent.mouseUp(window);
        // Bbox W/H should NOT have grown (distort doesn't change bbox).
        const inputs = container.querySelectorAll('input[type="number"]');
        const w = parseFloat((inputs[2] as HTMLInputElement).value);
        const h = parseFloat((inputs[3] as HTMLInputElement).value);
        expect(w).toBeCloseTo(100, 0);
        expect(h).toBeCloseTo(100, 0);
        // The SE handle should have moved — find a white rect near the new
        // distorted SE position (~180, ~160).
        const handlesAfter = Array.from(container.querySelectorAll('rect'))
            .filter(r => r.getAttribute('fill') === 'white');
        const movedSE = handlesAfter.find(r => {
            const rx = parseFloat(r.getAttribute('x') ?? '0');
            const ry = parseFloat(r.getAttribute('y') ?? '0');
            return rx > 170 && rx < 190 && ry > 150 && ry < 170;
        });
        expect(movedSE).toBeTruthy();
    });

    it('Cmd+Shift-drag on a side enters skew mode and moves both endpoints of that side', () => {
        const state = setupLayerAndState();
        const { container } = render(<FreeTransformOverlay state={state} zoom={1} panX={0} panY={0} onCommit={() => {}} onCancel={() => {}} />);
        // Find the 'n' side handle (top-center): around (sx + sw/2, sy) = (100, 50).
        const nHandle = Array.from(container.querySelectorAll('rect'))
            .find(r => r.getAttribute('fill') === 'white'
                && Math.abs(parseFloat(r.getAttribute('x') ?? '0') - 95) < 6
                && Math.abs(parseFloat(r.getAttribute('y') ?? '0') - 45) < 6);
        expect(nHandle).toBeTruthy();
        fireEvent.mouseDown(nHandle!, { clientX: 100, clientY: 50, metaKey: true, shiftKey: true });
        fireEvent.mouseMove(window, { clientX: 130, clientY: 50, metaKey: true, shiftKey: true });
        fireEvent.mouseUp(window);
        // After skew, the top edge corners NW and NE should have both shifted
        // right by ~30 px. Find the two white-fill rects on the now-skewed top.
        const handlesAfter = Array.from(container.querySelectorAll('rect'))
            .filter(r => r.getAttribute('fill') === 'white');
        const xs = handlesAfter
            .filter(r => Math.abs(parseFloat(r.getAttribute('y') ?? '999') - 45) < 6)
            .map(r => parseFloat(r.getAttribute('x') ?? '0'));
        // Both corner handles should be roughly +30 from their original
        // x (NW was at 45, NE at 145 → after skew 75, 175).
        expect(xs.some(x => Math.abs(x - 75) < 4)).toBe(true);
        expect(xs.some(x => Math.abs(x - 175) < 4)).toBe(true);
    });

    it('Cmd+Alt+Shift-drag on a corner enters perspective mode and mirrors the adjacent corner', () => {
        const state = setupLayerAndState();
        const { container } = render(<FreeTransformOverlay state={state} zoom={1} panX={0} panY={0} onCommit={() => {}} onCancel={() => {}} />);
        const neHandle = Array.from(container.querySelectorAll('rect'))
            .find(r => r.getAttribute('fill') === 'white'
                && parseFloat(r.getAttribute('x') ?? '0') > 100
                && parseFloat(r.getAttribute('y') ?? '0') < 60);
        expect(neHandle).toBeTruthy();
        fireEvent.mouseDown(neHandle!, { clientX: 150, clientY: 50, metaKey: true, altKey: true, shiftKey: true });
        fireEvent.mouseMove(window, { clientX: 170, clientY: 50, metaKey: true, altKey: true, shiftKey: true });
        fireEvent.mouseUp(window);
        // NE moved +20 right; NW should have mirrored -20 left (from 50 to 30).
        const handlesAfter = Array.from(container.querySelectorAll('rect'))
            .filter(r => r.getAttribute('fill') === 'white');
        const xs = handlesAfter
            .filter(r => Math.abs(parseFloat(r.getAttribute('y') ?? '999') - 45) < 6)
            .map(r => parseFloat(r.getAttribute('x') ?? '0'));
        // NE around 170, NW around 30. Allow some tolerance.
        expect(xs.some(x => Math.abs(x - 165) < 8)).toBe(true);
        expect(xs.some(x => Math.abs(x - 25) < 8)).toBe(true);
    });

    it('drawQuadWarp paints a non-rectangular source quad onto the destination canvas', () => {
        // 4x4 red source, mapped to a parallelogram should still paint red somewhere.
        const src = document.createElement('canvas');
        src.width = 4; src.height = 4;
        const sctx = src.getContext('2d')!;
        sctx.fillStyle = '#ff0000';
        sctx.fillRect(0, 0, 4, 4);

        const dest = document.createElement('canvas');
        dest.width = 16; dest.height = 16;
        const dctx = dest.getContext('2d')!;
        dctx.clearRect(0, 0, 16, 16);
        drawQuadWarp(dctx, src, {
            nw: { x: 4, y: 4 },
            ne: { x: 12, y: 4 },
            se: { x: 14, y: 12 },  // perspective-style: SE bowed out
            sw: { x: 2, y: 12 },
        });
        // Center of the quad should be red.
        const p = dctx.getImageData(8, 8, 1, 1).data;
        expect(p[0]).toBeGreaterThan(200);
        expect(p[3]).toBeGreaterThan(200);
    });
});
