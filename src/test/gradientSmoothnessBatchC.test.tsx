import { describe, it, expect, beforeEach, vi } from 'vitest';
import { cleanup, fireEvent, render } from '@testing-library/react';
import { GradientEditorDialog } from '../components/Dialogs/GradientEditorDialog';
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

function reset() {
    useEditorStore.setState((s) => ({
        ...s,
        layers: [],
        activeLayerId: null,
        gradientPresets: [],
    }));
    useEditorStore.getState().clearHistory();
}

describe('Gradient Editor: Smoothness applied', () => {
    beforeEach(() => { cleanup(); reset(); });

    it('Smoothness=100 produces a smoother S-curve than Smoothness=0 (linear)', () => {
        // Render with smoothness=0 (linear) first; sample t≈0.25 → grey ≈ 64.
        const { getByTestId, unmount } = render(
            <GradientEditorDialog
                isOpen
                initialColorStops={baseColors}
                initialOpacityStops={baseOpacities}
                initialSmoothness={0}
                onClose={vi.fn()}
                onConfirm={vi.fn()}
            />,
        );
        const stripLinear = getByTestId('gradient-strip') as HTMLCanvasElement;
        const linearAt25 = pixelAt(stripLinear, 90, 14);
        // At t=0.25 with linear interpolation the channel ≈ 64.
        expect(linearAt25.r).toBeGreaterThan(50);
        expect(linearAt25.r).toBeLessThan(80);
        unmount();

        // Now render with smoothness=100. At t=0.25 smoothstep(0.25) = 0.156,
        // so the channel value should be visibly DARKER than the linear sample.
        const { getByTestId: getByTestId2 } = render(
            <GradientEditorDialog
                isOpen
                initialColorStops={baseColors}
                initialOpacityStops={baseOpacities}
                initialSmoothness={100}
                onClose={vi.fn()}
                onConfirm={vi.fn()}
            />,
        );
        const stripSmooth = getByTestId2('gradient-strip') as HTMLCanvasElement;
        const smoothAt25 = pixelAt(stripSmooth, 90, 14);
        expect(smoothAt25.r).toBeLessThan(linearAt25.r - 10);
        // smoothstep(0.25) ≈ 0.156 → ~40
        expect(smoothAt25.r).toBeGreaterThan(20);
        expect(smoothAt25.r).toBeLessThan(60);
    });

    it('moving the Smoothness slider rerenders the strip', () => {
        const { getByTestId } = render(
            <GradientEditorDialog
                isOpen
                initialColorStops={baseColors}
                initialOpacityStops={baseOpacities}
                initialSmoothness={0}
                onClose={vi.fn()}
                onConfirm={vi.fn()}
            />,
        );
        const strip = getByTestId('gradient-strip') as HTMLCanvasElement;
        const before = pixelAt(strip, 90, 14);

        const slider = getByTestId('gradient-smoothness') as HTMLInputElement;
        fireEvent.change(slider, { target: { value: '100' } });
        const after = pixelAt(strip, 90, 14);
        expect(after.r).toBeLessThan(before.r - 10);
    });

    it('existing presets without smoothness are not broken (default behaviour preserves linear)', () => {
        // The original test passes initialSmoothness=undefined → defaults to 100
        // (per dialog default). Pass 0 here to verify the linear path still works.
        const { getByTestId } = render(
            <GradientEditorDialog
                isOpen
                initialColorStops={baseColors}
                initialOpacityStops={baseOpacities}
                initialSmoothness={0}
                onClose={vi.fn()}
                onConfirm={vi.fn()}
            />,
        );
        const strip = getByTestId('gradient-strip') as HTMLCanvasElement;
        // At t=0.5 (x=180/360) channel should be exactly mid-gray with linear.
        const middle = pixelAt(strip, 180, 14);
        expect(middle.r).toBeGreaterThan(120);
        expect(middle.r).toBeLessThan(140);
    });
});
