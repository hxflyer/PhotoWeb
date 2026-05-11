/**
 * Batch-4 — Brush/Pattern preset panels + Custom Shape preset library.
 *
 * Covers:
 *   - BrushPresetsPanel renders thumbnails per preset and applies on click.
 *   - Right-click → Rename input updates the preset name.
 *   - Drag-reorder swaps the preset order.
 *   - PatternPresetsPanel renders tile thumbnails.
 *   - Custom Shape tool produces a `kind: 'shape'` layer whose shapeData is a
 *     `custom` variant with the heart preset's pathD.
 */
import { describe, it, expect, beforeEach } from 'vitest';
import { cleanup, fireEvent, render } from '@testing-library/react';
import { useEditorStore } from '../store/editorStore';
import { ensureStubsRegistered } from '../tools/stubs';
import { BrushPresetsPanel } from '../components/Panels/BrushPresetsPanel';
import { PatternPresetsPanel } from '../components/Panels/PatternPresetsPanel';
import { getTool } from '../tools/registry';
import { setShapeOptions } from '../tools/shapes';
import { getCustomShapeLibrary } from '../tools/customShapes';
import { makeToolPointerEvent } from './simulator';
import type { ShapeCustomData } from '../store/types';

ensureStubsRegistered();

function resetStore() {
    cleanup();
    useEditorStore.setState(s => ({
        ...s,
        layers: [],
        activeLayerId: null,
        selectedLayerIds: [],
        layerSelectionAnchorId: null,
        brushPresets: [],
        patternPresets: [],
        activePatternId: null,
        brushSettings: { size: 20, opacity: 1, hardness: 1, flow: 1 },
        width: 200,
        height: 200,
    }));
    useEditorStore.getState().clearHistory();
}

function toolCtx() {
    return {
        store: useEditorStore.getState(),
        getStore: () => useEditorStore.getState(),
        requestRender: () => {},
    };
}

function seedBrushPresets() {
    const store = useEditorStore.getState();
    store.brushPresets = [];
    useEditorStore.setState({
        brushPresets: [
            { id: 'p-a', name: 'Soft Round 20', settings: { size: 20, hardness: 0.5, opacity: 1, flow: 1 } },
            { id: 'p-b', name: 'Hard Round 60', settings: { size: 60, hardness: 1, opacity: 0.8, flow: 1 } },
        ],
    });
}

function makeTile(): HTMLCanvasElement {
    const c = document.createElement('canvas');
    c.width = 8; c.height = 8;
    const ctx = c.getContext('2d')!;
    ctx.fillStyle = '#22cc88';
    ctx.fillRect(0, 0, 8, 8);
    return c;
}

describe('Batch-4 BrushPresetsPanel', () => {
    beforeEach(resetStore);

    it('renders one thumbnail per brush preset', () => {
        seedBrushPresets();
        const { getByTestId } = render(<BrushPresetsPanel />);
        expect(getByTestId('brush-preset-thumb-p-a')).toBeTruthy();
        expect(getByTestId('brush-preset-thumb-p-b')).toBeTruthy();
        expect(getByTestId('brush-preset-name-p-a').textContent).toBe('Soft Round 20');
    });

    it('clicking a preset applies its settings to brushSettings', () => {
        seedBrushPresets();
        const { getByTestId } = render(<BrushPresetsPanel />);
        fireEvent.click(getByTestId('brush-preset-row-p-b'));
        const s = useEditorStore.getState().brushSettings;
        expect(s.size).toBe(60);
        expect(s.hardness).toBe(1);
        expect(s.opacity).toBeCloseTo(0.8);
    });

    it('right-click → Rename Preset opens an input that renames the preset on Enter', () => {
        seedBrushPresets();
        const { getByTestId } = render(<BrushPresetsPanel />);
        fireEvent.contextMenu(getByTestId('brush-preset-row-p-a'), { clientX: 50, clientY: 50 });
        fireEvent.click(getByTestId('brush-preset-menu-rename'));
        const input = getByTestId('brush-preset-rename-input-p-a') as HTMLInputElement;
        fireEvent.change(input, { target: { value: 'Renamed Brush' } });
        fireEvent.keyDown(input, { key: 'Enter' });
        const preset = useEditorStore.getState().brushPresets.find(p => p.id === 'p-a')!;
        expect(preset.name).toBe('Renamed Brush');
    });

    it('drag-reorder swaps the brush preset order', () => {
        seedBrushPresets();
        const { getByTestId } = render(<BrushPresetsPanel />);
        const rowA = getByTestId('brush-preset-row-p-a');
        const rowB = getByTestId('brush-preset-row-p-b');
        fireEvent.dragStart(rowA);
        fireEvent.dragOver(rowB);
        fireEvent.drop(rowB);
        const order = useEditorStore.getState().brushPresets.map(p => p.id);
        expect(order).toEqual(['p-b', 'p-a']);
    });

    it('duplicate menu item creates a copy with a new id', () => {
        seedBrushPresets();
        const { getByTestId } = render(<BrushPresetsPanel />);
        fireEvent.contextMenu(getByTestId('brush-preset-row-p-a'));
        fireEvent.click(getByTestId('brush-preset-menu-duplicate'));
        const presets = useEditorStore.getState().brushPresets;
        expect(presets.length).toBe(3);
        expect(presets.find(p => p.name === 'Soft Round 20 copy')).toBeTruthy();
    });
});

