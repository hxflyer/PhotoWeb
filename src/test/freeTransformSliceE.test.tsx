import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { cleanup, render, fireEvent } from '@testing-library/react';
import { useEditorStore } from '../store/editorStore';
import { ensureStubsRegistered } from '../tools/stubs';
import { Layer } from '../core/Layer';
import { FreeTransformOverlay, type FreeTransformState } from '../components/Canvas/FreeTransformOverlay';

ensureStubsRegistered();

function setupLayerAndState(): FreeTransformState {
    const layer = new Layer(200, 200, 'L');
    layer.ctx.fillStyle = '#ff0000';
    layer.ctx.fillRect(50, 50, 100, 100);
    useEditorStore.setState(s => ({
        ...s,
        width: 200,
        height: 200,
        layers: [layer],
        activeLayerId: layer.id,
    }));
    const snapshot = layer.ctx.getImageData(0, 0, 200, 200);
    return {
        layerId: layer.id,
        snapshot,
        source: snapshot,
        sourceX: 0,
        sourceY: 0,
        x: 50,
        y: 50,
        width: 100,
        height: 100,
        rotation: 0,
        skewX: 0,
        skewY: 0,
    };
}

afterEach(() => cleanup());

describe('Slice E — Free Transform Shift/Alt + rotate-outside + rotate snap', () => {
    beforeEach(() => {
        useEditorStore.getState().clearHistory();
    });

    it('renders an outside-bbox rotate hit ring', () => {
        const state = setupLayerAndState();
        const { container } = render(
            <FreeTransformOverlay
                state={state}
                zoom={1}
                panX={0}
                panY={0}
                onCommit={() => {}}
                onCancel={() => {}}
            />
        );
        const ring = container.querySelector('[data-testid="ft-rotate-ring"]') as SVGRectElement;
        expect(ring).toBeTruthy();
        // Ring is centered on the bbox and ~24 px larger in each direction.
        const w = parseFloat(ring.getAttribute('width') ?? '0');
        const h = parseFloat(ring.getAttribute('height') ?? '0');
        // bbox is 100x100 at zoom 1, ring is 48 px larger per axis.
        expect(w).toBeCloseTo(148, 0);
        expect(h).toBeCloseTo(148, 0);
    });

    it('Shift on a corner drag constrains the aspect ratio', () => {
        const state = setupLayerAndState();
        const { container } = render(
            <FreeTransformOverlay state={state} zoom={1} panX={0} panY={0} onCommit={() => {}} onCancel={() => {}} />
        );
        // Find the SE handle. There are 8 handles + 1 ring + 1 transparent
        // pass-through + the actual dashed rect. The handles are 10x10
        // rects with fill="white".
        const seHandle = Array.from(container.querySelectorAll('rect'))
            .find(r => r.getAttribute('fill') === 'white'
                && parseFloat(r.getAttribute('x') ?? '0') > 100
                && parseFloat(r.getAttribute('y') ?? '0') > 100);
        expect(seHandle).toBeTruthy();
        // Mouse down on SE, drag mostly horizontal with shift held.
        fireEvent.mouseDown(seHandle!, { clientX: 150, clientY: 150 });
        fireEvent.mouseMove(window, { clientX: 250, clientY: 152, shiftKey: true });
        fireEvent.mouseUp(window);
        // After release, query the W and H inputs.
        const inputs = container.querySelectorAll('input[type="number"]');
        expect(inputs.length).toBeGreaterThanOrEqual(5);
        // inputs: [X, Y, W, H, °]
        const w = (inputs[2] as HTMLInputElement).value;
        const h = (inputs[3] as HTMLInputElement).value;
        // With Shift, the smaller change (Y) is replaced by the constrained
        // value so the aspect ratio stays 1:1. W ≈ H.
        expect(Math.abs(parseFloat(w) - parseFloat(h))).toBeLessThan(2);
    });

    it('Shift while rotating snaps angle to 15° increments', () => {
        const state = setupLayerAndState();
        const { container } = render(
            <FreeTransformOverlay state={state} zoom={1} panX={0} panY={0} onCommit={() => {}} onCancel={() => {}} />
        );
        // Click on the rotate ring's outer area (outside the bbox).
        const ring = container.querySelector('[data-testid="ft-rotate-ring"]') as SVGRectElement;
        // Center of bbox is at (100, 100). Ring spans (26..174, 26..174) in canvas coords.
        // Start rotation drag from above the bbox.
        fireEvent.mouseDown(ring, { clientX: 100, clientY: 26 });
        // Move to ~20° rotation from center.
        fireEvent.mouseMove(window, { clientX: 130, clientY: 26, shiftKey: true });
        fireEvent.mouseUp(window);
        const inputs = container.querySelectorAll('input[type="number"]');
        const rotation = parseFloat((inputs[4] as HTMLInputElement).value);
        // Snapped to a multiple of 15.
        expect(rotation % 15).toBeCloseTo(0, 1);
    });

    it('Alt-drag on a corner grows symmetrically about the center', () => {
        const state = setupLayerAndState();
        const { container } = render(
            <FreeTransformOverlay state={state} zoom={1} panX={0} panY={0} onCommit={() => {}} onCancel={() => {}} />
        );
        const seHandle = Array.from(container.querySelectorAll('rect'))
            .find(r => r.getAttribute('fill') === 'white'
                && parseFloat(r.getAttribute('x') ?? '0') > 100
                && parseFloat(r.getAttribute('y') ?? '0') > 100);
        expect(seHandle).toBeTruthy();
        fireEvent.mouseDown(seHandle!, { clientX: 150, clientY: 150 });
        fireEvent.mouseMove(window, { clientX: 160, clientY: 160, altKey: true });
        fireEvent.mouseUp(window);
        const inputs = container.querySelectorAll('input[type="number"]');
        const x = parseFloat((inputs[0] as HTMLInputElement).value);
        const y = parseFloat((inputs[1] as HTMLInputElement).value);
        const w = parseFloat((inputs[2] as HTMLInputElement).value);
        const h = parseFloat((inputs[3] as HTMLInputElement).value);
        // Center stays at (100,100): center = x + w/2 ≈ 100.
        expect(Math.abs((x + w / 2) - 100)).toBeLessThan(2);
        expect(Math.abs((y + h / 2) - 100)).toBeLessThan(2);
        // Width grew ~20 (10 px each side).
        expect(w).toBeGreaterThan(115);
    });
});
