import { describe, it, expect, beforeEach } from 'vitest';
import { cleanup, render } from '@testing-library/react';
import { createElement } from 'react';
import { useEditorStore } from '../store/editorStore';
import {
    commitPixelAction,
    captureLayerRegion,
    createCommandAction,
    createCompoundHistoryAction,
    globalHistory,
} from '../core/history';
import { layerPixelAt, pixelAt } from './simulator';
import { HistoryPanel } from '../components/Panels/HistoryPanel';

function reset() {
    cleanup();
    globalHistory.clear();
    useEditorStore.setState((s) => ({
        ...s,
        layers: [],
        activeLayerId: null,
        selectedLayerIds: [],
        layerSelectionAnchorId: null,
        historyTick: 0,
        historyEntries: [],
        currentHistoryIndex: -1,
        historyMaxSize: 50,
        canUndo: false,
        canRedo: false,
    }));
    useEditorStore.getState().setHistoryMaxSize(50);
    useEditorStore.getState().addLayer();
    useEditorStore.getState().clearHistory();
}

function commitGeneric(label: string) {
    return useEditorStore.getState().commitHistory({
        kind: 'layer-property',
        label,
        timestamp: Date.now(),
        apply: () => {},
        revert: () => {},
    });
}

describe('history command pattern', () => {
    beforeEach(reset);

    it('commit + undo restores prior pixel state', () => {
        const layer = useEditorStore.getState().layers[0];
        const lctx = layer.canvas.getContext('2d')!;
        lctx.fillStyle = '#ffffff';
        lctx.fillRect(0, 0, 100, 100);
        const rect = { x: 0, y: 0, width: 100, height: 100 };
        const before = captureLayerRegion(layer, rect);
        lctx.fillStyle = '#ff0000';
        lctx.fillRect(20, 20, 30, 30);
        commitPixelAction(layer, rect, before, 'fill rect');

        expect(layerPixelAt(layer, 30, 30).r).toBe(255);
        useEditorStore.getState().undo();
        expect(layerPixelAt(layer, 30, 30).r).toBe(255);
        // After undo, the white background is back at the dirty rect
        expect(layerPixelAt(layer, 30, 30).g).toBe(255);
        expect(layerPixelAt(layer, 30, 30).b).toBe(255);
    });

    it('redo replays after undo', () => {
        const layer = useEditorStore.getState().layers[0];
        const lctx = layer.canvas.getContext('2d')!;
        lctx.fillStyle = '#ffffff';
        lctx.fillRect(0, 0, 100, 100);
        const rect = { x: 0, y: 0, width: 100, height: 100 };
        const before = captureLayerRegion(layer, rect);
        lctx.fillStyle = '#00ff00';
        lctx.fillRect(0, 0, 50, 50);
        commitPixelAction(layer, rect, before, 'green');

        useEditorStore.getState().undo();
        expect(layerPixelAt(layer, 10, 10).g).toBe(255);
        // ImageData put back: now expect white
        expect(layerPixelAt(layer, 10, 10).r).toBe(255);

        useEditorStore.getState().redo();
        // After redo: green again
        expect(layerPixelAt(layer, 10, 10).g).toBe(255);
        expect(layerPixelAt(layer, 10, 10).r).toBe(0);
    });

    it('canUndo / canRedo reflect stack state', () => {
        expect(useEditorStore.getState().canUndo).toBe(false);
        const layer = useEditorStore.getState().layers[0];
        const rect = { x: 0, y: 0, width: 50, height: 50 };
        const before = captureLayerRegion(layer, rect);
        layer.ctx.fillStyle = '#0000ff';
        layer.ctx.fillRect(0, 0, 50, 50);
        commitPixelAction(layer, rect, before, 'blue');
        // Tick the store to refresh canUndo
        useEditorStore.setState((s) => ({ ...s, historyTick: s.historyTick + 1, canUndo: globalHistory.canUndo(), canRedo: globalHistory.canRedo() }));
        expect(useEditorStore.getState().canUndo).toBe(true);
    });

    it('keeps a full timeline while undo and redo move the active cursor', () => {
        commitGeneric('Action 1');
        commitGeneric('Action 2');
        commitGeneric('Action 3');

        expect(useEditorStore.getState().historyEntries.map(entry => entry.action.label)).toEqual([
            'Action 1',
            'Action 2',
            'Action 3',
        ]);
        expect(useEditorStore.getState().currentHistoryIndex).toBe(2);

        useEditorStore.getState().undo();
        useEditorStore.getState().undo();
        expect(useEditorStore.getState().historyEntries).toHaveLength(3);
        expect(useEditorStore.getState().currentHistoryIndex).toBe(0);
        expect(useEditorStore.getState().canRedo).toBe(true);

        useEditorStore.getState().redo();
        expect(useEditorStore.getState().historyEntries).toHaveLength(3);
        expect(useEditorStore.getState().currentHistoryIndex).toBe(1);
        expect(useEditorStore.getState().canUndo).toBe(true);
        expect(useEditorStore.getState().canRedo).toBe(true);
    });

    it('committing after undo truncates redoable future states', () => {
        commitGeneric('Open');
        commitGeneric('Brush Stroke');
        commitGeneric('Levels');

        useEditorStore.getState().undo();
        expect(useEditorStore.getState().currentHistoryIndex).toBe(1);
        expect(useEditorStore.getState().canRedo).toBe(true);

        commitGeneric('New Branch');

        expect(useEditorStore.getState().historyEntries.map(entry => entry.action.label)).toEqual([
            'Open',
            'Brush Stroke',
            'New Branch',
        ]);
        expect(useEditorStore.getState().currentHistoryIndex).toBe(2);
        expect(useEditorStore.getState().canRedo).toBe(false);
    });

    it('prunes old states when the maximum history size is exceeded', () => {
        const store = useEditorStore.getState();
        store.setHistoryMaxSize(3);

        commitGeneric('State 1');
        commitGeneric('State 2');
        commitGeneric('State 3');
        commitGeneric('State 4');
        commitGeneric('State 5');

        expect(useEditorStore.getState().historyMaxSize).toBe(3);
        expect(useEditorStore.getState().historyEntries.map(entry => entry.action.label)).toEqual([
            'State 3',
            'State 4',
            'State 5',
        ]);
        expect(useEditorStore.getState().currentHistoryIndex).toBe(2);

        useEditorStore.getState().undo();
        useEditorStore.getState().undo();
        useEditorStore.getState().undo();
        expect(useEditorStore.getState().currentHistoryIndex).toBe(-1);
        expect(useEditorStore.getState().canUndo).toBe(false);
        expect(useEditorStore.getState().canRedo).toBe(true);

        useEditorStore.getState().redo();
        expect(useEditorStore.getState().currentHistoryIndex).toBe(0);
        expect(useEditorStore.getState().historyEntries[0].action.label).toBe('State 3');
    });

    it('lowering the history limit prunes existing old states predictably', () => {
        commitGeneric('Open');
        commitGeneric('Paint');
        commitGeneric('Mask');
        commitGeneric('Transform');

        useEditorStore.getState().setHistoryMaxSize(2);

        expect(useEditorStore.getState().historyEntries.map(entry => entry.action.label)).toEqual([
            'Mask',
            'Transform',
        ]);
        expect(useEditorStore.getState().currentHistoryIndex).toBe(1);
        expect(useEditorStore.getState().canUndo).toBe(true);
        expect(useEditorStore.getState().canRedo).toBe(false);
    });

    it('History panel marks past, current, and redoable future entries', () => {
        commitGeneric('Open');
        commitGeneric('Paint');
        commitGeneric('Transform');
        useEditorStore.getState().undo();

        const { getByTestId } = render(createElement(HistoryPanel));

        expect(getByTestId('history-entry-0').getAttribute('data-history-state')).toBe('past');
        expect(getByTestId('history-entry-1').getAttribute('data-history-state')).toBe('current');
        expect(getByTestId('history-entry-2').getAttribute('data-history-state')).toBe('future');
    });

    it('reverting to a snapshot restores layer pixels and properties', () => {
        const store = useEditorStore.getState();
        const base = store.layers[0];
        base.name = 'Base';
        base.visible = true;
        base.opacity = 0.65;
        base.blendMode = 'multiply';
        base.ctx.fillStyle = '#112233';
        base.ctx.fillRect(0, 0, 8, 8);
        base.markDirty(null);
        store.addLayerMask(base.id, 'hide-all');
        expect(base.mask).toBeTruthy();
        store.addLayer();
        const top = useEditorStore.getState().layers[1];
        top.name = 'Top';
        top.visible = false;
        top.opacity = 0.35;
        top.ctx.fillStyle = '#ff0000';
        top.ctx.fillRect(0, 0, 8, 8);
        top.markDirty(null);
        useEditorStore.getState().setActiveLayer(base.id);

        useEditorStore.getState().commitSnapshot('Before experiment');

        base.name = 'Changed Base';
        base.visible = false;
        base.opacity = 1;
        base.blendMode = 'screen';
        base.ctx.fillStyle = '#00ff00';
        base.ctx.fillRect(0, 0, 8, 8);
        base.mask!.ctx.fillStyle = '#ffffff';
        base.mask!.ctx.fillRect(0, 0, 8, 8);
        top.name = 'Changed Top';
        top.visible = true;
        useEditorStore.getState().setActiveLayer(top.id);

        const snapshotIndex = useEditorStore.getState().historyEntries.findIndex(entry => entry.action.label === 'Before experiment');
        expect(snapshotIndex).toBeGreaterThanOrEqual(0);
        useEditorStore.getState().revertToHistoryIndex(snapshotIndex);

        const restored = useEditorStore.getState();
        expect(restored.layers).toHaveLength(2);
        expect(restored.activeLayerId).toBe(base.id);
        expect(restored.layers[0].name).toBe('Base');
        expect(restored.layers[0].visible).toBe(true);
        expect(restored.layers[0].opacity).toBe(0.65);
        expect(restored.layers[0].blendMode).toBe('multiply');
        expect(restored.layers[1].name).toBe('Top');
        expect(restored.layers[1].visible).toBe(false);
        expect(restored.layers[0].mask).toBeTruthy();
        expect(pixelAt(restored.layers[0].mask!.canvas, 2, 2)).toMatchObject({ r: 0, g: 0, b: 0, a: 255 });
        expect(layerPixelAt(restored.layers[0], 2, 2)).toMatchObject({ r: 17, g: 34, b: 51, a: 255 });
    });

    it('command helper applies, reverts, and redoes a generic command', () => {
        const layer = useEditorStore.getState().layers[0];
        const command = createCommandAction({
            kind: 'layer-property',
            label: 'Rename Layer',
            affectedIds: [layer.id],
            layerId: layer.id,
            dirtyRect: null,
            apply: () => { layer.name = 'After'; },
            revert: () => { layer.name = 'Before'; },
        });

        expect(command.affectedIds).toEqual([layer.id]);
        expect(command.dirtyRect).toBeNull();
        useEditorStore.getState().executeCommand(command);
        expect(layer.name).toBe('After');

        useEditorStore.getState().undo();
        expect(layer.name).toBe('Before');

        useEditorStore.getState().redo();
        expect(layer.name).toBe('After');
    });

    it('compound command applies children in order and reverts them in reverse order', () => {
        const calls: string[] = [];
        let value = '';
        const first = createCommandAction({
            kind: 'selection',
            label: 'First Step',
            affectedIds: ['selection'],
            apply: () => { calls.push('apply:first'); value += 'A'; },
            revert: () => { calls.push('revert:first'); value = value.replace('A', ''); },
        });
        const second = createCommandAction({
            kind: 'layer-property',
            label: 'Second Step',
            affectedIds: ['layer-1'],
            apply: () => { calls.push('apply:second'); value += 'B'; },
            revert: () => { calls.push('revert:second'); value = value.replace('B', ''); },
        });
        const compound = createCompoundHistoryAction({
            label: 'Compound Edit',
            actions: [first, second],
        });

        expect(compound.affectedIds).toEqual(['selection', 'layer-1']);
        useEditorStore.getState().executeCompoundCommand(compound);
        expect(value).toBe('AB');
        expect(calls).toEqual(['apply:first', 'apply:second']);

        useEditorStore.getState().undo();
        expect(value).toBe('');
        expect(calls).toEqual(['apply:first', 'apply:second', 'revert:second', 'revert:first']);

        useEditorStore.getState().redo();
        expect(value).toBe('AB');
        expect(calls).toEqual([
            'apply:first',
            'apply:second',
            'revert:second',
            'revert:first',
            'apply:first',
            'apply:second',
        ]);
    });
});
