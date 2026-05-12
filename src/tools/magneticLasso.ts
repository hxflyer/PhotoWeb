/**
 * Magnetic Lasso — Photoshop-style edge-snapping freehand selection.
 *
 * The tool tracks a polyline that snaps to high-contrast edges as the
 * cursor moves. The user clicks once to plant an anchor, moves the cursor
 * to outline an edge, and the tool periodically auto-anchors based on
 * the `frequency` option. Click again to plant a manual anchor; click
 * the first anchor (or Enter / dbl-click) to close the loop.
 *
 * Options (Photoshop spec):
 *   - width: edge-detection search window (1..256 px). Each frame the
 *            tool scans a perpendicular slice of `width` px on either
 *            side of the cursor for the strongest edge.
 *   - contrast: minimum gradient magnitude (1..100, mapped to 1..100 in
 *               sobel-magnitude units) — pixels below this are ignored
 *               so the lasso doesn't snap to noise.
 *   - frequency: auto-anchor cadence (0..100). 100 = every move event;
 *                10 = every ~10 events. Anchors are also planted when the
 *                cursor moves more than `width * 2` from the last anchor.
 */
import type { OverlayRenderContext, Tool, ToolPointerEvent } from './Tool';
import { registerTool } from './registry';
import { commitSelectionOperation, resolveSelectionOp } from './selectionModifiers';

export interface MagneticLassoOptions {
    width: number;
    contrast: number;
    frequency: number;
}

let options: MagneticLassoOptions = { width: 10, contrast: 10, frequency: 57 };

export function setMagneticLassoOptions(next: Partial<MagneticLassoOptions>): void {
    options = { ...options, ...next };
}

export function getMagneticLassoOptions(): MagneticLassoOptions {
    return { ...options };
}

interface MagState {
    anchors: { x: number; y: number }[];
    /** Live segment between the last committed anchor and the cursor. */
    live: { x: number; y: number }[];
    cursor: { x: number; y: number } | null;
    /** Cached layer luminance for the active layer; rebuilt on pointer-down. */
    luminance: { data: Float32Array; w: number; h: number } | null;
    framesSinceAnchor: number;
}

const mag: MagState = { anchors: [], live: [], cursor: null, luminance: null, framesSinceAnchor: 0 };

function p(e: ToolPointerEvent) { return { x: e.canvasX, y: e.canvasY }; }

function buildLuminance(layer: { ctx: CanvasRenderingContext2D; canvas: HTMLCanvasElement }): { data: Float32Array; w: number; h: number } {
    const w = layer.canvas.width;
    const h = layer.canvas.height;
    const img = layer.ctx.getImageData(0, 0, w, h);
    const out = new Float32Array(w * h);
    for (let i = 0; i < out.length; i++) {
        out[i] = 0.299 * img.data[i * 4] + 0.587 * img.data[i * 4 + 1] + 0.114 * img.data[i * 4 + 2];
    }
    return { data: out, w, h };
}

function sobelAt(lum: { data: Float32Array; w: number; h: number }, x: number, y: number): number {
    const { data, w, h } = lum;
    if (x < 1 || y < 1 || x >= w - 1 || y >= h - 1) return 0;
    const i = y * w + x;
    const tl = data[i - w - 1], t = data[i - w], tr = data[i - w + 1];
    const l = data[i - 1], r = data[i + 1];
    const bl = data[i + w - 1], b = data[i + w], br = data[i + w + 1];
    const gx = -tl + tr - 2 * l + 2 * r - bl + br;
    const gy = -tl - 2 * t - tr + bl + 2 * b + br;
    return Math.sqrt(gx * gx + gy * gy);
}

/**
 * Search a perpendicular slice of width `2*radius+1` centered on `point`,
 * oriented perpendicular to the vector from `from` to `point`, for the
 * pixel with the strongest gradient magnitude above `threshold`. Returns
 * the strongest point or `point` unchanged if nothing qualifies.
 */
function snapToEdge(
    lum: { data: Float32Array; w: number; h: number },
    from: { x: number; y: number },
    point: { x: number; y: number },
    radius: number,
    threshold: number,
): { x: number; y: number } {
    const dx = point.x - from.x;
    const dy = point.y - from.y;
    const len = Math.hypot(dx, dy) || 1;
    // Perpendicular unit vector (rotated 90°).
    const px = -dy / len;
    const py = dx / len;
    let bestX = point.x;
    let bestY = point.y;
    let bestMag = threshold;
    for (let r = -radius; r <= radius; r++) {
        const sx = Math.round(point.x + px * r);
        const sy = Math.round(point.y + py * r);
        const m = sobelAt(lum, sx, sy);
        if (m > bestMag) {
            bestMag = m;
            bestX = sx;
            bestY = sy;
        }
    }
    return { x: bestX, y: bestY };
}

