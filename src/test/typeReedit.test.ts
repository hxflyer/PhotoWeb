import { describe, it, expect, beforeEach } from 'vitest';
import { useEditorStore } from '../store/editorStore';
import {
    setEditingType, cancelEditingType, commitEditingType,
    typeToolState, defaultTextStyle, updateEditingStyle,
    findTypeLayerAt, commitTypeLayer, rerenderTypeLayer,
    bindTypePanelStore, bindTypeOverlayHandlers,
    applyStyleRun, styleAtOffset,
    type TypeLayerData,
} from '../tools/type';
import { getTool } from '../tools/registry';
import { makeToolPointerEvent } from './simulator';
import { ensureStubsRegistered } from '../tools/stubs';

function reset() {
    ensureStubsRegistered();
    cancelEditingType();
    useEditorStore.setState((s) => ({ ...s, layers: [], activeLayerId: null }));
    useEditorStore.getState().addLayer();
    bindTypePanelStore(() => {
        const s = useEditorStore.getState();
        return {
            layers: s.layers,
            activeLayerId: s.activeLayerId,
            forceRender: () => useEditorStore.setState(state => ({ layers: [...state.layers] })),
        };
    });
    bindTypeOverlayHandlers((data) => {
        const s = useEditorStore.getState();
        if (data.targetLayerId) {
            const layer = s.layers.find(l => l.id === data.targetLayerId);
            if (layer) {
                layer.kind = 'type';
                commitTypeLayer(layer.canvas, data);
                layer.typeData = data;
                layer.markDirty(null);
            }
        } else if (data.text.length > 0) {
            s.addLayer();
            const layer = useEditorStore.getState().layers.at(-1)!;
            layer.kind = 'type';
            commitTypeLayer(layer.canvas, data);
            layer.typeData = { ...data, targetLayerId: layer.id };
            layer.markDirty(null);
        }
        useEditorStore.setState(state => ({ layers: [...state.layers] }));
    }, () => {});
}

function makeTypeData(overrides: Partial<TypeLayerData> = {}): TypeLayerData {
    return {
        id: 'td-' + Math.random(),
        text: 'Hello',
        style: { ...defaultTextStyle, fontSize: 32, color: '#000' },
        orientation: 'horizontal',
        transform: { x: 50, y: 50, width: 200, height: 40, rotation: 0 },
        ...overrides,
    };
}

