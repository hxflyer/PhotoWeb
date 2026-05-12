import { describe, it, expect, beforeEach } from 'vitest';
import { cleanup, fireEvent, render } from '@testing-library/react';
import { useEditorStore } from '../store/editorStore';
import { ensureStubsRegistered } from '../tools/stubs';
import { addPath, clearPaths, type PathShape } from '../tools/pen';
import { fillActivePath } from '../tools/pathPaint';
import { FillPathDialog } from '../components/Dialogs/FillPathDialog';
import { layerPixelAt } from './simulator';

ensureStubsRegistered();

function reset() {
    useEditorStore.getState().clearHistory();
    useEditorStore.setState((s) => ({
        ...s,
        layers: [],
        activeLayerId: null,
        primaryColor: '#ff0000',
        secondaryColor: '#ffffff',
        width: 80,
        height: 80,
    }));
    useEditorStore.getState().addLayer();
    clearPaths();
}

function rectPath(): PathShape {
    return {
        id: 'rect',
        closed: true,
        anchors: [
            { x: 10, y: 10, type: 'corner' },
            { x: 70, y: 10, type: 'corner' },
            { x: 70, y: 70, type: 'corner' },
            { x: 10, y: 70, type: 'corner' },
        ],
    };
}

describe('Fill Path: Mode + Preserve Transparency', () => {
    beforeEach(() => { cleanup(); reset(); });

    it('filling with Multiply mode produces the expected blended pixel', () => {
        // Seed the layer with a known pixel (yellow: 255,255,0) inside the path.
        const layer = useEditorStore.getState().layers[0];
        layer.ctx.fillStyle = '#ffff00';
        layer.ctx.fillRect(0, 0, 80, 80);
        const beforeAlpha = layerPixelAt(layer, 40, 40).a;
        expect(beforeAlpha).toBe(255);

        addPath(rectPath());
        // Fill with red @ Multiply: yellow * red = (255*255/255, 255*0/255, 0)
        // -> (255, 0, 0).
        fillActivePath({ color: '#ff0000', opacity: 1, mode: 'multiply' });
        const inside = layerPixelAt(layer, 40, 40);
        expect(inside.r).toBe(255);
        expect(inside.g).toBe(0);
        expect(inside.b).toBe(0);

        // Pixels outside the rect path remain pure yellow (path didn't cover them).
        const outside = layerPixelAt(layer, 5, 5);
        expect(outside.r).toBe(255);
        expect(outside.g).toBe(255);
        expect(outside.b).toBe(0);
    });

    it('Preserve Transparency masks the fill to existing alpha', () => {
        // Seed only a small disk of opaque pixels on the layer.
        const layer = useEditorStore.getState().layers[0];
        layer.ctx.fillStyle = '#ffffff';
        layer.ctx.fillRect(30, 30, 20, 20);
        // Verify a pixel outside the disk is transparent.
        expect(layerPixelAt(layer, 5, 5).a).toBe(0);

        addPath(rectPath());
        fillActivePath({ color: '#ff0000', opacity: 1, mode: 'normal', preserveTransparency: true });

        // Inside the seeded disk: fill applied (red).
        const inside = layerPixelAt(layer, 40, 40);
        expect(inside.r).toBeGreaterThan(200);
        expect(inside.a).toBe(255);

        // Inside the path but outside the seeded disk: still transparent.
        const masked = layerPixelAt(layer, 15, 15);
        expect(masked.a).toBe(0);
    });

    it('dialog shows Mode dropdown and Preserve Transparency checkbox', () => {
        const { getByTestId } = render(<FillPathDialog open onClose={() => {}} />);
        const modeSelect = getByTestId('fill-path-mode-select') as HTMLSelectElement;
        const checkbox = getByTestId('fill-path-preserve-transparency') as HTMLInputElement;
        expect(modeSelect).toBeTruthy();
        expect(checkbox).toBeTruthy();
        // Mode list includes Multiply.
        expect(Array.from(modeSelect.options).map(o => o.value)).toContain('multiply');
    });

    it('clicking OK with Multiply mode + path commits the multiplied pixel', () => {
        const layer = useEditorStore.getState().layers[0];
        layer.ctx.fillStyle = '#ffff00';
        layer.ctx.fillRect(0, 0, 80, 80);
        addPath(rectPath());

        const { getByTestId } = render(<FillPathDialog open onClose={() => {}} />);
        fireEvent.change(getByTestId('fill-path-mode-select'), { target: { value: 'multiply' } });
        fireEvent.click(getByTestId('fill-path-ok'));

        const inside = layerPixelAt(layer, 40, 40);
        expect(inside.r).toBe(255);
        expect(inside.g).toBe(0);
        expect(inside.b).toBe(0);
    });
});