export const magneticLassoTool: Tool = {
    id: 'magnetic-lasso',
    label: 'Magnetic Lasso',
    cursor: 'crosshair',
    onPointerDown: (e, ctx) => {
        if (e.button !== 0) return;
        const store = ctx.getStore();
        const point = p(e);

        // Click on the first anchor closes the loop and commits.
        if (mag.anchors.length >= 3) {
            const first = mag.anchors[0];
            if (Math.hypot(point.x - first.x, point.y - first.y) < 10) {
                const path = [...mag.anchors];
                const op = resolveSelectionOp(e.shift, e.alt || e.meta || e.ctrl);
                commitSelectionOperation(store, { path, type: 'lasso' }, op);
                mag.anchors = [];
                mag.live = [];
                mag.cursor = null;
                mag.luminance = null;
                return;
            }
        }

        // First click: cache the active layer's luminance for fast edge probing.
        if (mag.anchors.length === 0) {
            const layer = store.layers.find(l => l.id === store.activeLayerId);
            if (!layer) return;
            mag.luminance = buildLuminance(layer);
        }
        mag.anchors.push(point);
        mag.live = [];
        mag.framesSinceAnchor = 0;
    },
    onPointerMove: (e) => {
        if (mag.anchors.length === 0 || !mag.luminance) return;
        const cursor = p(e);
        const last = mag.anchors[mag.anchors.length - 1];
        const snapped = snapToEdge(mag.luminance, last, cursor, options.width, options.contrast);
        mag.cursor = snapped;
        mag.framesSinceAnchor++;
        // Auto-anchor cadence: high frequency = anchor every move event.
        // 100 -> every event (interval 1); 0 -> only on far distance.
        const interval = Math.max(1, Math.round((100 - options.frequency) / 8) + 1);
        const dist = Math.hypot(snapped.x - last.x, snapped.y - last.y);
        if (mag.framesSinceAnchor >= interval || dist > options.width * 2) {
            mag.anchors.push(snapped);
            mag.live = [];
            mag.framesSinceAnchor = 0;
        } else {
            mag.live = [snapped];
        }
    },
    onPointerUp: () => {
        // Magnetic lasso doesn't commit on pointer-up — it commits when the
        // user clicks the first anchor (loop close) or presses Enter.
    },
    onKeyDown: (e, ctx) => {
        if (e.key === 'Enter' && mag.anchors.length >= 3) {
            const store = ctx.getStore();
            const op = resolveSelectionOp(e.shift, e.alt || e.meta || e.ctrl);
            commitSelectionOperation(store, { path: [...mag.anchors], type: 'lasso' }, op);
            mag.anchors = [];
            mag.live = [];
            mag.cursor = null;
            mag.luminance = null;
        } else if (e.key === 'Escape') {
            mag.anchors = [];
            mag.live = [];
            mag.cursor = null;
            mag.luminance = null;
        } else if (e.key === 'Backspace' && mag.anchors.length > 0) {
            mag.anchors.pop();
            mag.live = [];
            mag.framesSinceAnchor = 0;
        }
    },
    renderOverlay: (overlay: OverlayRenderContext) => {
        if (mag.anchors.length === 0) return;
        const { ctx, zoom } = overlay;
        const lw = 1 / Math.max(0.0001, zoom);
        const dash = 4 / Math.max(0.0001, zoom);
        ctx.save();
        ctx.lineWidth = lw;
        ctx.setLineDash([dash, dash]);
        ctx.strokeStyle = '#000';
        ctx.beginPath();
        ctx.moveTo(mag.anchors[0].x, mag.anchors[0].y);
        for (let i = 1; i < mag.anchors.length; i++) {
            ctx.lineTo(mag.anchors[i].x, mag.anchors[i].y);
        }
        if (mag.cursor) ctx.lineTo(mag.cursor.x, mag.cursor.y);
        ctx.stroke();
        ctx.strokeStyle = '#fff';
        ctx.lineDashOffset = dash;
        ctx.stroke();
        // Anchor squares so users can see where the snaps landed.
        ctx.setLineDash([]);
        ctx.fillStyle = '#0090ff';
        ctx.strokeStyle = '#fff';
        const r = 3 / Math.max(0.0001, zoom);
        for (const a of mag.anchors) {
            ctx.beginPath();
            ctx.rect(a.x - r, a.y - r, r * 2, r * 2);
            ctx.fill();
            ctx.stroke();
        }
        ctx.restore();
    },
};

registerTool(magneticLassoTool);
