/**
 * Batch B — selection-dialog completion tests.
 * Items 1+2: Select-and-Mask View Mode preview and Output To destinations.
 * Items 3+4: Color Range Select preset dropdown and Localized Color Clusters.
 */
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { cleanup, fireEvent, render } from '@testing-library/react';
import { useEditorStore } from '../store/editorStore';
import { ensureStubsRegistered } from '../tools/stubs';
import { Layer } from '../core/Layer';
import { RefineEdgeDialog } from '../components/Dialogs/RefineEdgeDialog';
import { ColorRangeDialog } from '../components/Dialogs/ColorRangeDialog';
import {
    renderSelectAndMaskToImageData,
    type SelectAndMaskViewMode,
} from '../utils/selectAndMaskCompositor';
import { buildColorRangeMask } from '../tools/colorRange';
import {
    colorRangeMaskFromPreset,
    type ColorRangePresetId,
} from '../tools/colorRangePresets';
import { computeRefinedSelectionOperation } from '../utils/refineEdgePreview';
import { rasterizeSelectionOperations } from '../utils/selectionUtils';

ensureStubsRegistered();

function installDocWithSelectedLayer(): Layer {
    const layer = new Layer(40, 40, 'L');
    layer.ctx.fillStyle = '#ff0000';
    layer.ctx.fillRect(0, 0, 40, 40);
    useEditorStore.setState(s => ({
        ...s,
        width: 40,
        height: 40,
        layers: [layer],
        activeLayerId: layer.id,
        selectedLayerIds: [layer.id],
        layerSelectionAnchorId: layer.id,
        selection: {
            ...s.selection,
            hasSelection: true,
            path: [],
            operations: [{
                mode: 'add',
                type: 'rect',
                path: [{ x: 10, y: 10 }, { x: 30, y: 30 }],
            }],
            polyPoints: [],
            isDraggingSelection: false,
        },
    }));
    return layer;
}

beforeEach(() => {
    useEditorStore.getState().clearHistory();
    try { localStorage?.clear?.(); } catch { /* noop */ }
});

afterEach(() => cleanup());

describe('Batch B Item 1 — Refine Edge View Mode preview', () => {
    it('renderSelectAndMaskToImageData paints "On Black" with selected pixels visible and deselected pixels black', () => {
        const width = 4, height = 1;
        const source = new ImageData(width, height);
        for (let i = 0; i < width; i++) {
            source.data[i * 4] = 200;
            source.data[i * 4 + 1] = 100;
            source.data[i * 4 + 2] = 50;
            source.data[i * 4 + 3] = 255;
        }
        const mask = new Uint8ClampedArray([255, 255, 0, 0]);
        const out = renderSelectAndMaskToImageData(width, height, mask, source, null, 'on-black');
        expect(out.data[0]).toBe(200);
        expect(out.data[1]).toBe(100);
        expect(out.data[2]).toBe(50);
        expect(out.data[8]).toBe(0);
        expect(out.data[9]).toBe(0);
        expect(out.data[10]).toBe(0);
    });

    it('On White composites deselected pixels to white background', () => {
        const source = new ImageData(2, 1);
        source.data.set([200, 0, 0, 255], 0);
        source.data.set([0, 0, 0, 255], 4);
        const mask = new Uint8ClampedArray([255, 0]);
        const out = renderSelectAndMaskToImageData(2, 1, mask, source, null, 'on-white');
        expect(out.data[0]).toBe(200);
        expect(out.data[4]).toBe(255);
        expect(out.data[5]).toBe(255);
        expect(out.data[6]).toBe(255);
    });

    it('Black & White view renders the refined alpha as a grayscale mask', () => {
        const source = new ImageData(2, 1);
        const mask = new Uint8ClampedArray([0, 255]);
        const out = renderSelectAndMaskToImageData(2, 1, mask, source, null, 'black-and-white');
        expect(out.data[0]).toBe(0);
        expect(out.data[1]).toBe(0);
        expect(out.data[2]).toBe(0);
        expect(out.data[4]).toBe(255);
        expect(out.data[5]).toBe(255);
        expect(out.data[6]).toBe(255);
    });

    it('Overlay view tints deselected pixels red without losing the source colour entirely', () => {
        const source = new ImageData(1, 1);
        source.data.set([50, 100, 150, 255], 0);
        const mask = new Uint8ClampedArray([0]);
        const out = renderSelectAndMaskToImageData(1, 1, mask, source, null, 'overlay');
        expect(out.data[0]).toBe(255);
        expect(out.data[1]).toBe(0);
        expect(out.data[2]).toBe(0);
    });

    it('selecting a view mode in the dialog updates the SelectAndMaskCanvas data attribute', () => {
        installDocWithSelectedLayer();
        render(<RefineEdgeDialog isOpen onClose={() => {}} />);
        const select = document.querySelector('[data-testid="refine-edge-view-mode"]') as HTMLSelectElement;
        expect(select).toBeTruthy();
        fireEvent.change(select, { target: { value: 'on-black' } });
        const canvas = document.querySelector('[data-testid="select-and-mask-canvas"]') as HTMLElement;
        expect(canvas.getAttribute('data-view-mode')).toBe('on-black');
        const allModes: SelectAndMaskViewMode[] = [
            'onion-skin', 'marching-ants', 'overlay', 'on-black', 'on-white', 'black-and-white', 'on-layers',
        ];
        const offered = Array.from(select.options).map(o => o.value);
        for (const m of allModes) expect(offered).toContain(m);
        expect(offered).not.toContain('on-transparent');
    });
});

