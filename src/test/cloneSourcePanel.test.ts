import { describe, it, expect, beforeEach } from 'vitest';
import { useEditorStore } from '../store/editorStore';
import { getTool } from '../tools/registry';
import { ensureStubsRegistered } from '../tools/stubs';
import { setCloneStampOptions, getCloneStampOptions, resetCloneSource } from '../tools/cloneStamp';
import { layerPixelAt, makeToolPointerEvent } from './simulator';

ensureStubsRegistered();

function reset() {
    useEditorStore.setState((s) => ({
        ...s,
        layers: [],
        activeLayerId: null,
        primaryColor: '#ff0000',
        brushSettings: { size: 5, hardness: 1, opacity: 1, flow: 1 },
    }));
    useEditorStore.getState().addLayer();
    useEditorStore.getState().clearHistory();
    setCloneStampOptions({ aligned: true, sample: 'current', mode: 'source-over', showOverlay: true, overlayOpacity: 0.5 });
}

function ctx() {
    return {
        store: useEditorStore.getState(),
        getStore: () => useEditorStore.getState(),
        requestRender: () => {},
    };
}

describe('clone source overlay controls', () => {
    beforeEach(reset);

    it('current-and-below ignores higher layer (regression for Phase 0 wiring sweep)', () => {
        // Build three layers: bottom is red, middle is empty (active), top is green.
        useEditorStore.setState(s => ({ ...s, layers: [], activeLayerId: null }));
        useEditorStore.getState().addLayer(); // bottom
        useEditorStore.getState().addLayer(); // middle
        useEditorStore.getState().addLayer(); // top
        const [bottom, middle, top] = useEditorStore.getState().layers;
        bottom.ctx.fillStyle = '#ff0000';
        bottom.ctx.fillRect(0, 0, 200, 200);
        top.ctx.fillStyle = '#00ff00';
        top.ctx.fillRect(0, 0, 200, 200);
        useEditorStore.getState().setActiveLayer(middle.id);
        setCloneStampOptions({ sample: 'current-below', aligned: true });

        const tool = getTool('clone-stamp')!;
        tool.onPointerDown!(makeToolPointerEvent({ canvasX: 50, canvasY: 50, modifiers: { alt: true } }), ctx());
        tool.onPointerDown!(makeToolPointerEvent({ canvasX: 100, canvasY: 100 }), ctx());
        tool.onPointerUp!(makeToolPointerEvent({ canvasX: 100, canvasY: 100 }), ctx());

        // The sample should have come from below (red), not from above (green).
        const px = layerPixelAt(middle, 100, 100);
        expect(px.r).toBe(255);
        expect(px.g).toBe(0);
    });

    it('overlay opacity persists in options', () => {
        setCloneStampOptions({ overlayOpacity: 0.25 });
        expect(getCloneStampOptions().overlayOpacity).toBe(0.25);
    });

    it('reset source clears the clone source', () => {
        const layer = useEditorStore.getState().layers[0];
        layer.ctx.fillStyle = '#ff0000';
        layer.ctx.fillRect(8, 8, 8, 8);
        const tool = getTool('clone-stamp')!;
        tool.onPointerDown!(makeToolPointerEvent({ canvasX: 10, canvasY: 10, modifiers: { alt: true } }), ctx());
        expect(useEditorStore.getState().cloneSource).toEqual({ x: 10, y: 10 });

        resetCloneSource({ setCloneSource: useEditorStore.getState().setCloneSource });
        expect(useEditorStore.getState().cloneSource).toBeNull();
    });

    it('show-overlay=false suppresses the overlay rendering branch without throwing', () => {
        setCloneStampOptions({ showOverlay: false });
        const tool = getTool('clone-stamp')!;
        const overlayCanvas = document.createElement('canvas');
        overlayCanvas.width = 200;
        overlayCanvas.height = 200;
        expect(() => tool.renderOverlay!({
            ctx: overlayCanvas.getContext('2d')!,
            zoom: 1, canvasWidth: 200, canvasHeight: 200,
        }, ctx())).not.toThrow();
    });
});
