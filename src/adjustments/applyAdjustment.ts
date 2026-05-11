import type { Layer } from '../core/Layer';
import type { SelectionState } from '../store/types';
import { buildSelectionMask, blendWithMask, buildEffectiveMask } from '../filters/selectionMask';
import { getAdjustment } from './registry';

/**
 * Applies an Image > Adjustments command directly to the active layer.
 * If a selection exists, only selected pixels are replaced; otherwise the full
 * layer is adjusted, matching Photoshop's destructive adjustment command model.
 *
 * The blend back to the layer canvas respects:
 *  - the selection's feather (via buildSelectionMask)
 *  - the layer's mask, including its density and feather (via buildEffectiveMask)
 */
export function applyAdjustmentToLayer(
    layer: Layer,
    adjustmentId: string,
    params: Record<string, unknown>,
    selection: SelectionState,
): boolean {
    const adjustment = getAdjustment(adjustmentId);
    if (!adjustment) return false;

    const width = layer.canvas.width;
    const height = layer.canvas.height;
    const original = layer.ctx.getImageData(0, 0, width, height);
    const selectionMask = buildSelectionMask(selection, width, height);
    const dirtyRect = layer.dirtyRect ?? null;
    const adjusted = adjustment.apply(
        { ...adjustment.defaultParams, ...params },
        { image: original, width, height, selectionMask, dirtyRect },
    );
    const effectiveMask = buildEffectiveMask(selection, layer.mask, width, height);
    const result = blendWithMask(original, adjusted, effectiveMask);

    layer.ctx.putImageData(result, 0, 0);
    layer.markDirty(null);
    return true;
}