describe('Batch B Item 2 — Refine Edge Output To destinations', () => {
    it('Output To: New Layer creates a layer carrying the masked content', () => {
        const layer = installDocWithSelectedLayer();
        const before = useEditorStore.getState().layers.length;
        useEditorStore.getState().applyRefineEdgeOutput(
            { radius: 0, smooth: 0, feather: 0, contrast: 0, shiftEdge: 0, smartRadius: false },
            'new-layer',
        );
        const state = useEditorStore.getState();
        expect(state.layers.length).toBe(before + 1);
        const fresh = state.layers[state.layers.length - 1];
        expect(fresh.id).not.toBe(layer.id);
        const out = fresh.ctx.getImageData(5, 5, 1, 1).data;
        expect(out[3]).toBe(0);
        const inside = fresh.ctx.getImageData(20, 20, 1, 1).data;
        expect(inside[3]).toBe(255);
    });

    it('Output To: New Layer with Layer Mask creates a layer with the alpha as its mask', () => {
        installDocWithSelectedLayer();
        const before = useEditorStore.getState().layers.length;
        useEditorStore.getState().applyRefineEdgeOutput(
            { radius: 0, smooth: 0, feather: 0, contrast: 0, shiftEdge: 0, smartRadius: false },
            'new-layer-with-mask',
        );
        const state = useEditorStore.getState();
        expect(state.layers.length).toBe(before + 1);
        const fresh = state.layers[state.layers.length - 1];
        expect(fresh.mask).toBeTruthy();
    });

    it('Output To: New Document replaces the document with the cutout', () => {
        installDocWithSelectedLayer();
        useEditorStore.getState().applyRefineEdgeOutput(
            { radius: 0, smooth: 0, feather: 0, contrast: 0, shiftEdge: 0, smartRadius: false },
            'new-document',
        );
        const state = useEditorStore.getState();
        expect(state.layers.length).toBe(1);
        expect(state.documentName).toBe('Untitled');
        expect(state.selection.hasSelection).toBe(false);
    });

    it('applyRefineEdgeOutput records a single history entry covering refine + mask', () => {
        installDocWithSelectedLayer();
        const beforeEntries = useEditorStore.getState().historyEntries.length;
        useEditorStore.getState().applyRefineEdgeOutput(
            { radius: 0, smooth: 0, feather: 0, contrast: 0, shiftEdge: 0, smartRadius: false },
            'new-layer-with-mask',
        );
        const after = useEditorStore.getState();
        expect(after.historyEntries.length).toBe(beforeEntries + 1);
        const layersAfter = after.layers.length;
        useEditorStore.getState().undo();
        const afterUndo = useEditorStore.getState();
        expect(afterUndo.layers.length).toBe(layersAfter - 1);
    });
});

