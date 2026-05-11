import type { OverlayRenderContext, Tool, ToolPointerEvent } from './Tool';
import { registerTool } from './registry';
import { commitSelectionOperation, resolveSelectionOp } from './selectionModifiers';
import { beginSelectionInteraction, previewSelectionMove, type SelectionMoveAnchor } from './selectionMove';

const DRAG_THRESHOLD = 3;

interface FreeState {
    points: { x: number; y: number }[] | null;
    move: SelectionMoveAnchor | null;
}
interface PolyState {
    points: { x: number; y: number }[];
    live: { x: number; y: number } | null;
    move: SelectionMoveAnchor | null;
}

const free: FreeState = { points: null, move: null };
const poly: PolyState = { points: [], live: null, move: null };

function p(e: ToolPointerEvent) { return { x: e.canvasX, y: e.canvasY }; }

function snapTo45(from: { x: number; y: number }, to: { x: number; y: number }): { x: number; y: number } {
    const dx = to.x - from.x;
    const dy = to.y - from.y;
    if (dx === 0 && dy === 0) return to;
    const len = Math.hypot(dx, dy);
    const angle = Math.atan2(dy, dx);
    const step = Math.PI / 4;
    const snapped = Math.round(angle / step) * step;
    return { x: from.x + Math.cos(snapped) * len, y: from.y + Math.sin(snapped) * len };
}

export const lassoTool: Tool = {
    id: 'lasso',
    label: 'Lasso',
    cursor: 'crosshair',
    onPointerDown: (e, ctx) => {
        if (e.button !== 0) return;
        const store = ctx.getStore();
        free.move = null;
        free.points = null;
        const decision = beginSelectionInteraction(e, store.selection, () => store.clearSelection());
        if (decision.kind === 'move') {
            free.move = decision.move;
            return;
        }
        free.points = [p(e)];
    },
    onPointerMove: (e) => {
        if (free.move) {
            const point = p(e);
            const dx = point.x - free.move.anchor.x;
            const dy = point.y - free.move.anchor.y;
            if (Math.hypot(dx, dy) < DRAG_THRESHOLD) return;
            previewSelectionMove(free.move, dx, dy);
            return;
        }
        if (!free.points) return;
        free.points.push(p(e));
    },
    onPointerUp: (e, ctx) => {
        if (free.move) {
            const point = p(e);
            const dx = point.x - free.move.anchor.x;
            const dy = point.y - free.move.anchor.y;
            if (Math.hypot(dx, dy) >= DRAG_THRESHOLD) previewSelectionMove(free.move, dx, dy);
            free.move = null;
            return;
        }
        if (!free.points || free.points.length < 3) {
            free.points = null;
            return;
        }
        const path = [...free.points];
        const store = ctx.getStore();
        const op = resolveSelectionOp(e.shift, e.alt || e.meta || e.ctrl);
        commitSelectionOperation(store, { path, type: 'lasso' }, op);
        free.points = null;
    },
    renderOverlay: (overlay) => renderLassoFreeOverlay(overlay),
};

function renderLassoFreeOverlay(overlay: OverlayRenderContext): void {
    if (!free.points || free.points.length < 2) return;
    const { ctx, zoom } = overlay;
    ctx.save();
    ctx.lineWidth = 1 / Math.max(0.0001, zoom);
    ctx.setLineDash([4 / Math.max(0.0001, zoom), 4 / Math.max(0.0001, zoom)]);
    ctx.strokeStyle = '#000';
    ctx.beginPath();
    ctx.moveTo(free.points[0].x, free.points[0].y);
    for (let i = 1; i < free.points.length; i++) {
        ctx.lineTo(free.points[i].x, free.points[i].y);
    }
    ctx.stroke();
    ctx.restore();
}