describe('Type layer persistence + re-edit', () => {
    beforeEach(reset);

    it('commitTypeLayer rasterizes text and stamps bounds onto data', () => {
        const layer = useEditorStore.getState().layers[0];
        const data = makeTypeData({ text: 'Hi', transform: { x: 30, y: 40, width: 200, height: 40, rotation: 0 } });
        commitTypeLayer(layer.canvas, data);
        // Bounds should now be set, anchored at the transform origin.
        expect(data.bounds).toBeTruthy();
        expect(data.bounds!.x).toBe(30);
        expect(data.bounds!.y).toBe(40);
        expect(data.bounds!.w).toBeGreaterThan(0);
        expect(data.bounds!.h).toBeGreaterThan(0);
    });

    it('findTypeLayerAt returns the topmost matching type layer (with slack)', () => {
        const layer = useEditorStore.getState().layers[0];
        layer.kind = 'type';
        const data = makeTypeData({ text: 'Hello', transform: { x: 100, y: 100, width: 200, height: 40, rotation: 0 } });
        commitTypeLayer(layer.canvas, data);
        layer.typeData = data;

        const layers = useEditorStore.getState().layers;
        // Inside the bounds → hit.
        const inside = findTypeLayerAt(layers, 110, 110);
        expect(inside?.id).toBe(layer.id);
        // Far outside → no hit.
        expect(findTypeLayerAt(layers, 500, 500)).toBeNull();
    });

    it('cancelEditingType restores the rasterized text on an existing layer', () => {
        const layer = useEditorStore.getState().layers[0];
        layer.kind = 'type';
        const data = makeTypeData({ text: 'Original' });
        commitTypeLayer(layer.canvas, data);
        layer.typeData = data;

        // Snapshot the canvas data after rasterization.
        const before = layer.ctx.getImageData(0, 0, layer.canvas.width, layer.canvas.height).data;
        const beforeSum = Array.from(before).reduce((a, b) => a + b, 0);

        // Simulate entering edit (clear canvas) — like the type tool's onPointerDown.
        layer.ctx.clearRect(0, 0, layer.canvas.width, layer.canvas.height);
        setEditingType({ ...data, targetLayerId: layer.id });

        const cleared = layer.ctx.getImageData(0, 0, layer.canvas.width, layer.canvas.height).data;
        expect(Array.from(cleared).reduce((a, b) => a + b, 0)).toBe(0); // canvas blank

        // Cancel — should re-render from layer.typeData.
        cancelEditingType();
        const after = layer.ctx.getImageData(0, 0, layer.canvas.width, layer.canvas.height).data;
        const afterSum = Array.from(after).reduce((a, b) => a + b, 0);
        expect(afterSum).toBe(beforeSum); // pixel-for-pixel restored
    });

    it('updateEditingStyle on a non-edit selected type layer re-rasterizes that layer', () => {
        const layer = useEditorStore.getState().layers[0];
        layer.kind = 'type';
        const data = makeTypeData({ text: 'Hello', style: { ...defaultTextStyle, fontSize: 32 } });
        commitTypeLayer(layer.canvas, data);
        layer.typeData = data;
        useEditorStore.getState().setActiveLayer(layer.id);

        // Snapshot before — at fontSize 32 we expect some non-zero pixels in a bounded area.
        const beforeAlpha = countNonzeroPixels(layer.canvas);
        // No active edit; updateEditingStyle should patch the active layer's style and re-rasterize.
        updateEditingStyle({ fontSize: 64 });

        const afterTypeData = layer.typeData as TypeLayerData;
        expect(afterTypeData.style.fontSize).toBe(64);
        const afterAlpha = countNonzeroPixels(layer.canvas);
        // Bigger font → strictly more painted pixels (at least the same baseline area).
        expect(afterAlpha).toBeGreaterThan(beforeAlpha);
    });

    it('updateEditingStyle without an edit AND no selected type layer falls back to defaultTextStyle', () => {
        // Active layer is a regular raster layer (no typeData).
        const layer = useEditorStore.getState().layers[0];
        useEditorStore.getState().setActiveLayer(layer.id);
        cancelEditingType();
        updateEditingStyle({ fontSize: 99 });
        expect(defaultTextStyle.fontSize).toBe(99);
        // Active layer should NOT have gained typeData.
        expect(layer.typeData).toBeFalsy();
        // Restore for other tests.
        updateEditingStyle({ fontSize: 32 });
    });

    it('rerenderTypeLayer redraws from the layer\'s stored typeData', () => {
        const layer = useEditorStore.getState().layers[0];
        layer.kind = 'type';
        layer.typeData = makeTypeData({ text: 'Re-rendered', style: { ...defaultTextStyle, fontSize: 48, color: '#ff0000' } });
        rerenderTypeLayer(layer);

        // Confirm a non-zero pixel exists somewhere within the bounds and it's red.
        const data = layer.typeData as TypeLayerData;
        expect(data.bounds).toBeTruthy();
        const cx = Math.floor(data.bounds!.x + 5);
        const cy = Math.floor(data.bounds!.y + data.bounds!.h * 0.5);
        const px = layer.ctx.getImageData(cx, cy, 1, 1).data;
        // We don't know exactly where the glyph strokes land — instead verify the layer
        // has SOME red pixels in the rendered area.
        const region = layer.ctx.getImageData(
            Math.floor(data.bounds!.x), Math.floor(data.bounds!.y),
            Math.min(layer.canvas.width - Math.floor(data.bounds!.x), Math.ceil(data.bounds!.w)),
            Math.min(layer.canvas.height - Math.floor(data.bounds!.y), Math.ceil(data.bounds!.h)),
        ).data;
        let foundRed = false;
        for (let i = 0; i < region.length; i += 4) {
            if (region[i] > 200 && region[i + 3] > 0) { foundRed = true; break; }
        }
        expect(foundRed).toBe(true);
        // Suppress unused-var check on px which only exists for symmetry/debug.
        void px;
    });

    it('committing without an active edit is a no-op (regression)', () => {
        // No editing state → commitEditingType is harmless.
        cancelEditingType();
        expect(typeToolState.editing).toBeNull();
        commitEditingType('whatever');
        expect(typeToolState.editing).toBeNull();
    });

    it('clicking empty canvas while editing commits and does not move/start a new text box', () => {
        setEditingType(makeTypeData({
            text: 'Typed',
            transform: { x: 50, y: 50, width: 200, height: 40, rotation: 0 },
        }));

        getTool('type-horizontal')!.onPointerDown!(
            makeToolPointerEvent({ canvasX: 300, canvasY: 300 }),
            {
                store: useEditorStore.getState(),
                getStore: () => useEditorStore.getState(),
                requestRender: () => {},
            },
        );

        expect(typeToolState.editing).toBeNull();
        const typeLayer = useEditorStore.getState().layers.find(l => l.kind === 'type');
        const typeData = typeLayer?.typeData as TypeLayerData | undefined;
        expect(typeData?.text).toBe('Typed');
        expect(typeData?.transform.x).toBe(50);
        expect(typeData?.transform.y).toBe(50);
    });

    it('clicking with the type tool creates point text without a text box', () => {
        const tool = getTool('type-horizontal')!;
        const ctx = {
            store: useEditorStore.getState(),
            getStore: () => useEditorStore.getState(),
            requestRender: () => {},
        };

        tool.onPointerDown!(makeToolPointerEvent({ canvasX: 120, canvasY: 140 }), ctx);
        tool.onPointerUp!(makeToolPointerEvent({ canvasX: 121, canvasY: 141 }), ctx);

        expect(typeToolState.editing?.text).toBe('text');
        expect(typeToolState.editing?.textMode).toBe('point');
        expect(typeToolState.editing?.transform.width).toBe(0);
        expect(typeToolState.editing?.targetLayerId).toBeTruthy();
        expect(useEditorStore.getState().layers.some(l => l.id === typeToolState.editing?.targetLayerId && l.kind === 'type')).toBe(true);
    });

    it('dragging with the type tool creates paragraph box text', () => {
        const tool = getTool('type-horizontal')!;
        const ctx = {
            store: useEditorStore.getState(),
            getStore: () => useEditorStore.getState(),
            requestRender: () => {},
        };

        tool.onPointerDown!(makeToolPointerEvent({ canvasX: 10, canvasY: 20 }), ctx);
        tool.onPointerMove!(makeToolPointerEvent({ canvasX: 110, canvasY: 70 }), ctx);
        tool.onPointerUp!(makeToolPointerEvent({ canvasX: 110, canvasY: 70 }), ctx);

        expect(typeToolState.editing?.text).toBe('text');
        expect(typeToolState.editing?.textMode).toBe('box');
        expect(typeToolState.editing?.transform.x).toBe(10);
        expect(typeToolState.editing?.transform.y).toBe(20);
        expect(typeToolState.editing?.transform.width).toBe(100);
        expect(typeToolState.editing?.transform.height).toBe(50);
        expect(typeToolState.editing?.targetLayerId).toBeTruthy();
        expect(useEditorStore.getState().layers.some(l => l.id === typeToolState.editing?.targetLayerId && l.kind === 'type')).toBe(true);
    });

    it('selecting another tool commits the active type edit', () => {
        setEditingType(makeTypeData({ text: 'Commit me' }));

        useEditorStore.getState().setTool('move');

        expect(typeToolState.editing).toBeNull();
        expect(useEditorStore.getState().activeTool).toBe('move');
        expect(useEditorStore.getState().layers.some(l => l.kind === 'type' && (l.typeData as TypeLayerData | undefined)?.text === 'Commit me')).toBe(true);
    });

    it('applies style patches only to the requested character range', () => {
        const data = makeTypeData({ text: 'Hello' });

        const next = applyStyleRun(data, 1, 4, { color: '#ff0000', fauxBold: true });

        expect(styleAtOffset(next, 0).color).toBe(data.style.color);
        expect(styleAtOffset(next, 1).color).toBe('#ff0000');
        expect(styleAtOffset(next, 3).fauxBold).toBe(true);
        expect(styleAtOffset(next, 4).color).toBe(data.style.color);
    });

    it('whole-style updates still affect the full active edit when no range is selected', () => {
        setEditingType(makeTypeData({ text: 'Whole' }));

        updateEditingStyle({ color: '#00ff00', fontSize: 48 });

        expect(typeToolState.editing?.style.color).toBe('#00ff00');
        expect(typeToolState.editing?.style.fontSize).toBe(48);
        expect(typeToolState.editing?.styleRuns).toBeUndefined();
    });
});

function countNonzeroPixels(canvas: HTMLCanvasElement): number {
    const ctx = canvas.getContext('2d')!;
    const d = ctx.getImageData(0, 0, canvas.width, canvas.height).data;
    let count = 0;
    for (let i = 3; i < d.length; i += 4) if (d[i] > 0) count++;
    return count;
}
