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
    let combinedMask = selectionMask;
    // Layer mask: if present and enabled, intersect with the selection mask so
    // pixels hidden by the mask are not modified by the adjustment.
    if (layer.mask && layer.mask.enabled) {
        const lm = layer.mask.ctx.getImageData(0, 0, width, height);
        const data = new Uint8ClampedArray(width * height * 4);
        for (let i = 0; i < lm.data.length; i += 4) {
            const luma = (0.299 * lm.data[i] + 0.587 * lm.data[i + 1] + 0.114 * lm.data[i + 2]);
            const sel = selectionMask ? selectionMask.data[i + 3] / 255 : 1;
            const a = Math.round(luma * sel);
            data[i] = 255; data[i + 1] = 255; data[i + 2] = 255; data[i + 3] = a;
        }
        combinedMask = new ImageData(data, width, height);
    }
    const result = blendWithMask(original, adjusted, combinedMask);

    layer.ctx.putImageData(result, 0, 0);
    layer.markDirty(null);
    return true;
}
