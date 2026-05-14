import { cleanup, fireEvent, render } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { OptionsBar } from '../components/Panels/OptionsBar';
import { ColorPickerDialog } from '../components/Dialogs/ColorPickerDialog';
import { Layer } from '../core/Layer';
import { useEditorStore } from '../store/editorStore';
import { getTool } from '../tools/registry';
import { ensureStubsRegistered } from '../tools/stubs';
import { commitActiveEditingType, defaultTextStyle, setEditingType, type TypeLayerData } from '../tools/type';
import { makeToolPointerEvent } from './simulator';

ensureStubsRegistered();

function resetDefaultTextStyle() {
    Object.assign(defaultTextStyle, {
        fontFamily: 'system-ui',
        fontSize: 32,
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

function resetStore() {
    resetDefaultTextStyle();
    setEditingType(null);
    useEditorStore.getState().clearHistory();
    useEditorStore.setState(state => ({
        ...state,
        width: 240,
        height: 160,
        layers: [],
        activeLayerId: null,
        selectedLayerIds: [],
        activeTool: 'type-horizontal',
        dialogs: { ...state.dialogs, isColorPickerOpen: false, colorPickerTarget: 'primary' },
    }));
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
    vi.restoreAllMocks();
});

describe('24 type basics', () => {
    beforeEach(resetStore);

    it('creates point type on click and area type on drag', () => {
        const tool = getTool('type-horizontal')!;

        tool.onPointerDown!(makeToolPointerEvent({ canvasX: 30, canvasY: 60 }), toolCtx());
        tool.onPointerUp!(makeToolPointerEvent({ canvasX: 30, canvasY: 60 }), toolCtx());
        let layer = useEditorStore.getState().layers.at(-1)!;
        expect(layer.kind).toBe('type');
        expect((layer.typeData as TypeLayerData).textMode).toBe('point');
        commitActiveEditingType();

        tool.onPointerDown!(makeToolPointerEvent({ canvasX: 40, canvasY: 50 }), toolCtx());
        tool.onPointerMove!(makeToolPointerEvent({ canvasX: 140, canvasY: 110 }), toolCtx());
        tool.onPointerUp!(makeToolPointerEvent({ canvasX: 140, canvasY: 110 }), toolCtx());
        layer = useEditorStore.getState().layers.at(-1)!;
        const data = layer.typeData as TypeLayerData;
        expect(data.textMode).toBe('box');
        expect(data.transform.width).toBe(100);
        expect(data.transform.height).toBe(60);
    });

    it('wires Type Options Bar controls into the selected type layer style', () => {
        const layer = new Layer(240, 160, 'Type');
        layer.kind = 'type';
        const data: TypeLayerData = {
            id: 'type-1',
            text: 'Hello',
            textMode: 'point',
            orientation: 'horizontal',
            style: { ...defaultTextStyle },
            transform: { x: 20, y: 20, width: 0, height: 38, rotation: 0 },
            bounds: { x: 20, y: 20, w: 80, h: 38 },
        };
        layer.typeData = data;
        useEditorStore.setState(state => ({
            ...state,
            layers: [layer],
            activeLayerId: layer.id,
            selectedLayerIds: [layer.id],
        }));

        const { getByTestId } = render(<OptionsBar />);
        fireEvent.change(getByTestId('type-options-font-size'), { target: { value: '48' } });
        fireEvent.change(getByTestId('type-options-font-style'), { target: { value: 'Bold Italic' } });
        fireEvent.change(getByTestId('type-options-antialias'), { target: { value: 'smooth' } });
        fireEvent.click(getByTestId('type-options-align-center'));
        fireEvent.click(getByTestId('type-options-underline'));

        const style = (useEditorStore.getState().layers[0].typeData as TypeLayerData).style;
        expect(style.fontSize).toBe(48);
        expect(style.fontWeight).toBe(700);
        expect(style.fontStyle).toBe('italic');
        expect(style.antiAlias).toBe('smooth');
        expect(style.textAlign).toBe('center');
        expect(style.underline).toBe(true);
    });

    it('opens the Type color picker from the Options Bar color swatch', () => {
        const { getByTestId } = render(<OptionsBar />);

        fireEvent.click(getByTestId('type-options-color-swatch'));

        const dialogs = useEditorStore.getState().dialogs;
        expect(dialogs.isColorPickerOpen).toBe(true);
        expect(dialogs.colorPickerTarget).toBe('type');
    });

    it('lets the Color Picker sample a color from the canvas before confirming type color', () => {
        let confirmed = '';
        const canvas = document.createElement('canvas');
        canvas.dataset.photowebCanvas = 'true';
        canvas.width = 2;
        canvas.height = 2;
        Object.defineProperty(canvas, 'getBoundingClientRect', {
            value: () => ({ left: 0, top: 0, right: 2, bottom: 2, width: 2, height: 2, x: 0, y: 0, toJSON: () => ({}) }),
        });
        canvas.getContext('2d')!.fillStyle = '#ff0000';
        canvas.getContext('2d')!.fillRect(0, 0, 2, 2);
        document.body.appendChild(canvas);
        Object.defineProperty(document, 'elementFromPoint', {
            value: vi.fn(() => canvas),
            configurable: true,
        });

        const { getByText } = render(
            <ColorPickerDialog
                isOpen
                initialColor="#000000"
                title="Type Color"
                onConfirm={color => { confirmed = color; }}
                onClose={() => {}}
            />
        );

        fireEvent.pointerDown(canvas, { clientX: 1, clientY: 1 });
        fireEvent.click(getByText('OK'));

        expect(confirmed).toBe('#ff0000');
        canvas.remove();
    });
});
