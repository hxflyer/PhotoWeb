import { describe, it, expect, beforeEach } from 'vitest';
import { cleanup, fireEvent, render } from '@testing-library/react';
import { useEditorStore } from '../store/editorStore';
import { ensureStubsRegistered } from '../tools/stubs';
import { addPath, clearPaths, type PathShape } from '../tools/pen';
import { strokeActivePath } from '../tools/pathPaint';
import { StrokePathDialog } from '../components/Dialogs/StrokePathDialog';
import { layerPixelAt } from './simulator';

ensureStubsRegistered();

function reset() {
    useEditorStore.getState().clearHistory();
    useEditorStore.setState((s) => ({
        ...s,
        layers: [],
        activeLayerId: null,
        primaryColor: '#00ff00',
        secondaryColor: '#ffffff',
        width: 200,
        height: 80,
        brushSettings: { size: 10, hardness: 1, opacity: 1, flow: 1 },
    }));
    useEditorStore.getState().addLayer();
    clearPaths();
}

function horizontalLinePath(): PathShape {
    // Open path from (20, 40) → (180, 40).
    return {
        id: 'h-line',
        closed: false,
        anchors: [
            { x: 20, y: 40, type: 'corner' },
            { x: 180, y: 40, type: 'corner' },
        ],
    };
}

describe('Stroke Path: Tool dropdown', () => {
    beforeEach(() => { cleanup(); reset(); });

    it('stroking with Eraser removes pixels along the path', () => {
        // Seed the layer fully red.
        const layer = useEditorStore.getState().layers[0];
        layer.ctx.fillStyle = '#ff0000';
        layer.ctx.fillRect(0, 0, 200, 80);
        expect(layerPixelAt(layer, 100, 40).a).toBe(255);

        addPath(horizontalLinePath());
        strokeActivePath({ size: 10, color: '#000000', opacity: 1, toolId: 'eraser' });

        // Center of stroke should now be transparent (alpha removed).
        const onLine = layerPixelAt(layer, 100, 40);
        expect(onLine.a).toBe(0);
        // Far from the line, pixels are still opaque red.
        const offLine = layerPixelAt(layer, 100, 5);
        expect(offLine.a).toBe(255);
        expect(offLine.r).toBe(255);
    });

    it('stroking with Brush paints pixels along the path in the chosen color', () => {
        addPath(horizontalLinePath());
        strokeActivePath({ size: 10, color: '#0000ff', opacity: 1, toolId: 'brush' });
        const layer = useEditorStore.getState().layers[0];
        const onLine = layerPixelAt(layer, 100, 40);
        expect(onLine.a).toBeGreaterThan(0);
        expect(onLine.b).toBeGreaterThan(200);
    });

    it('Simulate Pressure tapers the stroke width so endpoints are thinner', () => {
        addPath(horizontalLinePath());
        strokeActivePath({ size: 20, color: '#0000ff', opacity: 1, toolId: 'brush', simulatePressure: true });
        const layer = useEditorStore.getState().layers[0];
        // Middle of the path is at peak pressure → strong alpha at y=40.
        const middle = layerPixelAt(layer, 100, 40);
        expect(middle.a).toBeGreaterThan(200);
        // 4 px above the middle: should still be painted at peak pressure (size 20).
        const peakOffEdge = layerPixelAt(layer, 100, 36);
        expect(peakOffEdge.a).toBeGreaterThan(100);
        // Near an endpoint (size ~ small), 4 px above should be transparent.
        const endpointOffEdge = layerPixelAt(layer, 22, 36);
        expect(endpointOffEdge.a).toBe(0);
    });

    it('dialog shows Tool dropdown and Simulate Pressure checkbox', () => {
        const { getByTestId } = render(<StrokePathDialog open onClose={() => {}} />);
        const toolSelect = getByTestId('stroke-path-tool-select') as HTMLSelectElement;
        const sim = getByTestId('stroke-path-simulate-pressure') as HTMLInputElement;
        expect(toolSelect).toBeTruthy();
        expect(sim).toBeTruthy();
        const values = Array.from(toolSelect.options).map(o => o.value);
        expect(values).toContain('brush');
        expect(values).toContain('pencil');
        expect(values).toContain('eraser');
        expect(values).toContain('clone-stamp');
        expect(values).toContain('dodge');
        expect(values).toContain('burn');
        expect(values).toContain('sponge');
    });

    it('selecting Eraser in the dialog and clicking OK erases pixels along the path', () => {
        const layer = useEditorStore.getState().layers[0];
        layer.ctx.fillStyle = '#ff0000';
        layer.ctx.fillRect(0, 0, 200, 80);
        addPath(horizontalLinePath());

        const { getByTestId } = render(<StrokePathDialog open onClose={() => {}} />);
        fireEvent.change(getByTestId('stroke-path-tool-select'), { target: { value: 'eraser' } });
        fireEvent.click(getByTestId('stroke-path-ok'));

        expect(layerPixelAt(layer, 100, 40).a).toBe(0);
    });
});
