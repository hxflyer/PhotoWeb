import type { EditorStore, ClipboardImageInfo } from '../store/types';
import { rasterizeSelectionOperations } from './selectionUtils';

interface MaskBounds {
    minX: number;
    minY: number;
    maxX: number;
    maxY: number;
}

function maskBoundingBox(mask: Uint8ClampedArray, w: number, h: number): MaskBounds | null {
    let minX = w, minY = h, maxX = -1, maxY = -1;
    for (let y = 0; y < h; y++) {
        const row = y * w;
        for (let x = 0; x < w; x++) {
            if (mask[row + x] > 0) {
                if (x < minX) minX = x;
                if (y < minY) minY = y;
                if (x > maxX) maxX = x;
                if (y > maxY) maxY = y;
            }
        }
    }
    if (maxX < 0) return null;
    return { minX, minY, maxX, maxY };
}

// Photoshop's "Edit > Copy" captures the active layer pixels inside the
// selection (or the full canvas when no selection is active) plus the
// dimensions used to autofill File > New (lesson:
// create-new-photoshop-document-same-size-as-open-document). We mirror that
// here: dimensions go to the store synchronously so File > New can read them,
// and a flattened PNG goes to the system clipboard on a best-effort basis.
export function copyActiveDocumentForClipboard(store: EditorStore): boolean {
    const { width, height, layers, activeLayerId, selection } = store;
    if (!Number.isFinite(width) || !Number.isFinite(height) || width < 1 || height < 1) return false;
    const layer = layers.find(l => l.id === activeLayerId);
    if (!layer) return false;

    let info: ClipboardImageInfo;
    let copyRect: { x: number; y: number; w: number; h: number };

    if (selection.hasSelection && selection.operations.length > 0) {
        const mask = rasterizeSelectionOperations(selection.operations, width, height);
        const bounds = maskBoundingBox(mask, width, height);
        if (!bounds) {
            // Empty selection — fall through to full doc, matching Photoshop
            // which copies nothing in that case but also doesn't fail the
            // gesture for the user.
            info = { width, height, resolution: 72 };
            copyRect = { x: 0, y: 0, w: width, h: height };
        } else {
            const rw = bounds.maxX - bounds.minX + 1;
            const rh = bounds.maxY - bounds.minY + 1;
            info = { width: rw, height: rh, resolution: 72 };
            copyRect = { x: bounds.minX, y: bounds.minY, w: rw, h: rh };
        }
    } else {
        info = { width, height, resolution: 72 };
        copyRect = { x: 0, y: 0, w: width, h: height };
    }

    store.recordClipboardImageInfo(info);

    // Best-effort PNG write — gated behind feature detection so jsdom and
    // older browsers fall through silently. Failure here must not break the
    // synchronous dimension recording above.
    try {
        if (typeof document === 'undefined' || typeof window === 'undefined') return true;
        const Clipboard = typeof navigator !== 'undefined' ? navigator.clipboard : undefined;
        const ClipboardItemCtor = (typeof window !== 'undefined'
            ? (window as unknown as { ClipboardItem?: typeof ClipboardItem }).ClipboardItem
            : undefined);
        if (!Clipboard || typeof Clipboard.write !== 'function' || !ClipboardItemCtor) return true;

        const c = document.createElement('canvas');
        c.width = copyRect.w;
        c.height = copyRect.h;
        const ctx = c.getContext('2d');
        if (!ctx) return true;
        ctx.drawImage(layer.canvas, copyRect.x, copyRect.y, copyRect.w, copyRect.h, 0, 0, copyRect.w, copyRect.h);
        c.toBlob(blob => {
            if (!blob) return;
            try {
                const item = new ClipboardItemCtor({ 'image/png': blob });
                void Clipboard.write([item]).catch(() => { /* silenced; dimension record still wins */ });
            } catch { /* legacy ClipboardItem shape */ }
        }, 'image/png');
    } catch {
        // Any synchronous failure (canvas allocation, drawImage tainting) leaves
        // the dimension record in place — that's what File > New autofill needs.
    }

    return true;
}
