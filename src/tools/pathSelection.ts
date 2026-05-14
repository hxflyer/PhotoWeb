import type { Tool, ToolPointerEvent } from './Tool';
import { registerTool } from './registry';
import { getActivePath, getPaths, removePath, renderPathOverlay, setActivePath } from './pen';
import { useEditorStore } from '../store/editorStore';
import { hitTypePathHandleAt, moveTypePathHandle } from './type';

type DragState =
    | { kind: 'path'; pathId: string; anchorIndex: number | null; handle: 'in' | 'out' | null; last: { x: number; y: number } }
    | { kind: 'type-path'; layerId: string; handle: 'start' | 'end'; last: { x: number; y: number } };

const drag: { state: DragState | null } = { state: null };

function p(e: ToolPointerEvent) { return { x: e.canvasX, y: e.canvasY }; }

function pickAnchor(point: { x: number; y: number }, threshold = 6): { pathId: string; anchorIndex: number; handle: 'in' | 'out' | null } | null {
    for (const path of getPaths()) {
        for (let i = 0; i < path.anchors.length; i++) {
            const a = path.anchors[i];
            if (Math.hypot(point.x - a.x, point.y - a.y) <= threshold) {
                return { pathId: path.id, anchorIndex: i, handle: null };
            }
            if (a.inHandle && Math.hypot(point.x - a.inHandle.x, point.y - a.inHandle.y) <= threshold) {
                return { pathId: path.id, anchorIndex: i, handle: 'in' };
            }
            if (a.outHandle && Math.hypot(point.x - a.outHandle.x, point.y - a.outHandle.y) <= threshold) {
                return { pathId: path.id, anchorIndex: i, handle: 'out' };
            }
        }
    }
    return null;
}

export const pathSelectionTool: Tool = {
    id: 'path-selection',
    label: 'Path Selection',
    cursor: 'default',
    onPointerDown: (e) => {
        if (e.button !== 0) return;
        const point = p(e);
        const hit = pickAnchor(point);
        if (hit) {
            setActivePath(hit.pathId);
            drag.state = { kind: 'path', pathId: hit.pathId, anchorIndex: null, handle: null, last: point };
        }
    },
    onPointerMove: (e) => {
        const current = drag.state;
        if (!current || current.kind !== 'path') return;
        const point = p(e);
        const dx = point.x - current.last.x;
        const dy = point.y - current.last.y;
        const path = getPaths().find(p => p.id === current.pathId);
        if (!path) return;
        path.anchors.forEach(a => {
            a.x += dx; a.y += dy;
            if (a.inHandle) { a.inHandle.x += dx; a.inHandle.y += dy; }
            if (a.outHandle) { a.outHandle.x += dx; a.outHandle.y += dy; }
        });
        current.last = point;
    },
    onPointerUp: () => { drag.state = null; },
    onKeyDown: (e) => {
        if (e.key === 'Backspace' || e.key === 'Delete') {
            const path = getActivePath();
            if (path) {
                e.rawEvent.preventDefault();
                removePath(path.id);
            }
        }
    },
    renderOverlay: (overlay) => renderPathOverlay(overlay),
};

export const directSelectionTool: Tool = {
    id: 'direct-selection',
    label: 'Direct Selection',
    cursor: 'default',
    onPointerDown: (e) => {
        if (e.button !== 0) return;
        const point = p(e);
        const typeHandle = hitTypePathHandleAt(useEditorStore.getState().layers, point.x, point.y);
        if (typeHandle) {
            useEditorStore.getState().setActiveLayer(typeHandle.layer.id);
            drag.state = { kind: 'type-path', layerId: typeHandle.layer.id, handle: typeHandle.handle, last: point };
            return;
        }
        const hit = pickAnchor(point);
        if (hit) {
            setActivePath(hit.pathId);
            drag.state = { kind: 'path', pathId: hit.pathId, anchorIndex: hit.anchorIndex, handle: hit.handle, last: point };
        }
    },
    onPointerMove: (e) => {
        const current = drag.state;
        if (!current) return;
        if (current.kind === 'type-path') {
            const state = useEditorStore.getState();
            const layer = state.layers.find(l => l.id === current.layerId);
            if (!layer) return;
            const point = p(e);
            moveTypePathHandle(layer, current.handle, point);
            current.last = point;
            useEditorStore.setState(s => ({ layers: [...s.layers] }));
            return;
        }
        const path = getActivePath();
        if (current.kind !== 'path') return;
        if (!path || current.anchorIndex === null) return;
        const anchor = path.anchors[current.anchorIndex];
        if (!anchor) return;
        const point = p(e);
        if (current.handle === 'in' && anchor.inHandle) {
            anchor.inHandle.x = point.x;
            anchor.inHandle.y = point.y;
        } else if (current.handle === 'out' && anchor.outHandle) {
            anchor.outHandle.x = point.x;
            anchor.outHandle.y = point.y;
        } else {
            const dx = point.x - current.last.x;
            const dy = point.y - current.last.y;
            anchor.x += dx; anchor.y += dy;
            if (anchor.inHandle) { anchor.inHandle.x += dx; anchor.inHandle.y += dy; }
            if (anchor.outHandle) { anchor.outHandle.x += dx; anchor.outHandle.y += dy; }
        }
        current.last = point;
    },
    onPointerUp: () => { drag.state = null; },
    onKeyDown: (e) => {
        if (e.key === 'Backspace' || e.key === 'Delete') {
            if (drag.state?.kind === 'type-path') return;
            const path = getActivePath();
            if (!path || drag.state?.kind !== 'path' || drag.state.anchorIndex == null) {
                // No specific anchor → delete the whole path.
                if (path) {
                    e.rawEvent.preventDefault();
                    removePath(path.id);
                }
                return;
            }
            // Delete the selected anchor; if it was the last one, drop the path.
            e.rawEvent.preventDefault();
            path.anchors.splice(drag.state.anchorIndex, 1);
            if (path.anchors.length === 0) removePath(path.id);
            drag.state = null;
        }
    },
    renderOverlay: (overlay) => renderPathOverlay(overlay),
};

registerTool(pathSelectionTool);
registerTool(directSelectionTool);
