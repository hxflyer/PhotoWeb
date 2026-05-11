import { describe, it, expect, beforeEach } from 'vitest';
import { useEditorStore } from '../store/editorStore';
import { ensureStubsRegistered } from '../tools/stubs';
import {
    addPath,
    clearPaths,
    type PathShape,
} from '../tools/pen';
import { strokeActivePath, fillActivePath } from '../tools/pathPaint';
import { layerPixelAt } from './simulator';

ensureStubsRegistered();

function reset() {
    useEditorStore.getState().clearHistory();
    useEditorStore.setState((s) => ({
        ...s,
        layers: [],
        activeLayerId: null,
        primaryColor: '#ff0000',
        secondaryColor: '#ffffff',
        width: 200,
        height: 200,
        brushSettings: { size: 4, hardness: 1, opacity: 1, flow: 1 },
    }));
    useEditorStore.getState().addLayer();
    clearPaths();
}

function makeRectPath(): PathShape {
    return {
        id: 'rect-path', closed: true,
        anchors: [
            { x: 40, y: 40, type: 'corner' },
            { x: 160, y: 40, type: 'corner' },
            { x: 160, y: 160, type: 'corner' },
            { x: 40, y: 160, type: 'corner' },
        ],
    };
}

describe('Stroke Path / Fill Path commands', () => {
    beforeEach(reset);

    it('Stroke Path: paints red pixels along the path with brush size 10', () => {
        addPath(makeRectPath());
        strokeActivePath({ size: 10, color: '#ff0000', opacity: 1 });
        const layer = useEditorStore.getState().layers[0];
        // The top edge of the rectangle path runs from (40, 40) to (160, 40).
        // A stroke of width 10 should cover y=40 ± 5 for the entire span.
        const onTop = layerPixelAt(layer, 100, 40);
        expect(onTop.r).toBe(255);
        expect(onTop.a).toBeGreaterThan(0);
        // Interior should be empty (stroke only).
        const interior = layerPixelAt(layer, 100, 100);
        expect(interior.a).toBe(0);
    });

    it('Stroke Path commits a single history entry and undo restores the layer', () => {
        addPath(makeRectPath());
        const sizeBefore = useEditorStore.getState().historyEntries.length;
        strokeActivePath({ size: 10, color: '#ff0000', opacity: 1 });
        const sizeAfter = useEditorStore.getState().historyEntries.length;
        expect(sizeAfter).toBe(sizeBefore + 1);
        const layer = useEditorStore.getState().layers[0];
        expect(layerPixelAt(layer, 100, 40).a).toBeGreaterThan(0);
        useEditorStore.getState().undo();
        expect(layerPixelAt(layer, 100, 40).a).toBe(0);
    });

    it('Fill Path: fills the interior of a closed path with the requested color', () => {
        addPath(makeRectPath());
        fillActivePath({ color: '#ff0000', opacity: 1 });
        const layer = useEditorStore.getState().layers[0];
        const interior = layerPixelAt(layer, 100, 100);
        expect(interior.r).toBe(255);
        expect(interior.a).toBeGreaterThan(0);
        // Pixels well outside the rect should be empty.
        const outside = layerPixelAt(layer, 10, 10);
        expect(outside.a).toBe(0);
    });

    it('Fill Path commits a single history entry and undo restores the layer', () => {
        addPath(makeRectPath());
        const sizeBefore = useEditorStore.getState().historyEntries.length;
        fillActivePath({ color: '#ff0000', opacity: 1 });
        const sizeAfter = useEditorStore.getState().historyEntries.length;
        expect(sizeAfter).toBe(sizeBefore + 1);
        const layer = useEditorStore.getState().layers[0];
        expect(layerPixelAt(layer, 100, 100).r).toBe(255);
        useEditorStore.getState().undo();
        expect(layerPixelAt(layer, 100, 100).a).toBe(0);
    });

    it('returns false / leaves the layer untouched when no active path is present', () => {
        const ok = strokeActivePath({ size: 10, color: '#ff0000', opacity: 1 });
        expect(ok).toBe(false);
        const layer = useEditorStore.getState().layers[0];
        expect(layerPixelAt(layer, 100, 100).a).toBe(0);

        const ok2 = fillActivePath({ color: '#ff0000', opacity: 1 });
        expect(ok2).toBe(false);
    });
});
