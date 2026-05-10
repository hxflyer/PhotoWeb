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

    const result = blendWithMask(original, filtered, selectionMask);
    layer.ctx.putImageData(result, 0, 0);
    layer.markDirty(null);
    return true;
}
