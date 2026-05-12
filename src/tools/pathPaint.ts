/**
 * Stroke Path / Fill Path commands. Both operate on the active Pen path and
 * paint into the active layer through a single pixel-history entry so undo
 * round-trips the operation.
 */
import { useEditorStore } from '../store/editorStore';
import { captureLayerRegion, createPixelHistoryAction } from '../core/history';
import { getActivePath, type PathShape, type AnchorPoint } from './pen';
import { applyBlendModeToImageData, blendModeToCompositeOp, type BlendModeId } from '../core/blendModes';
import { getBrushTip } from './brush';

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

export type StrokePathToolId =
    | 'brush'
    | 'pencil'
    | 'eraser'
    | 'clone-stamp'
    | 'dodge'
    | 'burn'
    | 'sponge';

export interface StrokePathOptions {
    size: number;
    color: string;
    opacity: number;
    toolId?: StrokePathToolId;
    simulatePressure?: boolean;
}

/** Sample one cubic Bezier segment into x/y/length triples. */
function sampleSegment(
    prev: AnchorPoint,
    curr: AnchorPoint,
    out: { x: number; y: number; cumLen: number }[],
    startLen: number,
    steps = 32,
): number {
    const cp1 = prev.outHandle ?? { x: prev.x, y: prev.y };
    const cp2 = curr.inHandle ?? { x: curr.x, y: curr.y };
    let prevX = prev.x;
    let prevY = prev.y;
    let cum = startLen;
    for (let i = 1; i <= steps; i++) {
        const t = i / steps;
        const u = 1 - t;
        const x = u * u * u * prev.x + 3 * u * u * t * cp1.x + 3 * u * t * t * cp2.x + t * t * t * curr.x;
        const y = u * u * u * prev.y + 3 * u * u * t * cp1.y + 3 * u * t * t * cp2.y + t * t * t * curr.y;
        cum += Math.hypot(x - prevX, y - prevY);
        out.push({ x, y, cumLen: cum });
        prevX = x;
        prevY = y;
    }
    return cum;
}

/** Flatten the path into a polyline of (x, y, cumLen) samples. */
function samplePath(path: PathShape): { x: number; y: number; cumLen: number }[] {
    const out: { x: number; y: number; cumLen: number }[] = [];
    if (path.anchors.length === 0) return out;
    out.push({ x: path.anchors[0].x, y: path.anchors[0].y, cumLen: 0 });
    let cum = 0;
    for (let i = 1; i < path.anchors.length; i++) {
        cum = sampleSegment(path.anchors[i - 1], path.anchors[i], out, cum);
    }
    if (path.closed && path.anchors.length >= 2) {
        cum = sampleSegment(path.anchors[path.anchors.length - 1], path.anchors[0], out, cum);
    }
    return out;
}

/** Interpolate a point at a given length along the polyline. */
function pointAtLength(
    samples: { x: number; y: number; cumLen: number }[],
    target: number,
): { x: number; y: number } | null {
    if (samples.length === 0) return null;
    if (target <= samples[0].cumLen) return { x: samples[0].x, y: samples[0].y };
    const last = samples[samples.length - 1];
    if (target >= last.cumLen) return { x: last.x, y: last.y };
    let lo = 0;
    let hi = samples.length - 1;
    while (hi - lo > 1) {
        const mid = (lo + hi) >> 1;
        if (samples[mid].cumLen <= target) lo = mid; else hi = mid;
    }
    const a = samples[lo];
    const b = samples[hi];
    const span = b.cumLen - a.cumLen || 1;
    const k = (target - a.cumLen) / span;
    return { x: a.x + (b.x - a.x) * k, y: a.y + (b.y - a.y) * k };
}

/** Per-stamp primitive — paints one dab at (x, y) given size/pressure. */
type StampFn = (x: number, y: number, sizeFactor: number) => void;

function defaultSpacingFor(toolId: StrokePathToolId): number {
    if (toolId === 'pencil') return 0.4;
    if (toolId === 'eraser') return 0.15;
    if (toolId === 'clone-stamp') return 0.12;
    if (toolId === 'dodge' || toolId === 'burn' || toolId === 'sponge') return 0.25;
    return 0.15; // brush default
}

