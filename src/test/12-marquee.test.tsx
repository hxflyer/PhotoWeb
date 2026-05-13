import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import App from '../App';
import { OptionsBar } from '../components/Panels/OptionsBar';
import { useEditorStore } from '../store/editorStore';
import { getTool } from '../tools/registry';
import { ensureStubsRegistered } from '../tools/stubs';
import { getMarqueeOptions, setMarqueeOptions } from '../tools/marquee';
import { makeToolPointerEvent } from './simulator';

ensureStubsRegistered();

function reset() {
    cleanup();
    useEditorStore.setState((s) => ({
        ...s,
        layers: [],
        activeLayerId: null,
        width: 240,
        height: 240,
        activeTool: 'marquee-rect',
        selection: {
            ...s.selection,
            hasSelection: false,
            path: [],
            operations: [],
            polyPoints: [],
            isDraggingSelection: false,
            feather: 0,
        },
    }));
    useEditorStore.getState().addLayer();
    useEditorStore.getState().clearHistory();
    setMarqueeOptions({ feather: 0, antiAlias: true, style: 'normal', width: 1, height: 1 });
}

function ctx() {
    return {
        store: useEditorStore.getState(),
        getStore: () => useEditorStore.getState(),
        requestRender: () => {},
    };
}

function keyEvent(key: string) {
    return { key, shift: false, alt: false, meta: false, ctrl: false, rawEvent: new KeyboardEvent('keydown', { key }) };
}

function rectSize() {
    const op = useEditorStore.getState().selection.operations[0];
    return {
        x: op.path[0].x,
        y: op.path[0].y,
        w: op.path[1].x - op.path[0].x,
        h: op.path[1].y - op.path[0].y,
    };
}

afterEach(() => {
    cleanup();
});

describe('12-marquee Photoshop marquee choreography', () => {
    beforeEach(reset);

    it('Options Bar Fixed Ratio fields and swap drive rectangular marquee ratio', () => {
        render(<OptionsBar />);
        fireEvent.change(screen.getByTestId('marquee-style'), { target: { value: 'fixed-ratio' } });
        fireEvent.change(screen.getByTestId('marquee-width'), { target: { value: '4' } });
        fireEvent.change(screen.getByTestId('marquee-height'), { target: { value: '2' } });

        const tool = getTool('marquee-rect')!;
        tool.onPointerDown!(makeToolPointerEvent({ canvasX: 0, canvasY: 0 }), ctx());
        tool.onPointerMove!(makeToolPointerEvent({ canvasX: 100, canvasY: 10 }), ctx());
        tool.onPointerUp!(makeToolPointerEvent({ canvasX: 100, canvasY: 10 }), ctx());
        expect(rectSize()).toMatchObject({ w: 100, h: 50 });

        useEditorStore.getState().clearSelection();
        fireEvent.click(screen.getByTestId('marquee-swap'));
        expect(getMarqueeOptions()).toMatchObject({ width: 2, height: 4 });

        tool.onPointerDown!(makeToolPointerEvent({ canvasX: 0, canvasY: 0 }), ctx());
        tool.onPointerMove!(makeToolPointerEvent({ canvasX: 100, canvasY: 10 }), ctx());
        tool.onPointerUp!(makeToolPointerEvent({ canvasX: 100, canvasY: 10 }), ctx());
        expect(rectSize()).toMatchObject({ w: 100, h: 200 });
    });

    it('Fixed Size click places an exact-size rectangular selection', () => {
        setMarqueeOptions({ style: 'fixed-size', width: 40, height: 30 });
        const tool = getTool('marquee-rect')!;

        tool.onPointerDown!(makeToolPointerEvent({ canvasX: 10, canvasY: 20 }), ctx());
        tool.onPointerUp!(makeToolPointerEvent({ canvasX: 10, canvasY: 20 }), ctx());

        expect(rectSize()).toEqual({ x: 10, y: 20, w: 40, h: 30 });
    });

    it('Fixed Size click-drag repositions the exact-size outline before commit', () => {
        setMarqueeOptions({ style: 'fixed-size', width: 40, height: 30 });
        const tool = getTool('marquee-ellipse')!;

        tool.onPointerDown!(makeToolPointerEvent({ canvasX: 10, canvasY: 20 }), ctx());
        tool.onPointerMove!(makeToolPointerEvent({ canvasX: 35, canvasY: 45 }), ctx());
        tool.onPointerUp!(makeToolPointerEvent({ canvasX: 35, canvasY: 45 }), ctx());

        expect(rectSize()).toEqual({ x: 35, y: 45, w: 40, h: 30 });
        expect(useEditorStore.getState().selection.operations[0].type).toBe('circle');
    });

    it('Space held during a new marquee drag repositions without changing size', () => {
        const tool = getTool('marquee-rect')!;

        tool.onPointerDown!(makeToolPointerEvent({ canvasX: 0, canvasY: 0 }), ctx());
        tool.onPointerMove!(makeToolPointerEvent({ canvasX: 50, canvasY: 20 }), ctx());
        tool.onKeyDown!(keyEvent(' '), ctx());
        tool.onPointerMove!(makeToolPointerEvent({ canvasX: 70, canvasY: 40 }), ctx());
        tool.onPointerUp!(makeToolPointerEvent({ canvasX: 70, canvasY: 40 }), ctx());

        expect(rectSize()).toEqual({ x: 20, y: 20, w: 50, h: 20 });
    });

    it('App Space shortcut does not switch to Hand while marquee gesture is active', () => {
        render(<App />);
        useEditorStore.getState().setTool('marquee-rect');
        const tool = getTool('marquee-rect')!;

        tool.onPointerDown!(makeToolPointerEvent({ canvasX: 0, canvasY: 0 }), ctx());
        fireEvent.keyDown(window, { key: ' ', code: 'Space' });

        expect(useEditorStore.getState().activeTool).toBe('marquee-rect');
        tool.onPointerUp!(makeToolPointerEvent({ canvasX: 20, canvasY: 20 }), ctx());
    });
});
