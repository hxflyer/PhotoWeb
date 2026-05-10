import type { Layer } from '../core/Layer';
import type { SelectionState } from '../store/types';
import { buildSelectionMask, blendWithMask } from '../filters/selectionMask';
import { getAdjustment } from './registry';

/**
 * Applies an Image > Adjustments command directly to the active layer.
 * If a selection exists, only selected pixels are replaced; otherwise the full
 * layer is adjusted, matching Photoshop's destructive adjustment command model.
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
    const adjusted = adjustment.apply(
        { ...adjustment.defaultParams, ...params },
        { image: original, width, height },
    );
    const selectionMask = buildSelectionMask(selection, width, height);
    const result = blendWithMask(original, adjusted, selectionMask);

    layer.ctx.putImageData(result, 0, 0);
    layer.markDirty(null);
    return true;
}