function makeStampFn(toolId: StrokePathToolId, opts: StrokePathOptions, lctx: CanvasRenderingContext2D, baseSize: number): StampFn {
    const hardness = useEditorStore.getState().brushSettings.hardness;
    if (toolId === 'eraser') {
        return (x, y, f) => {
            const size = Math.max(1, baseSize * f);
            const tip = getBrushTip({ size, hardness, color: '#000' });
            lctx.save();
            lctx.globalCompositeOperation = 'destination-out';
            lctx.globalAlpha = opts.opacity;
            lctx.drawImage(tip, x - size / 2, y - size / 2);
            lctx.restore();
        };
    }
    if (toolId === 'pencil') {
        return (x, y, f) => {
            const size = Math.max(1, baseSize * f);
            lctx.save();
            lctx.imageSmoothingEnabled = false;
            lctx.globalAlpha = opts.opacity;
            lctx.fillStyle = opts.color;
            lctx.beginPath();
            lctx.arc(Math.round(x), Math.round(y), size / 2, 0, Math.PI * 2);
            lctx.fill();
            lctx.restore();
        };
    }
    if (toolId === 'dodge' || toolId === 'burn') {
        const direction = toolId === 'dodge' ? 1 : -1;
        return (x, y, f) => {
            const size = Math.max(1, baseSize * f);
            const r = size / 2;
            const x0 = Math.max(0, Math.floor(x - r));
            const y0 = Math.max(0, Math.floor(y - r));
            const x1 = Math.min(lctx.canvas.width, Math.ceil(x + r));
            const y1 = Math.min(lctx.canvas.height, Math.ceil(y + r));
            const w = x1 - x0;
            const h = y1 - y0;
            if (w <= 0 || h <= 0) return;
            const img = lctx.getImageData(x0, y0, w, h);
            const d = img.data;
            const exposure = opts.opacity * 0.5;
            for (let py = 0; py < h; py++) {
                for (let px = 0; px < w; px++) {
                    const dx = px + x0 - x;
                    const dy = py + y0 - y;
                    const dist = Math.hypot(dx, dy);
                    if (dist > r) continue;
                    const fall = 1 - dist / r;
                    const idx = (py * w + px) * 4;
                    const weight = fall * exposure;
                    d[idx] = Math.max(0, Math.min(255, d[idx] + direction * 64 * weight));
                    d[idx + 1] = Math.max(0, Math.min(255, d[idx + 1] + direction * 64 * weight));
                    d[idx + 2] = Math.max(0, Math.min(255, d[idx + 2] + direction * 64 * weight));
                }
            }
            lctx.putImageData(img, x0, y0);
        };
    }
    if (toolId === 'sponge') {
        return (x, y, f) => {
            const size = Math.max(1, baseSize * f);
            const r = size / 2;
            const x0 = Math.max(0, Math.floor(x - r));
            const y0 = Math.max(0, Math.floor(y - r));
            const x1 = Math.min(lctx.canvas.width, Math.ceil(x + r));
            const y1 = Math.min(lctx.canvas.height, Math.ceil(y + r));
            const w = x1 - x0;
            const h = y1 - y0;
            if (w <= 0 || h <= 0) return;
            const img = lctx.getImageData(x0, y0, w, h);
            const d = img.data;
            const flow = opts.opacity * 0.5;
            for (let py = 0; py < h; py++) {
                for (let px = 0; px < w; px++) {
                    const dx = px + x0 - x;
                    const dy = py + y0 - y;
                    const dist = Math.hypot(dx, dy);
                    if (dist > r) continue;
                    const fall = 1 - dist / r;
                    const idx = (py * w + px) * 4;
                    const r0 = d[idx], g0 = d[idx + 1], b0 = d[idx + 2];
                    const luma = 0.299 * r0 + 0.587 * g0 + 0.114 * b0;
                    const change = fall * flow;
                    const factor = 1 - change; // desaturate by default
                    d[idx] = Math.max(0, Math.min(255, luma + (r0 - luma) * factor));
                    d[idx + 1] = Math.max(0, Math.min(255, luma + (g0 - luma) * factor));
                    d[idx + 2] = Math.max(0, Math.min(255, luma + (b0 - luma) * factor));
                }
            }
            lctx.putImageData(img, x0, y0);
        };
    }
    if (toolId === 'clone-stamp') {
        // Clone Stamp requires an actual source; without a live source point we
        // fall back to a brush stamp using the primary color so the dialog
        // doesn't silently no-op. The walker uses brush semantics.
        return (x, y, f) => {
            const size = Math.max(1, baseSize * f);
            const tip = getBrushTip({ size, hardness, color: opts.color });
            lctx.save();
            lctx.globalAlpha = opts.opacity;
            lctx.drawImage(tip, x - size / 2, y - size / 2);
            lctx.restore();
        };
    }
    // brush
    return (x, y, f) => {
        const size = Math.max(1, baseSize * f);
        const tip = getBrushTip({ size, hardness, color: opts.color });
        lctx.save();
        lctx.globalAlpha = opts.opacity;
        lctx.drawImage(tip, x - size / 2, y - size / 2);
        lctx.restore();
    };
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
    const toolId = opts.toolId;
    const baseSize = Math.max(1, opts.size);
    if (!toolId) {
        // Legacy Canvas2D stroke path — flat anti-aliased line, no per-stamp tool.
        lctx.save();
        tracePath(lctx, path);
        lctx.strokeStyle = opts.color;
        lctx.lineWidth = baseSize;
        lctx.lineCap = 'round';
        lctx.lineJoin = 'round';
        lctx.globalAlpha = Math.max(0, Math.min(1, opts.opacity));
        lctx.stroke();
        lctx.restore();
    } else {
        const samples = samplePath(path);
        if (samples.length < 2) {
            store.commitHistory(createPixelHistoryAction(layer, rect, before, 'Stroke Path'));
            return true;
        }
        const total = samples[samples.length - 1].cumLen;
        const spacing = Math.max(1, baseSize * defaultSpacingFor(toolId));
        const stampFn = makeStampFn(toolId, opts, lctx, baseSize);
        for (let len = 0; len <= total; len += spacing) {
            const pt = pointAtLength(samples, len);
            if (!pt) continue;
            let sizeFactor = 1;
            if (opts.simulatePressure && total > 0) {
                // 0 → 1 → 0 along the length (Photoshop's taper).
                const t = len / total;
                sizeFactor = Math.max(0.05, 1 - Math.abs(2 * t - 1));
            }
            stampFn(pt.x, pt.y, sizeFactor);
        }
    }
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
