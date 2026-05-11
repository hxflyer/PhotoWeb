import type { Layer } from '../core/Layer';
import type { SelectionState } from '../store/types';
import { getFilter } from './registry';
import { buildSelectionMask, blendWithMask } from './selectionMask';

/**
 * Applies a registered filter to a layer, respecting the active selection and dirty rect.
 * Writes the result back to layer.canvas and calls layer.markDirty(null).
 */
export function applyFilterToLayer(
    layer: Layer,
    filterId: string,
    params: Record<string, unknown>,
    selection: SelectionState,
): boolean {
    const filter = getFilter(filterId);
    if (!filter) return false;

    const w = layer.canvas.width;
    const h = layer.canvas.height;

    const original = layer.ctx.getImageData(0, 0, w, h);
    const selectionMask = buildSelectionMask(selection, w, h);
    const dirtyRect = layer.dirtyRect ?? null;

    const filtered = filter.apply(params, {
        image: original,
        width: w,
        height: h,
        selectionMask,
        dirtyRect,
    });

    let combinedMask = selectionMask;
    if (layer.mask && layer.mask.enabled) {
        const lm = layer.mask.ctx.getImageData(0, 0, w, h);
        const data = new Uint8ClampedArray(w * h * 4);
        for (let i = 0; i < lm.data.length; i += 4) {
            const luma = (0.299 * lm.data[i] + 0.587 * lm.data[i + 1] + 0.114 * lm.data[i + 2]);
            const sel = selectionMask ? selectionMask.data[i + 3] / 255 : 1;
            const a = Math.round(luma * sel);
            data[i] = 255; data[i + 1] = 255; data[i + 2] = 255; data[i + 3] = a;
        }
        combinedMask = new ImageData(data, w, h);
    }

    const result = blendWithMask(original, filtered, combinedMask);
    layer.ctx.putImageData(result, 0, 0);
    layer.markDirty(null);
    return true;
}
