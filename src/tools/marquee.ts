import type { Tool, ToolPointerEvent } from './Tool';
import { registerTool } from './registry';

export interface MarqueeRect {
    x: number;
    y: number;
    width: number;
    height: number;
}

export interface MarqueeDragState {
    anchor: { x: number; y: number };
    current: { x: number; y: number };
}

export function computeMarqueeRect(
    drag: MarqueeDragState,
    shift: boolean,
    alt: boolean,
): MarqueeRect {
    const { anchor, current } = drag;
    let dx = current.x - anchor.x;
    let dy = current.y - anchor.y;

    if (shift) {
        const m = Math.max(Math.abs(dx), Math.abs(dy));
        dx = Math.sign(dx || 1) * m;
        dy = Math.sign(dy || 1) * m;
    }

    if (alt) {
        return {
            x: anchor.x - Math.abs(dx),
            y: anchor.y - Math.abs(dy),
            width: Math.abs(dx) * 2,
            height: Math.abs(dy) * 2,
        };
    }

    return {
        x: Math.min(anchor.x, anchor.x + dx),
        y: Math.min(anchor.y, anchor.y + dy),
        width: Math.abs(dx),
        height: Math.abs(dy),
    };
}

export function rectToPath(rect: MarqueeRect): { x: number; y: number }[] {
    return [
        { x: rect.x, y: rect.y },
        { x: rect.x + rect.width, y: rect.y + rect.height },
    ];
}

interface InternalState {
    drag: MarqueeDragState | null;
    shape: 'rect' | 'circle';
}

const stateRect: InternalState = { drag: null, shape: 'rect' };
const stateEllipse: InternalState = { drag: null, shape: 'circle' };

function pointerToRect(e: ToolPointerEvent) {
    return { x: e.canvasX, y: e.canvasY };
}

function makeMarqueeTool(id: 'marquee-rect' | 'marquee-ellipse', label: string, state: InternalState): Tool {
    return {
        id,
        label,
        cursor: 'crosshair',
        onPointerDown: (e) => {
            if (e.button !== 0) return;
            state.drag = { anchor: pointerToRect(e), current: pointerToRect(e) };
        },
        onPointerMove: (e, ctx) => {
            if (!state.drag) return;
            state.drag.current = pointerToRect(e);
            const rect = computeMarqueeRect(state.drag, e.shift, e.alt);
            ctx.getStore().setSelectionMode(state.shape);
            ctx.getStore().setSelectionPath(rectToPath(rect));
        },
        onPointerUp: (e, ctx) => {
            if (!state.drag) return;
            state.drag.current = pointerToRect(e);
            const rect = computeMarqueeRect(state.drag, e.shift, e.alt);
            const path = rectToPath(rect);
            const store = ctx.getStore();
            const opMode = e.shift && e.alt ? 'add' : e.shift ? 'add' : e.alt ? 'sub' : 'add';
            if (rect.width > 0 && rect.height > 0) {
                store.setSelectionMode(state.shape);
                store.addSelectionOperation({ mode: opMode as 'add' | 'sub', path, type: state.shape });
                store.setHasSelection(true);
            }
            state.drag = null;
        },
    };
}

export const marqueeRectTool = makeMarqueeTool('marquee-rect', 'Rectangular Marquee', stateRect);
export const marqueeEllipseTool = makeMarqueeTool('marquee-ellipse', 'Elliptical Marquee', stateEllipse);

registerTool(marqueeRectTool);
registerTool(marqueeEllipseTool);
