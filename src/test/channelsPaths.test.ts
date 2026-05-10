import { describe, it, expect, beforeEach } from 'vitest';
import { useEditorStore } from '../store/editorStore';
import { Canvas2DCompositor } from '../compositor/Canvas2DCompositor';
import { ensureStubsRegistered } from '../tools/stubs';
import { addPath, getPaths, getActivePathId, setActivePath, duplicatePath, removePath, renamePath, getPathName } from '../tools/pen';
import type { PathShape } from '../tools/pen';
import { pixelAt } from './simulator';

ensureStubsRegistered();

function reset() {
    useEditorStore.setState((s) => ({ ...s, layers: [], activeLayerId: null, activeChannel: 'rgb' }));
    useEditorStore.getState().addLayer();
    // Clear any leftover paths from earlier tests
    while (getPaths().length > 0) removePath(getPaths()[0].id);
}

describe('Channels — store + compositor channel isolation', () => {
    beforeEach(reset);

    it('setActiveChannel updates store state', () => {
        useEditorStore.getState().setActiveChannel('r');
        expect(useEditorStore.getState().activeChannel).toBe('r');
        useEditorStore.getState().setActiveChannel('rgb');
        expect(useEditorStore.getState().activeChannel).toBe('rgb');
    });

    it('compositor renders only the red channel as greyscale when activeChannel="r"', () => {
        const layer = useEditorStore.getState().layers[0];
        const lctx = layer.canvas.getContext('2d')!;
        // Pure red pixel.
        lctx.fillStyle = '#ff0000';
        lctx.fillRect(0, 0, layer.canvas.width, layer.canvas.height);

        const target = document.createElement('canvas');
        target.width = layer.canvas.width;
        target.height = layer.canvas.height;
        const compositor = new Canvas2DCompositor();
        compositor.beginFrame(target);
        compositor.render({
            layers: [layer],
            activeLayerId: layer.id,
            viewport: { width: layer.canvas.width, height: layer.canvas.height, zoom: 1, pan: { x: 0, y: 0 } },
            target,
            activeChannel: 'r',
        });

        // Red channel of pure red is 255 → greyscale should be (255,255,255).
        const px = pixelAt(target, 50, 50);
        expect(px.r).toBe(255);
        expect(px.g).toBe(255);
        expect(px.b).toBe(255);
    });

    it('compositor with activeChannel="b" on a pure red pixel produces black (B=0)', () => {
        const layer = useEditorStore.getState().layers[0];
        const lctx = layer.canvas.getContext('2d')!;
        lctx.fillStyle = '#ff0000';
        lctx.fillRect(0, 0, layer.canvas.width, layer.canvas.height);

        const target = document.createElement('canvas');
        target.width = layer.canvas.width;
        target.height = layer.canvas.height;
        const compositor = new Canvas2DCompositor();
        compositor.beginFrame(target);
        compositor.render({
            layers: [layer],
            activeLayerId: layer.id,
            viewport: { width: layer.canvas.width, height: layer.canvas.height, zoom: 1, pan: { x: 0, y: 0 } },
            target,
            activeChannel: 'b',
        });

        const px = pixelAt(target, 50, 50);
        expect(px.r).toBe(0);
        expect(px.g).toBe(0);
        expect(px.b).toBe(0);
    });

    it('compositor with activeChannel="rgb" leaves color intact (sanity check)', () => {
        const layer = useEditorStore.getState().layers[0];
        const lctx = layer.canvas.getContext('2d')!;
        lctx.fillStyle = '#80c000';
        lctx.fillRect(0, 0, layer.canvas.width, layer.canvas.height);

        const target = document.createElement('canvas');
        target.width = layer.canvas.width;
        target.height = layer.canvas.height;
        const compositor = new Canvas2DCompositor();
        compositor.beginFrame(target);
        compositor.render({
            layers: [layer],
            activeLayerId: layer.id,
            viewport: { width: layer.canvas.width, height: layer.canvas.height, zoom: 1, pan: { x: 0, y: 0 } },
            target,
            activeChannel: 'rgb',
        });

        const px = pixelAt(target, 50, 50);
        expect(px.r).toBe(0x80);
        expect(px.g).toBe(0xc0);
        expect(px.b).toBe(0);
    });
});

describe('Paths store — duplicate / remove / rename / activePath', () => {
    beforeEach(() => {
        // Start with a clean path store for each test.
        while (getPaths().length > 0) removePath(getPaths()[0].id);
    });

    it('addPath registers a path and sets it active; getActivePathId returns its id', () => {
        const path: PathShape = { id: 'p1', closed: false, anchors: [{ x: 10, y: 10, type: 'corner' }] };
        addPath(path);
        expect(getPaths().length).toBe(1);
        expect(getActivePathId()).toBe('p1');
    });

    it('duplicatePath creates an independent copy and sets it active', () => {
        const original: PathShape = {
            id: 'orig', closed: true,
            anchors: [
                { x: 0, y: 0, type: 'corner' },
                { x: 50, y: 0, type: 'corner' },
                { x: 25, y: 40, type: 'smooth', inHandle: { x: 20, y: 40 }, outHandle: { x: 30, y: 40 } },
            ],
        };
        addPath(original);
        const dupId = duplicatePath('orig');
        expect(dupId).toBeTruthy();
        expect(getPaths().length).toBe(2);
        expect(getActivePathId()).toBe(dupId);

        // Mutating the duplicate must not touch the original.
        const dup = getPaths().find(p => p.id === dupId)!;
        dup.anchors[0].x = 999;
        const orig = getPaths().find(p => p.id === 'orig')!;
        expect(orig.anchors[0].x).toBe(0);
    });

    it('removePath removes the entry and reassigns active when the active is removed', () => {
        addPath({ id: 'a', closed: false, anchors: [{ x: 1, y: 1, type: 'corner' }] });
        addPath({ id: 'b', closed: false, anchors: [{ x: 2, y: 2, type: 'corner' }] });
        addPath({ id: 'c', closed: false, anchors: [{ x: 3, y: 3, type: 'corner' }] });
        setActivePath('b');
        removePath('b');
        expect(getPaths().length).toBe(2);
        // Active falls back to the previous neighbor (index - 1 → 'a').
        expect(getActivePathId()).toBe('a');
    });

    it('renamePath persists a custom name; getPathName falls back to "Path N" if unnamed', () => {
        addPath({ id: 'x', closed: false, anchors: [] });
        addPath({ id: 'y', closed: false, anchors: [] });
        renamePath('x', 'My Outline');
        expect(getPathName('x')).toBe('My Outline');
        expect(getPathName('y')).toBe('Path 2');
    });
});
