import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it } from 'vitest';
import { PathsPanel } from '../components/Panels/PathsPanel';
import { useEditorStore } from '../store/editorStore';
import { getTool } from '../tools/registry';
import { ensureStubsRegistered } from '../tools/stubs';
import {
    addPath,
    clearPaths,
    getActivePath,
    getPaths,
    loadPathAsSelection,
    setActivePath,
    setPenOptions,
    type PathShape,
} from '../tools/pen';
import { makeToolPointerEvent } from './simulator';

ensureStubsRegistered();

function reset() {
    cleanup();
    clearPaths();
    useEditorStore.getState().clearHistory();
    useEditorStore.setState(s => ({
        ...s,
        width: 100,
        height: 100,
        layers: [],
        activeLayerId: null,
        selection: {
            ...s.selection,
            hasSelection: false,
            path: [],
            polyPoints: [],
            operations: [],
            isDraggingSelection: false,
            feather: 0,
        },
    }));
    useEditorStore.getState().addLayer();
    setPenOptions({ mode: 'path', autoAddDelete: true, rubberBand: true });
}

function ctx() {
    return {
        store: useEditorStore.getState(),
        getStore: () => useEditorStore.getState(),
        requestRender: () => {},
    };
}

function trianglePath(id = 'tri'): PathShape {
    return {
        id,
        closed: true,
        anchors: [
            { x: 10, y: 10, type: 'corner' },
            { x: 80, y: 10, type: 'corner' },
            { x: 40, y: 80, type: 'corner' },
        ],
    };
}

function keyEvent(key: string, modifiers: { meta?: boolean; ctrl?: boolean } = {}) {
    return {
        key,
        shift: false,
        alt: false,
        meta: !!modifiers.meta,
        ctrl: !!modifiers.ctrl,
        rawEvent: new KeyboardEvent('keydown', { key, metaKey: !!modifiers.meta, ctrlKey: !!modifiers.ctrl }),
    };
}

function clickTool(toolId: string, x: number, y: number, detail = 1) {
    const tool = getTool(toolId)!;
    const down = makeToolPointerEvent({ canvasX: x, canvasY: y });
    down.rawEvent = new MouseEvent('pointerdown', { detail }) as unknown as PointerEvent;
    tool.onPointerDown!(down, ctx());
    tool.onPointerUp?.(makeToolPointerEvent({ canvasX: x, canvasY: y }), ctx());
}

describe('15 pen paths', () => {
    beforeEach(reset);

    it('loads a closed path as a selection mask', () => {
        const path = trianglePath();
        addPath(path);

        const ok = loadPathAsSelection(path, useEditorStore.getState());

        expect(ok).toBe(true);
        const selection = useEditorStore.getState().selection;
        expect(selection.hasSelection).toBe(true);
        expect(selection.operations[0].mask?.data[20 * 100 + 40]).toBeGreaterThan(0);
    });

    it('Paths panel exposes Load Path as Selection', () => {
        addPath(trianglePath());
        setActivePath('tri');
        render(<PathsPanel />);

        fireEvent.click(screen.getByTestId('paths-panel-load-selection'));

        expect(useEditorStore.getState().selection.hasSelection).toBe(true);
    });

    it('Cmd/Ctrl+Enter converts the active Pen path into a selection', () => {
        const pen = getTool('pen')!;
        clickTool('pen', 10, 10);
        clickTool('pen', 80, 10);
        clickTool('pen', 40, 80);

        pen.onKeyDown!(keyEvent('Enter', { meta: true }), ctx());

        expect(useEditorStore.getState().selection.hasSelection).toBe(true);
        expect(getActivePath()).toBeNull();
    });

    it('Curvature Pen auto-generates smooth handles after the third point', () => {
        clickTool('curvature-pen', 10, 70);
        clickTool('curvature-pen', 50, 10);
        clickTool('curvature-pen', 90, 70);

        const path = getActivePath()!;
        expect(path.anchors).toHaveLength(3);
        expect(path.anchors[1].type).toBe('smooth');
        expect(path.anchors[1].inHandle).toBeDefined();
        expect(path.anchors[1].outHandle).toBeDefined();
    });

    it('Curvature Pen double-click toggles a smooth point into a corner point', () => {
        clickTool('curvature-pen', 10, 70);
        clickTool('curvature-pen', 50, 10);
        clickTool('curvature-pen', 90, 70);

        clickTool('curvature-pen', 50, 10, 2);

        const path = getPaths()[0];
        expect(path.anchors[1].type).toBe('corner');
        expect(path.anchors[1].inHandle).toBeUndefined();
        expect(path.anchors[1].outHandle).toBeUndefined();
    });

    it('Curvature Pen closes by clicking the starting point', () => {
        clickTool('curvature-pen', 10, 70);
        clickTool('curvature-pen', 50, 10);
        clickTool('curvature-pen', 90, 70);
        clickTool('curvature-pen', 10, 70);

        expect(getPaths()[0].closed).toBe(true);
    });
});
