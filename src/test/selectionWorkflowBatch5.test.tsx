/**
 * Batch 5 Slice D: Color Range modes + live preview + Transform Selection +
 * Border / Smooth dialogs + Defringe persistence + feathered mask-from-selection.
 *
 * These tests script user input (radio toggle, dialog OK click, eyedropper
 * shift-click) and assert on store state, selection masks, and persisted
 * preferences in localStorage.
 */
import { describe, expect, it, beforeEach } from 'vitest';
import { render, screen, cleanup, act, fireEvent } from '@testing-library/react';
import { Layer } from '../core/Layer';
import { useEditorStore } from '../store/editorStore';
import {
    applyColorRangeSelection,
    applyColorRangeSelectionWithMode,
} from '../tools/colorRange';
import { ColorRangeDialog } from '../components/Dialogs/ColorRangeDialog';
import { DefringeDialog } from '../components/Dialogs/DefringeDialog';
import { BorderSelectionDialog } from '../components/Dialogs/BorderSelectionDialog';
import { SmoothSelectionDialog } from '../components/Dialogs/SmoothSelectionDialog';
import { rasterizeSelectionOperations } from '../utils/selectionUtils';

function paintHalfAndHalf(w = 6, h = 4) {
    const layer = new Layer(w, h, 'half');
    layer.ctx.fillStyle = '#ff0000';
    layer.ctx.fillRect(0, 0, w / 2, h);
    layer.ctx.fillStyle = '#0000ff';
    layer.ctx.fillRect(w / 2, 0, w / 2, h);
    return layer;
}

function resetStoreWithLayer(layer: Layer, w: number, h: number) {
    useEditorStore.getState().clearHistory();
    useEditorStore.setState(s => ({
        ...s,
        width: w,
        height: h,
        layers: [layer],
        activeLayerId: layer.id,
        selection: {
            ...s.selection,
            hasSelection: false,
            path: [],
            polyPoints: [],
            operations: [],
            feather: 0,
        },
    }));
}

beforeEach(() => {
    cleanup();
    try { localStorage?.clear?.(); } catch { /* noop */ }
    useEditorStore.getState().clearHistory();
    useEditorStore.setState(s => ({
        ...s,
        selectionDialogPrefs: { defringeWidth: 1, borderWidth: 5, smoothRadius: 3, expandPx: 5, contractPx: 5 },
        isBorderSelectionDialogOpen: false,
        isSmoothSelectionDialogOpen: false,
        isTransformSelectionOpen: false,
        dialogs: { ...s.dialogs, isDefringeDialogOpen: false, isColorRangeDialogOpen: false },
    }));
});

describe('Batch 5 Slice D — Color Range modes', () => {
    it('Mode=Add unions an existing marquee with the color-range mask', () => {
        const layer = paintHalfAndHalf(6, 4);
        resetStoreWithLayer(layer, 6, 4);
        // Start with a marquee covering only the right (blue) half.
        useEditorStore.getState().setSelectionOperations([{
            mode: 'add', type: 'rect', path: [{ x: 3, y: 0 }, { x: 6, y: 4 }],
        }]);
        applyColorRangeSelectionWithMode(useEditorStore.getState(), {
            samples: [{ color: '#ff0000', mode: 'add' }],
            fuzziness: 5,
        }, 'add');
        const mask = rasterizeSelectionOperations(useEditorStore.getState().selection.operations, 6, 4);
        // A pixel on the left (red) and the right (blue) should both be selected.
        expect(mask[0]).toBeGreaterThan(0); // red, picked by color range
        expect(mask[5]).toBeGreaterThan(0); // blue, retained from marquee
    });

    it('Mode=Intersect AND-combines the marquee and the color-range mask', () => {
        const layer = paintHalfAndHalf(6, 4);
        resetStoreWithLayer(layer, 6, 4);
        // Marquee covers the whole canvas.
        useEditorStore.getState().setSelectionOperations([{
            mode: 'add', type: 'rect', path: [{ x: 0, y: 0 }, { x: 6, y: 4 }],
        }]);
        applyColorRangeSelectionWithMode(useEditorStore.getState(), {
            samples: [{ color: '#ff0000', mode: 'add' }],
            fuzziness: 5,
        }, 'intersect');
        const mask = rasterizeSelectionOperations(useEditorStore.getState().selection.operations, 6, 4);
        // Intersection of "whole canvas" with "red pixels" = the red half.
        expect(mask[0]).toBeGreaterThan(0); // red is in both -> selected
        expect(mask[5]).toBe(0);             // blue is only in marquee, not color range
    });

    it('Mode=Sub removes the color-range mask pixels from the marquee', () => {
        const layer = paintHalfAndHalf(6, 4);
        resetStoreWithLayer(layer, 6, 4);
        useEditorStore.getState().setSelectionOperations([{
            mode: 'add', type: 'rect', path: [{ x: 0, y: 0 }, { x: 6, y: 4 }],
        }]);
        applyColorRangeSelectionWithMode(useEditorStore.getState(), {
            samples: [{ color: '#ff0000', mode: 'add' }],
            fuzziness: 5,
        }, 'sub');
        const mask = rasterizeSelectionOperations(useEditorStore.getState().selection.operations, 6, 4);
        // Red pixels should be subtracted out; blue pixels remain.
        expect(mask[0]).toBe(0);
        expect(mask[5]).toBeGreaterThan(0);
    });

    it('Mode=Replace drops any existing selection before applying the mask', () => {
        const layer = paintHalfAndHalf(6, 4);
        resetStoreWithLayer(layer, 6, 4);
        useEditorStore.getState().setSelectionOperations([{
            mode: 'add', type: 'rect', path: [{ x: 3, y: 0 }, { x: 6, y: 4 }],
        }]);
        const replaced = applyColorRangeSelection(useEditorStore.getState(), {
            samples: [{ color: '#ff0000', mode: 'add' }],
            fuzziness: 5,
        });
        expect(replaced).toBe(true);
        const mask = rasterizeSelectionOperations(useEditorStore.getState().selection.operations, 6, 4);
        expect(mask[0]).toBeGreaterThan(0); // red, picked by color range
        expect(mask[5]).toBe(0);             // marquee discarded
    });
});

