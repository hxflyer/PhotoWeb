import type { OverlayRenderContext, Tool, ToolPointerEvent } from './Tool';
import { registerTool } from './registry';

export interface AnchorPoint {
    x: number;
    y: number;
    inHandle?: { x: number; y: number };
    outHandle?: { x: number; y: number };
    type: 'corner' | 'smooth';
}

export interface PathShape {
    id: string;
    closed: boolean;
    anchors: AnchorPoint[];
}

interface PathStore {
    paths: PathShape[];
    activeId: string | null;
}

const pathStore: PathStore = { paths: [], activeId: null };

export function getPaths(): PathShape[] { return pathStore.paths; }
export function getActivePath(): PathShape | null {
    return pathStore.paths.find(p => p.id === pathStore.activeId) ?? null;
}
export function setActivePath(id: string | null): void { pathStore.activeId = id; }
export function addPath(path: PathShape): void {
    pathStore.paths.push(path);
    pathStore.activeId = path.id;
}

function p(e: ToolPointerEvent) { return { x: e.canvasX, y: e.canvasY }; }

let dragHandle: { anchorIndex: number; pathId: string } | null = null;

const ANCHOR_COLOR = '#ffffff';
const ANCHOR_BORDER = '#0066ff';
const HANDLE_COLOR = '#0066ff';
const PATH_STROKE = '#0066ff';

export function renderPathOverlay(overlay: OverlayRenderContext): void {
    const { ctx, zoom } = overlay;
    const paths = pathStore.paths;
    if (paths.length === 0) return;
    ctx.save();
    const lineW = 1 / Math.max(0.0001, zoom);
    const anchorR = 4 / Math.max(0.0001, zoom);
    const handleR = 3 / Math.max(0.0001, zoom);

    paths.forEach(path => {
        if (path.anchors.length === 0) return;
        ctx.beginPath();
        ctx.lineWidth = lineW;
        ctx.strokeStyle = PATH_STROKE;
        const first = path.anchors[0];
        ctx.moveTo(first.x, first.y);
        for (let i = 1; i < path.anchors.length; i++) {
            const prev = path.anchors[i - 1];
            const a = path.anchors[i];
            if (prev.outHandle && a.inHandle) {
                ctx.bezierCurveTo(prev.outHandle.x, prev.outHandle.y, a.inHandle.x, a.inHandle.y, a.x, a.y);
            } else {
                ctx.lineTo(a.x, a.y);
            }
        }
        if (path.closed) ctx.closePath();
        ctx.stroke();

        path.anchors.forEach(a => {
            if (a.inHandle) {
                ctx.beginPath();
                ctx.strokeStyle = HANDLE_COLOR;
                ctx.lineWidth = lineW;
                ctx.moveTo(a.x, a.y);
                ctx.lineTo(a.inHandle.x, a.inHandle.y);
                ctx.stroke();
                drawCircle(ctx, a.inHandle.x, a.inHandle.y, handleR, HANDLE_COLOR, HANDLE_COLOR);
            }
            if (a.outHandle) {
                ctx.beginPath();
                ctx.strokeStyle = HANDLE_COLOR;
                ctx.lineWidth = lineW;
                ctx.moveTo(a.x, a.y);
                ctx.lineTo(a.outHandle.x, a.outHandle.y);
                ctx.stroke();
                drawCircle(ctx, a.outHandle.x, a.outHandle.y, handleR, HANDLE_COLOR, HANDLE_COLOR);
            }
            drawCircle(ctx, a.x, a.y, anchorR, ANCHOR_COLOR, ANCHOR_BORDER);
        });
    });
    ctx.restore();
}

function drawCircle(ctx: CanvasRenderingContext2D, x: number, y: number, r: number, fill: string, stroke: string): void {
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fillStyle = fill;
    ctx.fill();
    ctx.strokeStyle = stroke;
    ctx.stroke();
}

export const penTool: Tool = {
    id: 'pen',
    label: 'Pen',
    cursor: 'crosshair',
    onPointerDown: (e) => {
        if (e.button !== 0) return;
        const point = p(e);
        let path = getActivePath();
        if (!path || path.closed) {
            path = { id: crypto.randomUUID(), closed: false, anchors: [] };
            addPath(path);
        }
        if (path.anchors.length > 2) {
            const first = path.anchors[0];
            if (Math.hypot(point.x - first.x, point.y - first.y) < 8) {
                path.closed = true;
                dragHandle = null;
                return;
            }
        }
        path.anchors.push({ x: point.x, y: point.y, type: 'corner' });
        dragHandle = { anchorIndex: path.anchors.length - 1, pathId: path.id };
    },
    onPointerMove: (e) => {
        if (!dragHandle) return;
        const path = pathStore.paths.find(p => p.id === dragHandle!.pathId);
        if (!path) return;
        const anchor = path.anchors[dragHandle.anchorIndex];
        if (!anchor) return;
        const point = p(e);
        anchor.outHandle = { x: point.x, y: point.y };
        anchor.inHandle = { x: 2 * anchor.x - point.x, y: 2 * anchor.y - point.y };
        anchor.type = 'smooth';
    },
    onPointerUp: () => { dragHandle = null; },
    onKeyDown: (e) => {
        if (e.key === 'Enter' || e.key === 'Escape') {
            const path = getActivePath();
            if (path && !path.closed) path.closed = e.key === 'Enter';
            pathStore.activeId = null;
        }
    },
    renderOverlay: (overlay) => renderPathOverlay(overlay),
};

export const freeformPenTool: Tool = {
    id: 'freeform-pen',
    label: 'Freeform Pen',
    cursor: 'crosshair',
    onPointerDown: (e) => {
        if (e.button !== 0) return;
        const path: PathShape = { id: crypto.randomUUID(), closed: false, anchors: [{ x: e.canvasX, y: e.canvasY, type: 'corner' }] };
        addPath(path);
        dragHandle = { anchorIndex: 0, pathId: path.id };
    },
    onPointerMove: (e) => {
        if (!dragHandle) return;
        const path = pathStore.paths.find(p => p.id === dragHandle!.pathId);
        if (!path) return;
        const last = path.anchors[path.anchors.length - 1];
        if (!last) return;
        if (Math.hypot(e.canvasX - last.x, e.canvasY - last.y) < 4) return;
        path.anchors.push({ x: e.canvasX, y: e.canvasY, type: 'corner' });
    },
    onPointerUp: () => { dragHandle = null; },
    renderOverlay: (overlay) => renderPathOverlay(overlay),
};

registerTool(penTool);
registerTool(freeformPenTool);
