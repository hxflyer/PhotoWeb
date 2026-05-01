import type { OverlayRenderContext, Tool, ToolPointerEvent } from './Tool';
import { registerTool } from './registry';

const free: { points: { x: number; y: number }[] | null } = { points: null };
const poly: { points: { x: number; y: number }[]; live: { x: number; y: number } | null } = { points: [], live: null };

function p(e: ToolPointerEvent) { return { x: e.canvasX, y: e.canvasY }; }

export const lassoTool: Tool = {
    id: 'lasso',
    label: 'Lasso',
    cursor: 'crosshair',
    onPointerDown: (e) => {
        if (e.button !== 0) return;
        free.points = [p(e)];
    },
    onPointerMove: (e, ctx) => {
        if (!free.points) return;
        free.points.push(p(e));
        ctx.getStore().setSelectionMode('lasso');
        ctx.getStore().setSelectionPath([...free.points]);
    },
    onPointerUp: (e, ctx) => {
        if (!free.points || free.points.length < 3) {
            free.points = null;
            return;
        }
        const path = [...free.points];
        const store = ctx.getStore();
        store.setSelectionMode('lasso');
        const op = e.shift ? 'add' : e.alt ? 'sub' : 'add';
        store.addSelectionOperation({ mode: op as 'add' | 'sub', path, type: 'lasso' });
        store.setHasSelection(true);
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
        const point = p(e);
        if (poly.points.length > 2) {
            const first = poly.points[0];
            const dist = Math.hypot(point.x - first.x, point.y - first.y);
            if (dist < 10) {
                const path = [...poly.points];
                const store = ctx.getStore();
                store.setSelectionMode('lasso-poly');
                store.addSelectionOperation({ mode: 'add', path, type: 'lasso-poly' });
                store.setHasSelection(true);
                poly.points = [];
                poly.live = null;
                ctx.getStore().setPolyPoints([]);
                return;
            }
        }
        poly.points.push(point);
        ctx.getStore().setPolyPoints([...poly.points]);
    },
    onPointerMove: (e) => {
        poly.live = p(e);
    },
    onKeyDown: (e, ctx) => {
        if (e.key === 'Enter' && poly.points.length > 2) {
            const path = [...poly.points];
            const store = ctx.getStore();
            store.setSelectionMode('lasso-poly');
            store.addSelectionOperation({ mode: 'add', path, type: 'lasso-poly' });
            store.setHasSelection(true);
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