describe('Batch-4 PatternPresetsPanel', () => {
    beforeEach(resetStore);

    it('renders one tile thumbnail per pattern preset', () => {
        useEditorStore.getState().definePattern('Checker', makeTile());
        useEditorStore.getState().definePattern('Solid Green', makeTile());
        const presets = useEditorStore.getState().patternPresets;
        expect(presets.length).toBe(2);
        const { getByTestId } = render(<PatternPresetsPanel />);
        expect(getByTestId(`pattern-preset-thumb-${presets[0].id}`)).toBeTruthy();
        expect(getByTestId(`pattern-preset-thumb-${presets[1].id}`)).toBeTruthy();
    });

    it('clicking a pattern preset sets it as activePatternId', () => {
        useEditorStore.getState().definePattern('Checker', makeTile());
        const presets0 = useEditorStore.getState().patternPresets;
        // definePattern sets the new pattern active. Add a second so we can switch.
        useEditorStore.getState().definePattern('Other', makeTile());
        const target = presets0[0];
        useEditorStore.setState({ activePatternId: null });
        const { getByTestId } = render(<PatternPresetsPanel />);
        fireEvent.click(getByTestId(`pattern-preset-row-${target.id}`));
        expect(useEditorStore.getState().activePatternId).toBe(target.id);
    });

    it('rename menu updates pattern preset name', () => {
        useEditorStore.getState().definePattern('Original Name', makeTile());
        const id = useEditorStore.getState().patternPresets[0].id;
        const { getByTestId } = render(<PatternPresetsPanel />);
        fireEvent.contextMenu(getByTestId(`pattern-preset-row-${id}`));
        fireEvent.click(getByTestId('pattern-preset-menu-rename'));
        const input = getByTestId(`pattern-preset-rename-input-${id}`) as HTMLInputElement;
        fireEvent.change(input, { target: { value: 'Renamed Pattern' } });
        fireEvent.keyDown(input, { key: 'Enter' });
        expect(useEditorStore.getState().patternPresets.find(p => p.id === id)?.name).toBe('Renamed Pattern');
    });
});

describe('Batch-4 Custom Shape preset library', () => {
    beforeEach(resetStore);

    it('exposes at least the 8 built-in shapes', () => {
        const lib = getCustomShapeLibrary();
        const ids = lib.map(s => s.id);
        for (const id of [
            'heart', 'star-5pt', 'star-7pt', 'arrow-down-circle',
            'lightning-bolt', 'speech-bubble', 'gear', 'checkmark',
        ]) {
            expect(ids).toContain(id);
        }
        for (const s of lib) {
            expect(s.pathD.length).toBeGreaterThan(0);
        }
    });

    it('Custom Shape tool with the heart preset creates a shape layer with custom shapeData and matching pathD', () => {
        const heart = getCustomShapeLibrary().find(s => s.id === 'heart')!;
        setShapeOptions({
            mode: 'shape',
            fill: '#cc2233',
            stroke: null,
            strokeWidth: 1,
            customShapeId: heart.id,
        });
        const tool = getTool('shape-custom')!;
        const ctx = toolCtx();
        tool.onPointerDown!(makeToolPointerEvent({ canvasX: 20, canvasY: 20 }), ctx);
        tool.onPointerMove!(makeToolPointerEvent({ canvasX: 120, canvasY: 120 }), ctx);
        tool.onPointerUp!(makeToolPointerEvent({ canvasX: 120, canvasY: 120 }), ctx);
        const layers = useEditorStore.getState().layers;
        expect(layers.length).toBe(1);
        const layer = layers[0];
        expect(layer.kind).toBe('shape');
        const data = layer.shapeData as ShapeCustomData;
        expect(data.kind).toBe('custom');
        expect(data.presetId).toBe('heart');
        expect(data.pathD).toBe(heart.pathD);
        expect(data.bounds.w).toBe(100);
        expect(data.bounds.h).toBe(100);
    });
});
