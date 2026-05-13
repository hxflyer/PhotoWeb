import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import App from '../App';
import { BrushPresetsPanel } from '../components/Panels/BrushPresetsPanel';
import { Viewport } from '../components/Canvas/Viewport';
import { Layer } from '../core/Layer';
import { getBrushOptions, setBrushOptions } from '../tools/brush';
import { ensureStubsRegistered } from '../tools/stubs';
import { useEditorStore } from '../store/editorStore';
import { pixelAt } from './simulator';

ensureStubsRegistered();

const groups = [
    { id: 'general', name: 'General Brushes' },
    { id: 'dry-media', name: 'Dry Media Brushes' },
    { id: 'wet-media', name: 'Wet Media Brushes' },
    { id: 'special-effects', name: 'Special Effects Brushes' },
];

function setCanvasRect(canvas: HTMLCanvasElement, width = 3, height = 3) {
    canvas.getBoundingClientRect = () => ({
        x: 0,
        y: 0,
        left: 0,
        top: 0,
        right: width,
        bottom: height,
        width,
        height,
        toJSON: () => ({}),
    });
}

function reset(width = 20, height = 20) {
    localStorage.clear();
    useEditorStore.getState().clearHistory();
    setBrushOptions({ mode: 'source-over', smoothing: 0, spacing: 0.15, pressureSize: true, pressureOpacity: false });
    const layer = new Layer(width, height, 'Brush source');
    useEditorStore.setState((s) => ({
        ...s,
        width,
        height,
        zoom: 1,
        pan: { x: 0, y: 0 },
        layers: [layer],
        activeLayerId: layer.id,
        selectedLayerIds: [layer.id],
        layerSelectionAnchorId: layer.id,
        activeTool: 'brush',
        primaryColor: '#00ff00',
        secondaryColor: '#ffffff',
        brushSettings: { size: 3, hardness: 1, opacity: 1, flow: 1 },
        brushPresets: [],
        brushPresetGroups: groups,
        selectedBrushPresetGroupId: 'general',
        toasts: [],
        selection: { ...s.selection, hasSelection: false, path: [], operations: [], polyPoints: [], isDraggingSelection: false },
    }));
    useEditorStore.getState().clearHistory();
    return layer;
}

