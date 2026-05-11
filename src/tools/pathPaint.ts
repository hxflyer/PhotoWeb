/**
 * Stroke Path / Fill Path commands. Both operate on the active Pen path and
 * paint into the active layer through a single pixel-history entry so undo
 * round-trips the operation.
 */
import { useEditorStore } from '../store/editorStore';
import { captureLayerRegion, createPixelHistoryAction } from '../core/history';
import { getActivePath, type PathShape } from './pen';

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
    lctx.save();
    tracePath(lctx, path);
    lctx.fillStyle = opts.color;
    lctx.globalAlpha = Math.max(0, Math.min(1, opts.opacity));
    lctx.fill('evenodd');
    lctx.restore();
    layer.markDirty(null);
    store.commitHistory(createPixelHistoryAction(layer, rect, before, 'Fill Path'));
    return true;
}
