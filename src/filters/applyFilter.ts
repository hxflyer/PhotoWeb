import type { Layer } from '../core/Layer';
import type { SelectionState } from '../store/types';
import { getFilter } from './registry';
import { buildSelectionMask, blendWithMask, buildEffectiveMask } from './selectionMask';

/**
 * Applies a registered filter to a layer, respecting the active selection,
 * the layer's mask (density + feather), and the dirty rect.
 *
 * If `layer.dirtyRect` is non-null, it is threaded through `FilterApplyContext`
 * so the filter only walks that region. Filters that honor `dirtyRect` are
 * expected to leave pixels outside that rect equal to the input — so the
 * downstream `blendWithMask` and `putImageData` paths see correct values
 * across the whole canvas. When `layer.dirtyRect` is null the filter walks
 * the full image (legacy behavior, preserved for backwards compatibility).
 *
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

    const effectiveMask = buildEffectiveMask(selection, layer.mask, w, h);
    const result = blendWithMask(original, filtered, effectiveMask);
    layer.ctx.putImageData(result, 0, 0);
    layer.markDirty(null);
    return true;
}
