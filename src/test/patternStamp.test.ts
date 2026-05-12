import { describe, it, expect, beforeEach, vi } from 'vitest';
import { Layer } from '../core/Layer';
import { useEditorStore } from '../store/editorStore';
import { ensureStubsRegistered } from '../tools/stubs';
import { getTool } from '../tools/registry';
import type { ToolPointerEvent } from '../tools/Tool';
import { setPatternStampOptions, getPatternStampOptions } from '../tools/patternStamp';
import { layerPixelAt } from './simulator';

ensureStubsRegistered();

function pointer(x: number, y: number): ToolPointerEvent {
    return {
        canvasX: x, canvasY: y, clientX: x, clientY: y,
        button: 0, buttons: 1,
        shift: false, alt: false, meta: false, ctrl: false,
        pressure: 1, pointerType: 'mouse',
        rawEvent: new MouseEvent('mousedown') as PointerEvent,
    };
}

function toolCtx() {
    return {
        store: useEditorStore.getState(),
        getStore: () => useEditorStore.getState(),
        requestRender: vi.fn(),
    };
}

async function installPattern(): Promise<{ id: string }> {
    // 4x4 solid green pattern, cached directly (jsdom can't decode data URLs
    // through `new Image()` so we seed `patternTileCache` via `cachePatternTile`).
    const c = document.createElement('canvas');
    c.width = 4; c.height = 4;
    const ctx = c.getContext('2d')!;
    ctx.fillStyle = '#00ff00';
    ctx.fillRect(0, 0, 4, 4);
    const id = 'test-pattern-' + Math.random().toString(36).slice(2);
    const { cachePatternTile } = await import('../store/toolsSlice');
    cachePatternTile(id, c);
    useEditorStore.setState(s => ({
        ...s,
        patternPresets: [...s.patternPresets, { id, name: 'Test', width: 4, height: 4, dataUrl: '' }],
        activePatternId: id,
    }));
    return { id };
}

describe('Pattern Stamp tool', () => {
    beforeEach(() => {
        useEditorStore.getState().clearHistory();
        const layer = new Layer(32, 32, 'L');
        // Start with a transparent layer so we can verify pattern paint.
        useEditorStore.setState(s => ({
            ...s,
            width: 32, height: 32,
            layers: [layer], activeLayerId: layer.id,
            brushSettings: { ...s.brushSettings, size: 8, hardness: 1, opacity: 1, flow: 1 },
            patternPresets: [],
            activePatternId: null,
        }));
        setPatternStampOptions({ aligned: true, mode: 'source-over' });
    });

    it('options round-trip', () => {
        setPatternStampOptions({ aligned: false, mode: 'multiply' });
        const opts = getPatternStampOptions();
        expect(opts.aligned).toBe(false);
        expect(opts.mode).toBe('multiply');
    });

    it('no-op when no active pattern preset is set', () => {
        const tool = getTool('pattern-stamp')!;
        const ctx = toolCtx();
        tool.onPointerDown!(pointer(10, 10), ctx);
        tool.onPointerUp!(pointer(10, 10), ctx);
        // Layer should remain transparent.
        const layer = useEditorStore.getState().layers[0];
        expect(layerPixelAt(layer, 10, 10).a).toBe(0);
    });

    it('paints the pattern tile through the brush mask onto the layer', async () => {
        await installPattern();
        const tool = getTool('pattern-stamp')!;
        const ctx = toolCtx();
        tool.onPointerDown!(pointer(10, 10), ctx);
        tool.onPointerUp!(pointer(10, 10), ctx);

        const layer = useEditorStore.getState().layers[0];
        const px = layerPixelAt(layer, 10, 10);
        // Should be green-dominated (pattern is solid green).
        expect(px.g).toBeGreaterThan(px.r);
        expect(px.g).toBeGreaterThan(px.b);
        expect(px.a).toBeGreaterThan(0);
    });

    it('commits a history entry per stroke (undo restores)', async () => {
        await installPattern();
        const initialEntries = useEditorStore.getState().historyEntries.length;
        const tool = getTool('pattern-stamp')!;
        const ctx = toolCtx();
        tool.onPointerDown!(pointer(10, 10), ctx);
        tool.onPointerUp!(pointer(10, 10), ctx);
        expect(useEditorStore.getState().historyEntries.length).toBe(initialEntries + 1);

        useEditorStore.getState().undo();
        const layer = useEditorStore.getState().layers[0];
        expect(layerPixelAt(layer, 10, 10).a).toBe(0);
    });
});
