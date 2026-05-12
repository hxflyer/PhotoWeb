import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { render, cleanup, fireEvent } from '@testing-library/react';
import { useEditorStore } from '../store/editorStore';
import { ensureStubsRegistered } from '../tools/stubs';
import { PropertiesPanel } from '../components/Panels/PropertiesPanel';

ensureStubsRegistered();

function resetWithMaskedLayer() {
    useEditorStore.getState().clearHistory();
    useEditorStore.setState((s) => ({
        ...s,
        layers: [],
        activeLayerId: null,
        width: 100,
        height: 100,
    }));
    const store = useEditorStore.getState();
    store.addLayer();
    const id = useEditorStore.getState().activeLayerId!;
    store.addLayerMask(id, 'reveal-all');
    return id;
}

describe('MaskSection buttons in PropertiesPanel', () => {
    beforeEach(() => {
        resetWithMaskedLayer();
    });
    afterEach(cleanup);

    it('renders Mask Edge / Color Range / Invert / Apply / Disable / Delete buttons when a mask is present', () => {
        const { getByTestId } = render(<PropertiesPanel />);
        expect(getByTestId('mask-section-edge')).toBeTruthy();
        expect(getByTestId('mask-section-color-range')).toBeTruthy();
        expect(getByTestId('mask-section-invert')).toBeTruthy();
        expect(getByTestId('mask-section-apply')).toBeTruthy();
        expect(getByTestId('mask-section-disable')).toBeTruthy();
        expect(getByTestId('mask-section-delete')).toBeTruthy();
    });

    it('clicking Mask Edge… opens RefineEdgeDialog and sets the mask as active edit target', () => {
        const { getByTestId } = render(<PropertiesPanel />);
        expect(useEditorStore.getState().dialogs.isRefineEdgeDialogOpen).toBe(false);
        fireEvent.click(getByTestId('mask-section-edge'));
        expect(useEditorStore.getState().dialogs.isRefineEdgeDialogOpen).toBe(true);
        expect(useEditorStore.getState().activeLayerEditTarget).toBe('mask');
    });

    it('clicking Color Range… opens ColorRangeDialog', () => {
        const { getByTestId } = render(<PropertiesPanel />);
        expect(useEditorStore.getState().dialogs.isColorRangeDialogOpen).toBe(false);
        fireEvent.click(getByTestId('mask-section-color-range'));
        expect(useEditorStore.getState().dialogs.isColorRangeDialogOpen).toBe(true);
    });

    it('clicking Invert inverts the mask pixels', () => {
        const id = useEditorStore.getState().activeLayerId!;
        const layer = useEditorStore.getState().layers.find(l => l.id === id)!;
        const before = layer.mask!.ctx.getImageData(0, 0, 1, 1).data[0];
        const { getByTestId } = render(<PropertiesPanel />);
        fireEvent.click(getByTestId('mask-section-invert'));
        const after = useEditorStore.getState().layers.find(l => l.id === id)!.mask!.ctx.getImageData(0, 0, 1, 1).data[0];
        expect(after).toBe(255 - before);
    });

    it('clicking Apply removes the mask and merges it into the layer', () => {
        const id = useEditorStore.getState().activeLayerId!;
        expect(useEditorStore.getState().layers.find(l => l.id === id)!.mask).toBeTruthy();
        const { getByTestId } = render(<PropertiesPanel />);
        fireEvent.click(getByTestId('mask-section-apply'));
        expect(useEditorStore.getState().layers.find(l => l.id === id)!.mask).toBeFalsy();
    });

    it('clicking Disable toggles mask.enabled', () => {
        const id = useEditorStore.getState().activeLayerId!;
        expect(useEditorStore.getState().layers.find(l => l.id === id)!.mask!.enabled).toBe(true);
        const { getByTestId } = render(<PropertiesPanel />);
        fireEvent.click(getByTestId('mask-section-disable'));
        expect(useEditorStore.getState().layers.find(l => l.id === id)!.mask!.enabled).toBe(false);
    });

    it('clicking Delete removes the mask entirely', () => {
        const id = useEditorStore.getState().activeLayerId!;
        expect(useEditorStore.getState().layers.find(l => l.id === id)!.mask).toBeTruthy();
        const { getByTestId } = render(<PropertiesPanel />);
        fireEvent.click(getByTestId('mask-section-delete'));
        expect(useEditorStore.getState().layers.find(l => l.id === id)!.mask).toBeFalsy();
    });
});