describe('20b brush presets', () => {
    beforeEach(() => reset());
    afterEach(() => {
        vi.restoreAllMocks();
        cleanup();
    });

    it('Define Brush Preset captures grayscale canvas artwork as a custom brush tip', async () => {
        const source = reset(3, 3);
        source.ctx.clearRect(0, 0, 3, 3);
        source.ctx.fillStyle = '#000000';
        source.ctx.fillRect(0, 1, 1, 1);
        source.ctx.fillStyle = '#808080';
        source.ctx.fillRect(1, 1, 1, 1);
        source.ctx.fillStyle = '#ffffff';
        source.ctx.fillRect(2, 1, 1, 1);

        render(<App />);
        fireEvent(window, new Event('photoweb:define-brush-preset'));
        fireEvent.change(await screen.findByTestId('new-brush-preset-name'), { target: { value: 'Three tone brush' } });
        fireEvent.click(screen.getByTestId('new-brush-preset-ok'));

        const preset = useEditorStore.getState().brushPresets[0];
        expect(preset.name).toBe('Three tone brush');
        expect(preset.settings.customTip?.width).toBe(3);
        expect(useEditorStore.getState().brushSettings.customTip).toBeTruthy();

        const target = new Layer(3, 3, 'Paint target');
        useEditorStore.setState((s) => ({
            ...s,
            layers: [target],
            activeLayerId: target.id,
            selectedLayerIds: [target.id],
            layerSelectionAnchorId: target.id,
        }));
        cleanup();
        const { container } = render(<Viewport />);
        const workarea = screen.getByTestId('viewport-workarea');
        const canvas = container.querySelector('canvas') as HTMLCanvasElement;
        setCanvasRect(canvas, 3, 3);

        fireEvent.mouseDown(workarea, { clientX: 1.5, clientY: 1.5, button: 0, buttons: 1 });
        fireEvent.mouseUp(workarea, { clientX: 1.5, clientY: 1.5, button: 0, buttons: 0 });

        expect(pixelAt(target.canvas, 0, 1).a).toBe(255);
        expect(pixelAt(target.canvas, 1, 1).a).toBeGreaterThan(80);
        expect(pixelAt(target.canvas, 1, 1).a).toBeLessThan(200);
        expect(pixelAt(target.canvas, 2, 1).a).toBe(0);
    });

    it('saved preset capture flags restore tool settings and color but can leave brush size unchanged', () => {
        const store = useEditorStore.getState();
        store.setBrushSize(20);
        store.setBrushOpacity(0.6);
        store.setBrushFlow(0.4);
        store.setBrushHardness(0.75);
        store.setPrimaryColor('#ff8800');
        setBrushOptions({ mode: 'multiply', smoothing: 0.7, spacing: 0.1 });
        const id = store.saveBrushPreset('Highlighter - Orange', {
            captureSize: false,
            includeToolSettings: true,
            includeColor: true,
        });

        useEditorStore.setState(s => ({
            ...s,
            primaryColor: '#00ff00',
            brushSettings: { size: 5, hardness: 1, opacity: 1, flow: 1 },
        }));
        setBrushOptions({ mode: 'source-over', smoothing: 0, spacing: 0.3 });

        useEditorStore.getState().applyBrushPreset(id);
        const applied = useEditorStore.getState().brushSettings;
        expect(applied.size).toBe(5);
        expect(applied.hardness).toBeCloseTo(0.75);
        expect(applied.opacity).toBeCloseTo(0.6);
        expect(applied.flow).toBeCloseTo(0.4);
        expect(useEditorStore.getState().primaryColor).toBe('#ff8800');
        expect(getBrushOptions().mode).toBe('multiply');
        expect(getBrushOptions().smoothing).toBeCloseTo(0.7);
        expect(getBrushOptions().spacing).toBeCloseTo(0.1);
    });

    it('Brushes panel creates groups, saves into the selected group, and opens Get More Brushes', () => {
        const openSpy = vi.spyOn(window, 'open').mockReturnValue({} as Window);
        render(<BrushPresetsPanel />);

        fireEvent.click(screen.getByTestId('brush-presets-new-group'));
        fireEvent.change(screen.getByTestId('new-brush-group-name'), { target: { value: 'My Group' } });
        fireEvent.click(screen.getByTestId('new-brush-group-ok'));
        const newGroup = useEditorStore.getState().brushPresetGroups.find(group => group.name === 'My Group');
        expect(newGroup).toBeTruthy();
        expect(useEditorStore.getState().selectedBrushPresetGroupId).toBe(newGroup!.id);

        fireEvent.click(screen.getByTestId('brush-presets-new'));
        fireEvent.change(screen.getByTestId('new-brush-preset-name'), { target: { value: 'Grouped Brush' } });
        fireEvent.click(screen.getByTestId('new-brush-preset-include-tool-settings'));
        fireEvent.click(screen.getByTestId('new-brush-preset-capture-color'));
        fireEvent.click(screen.getByTestId('new-brush-preset-ok'));

        const preset = useEditorStore.getState().brushPresets[0];
        expect(preset.groupId).toBe(newGroup!.id);
        expect(screen.getByTestId(`brush-preset-row-${preset.id}`)).toBeTruthy();

        fireEvent.click(screen.getByTestId('brushes-panel-menu'));
        fireEvent.click(screen.getByTestId('brushes-get-more'));
        expect(openSpy).toHaveBeenCalledWith('https://www.adobe.com/products/photoshop/brushes.html', '_blank', 'noopener');
        expect(useEditorStore.getState().toasts[0].message).toContain('Opened Get More Brushes');
    });
});
