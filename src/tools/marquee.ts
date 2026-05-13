import type { OverlayRenderContext, Tool, ToolPointerEvent } from './Tool';
import type { SelectionOperation, SelectionState } from '../store/types';
import { useEditorStore } from '../store/editorStore';
import { registerTool } from './registry';
import { commitSelectionOperation, resolveSelectionOp } from './selectionModifiers';
import {
    previewSelectionMove,
    cloneSelectionOperation, selectionContainsPoint,
} from './selectionMove';

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

export interface MarqueeOptions {
    feather: number;
    antiAlias: boolean;
    style: 'normal' | 'fixed-ratio' | 'fixed-size';
    width: number;
    height: number;
}

const options: MarqueeOptions = {
    feather: 0,
    antiAlias: true,
    style: 'normal',
    width: 1,
    height: 1,
};

export function setMarqueeOptions(next: Partial<MarqueeOptions>): void {
    Object.assign(options, next);
    options.feather = Math.max(0, Number.isFinite(options.feather) ? options.feather : 0);
    options.width = Math.max(1, Number.isFinite(options.width) ? options.width : 1);
    options.height = Math.max(1, Number.isFinite(options.height) ? options.height : 1);
}

export function getMarqueeOptions(): MarqueeOptions {
    return { ...options };
}

