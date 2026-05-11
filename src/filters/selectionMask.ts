import type { SelectionState } from '../store/types';
import type { LayerMask } from '../core/Layer';

/**
 * Rasterises the current selection state into an ImageData alpha mask.
 * Alpha = 255 means fully selected; 0 means not selected.
 * If sel.feather > 0, the rasterized alpha is blurred by that radius so the
 * mask seen by filters/adjustments matches the marching-ants overlay.
 * Returns null when there is no active selection (treat as full-image selected).
 */
export function buildSelectionMask(sel: SelectionState, width: number, height: number): ImageData | null {
    if (!sel.hasSelection || sel.operations.length === 0) return null;

    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d')!;

    for (const op of sel.operations) {
        ctx.save();
        ctx.globalCompositeOperation = op.mode === 'add' ? 'source-over' : 'destination-out';
        ctx.fillStyle = 'white';
        if (op.mask) {
            // Raster mask op (e.g., from intersect, magic wand, refine edge):
            // paint its alpha into the mask canvas through a temp.
            const tmp = document.createElement('canvas');
            tmp.width = op.mask.width; tmp.height = op.mask.height;
            const tctx = tmp.getContext('2d');
            if (tctx) {
                const img = tctx.createImageData(op.mask.width, op.mask.height);
                for (let i = 0; i < op.mask.data.length; i++) {
                    img.data[i * 4] = 255; img.data[i * 4 + 1] = 255; img.data[i * 4 + 2] = 255;
                    img.data[i * 4 + 3] = op.mask.data[i];
                }
                tctx.putImageData(img, 0, 0);
                ctx.drawImage(tmp, 0, 0);
            }
        } else {
            ctx.beginPath();
            if (op.type === 'rect') {
                const [a, b] = op.path;
                if (a && b) ctx.rect(a.x, a.y, b.x - a.x, b.y - a.y);
            } else if (op.type === 'circle') {
                const [a, b] = op.path;
                if (a && b) {
                    const cx = (a.x + b.x) / 2;
                    const cy = (a.y + b.y) / 2;
                    ctx.ellipse(cx, cy, Math.abs(b.x - a.x) / 2, Math.abs(b.y - a.y) / 2, 0, 0, Math.PI * 2);
                }
            } else {
                if (op.path.length > 0) {
                    ctx.moveTo(op.path[0].x, op.path[0].y);
                    for (let i = 1; i < op.path.length; i++) ctx.lineTo(op.path[i].x, op.path[i].y);
                    ctx.closePath();
                }
            }
            ctx.fill();
        }
        ctx.restore();
    }

    const feather = Math.max(0, sel.feather ?? 0);
    if (feather > 0) {
        // Box-blur the alpha channel separably. Browser-native CSS blur via
        // canvas filter would be simpler but is unavailable in node-canvas
        // tests; this implementation works in both.
        const img = ctx.getImageData(0, 0, width, height);
        const alpha = new Uint8ClampedArray(width * height);
        for (let i = 0; i < alpha.length; i++) alpha[i] = img.data[i * 4 + 3];
        const blurred = boxBlurAlpha(alpha, width, height, Math.round(feather));
        for (let i = 0; i < blurred.length; i++) img.data[i * 4 + 3] = blurred[i];
        ctx.putImageData(img, 0, 0);
    }

    return ctx.getImageData(0, 0, width, height);
}

function boxBlurAlpha(src: Uint8ClampedArray, width: number, height: number, radius: number): Uint8ClampedArray {
    if (radius <= 0) return new Uint8ClampedArray(src);
    const tmp = new Float32Array(width * height);
    const out = new Uint8ClampedArray(width * height);
    const k = 2 * radius + 1;
    for (let y = 0; y < height; y++) {
        let sum = 0;
        for (let i = -radius; i <= radius; i++) sum += src[y * width + Math.max(0, Math.min(width - 1, i))];
        for (let x = 0; x < width; x++) {
            tmp[y * width + x] = sum / k;
            sum -= src[y * width + Math.max(0, Math.min(width - 1, x - radius))];
            sum += src[y * width + Math.max(0, Math.min(width - 1, x + radius + 1))];
        }
    }
    for (let x = 0; x < width; x++) {
        let sum = 0;
        for (let i = -radius; i <= radius; i++) sum += tmp[Math.max(0, Math.min(height - 1, i)) * width + x];
        for (let y = 0; y < height; y++) {
            out[y * width + x] = Math.round(sum / k);
            sum -= tmp[Math.max(0, Math.min(height - 1, y - radius)) * width + x];
            sum += tmp[Math.max(0, Math.min(height - 1, y + radius + 1)) * width + x];
        }
    }
    return out;
}