// -------------------------------------------------------------------------
// Item 3: Color Range Select preset dropdown
// -------------------------------------------------------------------------

describe('Batch B Item 3 — Color Range Select preset dropdown', () => {
    it('Reds preset selects saturated red and rejects pure green', () => {
        const img = new ImageData(3, 1);
        img.data.set([255, 0, 0, 255], 0);
        img.data.set([0, 255, 0, 255], 4);
        img.data.set([128, 128, 128, 255], 8);
        const mask = colorRangeMaskFromPreset(img, 'reds');
        expect(mask.data[0]).toBe(255);
        expect(mask.data[1]).toBe(0);
        expect(mask.data[2]).toBe(0); // gray (no saturation) excluded
    });

    it('Highlights preset selects the brightest pixels', () => {
        const img = new ImageData(3, 1);
        img.data.set([255, 255, 255, 255], 0);
        img.data.set([128, 128, 128, 255], 4);
        img.data.set([0, 0, 0, 255], 8);
        const mask = colorRangeMaskFromPreset(img, 'highlights');
        expect(mask.data[0]).toBe(255);
        expect(mask.data[2]).toBe(0);
    });

    it('Shadows preset selects the darkest pixels', () => {
        const img = new ImageData(3, 1);
        img.data.set([255, 255, 255, 255], 0);
        img.data.set([128, 128, 128, 255], 4);
        img.data.set([20, 20, 20, 255], 8);
        const mask = colorRangeMaskFromPreset(img, 'shadows');
        expect(mask.data[0]).toBe(0);
        expect(mask.data[2]).toBe(255);
    });

    it('Skin Tones preset selects a typical light skin pixel', () => {
        const img = new ImageData(2, 1);
        img.data.set([224, 172, 105, 255], 0); // typical light skin
        img.data.set([0, 0, 255, 255], 4);     // saturated blue
        const mask = colorRangeMaskFromPreset(img, 'skin-tones');
        expect(mask.data[0]).toBe(255);
        expect(mask.data[1]).toBe(0);
    });

    it('Dialog Select dropdown exposes the named presets', () => {
        useEditorStore.setState(s => ({
            ...s,
            width: 4,
            height: 1,
            layers: [],
            activeLayerId: null,
            dialogs: { ...s.dialogs, isColorRangeDialogOpen: true },
        }));
        render(<ColorRangeDialog />);
        const presetSelect = document.querySelector('[data-testid="color-range-preset"]') as HTMLSelectElement;
        expect(presetSelect).toBeTruthy();
        const opts = Array.from(presetSelect.options).map(o => o.value);
        const expected: ColorRangePresetId[] = [
            'sampled', 'reds', 'yellows', 'greens', 'cyans', 'blues', 'magentas',
            'highlights', 'midtones', 'shadows', 'skin-tones',
        ];
        for (const id of expected) expect(opts).toContain(id);
    });

    it('buildColorRangeMask honors the preset and ignores the sample list', () => {
        const img = new ImageData(2, 1);
        img.data.set([255, 255, 255, 255], 0);
        img.data.set([0, 0, 0, 255], 4);
        const mask = buildColorRangeMask(img, {
            samples: [{ color: '#ff0000', mode: 'add' }],
            fuzziness: 0,
            preset: 'highlights',
        });
        expect(mask.data[0]).toBe(255);
        expect(mask.data[1]).toBe(0);
    });
});

// -------------------------------------------------------------------------
// Item 4: Localized Color Clusters + Range slider
// -------------------------------------------------------------------------

