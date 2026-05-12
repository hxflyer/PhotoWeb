import type { RefineEdgeOptions, SelectionOperation } from '../store/types';
import { rasterizeSelectionOperations as rasterizeSelection } from './selectionUtils';
import { applyMaskContrast, blurMask, computeGradientMagnitude, smoothMaskMedian } from './maskOps';

/**
 * Pure refine pipeline used by RefineEdgeDialog's live preview. Mirrors the
 * math in `selectionSlice.refineEdge` but operates on input ops + opts and
 * returns a `SelectionOperation` without touching the store / history.
 *
 * Returns `null` when the input is empty.
 */
export function computeRefinedSelectionOperation(
    operations: SelectionOperation[],
    opts: RefineEdgeOptions,
    width: number,
    height: number,
    layerImage: ImageData | null,
): SelectionOperation | null {
    if (operations.length === 0) return null;
    let mask = rasterizeSelection(operations, width, height);
    if (opts.shiftEdge !== 0) {
        const px = Math.round(Math.abs(opts.shiftEdge) * 0.5);
        if (px > 0) mask = blurMask(mask, width, height, px);
        const threshold = opts.shiftEdge > 0 ? 64 : 192;
        for (let i = 0; i < mask.length; i++) mask[i] = mask[i] >= threshold ? 255 : 0;
    }
    if (opts.radius > 0) {
        if (opts.smartRadius && layerImage) {
            const gradient = computeGradientMagnitude(layerImage, width, height);
            const fullBlur = blurMask(mask, width, height, opts.radius);
            const lightBlur = blurMask(mask, width, height, 1);
            const out = new Uint8ClampedArray(mask.length);
            const threshold = 60;
            for (let i = 0; i < mask.length; i++) {
                const g = Math.min(1, gradient[i] / threshold);
                const t = Math.min(0.8, g);
                out[i] = Math.round(fullBlur[i] * (1 - t) + lightBlur[i] * t);
            }
            mask = out;
        } else {
            mask = blurMask(mask, width, height, opts.radius);
        }
    }
    if (opts.smooth > 0) mask = smoothMaskMedian(mask, width, height, opts.smooth);
    if (opts.feather > 0) {
        // Feather is the visible softening at the selection edge. Apply a
        // gaussian-style blur to the alpha so the live preview reflects what
        // the eventual mask will look like, not just the global slice
        // `feather` value (which only applies on `addLayerMaskFromSelection`).
        mask = blurMask(mask, width, height, Math.round(opts.feather));
    }
    if (opts.contrast > 0) mask = applyMaskContrast(mask, opts.contrast);
    return {
        mode: 'add',
        type: 'lasso',
        path: [],
        mask: { data: mask, width, height },
    };
}
