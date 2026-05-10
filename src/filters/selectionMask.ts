import type { SelectionState } from '../store/types';

/**
 * Rasterises the current selection state into an ImageData alpha mask.
 * Alpha = 255 means fully selected; 0 means not selected.
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
        ctx.beginPath();
        if (op.type === 'rect') {
            const [a, b] = op.path;
            if (a && b) ctx.rect(a.x, a.y, b.x - a.x, b.y - a.y);
        } else {
            if (op.path.length > 0) {
                ctx.moveTo(op.path[0].x, op.path[0].y);
                for (let i = 1; i < op.path.length; i++) ctx.lineTo(op.path[i].x, op.path[i].y);
                ctx.closePath();
            }
        }
        ctx.fill();
        ctx.restore();
    }

    return ctx.getImageData(0, 0, width, height);
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
