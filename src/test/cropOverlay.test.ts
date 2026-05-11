import { describe, it, expect, beforeEach } from 'vitest';
import { useEditorStore } from '../store/editorStore';
import { getTool } from '../tools/registry';
import { ensureStubsRegistered } from '../tools/stubs';
import { setCropOptions, getCropOptions } from '../tools/crop';
import { makeToolPointerEvent } from './simulator';

ensureStubsRegistered();

function reset() {
    useEditorStore.setState((s) => ({
        ...s,
        layers: [],
        activeLayerId: null,
        width: 200,
        height: 200,
    }));
    useEditorStore.getState().addLayer();
    useEditorStore.getState().clearHistory();
    setCropOptions({ overlay: 'rule-of-thirds', straighten: false, aspect: 'free' });
}

function toolCtx() {
    return {
        store: useEditorStore.getState(),
        getStore: () => useEditorStore.getState(),
        requestRender: () => {},
    };
}

describe('crop overlay + straighten wiring', () => {
    beforeEach(reset);

    it('setting overlay to grid records the option for the renderer', () => {
        setCropOptions({ overlay: 'grid' });
        expect(getCropOptions().overlay).toBe('grid');
    });

    it('renderOverlay does not throw for any overlay variant', () => {
        const tool = getTool('crop')!;
        const overlayCanvas = document.createElement('canvas');
        overlayCanvas.width = 200;
        overlayCanvas.height = 200;
        const octx = overlayCanvas.getContext('2d')!;
        for (const overlay of ['rule-of-thirds', 'grid', 'diagonal', 'triangle', 'golden-ratio', 'none'] as const) {
            setCropOptions({ overlay });
            expect(() => tool.renderOverlay!({
                ctx: octx, zoom: 1, canvasWidth: 200, canvasHeight: 200,
            }, toolCtx())).not.toThrow();
        }
    });

    it('straighten toggle drives the rotate-on-drag flow', () => {
        const tool = getTool('crop')!;
        tool.onActivate?.(toolCtx());
        setCropOptions({ straighten: true });
        // Drag a clearly tilted line.
        tool.onPointerDown!(makeToolPointerEvent({ canvasX: 20, canvasY: 20 }), toolCtx());
        tool.onPointerMove!(makeToolPointerEvent({ canvasX: 100, canvasY: 60 }), toolCtx());
        tool.onPointerUp!(makeToolPointerEvent({ canvasX: 100, canvasY: 60 }), toolCtx());
        // After commit, the straighten toggle resets.
        expect(getCropOptions().straighten).toBe(false);
    });
});
