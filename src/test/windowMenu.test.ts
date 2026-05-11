import { describe, it, expect, beforeEach } from 'vitest';
import { useEditorStore } from '../store/editorStore';
import { ensureStubsRegistered } from '../tools/stubs';

ensureStubsRegistered();

function reset() {
    useEditorStore.setState(s => ({
        ...s,
        panelVisibility: {
            history: true, layers: true, channels: true, paths: true,
            color: true, swatches: true, adjustments: true,
            properties: true, character: true, paragraph: true,
            navigator: true, info: true, tools: true,
            'brush-presets': true, 'pattern-presets': true,
        },
    }));
}

describe('window menu panel toggles', () => {
    beforeEach(reset);

    it('togglePanelVisibility flips a panel and persists in localStorage', () => {
        useEditorStore.getState().togglePanelVisibility('layers');
        expect(useEditorStore.getState().panelVisibility.layers).toBe(false);
        useEditorStore.getState().togglePanelVisibility('layers');
        expect(useEditorStore.getState().panelVisibility.layers).toBe(true);
    });

    it('setPanelVisibility sets a panel directly', () => {
        useEditorStore.getState().setPanelVisibility('color', false);
        expect(useEditorStore.getState().panelVisibility.color).toBe(false);
        useEditorStore.getState().setPanelVisibility('color', true);
        expect(useEditorStore.getState().panelVisibility.color).toBe(true);
    });

    it('toggling one panel does not affect another', () => {
        useEditorStore.getState().togglePanelVisibility('layers');
        expect(useEditorStore.getState().panelVisibility.layers).toBe(false);
        expect(useEditorStore.getState().panelVisibility.history).toBe(true);
        expect(useEditorStore.getState().panelVisibility.color).toBe(true);
    });
});