/**
 * Blends filtered result back into original using the selection mask.
 * Pixels fully selected (alpha=255) come entirely from `filtered`;
 * unselected pixels (alpha=0) keep `original`.
 */
export function blendWithMask(original: ImageData, filtered: ImageData, mask: ImageData | null): ImageData {
    if (!mask) return filtered;
    const out = new ImageData(new Uint8ClampedArray(filtered.data), filtered.width, filtered.height);
    const d = out.data;
    const o = original.data;
    const m = mask.data;
    for (let i = 0; i < d.length; i += 4) {
        const w = m[i + 3] / 255;
        d[i]     = Math.round(o[i]     * (1 - w) + d[i]     * w);
        d[i + 1] = Math.round(o[i + 1] * (1 - w) + d[i + 1] * w);
        d[i + 2] = Math.round(o[i + 2] * (1 - w) + d[i + 2] * w);
        d[i + 3] = Math.round(o[i + 3] * (1 - w) + d[i + 3] * w);
    }
    return out;
}

/**
 * Combines the active selection mask, the layer's mask (with density & feather),
 * into a single effective alpha mask used to clip destructive operations
 * (filters, adjustments). Result alpha = selection_alpha * layer_mask_alpha.
 *
 * Returns null when neither a selection nor an enabled layer mask is present
 * (caller should treat null as "full image").
 *
 * Mask semantics:
 *  - density (0..1): scales the mask's effect non-destructively. 0.5 means the
 *    mask only attenuates pixels to half-strength even where it is fully opaque.
 *  - feather (px): Gaussian-like blur applied to the mask's alpha before use.
 */
export function buildEffectiveMask(
    sel: SelectionState,
    layerMask: LayerMask | null,
    width: number,
    height: number,
): ImageData | null {
    const selectionMask = buildSelectionMask(sel, width, height);
    const hasLayerMask = !!(layerMask && layerMask.enabled);
    if (!selectionMask && !hasLayerMask) return null;
    if (!hasLayerMask) return selectionMask;

    // Rasterize the layer mask's luma to an alpha buffer; apply feather then
    // density. This mirrors Canvas2DCompositor.applyMask render-time semantics.
    const lm = layerMask!;
    const density = Math.max(0, Math.min(1, lm.density ?? 1));
    const feather = Math.max(0, lm.feather ?? 0);

    const tmp = document.createElement('canvas');
    tmp.width = width;
    tmp.height = height;
    const tctx = tmp.getContext('2d');
    if (!tctx) return selectionMask;
    tctx.drawImage(lm.canvas, 0, 0);
    const maskImg = tctx.getImageData(0, 0, width, height);

    // Convert luma → mask alpha. We use the box-blur helper for feather so the
    // result is consistent under node-canvas (which doesn't honour ctx.filter).
    const lumaAlpha = new Uint8ClampedArray(width * height);
    for (let i = 0, p = 0; i < maskImg.data.length; i += 4, p++) {
        const r = maskImg.data[i];
        const g = maskImg.data[i + 1];
        const b = maskImg.data[i + 2];
        lumaAlpha[p] = Math.round(0.299 * r + 0.587 * g + 0.114 * b);
    }
    const blurredLuma = feather > 0 ? boxBlurAlpha(lumaAlpha, width, height, Math.round(feather)) : lumaAlpha;

    const out = new Uint8ClampedArray(width * height * 4);
    const selData = selectionMask ? selectionMask.data : null;
    for (let p = 0, i = 0; p < blurredLuma.length; p++, i += 4) {
        // density attenuation: a' = 255 - (255 - a) * density
        const baseLuma = blurredLuma[p];
        const layerAlpha = Math.max(0, Math.min(255, Math.round(255 - (255 - baseLuma) * density)));
        const selAlpha = selData ? selData[i + 3] : 255;
        const combined = Math.round((layerAlpha * selAlpha) / 255);
        out[i] = 255;
        out[i + 1] = 255;
        out[i + 2] = 255;
        out[i + 3] = combined;
    }
    return new ImageData(out, width, height);
}
