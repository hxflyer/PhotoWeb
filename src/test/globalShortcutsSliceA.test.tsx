import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { render, cleanup, fireEvent } from '@testing-library/react';
import { useEditorStore } from '../store/editorStore';
import { ensureStubsRegistered } from '../tools/stubs';
import App from '../App';
import { runScript } from './simulator';

ensureStubsRegistered();

function reset() {
    useEditorStore.getState().clearHistory();
    useEditorStore.setState((s) => ({
        ...s,
        layers: [],
        activeLayerId: null,
        selectedLayerIds: [],
        layerSelectionAnchorId: null,
        activeTool: 'brush',
        width: 200,
        height: 200,
        zoom: 0.5,
    }));
    useEditorStore.getState().addLayer();
}

afterEach(() => cleanup());

describe('Slice A — global keyboard shortcuts', () => {
    beforeEach(reset);

    it('Cmd+1 sets zoom to 100%', async () => {
        render(<App />);
        await runScript([{ type: 'keyDown', key: '1', modifiers: { meta: true } }]);
        expect(useEditorStore.getState().zoom).toBe(1);
    });

    it('Cmd+J without selection duplicates the active layer', async () => {
        render(<App />);
        const before = useEditorStore.getState().layers.length;
        await runScript([{ type: 'keyDown', key: 'j', modifiers: { meta: true } }]);
        expect(useEditorStore.getState().layers.length).toBe(before + 1);
    });

    it('Cmd+G with one layer wraps it into a new group', async () => {
        render(<App />);
        useEditorStore.getState().addLayer();
        const layerCount = useEditorStore.getState().layers.length;
        await runScript([{ type: 'keyDown', key: 'g', modifiers: { meta: true } }]);
        const layers = useEditorStore.getState().layers;
        expect(layers.length).toBe(layerCount + 1);
        expect(layers.some(l => l.kind === 'group')).toBe(true);
    });

    it('Cmd+Shift+G ungroups the active group', async () => {
        render(<App />);
        useEditorStore.getState().createLayerGroup('G1');
        const group = useEditorStore.getState().layers.find(l => l.kind === 'group')!;
        useEditorStore.getState().setActiveLayer(group.id);
        await runScript([{ type: 'keyDown', key: 'g', modifiers: { meta: true, shift: true } }]);
        expect(useEditorStore.getState().layers.some(l => l.id === group.id)).toBe(false);
    });

    it('Cmd+Shift+Alt+E stamps visible into a new layer', async () => {
        render(<App />);
        useEditorStore.getState().addLayer();
        const before = useEditorStore.getState().layers.length;
        await runScript([{ type: 'keyDown', key: 'e', modifiers: { meta: true, shift: true, alt: true } }]);
        expect(useEditorStore.getState().layers.length).toBe(before + 1);
    });

    it('Cmd+E merges the active layer down', async () => {
        render(<App />);
        useEditorStore.getState().addLayer();
        const before = useEditorStore.getState().layers.length;
        const top = useEditorStore.getState().layers.at(-1)!;
        useEditorStore.getState().setActiveLayer(top.id);
        await runScript([{ type: 'keyDown', key: 'e', modifiers: { meta: true } }]);
        expect(useEditorStore.getState().layers.length).toBeLessThan(before);
    });

    it('Spacebar press temporarily activates Hand tool; release restores prior tool', async () => {
        render(<App />);
        useEditorStore.getState().setTool('brush');
        fireEvent.keyDown(window, { key: ' ', code: 'Space' });
        expect(useEditorStore.getState().activeTool).toBe('hand');
        fireEvent.keyUp(window, { key: ' ', code: 'Space' });
        expect(useEditorStore.getState().activeTool).toBe('brush');
    });

    it('Spacebar inside a text input does not switch to Hand tool', async () => {
        render(<App />);
        const input = document.createElement('input');
        document.body.appendChild(input);
        useEditorStore.getState().setTool('brush');
        fireEvent.keyDown(input, { key: ' ', code: 'Space' });
        expect(useEditorStore.getState().activeTool).toBe('brush');
        document.body.removeChild(input);
    });
});