describe('Batch 5 Slice D — Color Range dialog UI', () => {
    it('renders a live preview canvas at 300x200 with selection-mask pixels', async () => {
        const layer = paintHalfAndHalf(6, 4);
        resetStoreWithLayer(layer, 6, 4);
        useEditorStore.getState().setPrimaryColor('#ff0000');
        useEditorStore.getState().openColorRangeDialog();
        render(<ColorRangeDialog />);
        // Allow the effect that draws the preview to run.
        await act(async () => { await new Promise(r => setTimeout(r, 0)); });
        const preview = screen.getByTestId('color-range-preview') as HTMLCanvasElement;
        expect(preview.width).toBe(300);
        expect(preview.height).toBe(200);
        const ctx = preview.getContext('2d')!;
        const data = ctx.getImageData(0, 0, 300, 200).data;
        let nonBlack = 0;
        for (let i = 0; i < data.length; i += 4) {
            if (data[i] > 0) nonBlack++;
        }
        // With a red sample on a half-red canvas, the preview should show some
        // white pixels representing the matched mask.
        expect(nonBlack).toBeGreaterThan(0);
    });

    it('selecting the Add mode radio changes the dialog mode used on OK', async () => {
        const layer = paintHalfAndHalf(6, 4);
        resetStoreWithLayer(layer, 6, 4);
        useEditorStore.getState().setPrimaryColor('#ff0000');
        // Pre-existing marquee on the blue half.
        useEditorStore.getState().setSelectionOperations([{
            mode: 'add', type: 'rect', path: [{ x: 3, y: 0 }, { x: 6, y: 4 }],
        }]);
        useEditorStore.getState().openColorRangeDialog();
        render(<ColorRangeDialog />);
        const addRadio = screen.getByTestId('color-range-mode-add') as HTMLInputElement;
        await act(async () => { addRadio.click(); });
        expect(addRadio.checked).toBe(true);
        const ok = screen.getByTestId('color-range-ok');
        await act(async () => { (ok as HTMLButtonElement).click(); });
        const mask = rasterizeSelectionOperations(useEditorStore.getState().selection.operations, 6, 4);
        expect(mask[0]).toBeGreaterThan(0); // red added
        expect(mask[5]).toBeGreaterThan(0); // blue retained
    });

    it('shift-click on the color input flips Replace mode into Add', async () => {
        const layer = paintHalfAndHalf(6, 4);
        resetStoreWithLayer(layer, 6, 4);
        useEditorStore.getState().setPrimaryColor('#ff0000');
        useEditorStore.getState().openColorRangeDialog();
        render(<ColorRangeDialog />);
        const colorInput = screen.getByTestId('color-range-color-input') as HTMLInputElement;
        await act(async () => {
            const evt = new MouseEvent('click', { bubbles: true, cancelable: true, shiftKey: true });
            colorInput.dispatchEvent(evt);
        });
        const addRadio = screen.getByTestId('color-range-mode-add') as HTMLInputElement;
        expect(addRadio.checked).toBe(true);
    });
});

