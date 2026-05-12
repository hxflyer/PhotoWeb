import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { render, cleanup, fireEvent } from '@testing-library/react';
import { useEditorStore } from '../store/editorStore';
import { ensureStubsRegistered } from '../tools/stubs';
import { LayersPanel } from '../components/Panels/LayersPanel';
import { LayerStyleDialog } from '../components/Dialogs/LayerStyleDialog';

ensureStubsRegistered();

function resetWithLayer() {
    useEditorStore.getState().clearHistory();
    useEditorStore.setState((s) => ({
        ...s,
        layers: [],
        activeLayerId: null,
        selectedLayerIds: [],
        width: 100,
        height: 100,
    }));
    useEditorStore.getState().addLayer();
    return useEditorStore.getState().activeLayerId!;
}

describe('LayerStyleDialog (Batch F)', () => {
    afterEach(cleanup);
    beforeEach(resetWithLayer);

    it('does not render when isOpen=false', () => {
        const { queryByTestId } = render(
            <LayerStyleDialog isOpen={false} layerId={null} onClose={() => {}} />
        );
        expect(queryByTestId('layer-style-dialog')).toBeNull();
    });

    it('renders all tabs when open: Blending Options plus 10 effect tabs', () => {
        const id = useEditorStore.getState().activeLayerId!;
        const { getByTestId } = render(
            <LayerStyleDialog isOpen={true} layerId={id} onClose={() => {}} />
        );
        expect(getByTestId('layer-style-dialog')).toBeTruthy();
        expect(getByTestId('layer-style-tab-blending')).toBeTruthy();
        expect(getByTestId('layer-style-tab-bevel-emboss')).toBeTruthy();
        expect(getByTestId('layer-style-tab-stroke')).toBeTruthy();
        expect(getByTestId('layer-style-tab-inner-shadow')).toBeTruthy();
        expect(getByTestId('layer-style-tab-inner-glow')).toBeTruthy();
        expect(getByTestId('layer-style-tab-satin')).toBeTruthy();
        expect(getByTestId('layer-style-tab-color-overlay')).toBeTruthy();
        expect(getByTestId('layer-style-tab-gradient-overlay')).toBeTruthy();
        expect(getByTestId('layer-style-tab-pattern-overlay')).toBeTruthy();
        expect(getByTestId('layer-style-tab-outer-glow')).toBeTruthy();
        expect(getByTestId('layer-style-tab-drop-shadow')).toBeTruthy();
    });

    it('opens on initialTab and Blending Options tab shows blend mode + opacity + fill controls', () => {
        const id = useEditorStore.getState().activeLayerId!;
        const { getByTestId } = render(
            <LayerStyleDialog isOpen={true} layerId={id} initialTab="blending" onClose={() => {}} />
        );
        const blendingTab = getByTestId('layer-style-tab-blending');
        expect(blendingTab.getAttribute('data-active')).toBe('true');
        expect(getByTestId('layer-style-blend-mode')).toBeTruthy();
        expect(getByTestId('layer-style-fill-opacity')).toBeTruthy();
    });

    it('switches tab when a different one is clicked', () => {
        const id = useEditorStore.getState().activeLayerId!;
        const { getByTestId } = render(
            <LayerStyleDialog isOpen={true} layerId={id} initialTab="blending" onClose={() => {}} />
        );
        fireEvent.click(getByTestId('layer-style-tab-drop-shadow'));
        expect(getByTestId('layer-style-tab-drop-shadow').getAttribute('data-active')).toBe('true');
        expect(getByTestId('layer-style-tab-blending').getAttribute('data-active')).toBe('false');
    });

    it('shows "Add" button on a tab whose effect is not present, and adding wires the effect', () => {
        const id = useEditorStore.getState().activeLayerId!;
        const { getByTestId } = render(
            <LayerStyleDialog isOpen={true} layerId={id} initialTab="drop-shadow" onClose={() => {}} />
        );
        expect(useEditorStore.getState().layers.find(l => l.id === id)?.effects?.some(e => e.kind === 'drop-shadow')).toBeFalsy();
        fireEvent.click(getByTestId('layer-style-add-drop-shadow'));
        expect(useEditorStore.getState().layers.find(l => l.id === id)?.effects?.some(e => e.kind === 'drop-shadow')).toBe(true);
    });

    it('changes blend mode through the Blending Options tab and dispatches to the store', () => {
        const id = useEditorStore.getState().activeLayerId!;
        const { getByTestId } = render(
            <LayerStyleDialog isOpen={true} layerId={id} initialTab="blending" onClose={() => {}} />
        );
        const sel = getByTestId('layer-style-blend-mode') as HTMLSelectElement;
        fireEvent.change(sel, { target: { value: 'multiply' } });
        expect(useEditorStore.getState().layers.find(l => l.id === id)?.blendMode).toBe('multiply');
    });
});

describe('LayersPanel double-click thumbnail opens LayerStyleDialog (Batch F)', () => {
    beforeEach(resetWithLayer);
    afterEach(cleanup);

    it('double-clicking a layer thumbnail opens LayerStyleDialog focused on Blending Options', () => {
        const id = useEditorStore.getState().activeLayerId!;
        const { getByTestId, queryByTestId } = render(<LayersPanel />);
        expect(queryByTestId('layer-style-dialog')).toBeNull();
        const thumb = getByTestId(`layer-thumb-${id}`);
        fireEvent.doubleClick(thumb);
        expect(getByTestId('layer-style-dialog')).toBeTruthy();
        expect(getByTestId('layer-style-tab-blending').getAttribute('data-active')).toBe('true');
    });

    it('right-click Blending Options context menu also opens the dialog', () => {
        const id = useEditorStore.getState().activeLayerId!;
        const { getByTestId, queryByTestId } = render(<LayersPanel />);
        const row = getByTestId(`layer-row-${id}`);
        fireEvent.contextMenu(row);
        fireEvent.click(getByTestId('layer-context-blending-options'));
        expect(queryByTestId('layer-style-dialog')).not.toBeNull();
    });
});
