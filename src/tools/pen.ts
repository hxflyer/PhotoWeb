import type { Tool, ToolPointerEvent } from './Tool';
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
};

registerTool(penTool);
registerTool(freeformPenTool);