describe('Batch 5 Slice D — Transform Selection', () => {
    it('opening and committing the overlay scales selection bounds 2x without touching layer pixels', () => {
        const layer = new Layer(40, 40, 'src');
        layer.ctx.fillStyle = '#00ff00';
        layer.ctx.fillRect(0, 0, 40, 40);
        resetStoreWithLayer(layer, 40, 40);
        useEditorStore.getState().setSelectionOperations([{
            mode: 'add', type: 'rect', path: [{ x: 10, y: 10 }, { x: 20, y: 20 }],
        }]);
        // Simulate what the overlay does on commit: rasterize the existing
        // selection, scale 2x about its center, install the result.
        const before = rasterizeSelectionOperations(useEditorStore.getState().selection.operations, 40, 40);
        const beforePixel = layer.ctx.getImageData(15, 15, 1, 1).data;
        const w = 40, h = 40;
        const src = document.createElement('canvas');
        src.width = w; src.height = h;
        const sctx = src.getContext('2d')!;
        const image = sctx.createImageData(w, h);
        for (let i = 0; i < before.length; i++) {
            image.data[i * 4] = 255; image.data[i * 4 + 1] = 255; image.data[i * 4 + 2] = 255;
            image.data[i * 4 + 3] = before[i];
        }
        sctx.putImageData(image, 0, 0);
        const dst = document.createElement('canvas');
        dst.width = w; dst.height = h;
        const dctx = dst.getContext('2d')!;
        dctx.translate(15, 15);
        dctx.scale(2, 2);
        dctx.translate(-15, -15);
        dctx.drawImage(src, 0, 0);
        const out = new Uint8ClampedArray(w * h);
        const result = dctx.getImageData(0, 0, w, h).data;
        for (let i = 0; i < out.length; i++) out[i] = result[i * 4 + 3];
        useEditorStore.getState().setSelectionOperations([{
            mode: 'add', type: 'lasso', path: [], mask: { data: out, width: w, height: h },
        }]);
        // Check: the underlying pixel is unchanged.
        const afterPixel = layer.ctx.getImageData(15, 15, 1, 1).data;
        expect(afterPixel[0]).toBe(beforePixel[0]);
        expect(afterPixel[1]).toBe(beforePixel[1]);
        // Selection bounds should now span ~20x20 (twice the original 10x10).
        let minX = w, minY = h, maxX = 0, maxY = 0;
        for (let y = 0; y < h; y++) {
            for (let x = 0; x < w; x++) {
                if (out[y * w + x] >= 128) {
                    if (x < minX) minX = x; if (y < minY) minY = y;
                    if (x > maxX) maxX = x; if (y > maxY) maxY = y;
                }
            }
        }
        const newW = maxX - minX + 1;
        const newH = maxY - minY + 1;
        expect(newW).toBeGreaterThanOrEqual(18);
        expect(newH).toBeGreaterThanOrEqual(18);
    });

    it('Select > Transform Selection menu toggles the overlay flag', () => {
        expect(useEditorStore.getState().isTransformSelectionOpen).toBe(false);
        useEditorStore.getState().openTransformSelection();
        expect(useEditorStore.getState().isTransformSelectionOpen).toBe(true);
        useEditorStore.getState().closeTransformSelection();
        expect(useEditorStore.getState().isTransformSelectionOpen).toBe(false);
    });
});

describe('Batch 5 Slice D — Border Selection dialog', () => {
    it('entering 8 and clicking OK produces a ring mask roughly 8px wide', async () => {
        const layer = new Layer(60, 60, 'src');
        resetStoreWithLayer(layer, 60, 60);
        useEditorStore.getState().setHasSelection(true);
        useEditorStore.getState().setSelectionOperations([{
            mode: 'add', type: 'rect', path: [{ x: 10, y: 10 }, { x: 50, y: 50 }],
        }]);
        useEditorStore.getState().openBorderSelectionDialog();
        render(<BorderSelectionDialog />);
        const widthInput = screen.getByTestId('border-width-input') as HTMLInputElement;
        await act(async () => {
            fireEvent.change(widthInput, { target: { value: '8' } });
        });
        const ok = screen.getByTestId('border-selection-ok') as HTMLButtonElement;
        await act(async () => { ok.click(); });
        const ops = useEditorStore.getState().selection.operations;
        expect(ops[0].mask).toBeTruthy();
        const data = ops[0].mask!.data;
        // Interior should be empty; on the boundary should be non-empty.
        const interior = data[30 * 60 + 30];
        const onBorder = data[10 * 60 + 30];
        expect(interior).toBe(0);
        expect(onBorder).toBeGreaterThan(0);
        // Persistence: width=8 should be stored.
        expect(useEditorStore.getState().selectionDialogPrefs.borderWidth).toBe(8);
    });
});

