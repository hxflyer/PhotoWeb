import { cleanup, fireEvent, render } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { OptionsBar } from '../components/Panels/OptionsBar';
import { Layer } from '../core/Layer';
import { useEditorStore } from '../store/editorStore';
import { getTool } from '../tools/registry';
import { ensureStubsRegistered } from '../tools/stubs';
import { clearPaths, getPaths, addPath } from '../tools/pen';
import { getShapeOptions, setShapeOptions } from '../tools/shapes';
import { commitTypeLayer, defaultTextStyle, setEditingType, type TypeLayerData } from '../tools/type';
import { makeToolPointerEvent } from './simulator';

ensureStubsRegistered();

function resetStore() {
    clearPaths();
    setEditingType(null);
    useEditorStore.getState().clearHistory();
    useEditorStore.setState(state => ({
        ...state,
        width: 220,
        height: 160,
        layers: [],
        activeLayerId: null,
        selectedLayerIds: [],
        primaryColor: '#111111',
        activeTool: 'type-horizontal',
    }));
    Object.assign(defaultTextStyle, {
        fontFamily: 'system-ui',
        fontSize: 24,
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

afterEach(() => {
    cleanup();
});

describe('25a type on path and warp text', () => {
    beforeEach(resetStore);

    it('Shape Tool Path mode creates a stored path without adding a layer', () => {
        const previous = getShapeOptions();
        setShapeOptions({ mode: 'path' });
        useEditorStore.setState(state => ({ ...state, activeTool: 'shape-ellipse' }));
        const tool = getTool('shape-ellipse')!;
        const layersBefore = useEditorStore.getState().layers.length;

        tool.onPointerDown!(makeToolPointerEvent({ canvasX: 30, canvasY: 30 }), toolCtx());
        tool.onPointerMove!(makeToolPointerEvent({ canvasX: 150, canvasY: 110 }), toolCtx());
        tool.onPointerUp!(makeToolPointerEvent({ canvasX: 150, canvasY: 110 }), toolCtx());

        expect(useEditorStore.getState().layers).toHaveLength(layersBefore);
        expect(getPaths()).toHaveLength(1);
        expect(getPaths()[0].closed).toBe(true);
        expect(getPaths()[0].anchors.length).toBeGreaterThanOrEqual(4);
        setShapeOptions(previous);
    });

    it('clicking a stored path with the Type Tool creates text-on-path data', () => {
        addPath({
            id: 'line-path',
            closed: false,
            anchors: [
                { x: 20, y: 80, type: 'corner' },
                { x: 180, y: 80, type: 'corner' },
            ],
        });

        const tool = getTool('type-horizontal')!;
        tool.onPointerDown!(makeToolPointerEvent({ canvasX: 70, canvasY: 80 }), toolCtx());

        const layer = useEditorStore.getState().layers.at(-1)!;
        const data = layer.typeData as TypeLayerData;
        expect(layer.kind).toBe('type');
        expect(data.textMode).toBe('path');
        expect(data.pathText?.path.anchors).toHaveLength(2);
        expect(data.pathText?.startOffset).toBeGreaterThan(0);

        data.text = 'PATH';
        commitTypeLayer(layer.canvas, data);
        expect(data.bounds?.w).toBeGreaterThan(100);
        const pixels = layer.ctx.getImageData(0, 0, 220, 160).data;
        let alphaTotal = 0;
        for (let i = 3; i < pixels.length; i += 4) alphaTotal += pixels[i];
        expect(alphaTotal).toBeGreaterThan(0);
    });

    it('Direct Selection drags type-on-path start handle and flips side across the path', () => {
        const layer = new Layer(220, 160, 'Path Type', 'type');
        layer.typeData = {
            id: 'type-path',
            text: 'PATH',
            textMode: 'path',
            orientation: 'horizontal',
            style: { ...defaultTextStyle },
            transform: { x: 20, y: 60, width: 0, height: 32, rotation: 0 },
            pathText: {
                path: {
                    id: 'copied-path',
                    closed: false,
                    anchors: [
                        { x: 20, y: 80, type: 'corner' },
                        { x: 180, y: 80, type: 'corner' },
                    ],
                },
                startOffset: 0,
                flipped: false,
            },
        } satisfies TypeLayerData;
        commitTypeLayer(layer.canvas, layer.typeData as TypeLayerData);
        useEditorStore.setState(state => ({
            ...state,
            layers: [layer],
            activeLayerId: layer.id,
            selectedLayerIds: [layer.id],
            activeTool: 'direct-selection',
        }));

        const tool = getTool('direct-selection')!;
        tool.onPointerDown!(makeToolPointerEvent({ canvasX: 20, canvasY: 80 }), toolCtx());
        tool.onPointerMove!(makeToolPointerEvent({ canvasX: 70, canvasY: 104 }), toolCtx());
        tool.onPointerUp!(makeToolPointerEvent({ canvasX: 70, canvasY: 104 }), toolCtx());

        const data = useEditorStore.getState().layers[0].typeData as TypeLayerData;
        expect(data.pathText?.startOffset).toBeGreaterThan(40);
        expect(data.pathText?.flipped).toBe(true);
    });

    it('Options Bar Warp Text dialog writes type warp settings through layer data', () => {
        const layer = new Layer(220, 160, 'Type');
        layer.kind = 'type';
        layer.typeData = {
            id: 'type-1',
            text: 'Warp',
            textMode: 'point',
            orientation: 'horizontal',
            style: { ...defaultTextStyle },
            transform: { x: 24, y: 48, width: 0, height: 32, rotation: 0 },
        } satisfies TypeLayerData;
        useEditorStore.setState(state => ({
            ...state,
            activeTool: 'type-horizontal',
            layers: [layer],
            activeLayerId: layer.id,
            selectedLayerIds: [layer.id],
        }));

        const { getByTestId } = render(<OptionsBar />);
        fireEvent.click(getByTestId('type-options-warp-text'));
        fireEvent.change(getByTestId('warp-text-style'), { target: { value: 'wave' } });
        fireEvent.change(getByTestId('warp-text-bend'), { target: { value: '45' } });
        fireEvent.change(getByTestId('warp-text-distortH'), { target: { value: '-12' } });
        fireEvent.click(getByTestId('warp-text-vertical'));
        fireEvent.click(getByTestId('warp-text-ok'));

        const warp = (useEditorStore.getState().layers[0].typeData as TypeLayerData).warp;
        expect(warp).toEqual({ style: 'wave', bend: 45, distortH: -12, distortV: 0, horizontal: false });
    });
});
