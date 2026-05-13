import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { BrushPresetsPanel } from '../components/Panels/BrushPresetsPanel';
import { Viewport } from '../components/Canvas/Viewport';
import { Layer } from '../core/Layer';
import { applyBrushDab } from '../utils/brushEngine';
import {
    getBrushDynamicsOptions,
    resetBrushDynamicsOptions,
    resolveBrushDynamicDabs,
    setBrushDynamicsOptions,
} from '../utils/brushDynamics';
import { useEditorStore } from '../store/editorStore';
import { setBrushOptions } from '../tools/brush';

function setCanvasRect(canvas: HTMLCanvasElement, width = 48, height = 48) {
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

function resetStore() {
    resetBrushDynamicsOptions();
    setBrushOptions({ mode: 'source-over', smoothing: 0, spacing: 0.15, pressureSize: false, pressureOpacity: false });
    const layer = new Layer(48, 48, 'Brush dynamics target');
    useEditorStore.setState((s) => ({
        ...s,
        width: 48,
        height: 48,
        zoom: 1,
        pan: { x: 0, y: 0 },
        layers: [layer],
        activeLayerId: layer.id,
        selectedLayerIds: [layer.id],
        layerSelectionAnchorId: layer.id,
        activeTool: 'brush',
        primaryColor: '#ff0000',
        secondaryColor: '#0000ff',
        brushSettings: { size: 6, hardness: 1, opacity: 1, flow: 1 },
        selection: { ...s.selection, hasSelection: false, path: [], operations: [], polyPoints: [], isDraggingSelection: false },
        quickMaskMode: false,
    }));
    useEditorStore.getState().clearHistory();
    return layer;
}

function buffers(width = 16, height = 16) {
    const base = new Uint8ClampedArray(width * height * 4);
    return {
        width,
        height,
        base,
        work: new Uint8ClampedArray(base),
        coverage: new Float32Array(width * height),
    };
}

function alphaAt(work: Uint8ClampedArray, width: number, x: number, y: number): number {
    return work[((y * width + x) * 4) + 3];
}

describe('21 brush dynamics', () => {
    beforeEach(resetStore);
    afterEach(() => {
        cleanup();
        resetBrushDynamicsOptions();
    });

    it('Brush Settings tab exposes Photoshop-style dynamics sections and controls', () => {
        render(<BrushPresetsPanel />);

        fireEvent.click(screen.getByTestId('brushes-panel-tab-settings'));
        fireEvent.click(screen.getByTestId('brush-dynamics-shape-tab'));
        fireEvent.click(screen.getByTestId('brush-dynamics-shape-enabled'));
        fireEvent.change(screen.getByTestId('brush-shape-size-control'), { target: { value: 'fade' } });
        fireEvent.change(screen.getByTestId('brush-shape-size-jitter'), { target: { value: '0.5' } });
        fireEvent.click(screen.getByTestId('brush-dynamics-scattering-tab'));
        fireEvent.click(screen.getByTestId('brush-dynamics-scattering-enabled'));
        fireEvent.change(screen.getByTestId('brush-scatter-count'), { target: { value: '4' } });

        const options = getBrushDynamicsOptions();
        expect(options.shape.enabled).toBe(true);
        expect(options.shape.sizeControl).toBe('fade');
        expect(options.shape.sizeJitter).toBeCloseTo(0.5);
        expect(options.scattering.enabled).toBe(true);
        expect(options.scattering.count).toBe(4);
    });

    it('resolves size, scattering, color, opacity, and flow per brush stamp', () => {
        setBrushDynamicsOptions({
            shape: { enabled: true, sizeControl: 'fade', sizeFadeSteps: 2, minDiameter: 0.25, sizeJitter: 0.25 },
            scattering: { enabled: true, scatter: 1.5, bothAxes: true, count: 4, countJitter: 0 },
            colorDynamics: { enabled: true, foregroundBackgroundJitter: 1, hueJitter: 0.25, saturationJitter: 0.25, brightnessJitter: 0.25, purity: -1 },
            otherDynamics: { enabled: true, opacityControl: 'fade', opacityFadeSteps: 2, flowJitter: 0.5 },
        });

        const first = resolveBrushDynamicDabs({
            x: 20,
            y: 20,
            baseSize: 10,
            opacity: 1,
            flow: 1,
            primaryColor: '#ff0000',
            secondaryColor: '#0000ff',
            dabIndex: 0,
        });
        const faded = resolveBrushDynamicDabs({
            x: 20,
            y: 20,
            baseSize: 10,
            opacity: 1,
            flow: 1,
            primaryColor: '#ff0000',
            secondaryColor: '#0000ff',
            dabIndex: 2,
        });

        expect(first).toHaveLength(4);
        expect(first.some(dab => Math.hypot(dab.x - 20, dab.y - 20) > 1)).toBe(true);
        expect(first.some(dab => dab.color.g > 0 || dab.color.b > 0 || dab.color.r < 255)).toBe(true);
        expect(faded[0].size).toBeLessThan(first[0].size);
        expect(faded[0].opacity).toBe(0);
        expect(first[0].flow).toBeLessThan(1);
    });

    it('texture and dual brush options modulate stamped alpha in the brush engine', () => {
        const plain = buffers();
        applyBrushDab({
            ...plain,
            x: 8,
            y: 8,
            size: 12,
            hardness: 1,
            opacity: 1,
            flow: 1,
            color: { r: 0, g: 0, b: 0 },
            mode: 'paint',
        });

        const dynamic = buffers();
        applyBrushDab({
            ...dynamic,
            x: 8,
            y: 8,
            size: 12,
            hardness: 1,
            opacity: 1,
            flow: 1,
            color: { r: 0, g: 0, b: 0 },
            mode: 'paint',
            dynamics: {
                seed: 5,
                texture: {
                    enabled: true,
                    pattern: 'checker',
                    mode: 'multiply',
                    scale: 4,
                    depth: 0.8,
                    invert: false,
                    textureEachTip: false,
                    minDepth: 0,
                    depthJitter: 0,
                },
                dualBrush: {
                    enabled: true,
                    diameter: 4,
                    spacing: 1,
                    scatter: 0,
                    count: 1,
                    mode: 'multiply',
                    flip: false,
                },
            },
        });

        expect(alphaAt(dynamic.work, dynamic.width, 5, 8)).toBeLessThan(alphaAt(plain.work, plain.width, 5, 8));
    });

    it('viewport painting uses enabled scattering dynamics for real pixels', () => {
        const layer = resetStore();
        setBrushDynamicsOptions({
            scattering: { enabled: true, scatter: 2, bothAxes: true, count: 4, countJitter: 0 },
        });
        const { container } = render(<Viewport />);
        const workarea = screen.getByTestId('viewport-workarea');
        const canvas = container.querySelector('canvas') as HTMLCanvasElement;
        setCanvasRect(canvas);

        fireEvent.mouseDown(workarea, { clientX: 24, clientY: 24, button: 0, buttons: 1 });
        fireEvent.mouseUp(workarea, { clientX: 24, clientY: 24, button: 0, buttons: 0 });

        const image = layer.ctx.getImageData(0, 0, 48, 48).data;
        let scatteredPixels = 0;
        for (let y = 0; y < 48; y++) {
            for (let x = 0; x < 48; x++) {
                const alpha = image[(y * 48 + x) * 4 + 3];
                if (alpha > 0 && Math.hypot(x - 24, y - 24) > 6) scatteredPixels++;
            }
        }
        expect(scatteredPixels).toBeGreaterThan(0);
    });
});