export function computeMarqueeRect(
    drag: MarqueeDragState,
    shift: boolean,
    alt: boolean,
    marqueeOptions: MarqueeOptions = options,
): MarqueeRect {
    const { anchor, current } = drag;
    const optWidth = Math.max(1, marqueeOptions.width || 1);
    const optHeight = Math.max(1, marqueeOptions.height || 1);

    if (marqueeOptions.style === 'fixed-size') {
        return {
            x: alt ? current.x - optWidth / 2 : current.x,
            y: alt ? current.y - optHeight / 2 : current.y,
            width: optWidth,
            height: optHeight,
        };
    }

    let dx = current.x - anchor.x;
    let dy = current.y - anchor.y;

    if (marqueeOptions.style === 'fixed-ratio') {
        const ratio = optWidth / optHeight;
        let nextW = Math.abs(dx);
        let nextH = Math.abs(dy);
        if (nextW === 0 && nextH === 0) {
            nextW = 0;
            nextH = 0;
        } else if (nextH === 0 || nextW / nextH > ratio) {
            nextH = nextW / ratio;
        } else {
            nextW = nextH * ratio;
        }
        dx = Math.sign(dx || 1) * nextW;
        dy = Math.sign(dy || 1) * nextH;
    } else if (shift) {
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

// Build a binary (non-AA) mask of a rectangle defined by `rect`. Used when
// the user disables Anti-Alias on the rectangular marquee — the rect path
// otherwise always goes through the Canvas2D AA-fill path.
export function rasterizeBinaryRectMask(
    rect: MarqueeRect,
    canvasWidth: number,
    canvasHeight: number,
): SelectionOperation['mask'] {
    const data = new Uint8ClampedArray(canvasWidth * canvasHeight);
    const x0 = Math.max(0, Math.round(rect.x));
    const y0 = Math.max(0, Math.round(rect.y));
    const x1 = Math.min(canvasWidth, Math.round(rect.x + rect.width));
    const y1 = Math.min(canvasHeight, Math.round(rect.y + rect.height));
    for (let y = y0; y < y1; y++) {
        for (let x = x0; x < x1; x++) {
            data[y * canvasWidth + x] = 255;
        }
    }
    return { data, width: canvasWidth, height: canvasHeight };
}

// Build a binary (non-AA) mask of an ellipse defined by `rect`.
// The mask is the size of the canvas and aligned with origin (0,0).
export function rasterizeBinaryEllipseMask(
    rect: MarqueeRect,
    canvasWidth: number,
    canvasHeight: number,
): SelectionOperation['mask'] {
    const data = new Uint8ClampedArray(canvasWidth * canvasHeight);
    const cx = rect.x + rect.width / 2;
    const cy = rect.y + rect.height / 2;
    const rx = rect.width / 2;
    const ry = rect.height / 2;
    if (rx <= 0 || ry <= 0) return { data, width: canvasWidth, height: canvasHeight };
    const minX = Math.max(0, Math.floor(rect.x));
    const minY = Math.max(0, Math.floor(rect.y));
    const maxX = Math.min(canvasWidth, Math.ceil(rect.x + rect.width));
    const maxY = Math.min(canvasHeight, Math.ceil(rect.y + rect.height));
    for (let y = minY; y < maxY; y++) {
        for (let x = minX; x < maxX; x++) {
            // Sample the pixel center (x+0.5, y+0.5) for crisp binary edges.
            const px = (x + 0.5 - cx) / rx;
            const py = (y + 0.5 - cy) / ry;
            if (px * px + py * py <= 1) {
                data[y * canvasWidth + x] = 255;
            }
        }
    }
    return { data, width: canvasWidth, height: canvasHeight };
}

interface InternalState {
    drag: MarqueeDragState | null;
    pendingNew: { x: number; y: number } | null;
    move: {
        anchor: { x: number; y: number };
        path: SelectionState['path'];
        operations: SelectionOperation[];
    } | null;
    clearedSelection: {
        path: SelectionState['path'];
        operations: SelectionOperation[];
        hasSelection: boolean;
    } | null;
    shape: 'rect' | 'circle';
    shift: boolean;
    alt: boolean;
    space: boolean;
    lastPoint: { x: number; y: number } | null;
    // Selection-op resolved at pointer-down time. Photoshop convention: the
    // modifier state at the START of the gesture decides add/sub/intersect/new;
    // alt held *mid-drag* re-purposes to "draw from center", so we capture this
    // here once and use it on commit.
    pendingOp: import('./selectionModifiers').SelectionOp;
}

const stateRect: InternalState = { drag: null, pendingNew: null, move: null, clearedSelection: null, shape: 'rect', shift: false, alt: false, space: false, lastPoint: null, pendingOp: 'new' };
const stateEllipse: InternalState = { drag: null, pendingNew: null, move: null, clearedSelection: null, shape: 'circle', shift: false, alt: false, space: false, lastPoint: null, pendingOp: 'new' };
const DRAG_THRESHOLD = 3;

export function isMarqueeGestureActive(): boolean {
    return !!(stateRect.drag || stateEllipse.drag);
}

function pointerToRect(e: ToolPointerEvent) {
    return { x: e.canvasX, y: e.canvasY };
}

function makeMarqueeTool(id: 'marquee-rect' | 'marquee-ellipse', label: string, state: InternalState): Tool {
    return {
        id,
        label,
        cursor: 'crosshair',
        onPointerDown: (e, ctx) => {
            if (e.button !== 0) return;
            const point = pointerToRect(e);
            const store = ctx.getStore();
            const op = resolveSelectionOp(e.shift, e.alt || e.meta || e.ctrl);
            state.pendingOp = op;
            state.drag = null;
            state.pendingNew = null;
            state.move = null;
            state.clearedSelection = null;
            state.space = false;
            state.lastPoint = point;
            if (op === 'new' && store.selection.hasSelection) {
                if (selectionContainsPoint(store.selection, point.x, point.y)) {
                    // Mouse-down inside the selection: do not dismiss. The user is
                    // about to drag the selection outline to a new location.
                    state.move = {
                        anchor: point,
                        path: store.selection.path.map(item => ({ ...item })),
                        operations: store.selection.operations.map(cloneSelectionOperation),
                    };
                    return;
                }
                // Mouse-down outside the existing selection: dismiss it immediately
                // (Photoshop behavior). Then start a new marquee at this point.
                store.clearSelection();
            }
            state.drag = { anchor: point, current: point };
        },
        onPointerMove: (e, ctx) => {
            const point = pointerToRect(e);
            if (state.move) {
                if (e.shift || e.meta || e.ctrl) {
                    state.drag = { anchor: state.move.anchor, current: point };
                    state.move = null;
                    state.shift = e.shift;
                    state.alt = e.meta || e.ctrl;
                    return;
                }
                const dx = point.x - state.move.anchor.x;
                const dy = point.y - state.move.anchor.y;
                if (Math.hypot(dx, dy) < DRAG_THRESHOLD) return;
                previewSelectionMove(state.move, dx, dy);
                return;
            }
            if (state.pendingNew) {
                if (Math.hypot(point.x - state.pendingNew.x, point.y - state.pendingNew.y) < DRAG_THRESHOLD) return;
                state.drag = { anchor: state.pendingNew, current: point };
                state.pendingNew = null;
            }
            if (!state.drag) return;
            if (state.space) {
                const previous = state.lastPoint ?? state.drag.current;
                const dx = point.x - previous.x;
                const dy = point.y - previous.y;
                state.drag.anchor = { x: state.drag.anchor.x + dx, y: state.drag.anchor.y + dy };
                state.drag.current = { x: state.drag.current.x + dx, y: state.drag.current.y + dy };
            } else {
                state.drag.current = point;
            }
            state.lastPoint = point;
            state.shift = e.shift;
            state.alt = e.alt;
            ctx.requestRender();
            // Overlay RAF loop draws from state.drag each frame — no store mutation during drag
        },
        onPointerUp: (e) => {
            if (state.move) {
                const point = pointerToRect(e);
                const dx = point.x - state.move.anchor.x;
                const dy = point.y - state.move.anchor.y;
                if (Math.hypot(dx, dy) >= DRAG_THRESHOLD) {
                    previewSelectionMove(state.move, dx, dy);
                }
                state.move = null;
                return;
            }
            if (state.pendingNew) {
                state.pendingNew = null;
                return;
            }
            if (!state.drag) return;
            const point = pointerToRect(e);
            if (state.space) {
                const previous = state.lastPoint ?? state.drag.current;
                const dx = point.x - previous.x;
                const dy = point.y - previous.y;
                state.drag.anchor = { x: state.drag.anchor.x + dx, y: state.drag.anchor.y + dy };
                state.drag.current = { x: state.drag.current.x + dx, y: state.drag.current.y + dy };
            } else {
                state.drag.current = point;
            }
            const rect = computeMarqueeRect(state.drag, e.shift, e.alt);
            if (rect.width > 0 && rect.height > 0) {
                // Use the op resolved at pointer-down so that alt held mid-drag
                // means "from center", not "subtract".
                const op = state.pendingOp;
                const store = useEditorStore.getState();
                if (!options.antiAlias) {
                    const mask = state.shape === 'circle'
                        ? rasterizeBinaryEllipseMask(rect, store.width, store.height)
                        : rasterizeBinaryRectMask(rect, store.width, store.height);
                    commitSelectionOperation(store, { path: rectToPath(rect), type: state.shape, mask }, op);
                } else {
                    commitSelectionOperation(store, { path: rectToPath(rect), type: state.shape }, op);
                }
                store.setSelectionFeather(options.feather);
            }
            state.drag = null;
            state.clearedSelection = null;
            state.space = false;
            state.lastPoint = null;
        },
        onKeyDown: (e, ctx) => {
            if (e.key !== ' ' && e.key !== 'Spacebar') return;
            if (!state.drag) return;
            state.space = true;
            e.rawEvent.preventDefault();
            ctx.requestRender();
        },
        onKeyUp: (e, ctx) => {
            if (e.key !== ' ' && e.key !== 'Spacebar') return;
            if (!state.drag) return;
            state.space = false;
            e.rawEvent.preventDefault();
            ctx.requestRender();
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
    ctx.setLineDash([]);
    const w = Math.round(rect.width);
    const h = Math.round(rect.height);
    const hudX = rect.x + rect.width + 8 / Math.max(0.0001, zoom);
    const hudY = rect.y + rect.height - 30 / Math.max(0.0001, zoom);
    const hudW = 58 / Math.max(0.0001, zoom);
    const hudH = 28 / Math.max(0.0001, zoom);
    ctx.fillStyle = 'rgba(30, 30, 30, 0.9)';
    ctx.fillRect(hudX, hudY, hudW, hudH);
    ctx.fillStyle = '#fff';
    ctx.font = `${10 / Math.max(0.0001, zoom)}px sans-serif`;
    ctx.fillText(`W: ${w} px`, hudX + 5 / Math.max(0.0001, zoom), hudY + 11 / Math.max(0.0001, zoom));
    ctx.fillText(`H: ${h} px`, hudX + 5 / Math.max(0.0001, zoom), hudY + 23 / Math.max(0.0001, zoom));
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