describe('Batch B Item 4 — Localized Color Clusters', () => {
    it('buildColorRangeMask without range matches every pixel, regardless of distance', () => {
        const image = new ImageData(5, 1);
        for (let i = 0; i < 5; i++) image.data.set([255, 0, 0, 255], i * 4);
        const unlimited = buildColorRangeMask(image, {
            samples: [{ color: '#ff0000', mode: 'add', x: 0, y: 0 }],
            fuzziness: 0,
        });
        expect([...unlimited.data]).toEqual([255, 255, 255, 255, 255]);
    });

    it('Range gate restricts matches to pixels within range px of the sampled origin', () => {
        const image = new ImageData(5, 1);
        for (let i = 0; i < 5; i++) image.data.set([255, 0, 0, 255], i * 4);
        const localised = buildColorRangeMask(image, {
            samples: [{ color: '#ff0000', mode: 'add', x: 0, y: 0 }],
            fuzziness: 0,
            range: 2,
        });
        expect(localised.data[0]).toBe(255);
        expect(localised.data[1]).toBe(255);
        expect(localised.data[2]).toBe(255);
        expect(localised.data[3]).toBe(0);
        expect(localised.data[4]).toBe(0);
    });

    it('feather slider visibly softens the refined alpha in the preview pipeline', () => {
        const ops = [{ mode: 'add' as const, type: 'rect' as const, path: [{ x: 10, y: 10 }, { x: 30, y: 30 }] }];
        const noFeather = computeRefinedSelectionOperation(ops, { radius: 0, smooth: 0, feather: 0, contrast: 0, shiftEdge: 0, smartRadius: false }, 40, 40, null);
        const withFeather = computeRefinedSelectionOperation(ops, { radius: 0, smooth: 0, feather: 6, contrast: 0, shiftEdge: 0, smartRadius: false }, 40, 40, null);
        expect(noFeather).not.toBeNull();
        expect(withFeather).not.toBeNull();
        const baseline = noFeather!.mask!.data;
        const softened = withFeather!.mask!.data;
        // Pixel just outside the rect (9,20) should be 0 without feather but
        // > 0 with feather.
        const idx = 9 * 40 + 20;
        expect(baseline[idx]).toBe(0);
        expect(softened[idx]).toBeGreaterThan(0);
    });

    it('Remember Settings persists the last-used Refine Edge sliders across opens', () => {
        installDocWithSelectedLayer();
        const { container, rerender } = render(<RefineEdgeDialog isOpen onClose={() => {}} />);
        const sliders = container.querySelectorAll('input[type="range"]');
        fireEvent.change(sliders[0], { target: { value: '18' } });
        const remember = document.querySelector('[data-testid="refine-edge-remember"]') as HTMLInputElement;
        fireEvent.click(remember);
        const ok = document.querySelector('[data-testid="refine-edge-ok"]') as HTMLButtonElement;
        fireEvent.click(ok);
        const prefs = useEditorStore.getState().selectionDialogPrefs.refineEdge;
        expect(prefs.remember).toBe(true);
        expect(prefs.radius).toBe(18);
        rerender(<RefineEdgeDialog isOpen={false} onClose={() => {}} />);
        installDocWithSelectedLayer();
        rerender(<RefineEdgeDialog isOpen onClose={() => {}} />);
        const reopened = container.querySelectorAll('input[type="range"]');
        expect((reopened[0] as HTMLInputElement).value).toBe('18');
    });

    it('the live-preview feather slider visibly softens the dialog selection mask', () => {
        installDocWithSelectedLayer();
        const { container } = render(<RefineEdgeDialog isOpen onClose={() => {}} />);
        const sliders = container.querySelectorAll('input[type="range"]');
        fireEvent.change(sliders[2], { target: { value: '6' } });
        const state = useEditorStore.getState();
        const mask = rasterizeSelectionOperations(state.selection.operations, state.width, state.height);
        const edgeIdx = 9 * state.width + 20;
        expect(mask[edgeIdx]).toBeGreaterThan(0);
        expect(mask[edgeIdx]).toBeLessThan(255);
    });

    it('Dialog reveals the Range slider when Localized Color Clusters is enabled', () => {
        useEditorStore.setState(s => ({
            ...s,
            width: 4,
            height: 1,
            layers: [],
            activeLayerId: null,
            dialogs: { ...s.dialogs, isColorRangeDialogOpen: true },
        }));
        render(<ColorRangeDialog />);
        // Range slider should NOT be present yet.
        expect(document.querySelector('[data-testid="color-range-range-slider"]')).toBeNull();
        const cb = document.querySelector('[data-testid="color-range-localized"]') as HTMLInputElement;
        expect(cb).toBeTruthy();
        fireEvent.click(cb);
        const slider = document.querySelector('[data-testid="color-range-range-slider"]') as HTMLInputElement;
        expect(slider).toBeTruthy();
    });
});
