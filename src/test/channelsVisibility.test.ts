import { describe, it, expect, beforeEach } from 'vitest';
import { useEditorStore } from '../store/editorStore';
import { Canvas2DCompositor } from '../compositor/Canvas2DCompositor';
import { ensureStubsRegistered } from '../tools/stubs';
import { pixelAt } from './simulator';

ensureStubsRegistered();

function reset() {
    useEditorStore.setState((s) => ({
        ...s,
        layers: [],
        activeLayerId: null,
        activeChannel: 'rgb',
        channelVisibility: { r: true, g: true, b: true },
    }));
    useEditorStore.getState().addLayer();
}

describe('channels visibility', () => {
    beforeEach(reset);

    it('toggleChannelVisibility flips a single channel without affecting others', () => {
        useEditorStore.getState().toggleChannelVisibility('r');
        const v = useEditorStore.getState().channelVisibility;
        expect(v.r).toBe(false);
        expect(v.g).toBe(true);
        expect(v.b).toBe(true);
    });

    it('hiding red zeros the red channel in the composite', () => {
        const layer = useEditorStore.getState().layers[0];
        layer.canvas.width = 50; layer.canvas.height = 50;
        layer.ctx.fillStyle = '#ff8040';
        layer.ctx.fillRect(0, 0, 50, 50);

        useEditorStore.getState().setChannelVisibility('r', false);

        const target = document.createElement('canvas');
        target.width = 50; target.height = 50;
        const compositor = new Canvas2DCompositor();
        compositor.render({
            layers: useEditorStore.getState().layers,
            activeLayerId: layer.id,
            viewport: { width: 50, height: 50, zoom: 1, pan: { x: 0, y: 0 } },
            target,
            activeChannel: 'rgb',
            channelVisibility: useEditorStore.getState().channelVisibility,
        });

        const px = pixelAt(target, 25, 25);
        expect(px.r).toBe(0);
        expect(px.g).toBe(0x80);
        expect(px.b).toBe(0x40);
    });

    it('all channels visible (default) leaves the composite unchanged', () => {
        const layer = useEditorStore.getState().layers[0];
        layer.canvas.width = 50; layer.canvas.height = 50;
        layer.ctx.fillStyle = '#ff8040';
        layer.ctx.fillRect(0, 0, 50, 50);

        const target = document.createElement('canvas');
        target.width = 50; target.height = 50;
        const compositor = new Canvas2DCompositor();
        compositor.render({
            layers: useEditorStore.getState().layers,
            activeLayerId: layer.id,
            viewport: { width: 50, height: 50, zoom: 1, pan: { x: 0, y: 0 } },
            target,
            activeChannel: 'rgb',
            channelVisibility: { r: true, g: true, b: true },
        });

        const px = pixelAt(target, 25, 25);
        expect(px.r).toBe(0xff);
        expect(px.g).toBe(0x80);
        expect(px.b).toBe(0x40);
    });
});
