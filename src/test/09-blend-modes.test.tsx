import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { cleanup, fireEvent, render } from '@testing-library/react';
import { useEditorStore } from '../store/editorStore';
import { ensureStubsRegistered } from '../tools/stubs';
import App from '../App';
import { LayersPanel } from '../components/Panels/LayersPanel';
import { runScript, pixelAt } from './simulator';
import { Layer } from '../core/Layer';
import { Canvas2DCompositor } from '../compositor/Canvas2DCompositor';

ensureStubsRegistered();

function fill(layer: Layer, color: string) {
    layer.ctx.fillStyle = color;
    layer.ctx.fillRect(0, 0, layer.canvas.width, layer.canvas.height);
}

function resetDocument() {
    useEditorStore.getState().clearHistory();
    useEditorStore.setState((s) => ({
        ...s,
        layers: [],
        activeLayerId: null,
        selectedLayerIds: [],
        layerSelectionAnchorId: null,
        width: 20,
        height: 20,
        activeTool: 'move',
    }));
    useEditorStore.getState().addLayer({ name: 'Base' });
    fill(useEditorStore.getState().layers[0], '#808080');
    useEditorStore.getState().addLayer({ name: 'Texture' });
    fill(useEditorStore.getState().layers[1], '#c86432');
    useEditorStore.getState().clearHistory();
}

function renderPixelForMode(mode: Layer['blendMode']) {
    const base = new Layer(1, 1, 'Base');
    fill(base, '#606060');
    const top = new Layer(1, 1, 'Top');
    fill(top, '#c86432');
    top.blendMode = mode;

    const target = document.createElement('canvas');
    target.width = 1;
    target.height = 1;
    const compositor = new Canvas2DCompositor();
    compositor.render({
        layers: [base, top],
        activeLayerId: top.id,
        viewport: { width: 1, height: 1, zoom: 1, pan: { x: 0, y: 0 } },
        target,
    });
    return pixelAt(target, 0, 0);
}

describe('09 blend modes', () => {
    beforeEach(resetDocument);
    afterEach(cleanup);

    it('Layers panel menu previews on hover, reverts on leave, and commits on click', () => {
        const activeId = useEditorStore.getState().activeLayerId!;
        const { getByTestId } = render(<LayersPanel />);

        fireEvent.click(getByTestId('layers-blend-mode-button'));
        expect(getByTestId('layers-blend-mode-menu').querySelectorAll('button')).toHaveLength(27);

        fireEvent.mouseEnter(getByTestId('layers-blend-mode-multiply'));
        expect(useEditorStore.getState().layers.find(layer => layer.id === activeId)?.blendMode).toBe('multiply');
        expect(useEditorStore.getState().historyEntries).toHaveLength(0);

        fireEvent.mouseLeave(getByTestId('layers-blend-mode-menu'));
        expect(useEditorStore.getState().layers.find(layer => layer.id === activeId)?.blendMode).toBe('normal');

        fireEvent.click(getByTestId('layers-blend-mode-button'));
        fireEvent.mouseEnter(getByTestId('layers-blend-mode-linear-light'));
        fireEvent.click(getByTestId('layers-blend-mode-linear-light'));

        expect(useEditorStore.getState().layers.find(layer => layer.id === activeId)?.blendMode).toBe('linear-light');
        expect(useEditorStore.getState().historyEntries).toHaveLength(1);
    });

    it('Shift+Plus and Shift+Minus cycle the active layer blend mode from the Move Tool', async () => {
        render(<App />);
        const activeId = useEditorStore.getState().activeLayerId!;

        await runScript([{ type: 'keyDown', key: '=', modifiers: { shift: true } }]);
        expect(useEditorStore.getState().layers.find(layer => layer.id === activeId)?.blendMode).toBe('dissolve');

        await runScript([{ type: 'keyDown', key: '-', modifiers: { shift: true } }]);
        expect(useEditorStore.getState().layers.find(layer => layer.id === activeId)?.blendMode).toBe('normal');

        useEditorStore.getState().setTool('brush');
        await runScript([{ type: 'keyDown', key: '=', modifiers: { shift: true } }]);
        expect(useEditorStore.getState().layers.find(layer => layer.id === activeId)?.blendMode).toBe('normal');
    });

    it('common recipe modes visibly change the composite', () => {
        const normal = renderPixelForMode('normal');
        const multiply = renderPixelForMode('multiply');
        const screen = renderPixelForMode('screen');
        const overlay = renderPixelForMode('overlay');
        const softLight = renderPixelForMode('soft-light');

        expect(multiply.r).toBeLessThan(normal.r);
        expect(screen.r).toBeGreaterThan(normal.r);
        expect(overlay.r).not.toBe(normal.r);
        expect(softLight.r).not.toBe(normal.r);
    });
});
