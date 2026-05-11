import { describe, it, expect, beforeEach } from 'vitest';
import { useEditorStore } from '../store/editorStore';
import { layerPixelAt, pixelAt } from './simulator';
import { Canvas2DCompositor } from '../compositor/Canvas2DCompositor';

function reset() {
    useEditorStore.getState().clearHistory();
    useEditorStore.setState((s) => ({
        ...s,
        layers: [],
        activeLayerId: null,
        selectedLayerIds: [],
        layerSelectionAnchorId: null,
    }));
}

describe('layers slice', () => {
    beforeEach(reset);

    it('add a layer', () => {
        useEditorStore.getState().addLayer();
        const { layers, activeLayerId } = useEditorStore.getState();
        expect(layers.length).toBe(1);
        expect(activeLayerId).toBe(layers[0].id);
    });

    it('add three layers, then delete the middle one', () => {
        useEditorStore.getState().addLayer();
        useEditorStore.getState().addLayer();
        useEditorStore.getState().addLayer();
        const { layers } = useEditorStore.getState();
        const middleId = layers[1].id;
        useEditorStore.getState().removeLayer(middleId);
        const after = useEditorStore.getState().layers;
        expect(after.length).toBe(2);
        expect(after.find(l => l.id === middleId)).toBeUndefined();
    });

    it('reorder layers (move bottom to top)', () => {
        useEditorStore.getState().addLayer();
        useEditorStore.getState().addLayer();
        useEditorStore.getState().addLayer();
        const layersBefore = useEditorStore.getState().layers;
        const bottomId = layersBefore[0].id;
        useEditorStore.getState().reorderLayers(0, 2);
        const layersAfter = useEditorStore.getState().layers;
        expect(layersAfter[2].id).toBe(bottomId);
    });

    it('toggle visibility', () => {
        useEditorStore.getState().addLayer();
        const id = useEditorStore.getState().layers[0].id;
        expect(useEditorStore.getState().layers[0].visible).toBe(true);
        useEditorStore.getState().toggleLayerVisibility(id);
        expect(useEditorStore.getState().layers[0].visible).toBe(false);
    });

    it('alt-solo: shows only the targeted layer', () => {
        useEditorStore.getState().addLayer();
        useEditorStore.getState().addLayer();
        useEditorStore.getState().addLayer();
        const ids = useEditorStore.getState().layers.map(l => l.id);
        useEditorStore.getState().soloLayer(ids[1]);
        const after = useEditorStore.getState().layers;
        expect(after.find(l => l.id === ids[0])!.visible).toBe(false);
        expect(after.find(l => l.id === ids[1])!.visible).toBe(true);
        expect(after.find(l => l.id === ids[2])!.visible).toBe(false);
    });

    it('rename a layer', () => {
        useEditorStore.getState().addLayer();
        const id = useEditorStore.getState().layers[0].id;
        useEditorStore.getState().renameLayer(id, 'Hero');
        expect(useEditorStore.getState().layers[0].name).toBe('Hero');
    });

    it('layer via copy duplicates pixels', () => {
        useEditorStore.getState().addLayer();
        const layer = useEditorStore.getState().layers[0];
        const ctx = layer.canvas.getContext('2d')!;
        ctx.fillStyle = '#00ff00';
        ctx.fillRect(0, 0, 50, 50);
        useEditorStore.getState().setActiveLayer(layer.id);
        useEditorStore.getState().layerViaCopy();
        const after = useEditorStore.getState().layers;
        expect(after.length).toBe(2);
        const px = layerPixelAt(after[1], 10, 10);
        expect(px.g).toBe(255);
    });

    it('merge down composites top into bottom', () => {
        useEditorStore.getState().addLayer();
        useEditorStore.getState().addLayer();
        const [bottom, top] = useEditorStore.getState().layers;
        const bctx = bottom.canvas.getContext('2d')!;
        bctx.fillStyle = '#ff0000';
        bctx.fillRect(0, 0, 100, 100);
        const tctx = top.canvas.getContext('2d')!;
        tctx.fillStyle = '#0000ff';
        tctx.fillRect(50, 50, 50, 50);
        useEditorStore.getState().mergeLayerDown(top.id);
        const merged = useEditorStore.getState().layers[0];
        expect(useEditorStore.getState().layers.length).toBe(1);
        const pxRed = layerPixelAt(merged, 10, 10);
        const pxBlue = layerPixelAt(merged, 70, 70);
        expect(pxRed.r).toBe(255);
        expect(pxBlue.b).toBe(255);
    });

    it('undo and redo restore layer add, reorder, and property changes', () => {
        const store = useEditorStore.getState();
        store.clearHistory();
        store.addLayer();
        expect(useEditorStore.getState().layers).toHaveLength(1);
        store.undo();
        expect(useEditorStore.getState().layers).toHaveLength(0);
        store.redo();
        expect(useEditorStore.getState().layers).toHaveLength(1);

        useEditorStore.getState().addLayer();
        useEditorStore.getState().addLayer();
        useEditorStore.getState().clearHistory();
        const ids = useEditorStore.getState().layers.map(layer => layer.id);
        useEditorStore.getState().reorderLayers(0, 2);
        expect(useEditorStore.getState().layers.map(layer => layer.id)).toEqual([ids[1], ids[2], ids[0]]);
        useEditorStore.getState().undo();
        expect(useEditorStore.getState().layers.map(layer => layer.id)).toEqual(ids);
        useEditorStore.getState().redo();
        expect(useEditorStore.getState().layers.map(layer => layer.id)).toEqual([ids[1], ids[2], ids[0]]);

        const activeId = useEditorStore.getState().layers[0].id;
        useEditorStore.getState().clearHistory();
        useEditorStore.getState().setLayerOpacity(activeId, 0.25);
        expect(useEditorStore.getState().layers[0].opacity).toBe(0.25);
        useEditorStore.getState().undo();
        expect(useEditorStore.getState().layers[0].opacity).toBe(1);
        useEditorStore.getState().redo();
        expect(useEditorStore.getState().layers[0].opacity).toBe(0.25);
    });

    it('undo and redo restore mask add and apply', () => {
        useEditorStore.getState().addLayer();
        const layer = useEditorStore.getState().layers[0];
        layer.ctx.fillStyle = '#ff0000';
        layer.ctx.fillRect(0, 0, 20, 20);
        useEditorStore.getState().clearHistory();

        useEditorStore.getState().addLayerMask(layer.id, 'hide-all');
        expect(useEditorStore.getState().layers[0].mask).toBeTruthy();
        useEditorStore.getState().undo();
        expect(useEditorStore.getState().layers[0].mask).toBeNull();
        useEditorStore.getState().redo();
        expect(useEditorStore.getState().layers[0].mask).toBeTruthy();

        useEditorStore.getState().clearHistory();
        useEditorStore.getState().applyLayerMask(layer.id);
        expect(useEditorStore.getState().layers[0].mask).toBeNull();
        expect(layerPixelAt(useEditorStore.getState().layers[0], 10, 10).a).toBe(0);
        useEditorStore.getState().undo();
        expect(useEditorStore.getState().layers[0].mask).toBeTruthy();
        expect(layerPixelAt(useEditorStore.getState().layers[0], 10, 10).a).toBe(255);
        useEditorStore.getState().redo();
        expect(useEditorStore.getState().layers[0].mask).toBeNull();
        expect(layerPixelAt(useEditorStore.getState().layers[0], 10, 10).a).toBe(0);
    });

    it('undo and redo restore mask enabled and linked state', () => {
        const store = useEditorStore.getState();
        store.addLayer();
        const layer = useEditorStore.getState().layers[0];
        store.addLayerMask(layer.id, 'reveal-all');
        store.clearHistory();

        store.setLayerMaskEnabled(layer.id, false);
        expect(useEditorStore.getState().layers[0].mask?.enabled).toBe(false);
        store.undo();
        expect(useEditorStore.getState().layers[0].mask?.enabled).toBe(true);
        store.redo();
        expect(useEditorStore.getState().layers[0].mask?.enabled).toBe(false);

        const restoredLayer = useEditorStore.getState().layers[0];
        store.clearHistory();
        store.setLayerMaskLinked(restoredLayer.id, false);
        expect(useEditorStore.getState().layers[0].mask?.linked).toBe(false);
        store.undo();
        expect(useEditorStore.getState().layers[0].mask?.linked).toBe(true);
    });

    it('creates, collapses, ungroups, and undo/redoes layer groups', () => {
        const store = useEditorStore.getState();
        store.addLayer();
        store.addLayer();
        store.addLayer();
        store.clearHistory();
        const ids = useEditorStore.getState().layers.map(layer => layer.id);

        store.groupLayers([ids[0], ids[1]], 'Artwork');
        const grouped = useEditorStore.getState();
        const group = grouped.layers.find(layer => layer.kind === 'group')!;
        expect(group.name).toBe('Artwork');
        expect(group.expanded).toBe(true);
        expect(grouped.activeLayerId).toBe(group.id);
        expect(grouped.layers.find(layer => layer.id === ids[0])!.parentId).toBe(group.id);
        expect(grouped.layers.find(layer => layer.id === ids[1])!.parentId).toBe(group.id);
        expect(grouped.layers.find(layer => layer.id === ids[2])!.parentId).toBeNull();

        store.toggleLayerGroupExpanded(group.id);
        expect(useEditorStore.getState().layers.find(layer => layer.id === group.id)!.expanded).toBe(false);
        store.undo();
        expect(useEditorStore.getState().layers.find(layer => layer.id === group.id)!.expanded).toBe(true);
        store.redo();
        expect(useEditorStore.getState().layers.find(layer => layer.id === group.id)!.expanded).toBe(false);

        store.clearHistory();
        store.ungroupLayerGroup(group.id);
        expect(useEditorStore.getState().layers.find(layer => layer.id === group.id)).toBeUndefined();
        expect(useEditorStore.getState().layers.find(layer => layer.id === ids[0])!.parentId).toBeNull();
        store.undo();
        expect(useEditorStore.getState().layers.find(layer => layer.id === group.id)).toBeTruthy();
        expect(useEditorStore.getState().layers.find(layer => layer.id === ids[0])!.parentId).toBe(group.id);
    });

    it('deleting a group removes its children and undo restores them', () => {
        const store = useEditorStore.getState();
        store.addLayer();
        store.addLayer();
        const ids = useEditorStore.getState().layers.map(layer => layer.id);
        store.groupLayers(ids, 'Delete Me');
        const group = useEditorStore.getState().layers.find(layer => layer.kind === 'group')!;
        store.clearHistory();

        store.removeLayer(group.id);
        expect(useEditorStore.getState().layers).toHaveLength(0);
        store.undo();
        expect(useEditorStore.getState().layers.map(layer => layer.id)).toEqual([...ids, group.id]);
    });

    it('group visibility and opacity affect composited children', () => {
        const store = useEditorStore.getState();
        store.addLayer();
        const child = useEditorStore.getState().layers[0];
        child.ctx.fillStyle = '#ff0000';
        child.ctx.fillRect(0, 0, 20, 20);
        child.markDirty(null);
        store.groupLayers([child.id], 'Composite Group');
        const group = useEditorStore.getState().layers.find(layer => layer.kind === 'group')!;

        const canvas = document.createElement('canvas');
        canvas.width = 20;
        canvas.height = 20;
        const compositor = new Canvas2DCompositor();
        compositor.beginFrame(canvas);
        compositor.render({ target: canvas, layers: useEditorStore.getState().layers, activeLayerId: group.id, viewport: { width: 20, height: 20, zoom: 1, pan: { x: 0, y: 0 } } });
        expect(pixelAt(canvas, 5, 5)).toMatchObject({ r: 255, g: 0, b: 0, a: 255 });

        store.setLayerOpacity(group.id, 0.5);
        compositor.beginFrame(canvas);
        compositor.render({ target: canvas, layers: useEditorStore.getState().layers, activeLayerId: group.id, viewport: { width: 20, height: 20, zoom: 1, pan: { x: 0, y: 0 } } });
        const faded = pixelAt(canvas, 5, 5);
        expect(faded.r).toBeGreaterThan(240);
        expect(faded.g).toBeGreaterThan(100);
        expect(faded.g).toBeLessThan(140);

        store.toggleLayerVisibility(group.id);
        compositor.beginFrame(canvas);
        compositor.render({ target: canvas, layers: useEditorStore.getState().layers, activeLayerId: group.id, viewport: { width: 20, height: 20, zoom: 1, pan: { x: 0, y: 0 } } });
        expect(pixelAt(canvas, 5, 5)).toMatchObject({ r: 242, g: 242, b: 242, a: 255 });
    });

    it('supports replace, toggle, range, all, and deselect layer selection', () => {
        const store = useEditorStore.getState();
        store.addLayer();
        store.addLayer();
        store.addLayer();
        const ids = useEditorStore.getState().layers.map(layer => layer.id);

        store.selectLayer(ids[0]);
        expect(useEditorStore.getState().selectedLayerIds).toEqual([ids[0]]);
        expect(useEditorStore.getState().activeLayerId).toBe(ids[0]);

        store.selectLayer(ids[2], 'toggle');
        expect(useEditorStore.getState().selectedLayerIds).toEqual([ids[0], ids[2]]);
        expect(useEditorStore.getState().activeLayerId).toBe(ids[2]);

        store.selectLayer(ids[1], 'range');
        expect(useEditorStore.getState().selectedLayerIds).toEqual([ids[1], ids[2]]);
        expect(useEditorStore.getState().activeLayerId).toBe(ids[1]);

        store.selectAllLayers();
        expect(useEditorStore.getState().selectedLayerIds).toEqual(ids);
        expect(useEditorStore.getState().activeLayerId).toBe(ids[2]);

        store.deselectLayers();
        expect(useEditorStore.getState().selectedLayerIds).toEqual([]);
        expect(useEditorStore.getState().activeLayerId).toBe(ids[2]);
    });

    it('keeps multi-selection by id when layers reorder', () => {
        const store = useEditorStore.getState();
        store.addLayer();
        store.addLayer();
        store.addLayer();
        const ids = useEditorStore.getState().layers.map(layer => layer.id);
        store.selectLayer(ids[0]);
        store.selectLayer(ids[2], 'toggle');

        store.reorderLayers(0, 2);

        expect(useEditorStore.getState().layers.map(layer => layer.id)).toEqual([ids[1], ids[2], ids[0]]);
        expect(useEditorStore.getState().selectedLayerIds).toEqual([ids[0], ids[2]]);
    });

    it('aligns selected layer content and supports undo/redo', () => {
        const store = useEditorStore.getState();
        store.addLayer();
        store.addLayer();
        const [left, right] = useEditorStore.getState().layers;
        left.ctx.fillStyle = '#ff0000';
        left.ctx.fillRect(10, 2, 4, 4);
        right.ctx.fillStyle = '#0000ff';
        right.ctx.fillRect(30, 8, 4, 4);
        left.markDirty(null);
        right.markDirty(null);
        store.selectLayer(left.id);
        store.selectLayer(right.id, 'toggle');
        store.clearHistory();

        store.alignSelectedLayers('left');
        expect(layerPixelAt(right, 30, 8).a).toBe(0);
        expect(layerPixelAt(right, 10, 8)).toMatchObject({ r: 0, g: 0, b: 255, a: 255 });

        store.undo();
        const restoredRight = useEditorStore.getState().layers.find(layer => layer.id === right.id)!;
        expect(layerPixelAt(restoredRight, 30, 8)).toMatchObject({ r: 0, g: 0, b: 255, a: 255 });
        expect(layerPixelAt(restoredRight, 10, 8).a).toBe(0);

        store.redo();
        const redoneRight = useEditorStore.getState().layers.find(layer => layer.id === right.id)!;
        expect(layerPixelAt(redoneRight, 10, 8)).toMatchObject({ r: 0, g: 0, b: 255, a: 255 });
    });

    it('aligns selected groups by moving their children', () => {
        const store = useEditorStore.getState();
        store.addLayer();
        store.addLayer();
        const [target, child] = useEditorStore.getState().layers;
        target.ctx.fillStyle = '#ff0000';
        target.ctx.fillRect(5, 1, 4, 4);
        child.ctx.fillStyle = '#00ff00';
        child.ctx.fillRect(25, 1, 4, 4);
        target.markDirty(null);
        child.markDirty(null);
        store.groupLayers([child.id], 'Moving Group');
        const group = useEditorStore.getState().layers.find(layer => layer.kind === 'group')!;
        store.selectLayer(target.id);
        store.selectLayer(group.id, 'toggle');

        store.alignSelectedLayers('left');

        expect(layerPixelAt(child, 25, 1).a).toBe(0);
        expect(layerPixelAt(child, 5, 1)).toMatchObject({ r: 0, g: 255, b: 0, a: 255 });
    });

    it('distributes three selected layers evenly and supports undo', () => {
        const store = useEditorStore.getState();
        store.addLayer();
        store.addLayer();
        store.addLayer();
        const [a, b, c] = useEditorStore.getState().layers;
        a.ctx.fillStyle = '#ff0000';
        a.ctx.fillRect(0, 1, 4, 4);
        b.ctx.fillStyle = '#00ff00';
        b.ctx.fillRect(20, 1, 4, 4);
        c.ctx.fillStyle = '#0000ff';
        c.ctx.fillRect(50, 1, 4, 4);
        a.markDirty(null);
        b.markDirty(null);
        c.markDirty(null);
        store.selectAllLayers();
        store.clearHistory();

        store.distributeSelectedLayers('left');

        expect(layerPixelAt(b, 20, 1).a).toBe(0);
        expect(layerPixelAt(b, 25, 1)).toMatchObject({ r: 0, g: 255, b: 0, a: 255 });

        store.undo();
        const restoredB = useEditorStore.getState().layers.find(layer => layer.id === b.id)!;
        expect(layerPixelAt(restoredB, 20, 1)).toMatchObject({ r: 0, g: 255, b: 0, a: 255 });
        expect(layerPixelAt(restoredB, 25, 1).a).toBe(0);
    });
});
