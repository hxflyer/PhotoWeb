import type { OverlayRenderContext, Tool, ToolPointerEvent } from './Tool';
import { registerTool } from './registry';
import { commitSelectionOperation, resolveSelectionOp } from './selectionModifiers';

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
    shift: boolean;
    alt: boolean;
}

const stateRect: InternalState = { drag: null, shape: 'rect', shift: false, alt: false };
const stateEllipse: InternalState = { drag: null, shape: 'circle', shift: false, alt: false };

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
        onPointerMove: (e) => {
            if (!state.drag) return;
            state.drag.current = pointerToRect(e);
            state.shift = e.shift;
            state.alt = e.alt;
            // Overlay RAF loop draws from state.drag each frame — no store mutation during drag
        },
        onPointerUp: (e, ctx) => {
            if (!state.drag) return;
            state.drag.current = pointerToRect(e);
            const rect = computeMarqueeRect(state.drag, e.shift, e.alt);
            const path = rectToPath(rect);
            const store = ctx.getStore();
            if (rect.width > 0 && rect.height > 0) {
                const op = resolveSelectionOp(e.shift, e.meta || e.ctrl);
                commitSelectionOperation(store, { path, type: state.shape }, op);
            }
            state.drag = null;
        },
    };
}

function renderMarqueeOverlay(state: InternalState, overlay: OverlayRenderContext): void {
    if (!state.drag) return;
    const rect = computeMarqueeRect(state.drag, state.shift, state.alt);
    if (rect.width === 0 && rect.height === 0) return;
    const { ctx, zoom } = overlay;
    ctx.save();
    ctx.lineWidth = 1 / Math.max(0.0001, zoom);
    ctx.setLineDash([4 / Math.max(0.0001, zoom), 4 / Math.max(0.0001, zoom)]);
    ctx.strokeStyle = '#000';
    if (state.shape === 'rect') {
        ctx.strokeRect(rect.x, rect.y, rect.width, rect.height);
        ctx.strokeStyle = '#fff';
        ctx.lineDashOffset = 4 / Math.max(0.0001, zoom);
        ctx.strokeRect(rect.x, rect.y, rect.width, rect.height);
    } else {
        const cx = rect.x + rect.width / 2;
        const cy = rect.y + rect.height / 2;
        ctx.beginPath();
        ctx.ellipse(cx, cy, rect.width / 2, rect.height / 2, 0, 0, Math.PI * 2);
        ctx.stroke();
        ctx.strokeStyle = '#fff';
        ctx.lineDashOffset = 4 / Math.max(0.0001, zoom);
        ctx.stroke();
    }
    ctx.restore();
}

export const marqueeRectTool: Tool = {
    ...makeMarqueeTool('marquee-rect', 'Rectangular Marquee', stateRect),
    renderOverlay: (overlay) => renderMarqueeOverlay(stateRect, overlay),
};
export const marqueeEllipseTool: Tool = {
    ...makeMarqueeTool('marquee-ellipse', 'Elliptical Marquee', stateEllipse),
    renderOverlay: (overlay) => renderMarqueeOverlay(stateEllipse, overlay),
};

registerTool(marqueeRectTool);
registerTool(marqueeEllipseTool);
