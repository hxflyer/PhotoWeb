import { beforeEach, describe, expect, it } from 'vitest';
import { Layer } from '../core/Layer';
import { useEditorStore } from '../store/editorStore';
import { getTool } from '../tools/registry';
import { ensureStubsRegistered } from '../tools/stubs';
import { addPath, clearPaths, getPaths } from '../tools/pen';
import { getShapeOptions, setShapeOptions } from '../tools/shapes';
import { commitTypeLayer, defaultTextStyle, setEditingType, type TypeLayerData } from '../tools/type';
import { convertActiveLayerToShape } from '../tools/typeCommands';
import { makeToolPointerEvent } from './simulator';
import type { ShapeCustomData } from '../store/types';

ensureStubsRegistered();

function resetStore() {
    clearPaths();
    setEditingType(null);
    useEditorStore.getState().clearHistory();
    useEditorStore.setState(state => ({
        ...state,
        width: 240,
        height: 180,
        layers: [],
        activeLayerId: null,
        selectedLayerIds: [],
        primaryColor: '#000000',
        activeTool: 'type-horizontal',
    }));
    Object.assign(defaultTextStyle, {
        fontFamily: 'system-ui',
        fontSize: 18,
        fontWeight: 400,
        fontStyle: 'normal',
        color: '#000000',
        letterSpacing: 0,
        lineHeight: 0,
        textAlign: 'left',
        scaleX: 1,
        scaleY: 1,
        baselineShift: 0,
        fauxBold: false,
        fauxItalic: false,
        allCaps: false,
        smallCaps: false,
        superscript: false,
        subscript: false,
        underline: false,
        strikethrough: false,
        antiAlias: 'crisp',
        indentLeft: 0,
        indentRight: 0,
        indentFirst: 0,
        spaceBefore: 0,
        spaceAfter: 0,
        hyphenate: false,
    });
}

function toolCtx() {
    return {
        store: useEditorStore.getState(),
        getStore: () => useEditorStore.getState(),
        requestRender: () => {},
    };
}

describe('25b type and shape interop', () => {
    beforeEach(resetStore);

    it('Custom Shape Tool Path mode creates an editable path outline', () => {
        const previous = getShapeOptions();
        setShapeOptions({ mode: 'path', customShapeId: 'heart' });
        const tool = getTool('shape-custom')!;

        tool.onPointerDown!(makeToolPointerEvent({ canvasX: 30, canvasY: 20 }), toolCtx());
        tool.onPointerMove!(makeToolPointerEvent({ canvasX: 150, canvasY: 140 }), toolCtx());
        tool.onPointerUp!(makeToolPointerEvent({ canvasX: 150, canvasY: 140 }), toolCtx());

        expect(useEditorStore.getState().layers).toHaveLength(0);
        expect(getPaths()).toHaveLength(1);
        expect(getPaths()[0].closed).toBe(true);
        expect(getPaths()[0].anchors.length).toBeGreaterThan(4);
        setShapeOptions(previous);
    });

    it('clicking inside a closed path with the Type Tool creates text constrained to the shape', () => {
        addPath({
            id: 'box-path',
            closed: true,
            anchors: [
                { x: 40, y: 30, type: 'corner' },
                { x: 180, y: 30, type: 'corner' },
                { x: 180, y: 130, type: 'corner' },
                { x: 40, y: 130, type: 'corner' },
            ],
        });

        const tool = getTool('type-horizontal')!;
        tool.onPointerDown!(makeToolPointerEvent({ canvasX: 90, canvasY: 80 }), toolCtx());

        const layer = useEditorStore.getState().layers.at(-1)!;
        const data = layer.typeData as TypeLayerData;
        expect(data.textMode).toBe('shape');
        expect(data.shapeText?.path.closed).toBe(true);
        expect(data.transform.x).toBeCloseTo(40);
        expect(data.transform.y).toBeCloseTo(30);
        expect(data.transform.width).toBeCloseTo(140);
        expect(data.transform.height).toBeCloseTo(100);

        data.text = 'Text wraps inside this closed path frame.';
        commitTypeLayer(layer.canvas, data);
        const pixels = layer.ctx.getImageData(0, 0, 240, 180).data;
        let alphaTotal = 0;
        for (let i = 3; i < pixels.length; i += 4) alphaTotal += pixels[i];
        expect(alphaTotal).toBeGreaterThan(0);
    });

    it('Convert to Shape turns a type layer into a custom shape layer with undo', () => {
        const layer = new Layer(240, 180, 'Type', 'type');
        const data: TypeLayerData = {
            id: 'type-1',
            text: 'A',
            textMode: 'point',
            orientation: 'horizontal',
            style: { ...defaultTextStyle, fontSize: 60 },
            transform: { x: 40, y: 40, width: 0, height: 72, rotation: 0 },
        };
        layer.typeData = data;
        commitTypeLayer(layer.canvas, data);
        useEditorStore.setState(state => ({
            ...state,
            layers: [layer],
            activeLayerId: layer.id,
            selectedLayerIds: [layer.id],
        }));

        expect(convertActiveLayerToShape()).toBe(true);
        const converted = useEditorStore.getState().layers[0];
        expect(converted.kind).toBe('shape');
        expect(converted.typeData).toBeNull();
        expect((converted.shapeData as ShapeCustomData).pathD).toContain('M');

        useEditorStore.getState().undo();
        expect(useEditorStore.getState().layers[0].kind).toBe('type');
        expect(useEditorStore.getState().layers[0].typeData).toEqual(data);
    });
});
