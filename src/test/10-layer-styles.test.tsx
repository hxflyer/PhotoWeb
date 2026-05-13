import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import App from '../App';
import { LayerStyleDialog } from '../components/Dialogs/LayerStyleDialog';
import { LayersPanel } from '../components/Panels/LayersPanel';
import { StylesPanel } from '../components/Panels/StylesPanel';
import { useEditorStore } from '../store/editorStore';
import { ensureStubsRegistered } from '../tools/stubs';

ensureStubsRegistered();

function resetLayers() {
    localStorage.clear();
    useEditorStore.getState().clearHistory();
    useEditorStore.getState().clearAllPresets();
    useEditorStore.setState((s) => ({
        ...s,
        layers: [],
        activeLayerId: null,
        selectedLayerIds: [],
        layerSelectionAnchorId: null,
        width: 80,
        height: 60,
        activeTool: 'move',
        copiedLayerStyle: null,
        dialogs: {
            ...s.dialogs,
            isNewLayerDialogOpen: false,
        },
    }));
    useEditorStore.getState().addLayer({ name: 'Base' });
    useEditorStore.getState().addLayer({ name: 'Type' });
    useEditorStore.getState().clearHistory();
}

describe('10 layer styles', () => {
    beforeEach(resetLayers);
    afterEach(cleanup);

    it('bottom Layers-panel fx button opens the effects menu and a chosen effect opens the dialog tab', () => {
        const id = useEditorStore.getState().activeLayerId!;
        const { getByTestId } = render(<LayersPanel />);

        fireEvent.click(getByTestId('layers-panel-fx-button'));
        expect(getByTestId('layer-context-fx-submenu')).toBeTruthy();

        fireEvent.click(getByTestId('layer-context-add-drop-shadow'));

        const layer = useEditorStore.getState().layers.find(l => l.id === id)!;
        expect(layer.effects.some(effect => effect.kind === 'drop-shadow')).toBe(true);
        expect(getByTestId('layer-style-dialog')).toBeTruthy();
        expect(getByTestId('layer-style-tab-drop-shadow').getAttribute('data-active')).toBe('true');
    });

    it('Background layers cannot receive layer effects through UI or store actions', () => {
        useEditorStore.getState().newDocument(80, 60, '#ffffff', 'Background Guard');
        const background = useEditorStore.getState().layers[0];
        const { getByTestId } = render(<LayersPanel />);

        expect((getByTestId('layers-panel-fx-button') as HTMLButtonElement).disabled).toBe(true);
        useEditorStore.getState().addLayerEffect(background.id, 'stroke');

        expect(useEditorStore.getState().layers[0].effects).toHaveLength(0);
    });

    it('Layer > Layer Style effect entries open the dialog and add the chosen effect', () => {
        const id = useEditorStore.getState().activeLayerId!;
        render(<App />);

        fireEvent.mouseDown(screen.getAllByText('Layer')[0]);
        fireEvent.mouseEnter(screen.getByText('Layer Style'));
        fireEvent.click(screen.getAllByText('Drop Shadow…')[0]);

        const layer = useEditorStore.getState().layers.find(l => l.id === id)!;
        expect(layer.effects.some(effect => effect.kind === 'drop-shadow')).toBe(true);
        expect(screen.getByTestId('layer-style-dialog')).toBeTruthy();
        expect(screen.getByTestId('layer-style-tab-drop-shadow').getAttribute('data-active')).toBe('true');
    });

    it('New Style saves a reusable style and the Styles panel applies it to another layer', () => {
        const sourceId = useEditorStore.getState().activeLayerId!;
        useEditorStore.getState().addLayerEffect(sourceId, 'stroke');
        useEditorStore.getState().setLayerEffectParams(sourceId, 0, { color: '#123456', size: 9 });
        useEditorStore.getState().setLayerBlendMode(sourceId, 'multiply');
        useEditorStore.getState().setLayerFill(sourceId, 0.35);

        const { getByTestId, unmount } = render(
            <LayerStyleDialog isOpen={true} layerId={sourceId} initialTab="blending" onClose={() => {}} />
        );
        fireEvent.click(getByTestId('layer-style-new-style'));
        fireEvent.change(getByTestId('new-style-name'), { target: { value: 'Frame Style' } });
        fireEvent.click(getByTestId('new-style-include-blending'));
        fireEvent.click(getByTestId('new-style-ok'));

        const preset = useEditorStore.getState().layerStylePresets.find(style => style.name === 'Frame Style');
        expect(preset).toBeTruthy();
        unmount();

        useEditorStore.getState().addLayer({ name: 'Target' });
        const targetId = useEditorStore.getState().activeLayerId!;
        const panel = render(<StylesPanel />);
        fireEvent.click(panel.getByTestId(`style-preset-${preset!.id}`));

        const target = useEditorStore.getState().layers.find(layer => layer.id === targetId)!;
        expect(target.effects).toHaveLength(1);
        expect(target.effects[0].kind).toBe('stroke');
        expect(target.effects[0].params.color).toBe('#123456');
        expect(target.effects[0].params.size).toBe(9);
        expect(target.blendMode).toBe('multiply');
        expect(target.fill).toBeCloseTo(0.35);

        fireEvent.click(panel.getByTestId('style-preset-none'));
        expect(useEditorStore.getState().layers.find(layer => layer.id === targetId)!.effects).toHaveLength(0);
    });
});
