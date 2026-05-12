import { describe, it, expect, beforeEach, vi } from 'vitest';
import { cleanup, fireEvent, render } from '@testing-library/react';
import { GradientEditorDialog, type GradientEditorResult } from '../components/Dialogs/GradientEditorDialog';
import { useEditorStore } from '../store/editorStore';
import { ensureStubsRegistered } from '../tools/stubs';
import type { GradientColorStop, GradientOpacityStop } from '../store/types';
import { pixelAt } from './simulator';

ensureStubsRegistered();

const baseColors: GradientColorStop[] = [
    { position: 0, color: '#000000' },
    { position: 1, color: '#ffffff' },
];
const baseOpacities: GradientOpacityStop[] = [
    { position: 0, opacity: 1 },
    { position: 1, opacity: 1 },
];

function mockBoundingRect(el: HTMLElement, width: number) {
    el.getBoundingClientRect = () => ({
        left: 0, top: 0, right: width, bottom: 18, width, height: 18, x: 0, y: 0, toJSON: () => ({}),
    });
}

function reset() {
    useEditorStore.setState((s) => ({
        ...s,
        layers: [],
        activeLayerId: null,
        gradientPresets: [],
        width: 200, height: 100,
    }));
    useEditorStore.getState().clearHistory();
}

describe('Gradient Editor: midpoint diamonds', () => {
    beforeEach(() => { cleanup(); reset(); });

    it('renders a midpoint diamond between each adjacent pair of color stops', () => {
        const { getByTestId } = render(
            <GradientEditorDialog
                isOpen
                initialColorStops={baseColors}
                initialOpacityStops={baseOpacities}
                onClose={vi.fn()}
                onConfirm={vi.fn()}
            />,
        );
        // 2 stops => 1 midpoint.
        expect(getByTestId('gradient-color-midpoint-0')).toBeTruthy();
        expect(getByTestId('gradient-opacity-midpoint-0')).toBeTruthy();
    });

    it('dragging the color midpoint right shifts the gradient strip pixel toward the dark stop', () => {
        const onConfirm = vi.fn();
        const { getByTestId } = render(
            <GradientEditorDialog
                isOpen
                initialColorStops={baseColors}
                initialOpacityStops={baseOpacities}
                onClose={vi.fn()}
                onConfirm={onConfirm}
            />,
        );
        const strip = getByTestId('gradient-strip') as HTMLCanvasElement;
        // Baseline: at x=180 of a 360-wide strip (t=0.5) the linear gradient
        // between #000 and #fff renders ~middle grey.
        const before = pixelAt(strip, 180, 14);
        expect(before.r).toBeGreaterThan(100);
        expect(before.r).toBeLessThan(180);

        // Drag the diamond from 50% to 75% — pushes the transition toward
        // the high stop, so x=180 (gradient t=0.5) should be DARKER.
        const row = getByTestId('gradient-color-row') as HTMLDivElement;
        mockBoundingRect(row, 360);
        const diamond = getByTestId('gradient-color-midpoint-0') as HTMLDivElement;
        fireEvent.pointerDown(diamond, { clientX: 180, clientY: 8, pointerId: 1 });
        fireEvent.pointerMove(diamond, { clientX: 270, clientY: 8, pointerId: 1 });
        fireEvent.pointerUp(diamond, { clientX: 270, clientY: 8, pointerId: 1 });

        const after = pixelAt(strip, 180, 14);
        expect(after.r).toBeLessThan(before.r - 20);

        fireEvent.click(getByTestId('gradient-editor-ok'));
        const result: GradientEditorResult = onConfirm.mock.calls[0][0];
        // The first color stop's midpointToNext should now be ~0.75.
        const lo = result.colorStops.find(s => s.position === 0)!;
        expect(lo.midpointToNext).toBeGreaterThan(0.7);
        expect(lo.midpointToNext).toBeLessThan(0.8);
    });
});