export const lassoPolyTool: Tool = {
    id: 'lasso-poly',
    label: 'Polygonal Lasso',
    cursor: 'crosshair',
    onPointerDown: (e, ctx) => {
        if (e.button !== 0) return;
        let point = p(e);
        const store = ctx.getStore();
        // Polygon-in-progress: a click near the first vertex closes the path.
        if (poly.points.length > 2) {
            const first = poly.points[0];
            const dist = Math.hypot(point.x - first.x, point.y - first.y);
            if (dist < 10) {
                const path = [...poly.points];
                const op = resolveSelectionOp(e.shift, e.alt || e.meta || e.ctrl);
                commitSelectionOperation(store, { path, type: 'lasso-poly' }, op);
                poly.points = [];
                poly.live = null;
                store.setPolyPoints([]);
                return;
            }
        }
        // First click of a new polygon: respect the inside-drag / outside-dismiss
        // contract before adding the anchor point.
        if (poly.points.length === 0) {
            poly.move = null;
            const decision = beginSelectionInteraction(e, store.selection, () => store.clearSelection());
            if (decision.kind === 'move') {
                poly.move = decision.move;
                return;
            }
        } else if (e.shift) {
            // Shift constrains the new segment to 0/45/90/... degrees from
            // the previous anchor (Photoshop's angle-snap behavior).
            point = snapTo45(poly.points[poly.points.length - 1], point);
        }
        poly.points.push(point);
        store.setPolyPoints([...poly.points]);
    },
    onPointerMove: (e) => {
        if (poly.move) {
            const point = p(e);
            const dx = point.x - poly.move.anchor.x;
            const dy = point.y - poly.move.anchor.y;
            if (Math.hypot(dx, dy) >= DRAG_THRESHOLD) previewSelectionMove(poly.move, dx, dy);
            return;
        }
        let live = p(e);
        // Live segment preview also honors Shift so the user sees the snap.
        if (e.shift && poly.points.length > 0) {
            live = snapTo45(poly.points[poly.points.length - 1], live);
        }
        poly.live = live;
    },
    onPointerUp: (e) => {
        if (poly.move) {
            const point = p(e);
            const dx = point.x - poly.move.anchor.x;
            const dy = point.y - poly.move.anchor.y;
            if (Math.hypot(dx, dy) >= DRAG_THRESHOLD) previewSelectionMove(poly.move, dx, dy);
            poly.move = null;
        }
    },
    onKeyDown: (e, ctx) => {
        if (e.key === 'Enter' && poly.points.length > 2) {
            const path = [...poly.points];
            const store = ctx.getStore();
            const op = resolveSelectionOp(e.shift, e.alt || e.meta || e.ctrl);
            commitSelectionOperation(store, { path, type: 'lasso-poly' }, op);
            poly.points = [];
            poly.live = null;
            ctx.getStore().setPolyPoints([]);
        } else if (e.key === 'Escape') {
            poly.points = [];
            poly.live = null;
            ctx.getStore().setPolyPoints([]);
        } else if (e.key === 'Backspace' && poly.points.length > 0) {
            poly.points.pop();
            ctx.getStore().setPolyPoints([...poly.points]);
        }
    },
    renderOverlay: (overlay) => renderLassoPolyOverlay(overlay),
};

function renderLassoPolyOverlay(overlay: OverlayRenderContext): void {
    if (poly.points.length === 0) return;
    const { ctx, zoom } = overlay;
    const lineW = 1 / Math.max(0.0001, zoom);
    const dotR = 3 / Math.max(0.0001, zoom);
    ctx.save();
    ctx.lineWidth = lineW;
    ctx.setLineDash([4 / Math.max(0.0001, zoom), 4 / Math.max(0.0001, zoom)]);
    ctx.strokeStyle = '#000';
    ctx.beginPath();
    ctx.moveTo(poly.points[0].x, poly.points[0].y);
    for (let i = 1; i < poly.points.length; i++) {
        ctx.lineTo(poly.points[i].x, poly.points[i].y);
    }
    if (poly.live) ctx.lineTo(poly.live.x, poly.live.y);
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.fillStyle = '#fff';
    ctx.strokeStyle = '#000';
    poly.points.forEach(p => {
        ctx.beginPath();
        ctx.arc(p.x, p.y, dotR, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
    });
    ctx.restore();
}

registerTool(lassoTool);
registerTool(lassoPolyTool);
