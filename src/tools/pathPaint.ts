/**
 * Stroke Path / Fill Path commands. Both operate on the active Pen path and
 * paint into the active layer through a single pixel-history entry so undo
 * round-trips the operation.
 */
import { useEditorStore } from '../store/editorStore';
import { captureLayerRegion, createPixelHistoryAction } from '../core/history';
import { getActivePath, type PathShape } from './pen';
import { applyBlendModeToImageData, blendModeToCompositeOp, type BlendModeId } from '../core/blendModes';

function tracePath(ctx: CanvasRenderingContext2D, path: PathShape): void {
    if (path.anchors.length === 0) return;
    const first = path.anchors[0];
    ctx.beginPath();
    ctx.moveTo(first.x, first.y);
    for (let i = 1; i < path.anchors.length; i++) {
        const prev = path.anchors[i - 1];
        const curr = path.anchors[i];
        const cp1 = prev.outHandle ?? { x: prev.x, y: prev.y };
        const cp2 = curr.inHandle ?? { x: curr.x, y: curr.y };
        ctx.bezierCurveTo(cp1.x, cp1.y, cp2.x, cp2.y, curr.x, curr.y);
    }
    if (path.closed && path.anchors.length >= 2) {
        const prev = path.anchors[path.anchors.length - 1];
        const curr = path.anchors[0];
        const cp1 = prev.outHandle ?? { x: prev.x, y: prev.y };
        const cp2 = curr.inHandle ?? { x: curr.x, y: curr.y };
        ctx.bezierCurveTo(cp1.x, cp1.y, cp2.x, cp2.y, curr.x, curr.y);
        ctx.closePath();
    }
}

export interface StrokePathOptions {
    size: number;
    color: string;
    opacity: number;
}

export function strokeActivePath(opts: StrokePathOptions): boolean {
    const path = getActivePath();
    if (!path || path.anchors.length === 0) return false;
    const store = useEditorStore.getState();
    const layer = store.layers.find(l => l.id === store.activeLayerId);
    if (!layer) return false;
    const rect = { x: 0, y: 0, width: layer.canvas.width, height: layer.canvas.height };
    const before = captureLayerRegion(layer, rect);
    const lctx = layer.ctx;
    lctx.save();
    tracePath(lctx, path);
    lctx.strokeStyle = opts.color;
    lctx.lineWidth = Math.max(1, opts.size);
    lctx.lineCap = 'round';
    lctx.lineJoin = 'round';
    lctx.globalAlpha = Math.max(0, Math.min(1, opts.opacity));
    lctx.stroke();
    lctx.restore();
    layer.markDirty(null);
    store.commitHistory(createPixelHistoryAction(layer, rect, before, 'Stroke Path'));
    return true;
}

export interface FillPathOptions {
    color: string;
    opacity: number;
    mode?: BlendModeId;
    preserveTransparency?: boolean;
}

export function fillActivePath(opts: FillPathOptions): boolean {
    const path = getActivePath();
    if (!path || path.anchors.length === 0) return false;
    const store = useEditorStore.getState();
    const layer = store.layers.find(l => l.id === store.activeLayerId);
    if (!layer) return false;
    const rect = { x: 0, y: 0, width: layer.canvas.width, height: layer.canvas.height };
    const before = captureLayerRegion(layer, rect);
    const lctx = layer.ctx;
    const mode: BlendModeId = opts.mode ?? 'normal';
    const opacity = Math.max(0, Math.min(1, opts.opacity));
    const nativeOp = blendModeToCompositeOp(mode);
    if (nativeOp) {
        lctx.save();
        if (opts.preserveTransparency) {
            // Stamp the fill into an offscreen, then composite source-atop so the
            // result is masked to the layer's existing alpha.
            const off = document.createElement('canvas');
            off.width = layer.canvas.width;
            off.height = layer.canvas.height;
            const octx = off.getContext('2d');
            if (octx) {
                tracePath(octx, path);
                octx.fillStyle = opts.color;
                octx.fill('evenodd');
                lctx.globalCompositeOperation = 'source-atop';
                lctx.globalAlpha = opacity;
                if (mode !== 'normal') {
                    // Layer blend mode applies between the masked fill and the
                    // existing pixels. We approximate by drawing source-atop
                    // first (mask) then re-applying the chosen mode through a
                    // second pass.
                    lctx.drawImage(off, 0, 0);
                    lctx.globalAlpha = 1;
                    lctx.globalCompositeOperation = nativeOp;
                    lctx.drawImage(off, 0, 0);
                } else {
                    lctx.drawImage(off, 0, 0);
                }
            }
        } else {
            tracePath(lctx, path);
            lctx.fillStyle = opts.color;
            lctx.globalAlpha = opacity;
            lctx.globalCompositeOperation = nativeOp;
            lctx.fill('evenodd');
        }
        lctx.restore();
    } else {
        // Custom blend modes (linear-burn, linear-dodge, dissolve) need per-pixel
        // blending via applyBlendModeToImageData.
        const off = document.createElement('canvas');
        off.width = layer.canvas.width;
        off.height = layer.canvas.height;
        const octx = off.getContext('2d');
        if (octx) {
            tracePath(octx, path);
            octx.fillStyle = opts.color;
            octx.globalAlpha = opacity;
            octx.fill('evenodd');
            const srcImage = octx.getImageData(0, 0, off.width, off.height);
            const dstImage = lctx.getImageData(0, 0, layer.canvas.width, layer.canvas.height);
            const blended = applyBlendModeToImageData(srcImage, dstImage, mode);
            if (opts.preserveTransparency) {
                // Mask the blended result to existing alpha: keep dst alpha,
                // composite blended RGB only where dst alpha > 0.
                for (let i = 0; i < blended.data.length; i += 4) {
                    const srcA = srcImage.data[i + 3] / 255;
                    if (dstImage.data[i + 3] === 0 || srcA === 0) {
                        blended.data[i] = dstImage.data[i];
                        blended.data[i + 1] = dstImage.data[i + 1];
                        blended.data[i + 2] = dstImage.data[i + 2];
                        blended.data[i + 3] = dstImage.data[i + 3];
                    } else {
                        blended.data[i + 3] = dstImage.data[i + 3];
                    }
                }
            } else {
                // Honour srcA-weighted blend so areas the path didn't touch are
                // left untouched by the per-pixel custom blend.
                for (let i = 0; i < blended.data.length; i += 4) {
                    const srcA = srcImage.data[i + 3] / 255;
                    if (srcA === 0) {
                        blended.data[i] = dstImage.data[i];
                        blended.data[i + 1] = dstImage.data[i + 1];
                        blended.data[i + 2] = dstImage.data[i + 2];
                        blended.data[i + 3] = dstImage.data[i + 3];
                    }
                }
            }
            lctx.putImageData(blended, 0, 0);
        }
    }
    layer.markDirty(null);
    store.commitHistory(createPixelHistoryAction(layer, rect, before, 'Fill Path'));
    return true;
}
