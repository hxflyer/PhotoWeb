import { describe, it, expect, beforeEach } from 'vitest';
import { cleanup, fireEvent, render } from '@testing-library/react';
import { useEditorStore } from '../store/editorStore';
import { ensureStubsRegistered } from '../tools/stubs';
import { PropertiesPanel } from '../components/Panels/PropertiesPanel';
import { Layer } from '../core/Layer';
import { commitTypeLayer, defaultTextStyle, type TypeLayerData } from '../tools/type';

ensureStubsRegistered();

function reset() {
    useEditorStore.setState((s) => ({
        ...s,
        layers: [],
        activeLayerId: null,
        width: 200,
        height: 200,
    }));
    useEditorStore.getState().clearHistory();
}

describe('properties panel', () => {
    beforeEach(reset);
    beforeEach(cleanup);

    it('shows the empty state when no layer is selected', () => {
        const { getByText } = render(<PropertiesPanel />);
        expect(getByText(/no layer selected/i)).toBeTruthy();
    });

    it('shows raster properties for a raster layer', () => {
        useEditorStore.getState().addLayer();
        const { getAllByDisplayValue } = render(<PropertiesPanel />);
        const layer = useEditorStore.getState().layers[0];
        expect(getAllByDisplayValue(layer.name).length).toBeGreaterThan(0);
    });

    it('switching to an adjustment layer renders adjustment params', () => {
        useEditorStore.getState().addLayer();
        useEditorStore.getState().addAdjustmentLayer('brightness-contrast');
        const { container } = render(<PropertiesPanel />);
        // The adjustment label appears in the section header.
        expect(container.textContent).toMatch(/Adjustment/i);
    });

    it('changing adjustment params writes through to the layer', () => {
        useEditorStore.getState().addLayer();
        useEditorStore.getState().addAdjustmentLayer('brightness-contrast', { brightness: 0 });
        const { activeLayerId } = useEditorStore.getState();
        useEditorStore.getState().setLayerAdjustmentParams(activeLayerId!, { brightness: 25 });
        const layer = useEditorStore.getState().layers.find(l => l.id === activeLayerId);
        const adj = (layer as unknown as { adjustment?: { params: Record<string, unknown> } }).adjustment;
        expect(adj?.params.brightness).toBe(25);
    });

    it('mask density and feather updates persist to the layer mask', () => {
        useEditorStore.getState().addLayer();
        const { activeLayerId } = useEditorStore.getState();
        useEditorStore.getState().addLayerMask(activeLayerId!, 'reveal-all');
        useEditorStore.getState().setLayerMaskDensity(activeLayerId!, 0.5);
        useEditorStore.getState().setLayerMaskFeather(activeLayerId!, 12);
        const layer = useEditorStore.getState().layers.find(l => l.id === activeLayerId);
        expect(layer?.mask?.density).toBe(0.5);
        expect(layer?.mask?.feather).toBe(12);
    });

    it('fill layer data update repaints the canvas', () => {
        useEditorStore.getState().addFillLayer({ kind: 'solid-color', color: '#ff0000' });
        const { activeLayerId } = useEditorStore.getState();
        useEditorStore.getState().setLayerFillData(activeLayerId!, { kind: 'solid-color', color: '#00ff00' });
        const layer = useEditorStore.getState().layers.find(l => l.id === activeLayerId)!;
        const px = layer.ctx.getImageData(10, 10, 1, 1).data;
        expect(px[0]).toBe(0);
        expect(px[1]).toBe(255);
    });

    it('shows and edits selected type layer basics', () => {
        const layer = new Layer(200, 120, 'Type layer', 'type');
        const typeData: TypeLayerData = {
            id: 'type-props',
            text: 'Original',
            style: { ...defaultTextStyle, fontFamily: 'Arial', fontSize: 24, color: '#ff0000', textAlign: 'left' },
            orientation: 'horizontal',
            transform: { x: 20, y: 30, width: 160, height: 60, rotation: 0 },
            textMode: 'box',
            targetLayerId: layer.id,
        };
        commitTypeLayer(layer.canvas, typeData);
        layer.typeData = typeData;
        useEditorStore.setState(s => ({
            ...s,
            layers: [layer],
            activeLayerId: layer.id,
        }));

        const { getByTestId } = render(<PropertiesPanel />);
        fireEvent.change(getByTestId('properties-type-text'), { target: { value: 'Updated' } });
        fireEvent.change(getByTestId('properties-type-size'), { target: { value: '36' } });
        fireEvent.change(getByTestId('properties-type-color'), { target: { value: '#00ff00' } });
        fireEvent.change(getByTestId('properties-type-align'), { target: { value: 'center' } });
        fireEvent.change(getByTestId('properties-type-orientation'), { target: { value: 'vertical' } });

        const updated = layer.typeData as TypeLayerData;
        expect(updated.text).toBe('Updated');
        expect(updated.style.fontSize).toBe(36);
        expect(updated.style.color).toBe('#00ff00');
        expect(updated.style.textAlign).toBe('center');
        expect(updated.orientation).toBe('vertical');
    });
});
