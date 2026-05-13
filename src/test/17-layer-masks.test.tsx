import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { cleanup, fireEvent, render } from '@testing-library/react';
import { Canvas2DCompositor } from '../compositor/Canvas2DCompositor';
import { Layer } from '../core/Layer';
import '../effects';
import { LayersPanel } from '../components/Panels/LayersPanel';
import { useEditorStore } from '../store/editorStore';
import { pixelAt } from './simulator';

function resetStore(): string {
    const layer = new Layer(40, 40, 'Masked');
    layer.ctx.fillStyle = '#ffffff';
    layer.ctx.fillRect(8, 8, 24, 24);
    useEditorStore.getState().clearHistory();
    useEditorStore.setState(s => ({
        ...s,
        width: 40,
        height: 40,
        layers: [layer],
        activeLayerId: layer.id,
        selectedLayerIds: [layer.id],
        layerSelectionAnchorId: layer.id,
        activeLayerEditTarget: 'layer',
        viewedLayerMaskId: null,
        selection: {
            hasSelection: false,
            mode: 'rect',
            path: [],
            polyPoints: [],
            operations: [],
            isDraggingSelection: false,
            isFreeEditMode: false,
            feather: 0,
        },
    }));
    return layer.id;
}

function maskPixel(id: string, x = 0, y = 0): number {
    const layer = useEditorStore.getState().layers.find(l => l.id === id)!;
    return layer.mask!.ctx.getImageData(x, y, 1, 1).data[0];
}

describe('17 — Layer masks', () => {
    beforeEach(resetStore);
    afterEach(cleanup);

    it('Alt-clicking Add Layer Mask creates a hide-all mask', () => {
        const id = useEditorStore.getState().activeLayerId!;
        const { getByTestId } = render(<LayersPanel />);

        fireEvent.click(getByTestId('layers-add-mask-button'), { altKey: true });

        expect(useEditorStore.getState().layers.find(l => l.id === id)!.mask).toBeTruthy();
        expect(maskPixel(id)).toBe(0);
    });

    it('mask thumbnail modifiers target, view, disable, and load the mask as a selection', () => {
        const id = useEditorStore.getState().activeLayerId!;
        useEditorStore.getState().addLayerMask(id, 'reveal-all');
        const layer = useEditorStore.getState().layers.find(l => l.id === id)!;
        layer.mask!.ctx.fillStyle = '#000000';
        layer.mask!.ctx.fillRect(0, 0, 20, 40);
        layer.mask!.ctx.fillStyle = '#ffffff';
        layer.mask!.ctx.fillRect(20, 0, 20, 40);

        const { getByTestId } = render(<LayersPanel />);
        const thumb = getByTestId(`mask-thumbnail-${id}`);

        fireEvent.click(thumb);
        expect(useEditorStore.getState().activeLayerEditTarget).toBe('mask');

        fireEvent.click(thumb, { altKey: true });
        expect(useEditorStore.getState().viewedLayerMaskId).toBe(id);

        fireEvent.click(thumb, { shiftKey: true });
        expect(useEditorStore.getState().layers.find(l => l.id === id)!.mask!.enabled).toBe(false);

        fireEvent.click(thumb, { metaKey: true });
        const selection = useEditorStore.getState().selection;
        expect(selection.hasSelection).toBe(true);
        expect(selection.operations[0].mask!.data[10]).toBe(0);
        expect(selection.operations[0].mask!.data[30]).toBe(255);
    });

    it('pasting while the mask is active writes clipboard luminance into the mask', () => {
        const id = useEditorStore.getState().activeLayerId!;
        useEditorStore.getState().addLayerMask(id, 'reveal-all');

        const src = new Layer(40, 40, 'Clipboard');
        const gradient = src.ctx.createLinearGradient(0, 0, 40, 0);
        gradient.addColorStop(0, '#000000');
        gradient.addColorStop(1, '#ffffff');
        src.ctx.fillStyle = gradient;
        src.ctx.fillRect(0, 0, 40, 40);
        useEditorStore.setState({ transferLayerClipboard: src, activeLayerEditTarget: 'mask' });

        expect(useEditorStore.getState().pasteTransferredLayer(false)).toBe(true);

        expect(maskPixel(id, 0, 0)).toBeLessThan(20);
        expect(maskPixel(id, 39, 0)).toBeGreaterThan(230);
        expect(useEditorStore.getState().layers).toHaveLength(1);
    });

    it('Layer Mask Hides Effects clips outside strokes by the mask', () => {
        const id = useEditorStore.getState().activeLayerId!;
        const layer = useEditorStore.getState().layers.find(l => l.id === id)!;
        layer.ctx.clearRect(0, 0, 40, 40);
        layer.ctx.fillStyle = '#ffffff';
        layer.ctx.fillRect(8, 8, 24, 24);
        useEditorStore.getState().addLayerMask(id, 'reveal-all');
        useEditorStore.getState().addLayerEffect(id, 'stroke');
        useEditorStore.getState().setLayerEffectParams(id, 0, {
            size: 6,
            position: 'outside',
            color: '#0000ff',
            opacity: 1,
        });
        layer.mask!.ctx.fillStyle = '#000000';
        layer.mask!.ctx.fillRect(20, 0, 20, 40);

        const targetA = document.createElement('canvas');
        targetA.width = 40;
        targetA.height = 40;
        new Canvas2DCompositor().render({
            layers: useEditorStore.getState().layers,
            activeLayerId: id,
            viewport: { width: 40, height: 40, zoom: 1, pan: { x: 0, y: 0 } },
            target: targetA,
        });
        const visibleStroke = pixelAt(targetA, 22, 20);
        expect(visibleStroke.b).toBeGreaterThan(100);

        useEditorStore.getState().setLayerBlendingFlag(id, 'layerMaskHidesEffects', true);
        const targetB = document.createElement('canvas');
        targetB.width = 40;
        targetB.height = 40;
        new Canvas2DCompositor().render({
            layers: useEditorStore.getState().layers,
            activeLayerId: id,
            viewport: { width: 40, height: 40, zoom: 1, pan: { x: 0, y: 0 } },
            target: targetB,
        });
        const clippedStroke = pixelAt(targetB, 22, 20);
        expect(clippedStroke.b).toBeLessThan(visibleStroke.b);
    });
});
