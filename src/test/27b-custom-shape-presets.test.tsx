import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { MenuBar } from '../components/layout/MenuBar';
import { Layer } from '../core/Layer';
import { useEditorStore } from '../store/editorStore';
import type { ShapeRectData } from '../store/types';
import { getCustomShapeGroups, getCustomShapeLibrary, resetUserCustomShapes } from '../tools/customShapes';
import {
    defineActiveLayerAsCustomShape,
    loadCustomShapeSetFromJson,
    saveCustomShapeSetAsJson,
    shapeDataToCustomPathD,
} from '../tools/customShapePresets';
import { getShapeOptions, setShapeOptions } from '../tools/shapes';
import { ensureStubsRegistered } from '../tools/stubs';

ensureStubsRegistered();

function installShapeLayer(data: ShapeRectData, name = 'Cookie Shape') {
    const layer = new Layer(160, 120, name, 'shape');
    layer.shapeData = data;
    useEditorStore.setState(state => ({
        ...state,
        width: 160,
        height: 120,
        layers: [layer],
        activeLayerId: layer.id,
        selectedLayerIds: [layer.id],
        layerSelectionAnchorId: layer.id,
    }));
    return layer;
}

function resetStore() {
    cleanup();
    resetUserCustomShapes();
    useEditorStore.getState().clearHistory();
    useEditorStore.setState(state => ({
        ...state,
        width: 160,
        height: 120,
        layers: [],
        activeLayerId: null,
        selectedLayerIds: [],
        layerSelectionAnchorId: null,
        activeTool: 'shape-rectangle',
    }));
    setShapeOptions({ customShapeId: 'heart', mode: 'shape', fill: '#000000', stroke: null, strokeWidth: 1 });
}

function noop() {}

describe('27b custom shape presets', () => {
    beforeEach(resetStore);
    afterEach(() => {
        vi.restoreAllMocks();
        cleanup();
        resetUserCustomShapes();
    });

    it('converts active Shape layer geometry into a user custom shape preset', () => {
        installShapeLayer({
            kind: 'rect',
            bounds: { x: 20, y: 10, w: 80, h: 60 },
            fill: { type: 'solid', color: '#112233' },
            stroke: null,
        });

        const id = defineActiveLayerAsCustomShape('Gingerbread Man');

        expect(id).toBe('user-gingerbread-man');
        expect(getShapeOptions().customShapeId).toBe(id);
        expect(useEditorStore.getState().activeTool).toBe('shape-custom');
        expect(getCustomShapeLibrary().map(shape => shape.id)).toContain(id);
        const group = getCustomShapeGroups().find(item => item.id === 'user-custom-shapes');
        expect(group?.shapes.map(shape => shape.name)).toContain('Gingerbread Man');
    });

    it('exports and imports user custom shape sets as Photoweb JSON', () => {
        installShapeLayer({
            kind: 'rect',
            bounds: { x: 0, y: 0, w: 40, h: 40 },
            fill: { type: 'solid', color: '#000' },
            stroke: null,
        });
        defineActiveLayerAsCustomShape('Holiday Square');

        const exported = saveCustomShapeSetAsJson('user-custom-shapes');
        expect(exported).toContain('photoweb-custom-shape-set');

        resetUserCustomShapes();
        expect(getCustomShapeLibrary().map(shape => shape.id)).not.toContain('user-holiday-square');

        expect(loadCustomShapeSetFromJson(exported!)).toBe(true);
        expect(getCustomShapeLibrary().map(shape => shape.name)).toContain('Holiday Square');
    });

    it('normalizes non-custom shape data to a 100x100 custom shape path', () => {
        const pathD = shapeDataToCustomPathD({
            kind: 'rect',
            bounds: { x: 50, y: 25, w: 300, h: 100 },
            fill: { type: 'solid', color: '#000' },
            stroke: null,
        });
        expect(pathD).toBe('M0,0 L100,0 L100,100 L0,100 Z');
    });

    it('Edit > Define Custom Shape prompts for a name and adds the preset', () => {
        installShapeLayer({
            kind: 'rect',
            bounds: { x: 20, y: 10, w: 80, h: 60 },
            fill: { type: 'solid', color: '#112233' },
            stroke: null,
        }, 'Menu Shape');
        vi.spyOn(window, 'prompt').mockReturnValue('Menu Defined Shape');

        render(
            <MenuBar
                onNew={noop}
                onSaveAs={noop}
                onFreeTransform={noop}
                onWarp={noop}
                onOpenFile={noop}
                onPlaceEmbedded={noop}
                onLoadFilesIntoStack={noop}
                onClose={noop}
            />
        );
        fireEvent.mouseDown(screen.getByText('Edit'));
        fireEvent.click(screen.getByText('Define Custom Shape…'));

        expect(getCustomShapeLibrary().map(shape => shape.name)).toContain('Menu Defined Shape');
    });
});