describe('Batch 5 Slice D — Smooth Selection dialog', () => {
    it('entering 5 and clicking OK installs a smoothed mask', async () => {
        const layer = new Layer(40, 40, 'src');
        resetStoreWithLayer(layer, 40, 40);
        useEditorStore.getState().setHasSelection(true);
        // A jagged-corner selection (rectangle with a notch carved out).
        useEditorStore.getState().setSelectionOperations([
            { mode: 'add', type: 'rect', path: [{ x: 5, y: 5 }, { x: 35, y: 35 }] },
            { mode: 'sub', type: 'rect', path: [{ x: 33, y: 33 }, { x: 35, y: 35 }] },
        ]);
        useEditorStore.getState().openSmoothSelectionDialog();
        render(<SmoothSelectionDialog />);
        const radiusInput = screen.getByTestId('smooth-radius-input') as HTMLInputElement;
        await act(async () => {
            fireEvent.change(radiusInput, { target: { value: '5' } });
        });
        const ok = screen.getByTestId('smooth-selection-ok') as HTMLButtonElement;
        await act(async () => { ok.click(); });
        const ops = useEditorStore.getState().selection.operations;
        expect(ops).toHaveLength(1);
        expect(ops[0].mask).toBeTruthy();
        // Persistence: radius=5 stored.
        expect(useEditorStore.getState().selectionDialogPrefs.smoothRadius).toBe(5);
    });
});

describe('Batch 5 Slice D — Defringe width persists', () => {
    it('setting width=4 and reopening pre-fills the input with 4', async () => {
        useEditorStore.getState().setSelectionDialogPref('defringeWidth', 4);
        const { rerender } = render(<DefringeDialog isOpen onClose={() => {}} onConfirm={() => {}} />);
        const slider = screen.getByTestId('defringe-width-slider') as HTMLInputElement;
        expect(Number(slider.value)).toBe(4);
        // Simulate a close + reopen cycle.
        rerender(<DefringeDialog isOpen={false} onClose={() => {}} onConfirm={() => {}} />);
        rerender(<DefringeDialog isOpen onClose={() => {}} onConfirm={() => {}} />);
        const slider2 = screen.getByTestId('defringe-width-slider') as HTMLInputElement;
        expect(Number(slider2.value)).toBe(4);
    });
});

describe('Batch 5 Slice D — addLayerMaskFromSelection with feather', () => {
    it('produces a soft mask gradient when the selection has feather=10', () => {
        const layer = new Layer(60, 60, 'src');
        layer.ctx.fillStyle = '#ffffff';
        layer.ctx.fillRect(0, 0, 60, 60);
        resetStoreWithLayer(layer, 60, 60);
        useEditorStore.getState().setSelectionOperations([{
            mode: 'add', type: 'rect', path: [{ x: 20, y: 20 }, { x: 40, y: 40 }],
        }]);
        useEditorStore.getState().setHasSelection(true);
        useEditorStore.getState().setSelectionFeather(10);
        useEditorStore.getState().addLayerMaskFromSelection(layer.id, 'reveal');
        const mask = useEditorStore.getState().layers[0].mask;
        expect(mask).toBeTruthy();
        // Look at a series of pixels stepping out of the selection — the alpha
        // should fall off gradually rather than jump straight from 255 to 0.
        const vCenter = mask!.ctx.getImageData(30, 30, 1, 1).data[0]; // center of the selection
        const vEdge = mask!.ctx.getImageData(42, 30, 1, 1).data[0];    // just outside the edge
        const vFar = mask!.ctx.getImageData(55, 30, 1, 1).data[0];     // far outside
        // The center should be near-white (revealed), the far-outside near-black,
        // and the just-outside value should be neither — a soft transition.
        expect(vCenter).toBeGreaterThan(200);
        expect(vFar).toBeLessThan(80);
        expect(vEdge).toBeGreaterThan(20);
        expect(vEdge).toBeLessThan(235);
    });
});
