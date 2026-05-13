import type { OverlayRenderContext, Tool, ToolPointerEvent } from './Tool';
import type { SelectionOperation } from '../store/types';
import { registerTool } from './registry';
import { sampleSourceImageData } from './magicWand';
import { rasterizeBinaryRectMask, rectToPath, type MarqueeRect } from './marquee';
import { commitSelectionOperation, resolveSelectionOp, type SelectionOp } from './selectionModifiers';
import { beginSelectionInteraction, previewSelectionMove, type SelectionMoveAnchor } from './selectionMove';
import { rasterizeSelectionOperations } from '../utils/selectionUtils';

const DRAG_THRESHOLD = 3;

export interface ObjectSelectionOptions {
    mode: 'rectangle' | 'lasso';
    sampleAllLayers: boolean;
    autoEnhance: boolean;
    objectSubtract: boolean;
}

const options: ObjectSelectionOptions = {
    mode: 'rectangle',
    sampleAllLayers: false,
    autoEnhance: false,
    objectSubtract: true,
};

export function setObjectSelectionOptions(next: Partial<ObjectSelectionOptions>): void {
    Object.assign(options, next);
}

export function getObjectSelectionOptions(): ObjectSelectionOptions {
    return { ...options };
}

interface ObjectSelectionState {
    drag: { anchor: Point; current: Point } | null;
    lassoPath: Point[] | null;
    move: SelectionMoveAnchor | null;
    op: SelectionOp;
    space: boolean;
    lastPoint: Point | null;
}

type Point = { x: number; y: number };

const state: ObjectSelectionState = {
    drag: null,
    lassoPath: null,
    move: null,
    op: 'new',
    space: false,
    lastPoint: null,
};

function pointFromEvent(e: ToolPointerEvent): Point {
    return { x: e.canvasX, y: e.canvasY };
}

function rectFromDrag(drag: NonNullable<ObjectSelectionState['drag']>): MarqueeRect {
    return {
        x: Math.min(drag.anchor.x, drag.current.x),
        y: Math.min(drag.anchor.y, drag.current.y),
        width: Math.abs(drag.current.x - drag.anchor.x),
        height: Math.abs(drag.current.y - drag.anchor.y),
    };
}

function rasterizeLassoPath(path: Point[], width: number, height: number): NonNullable<SelectionOperation['mask']> {
    const data = rasterizeSelectionOperations([{ mode: 'add', path, type: 'lasso' }], width, height);
    return { data, width, height };
}

function enhanceMask(mask: Uint8ClampedArray, width: number, height: number): Uint8ClampedArray {
    const next = new Uint8ClampedArray(mask);
    const selectedNeighborCount = (x: number, y: number) => {
        let count = 0;
        for (let yy = y - 1; yy <= y + 1; yy++) {
            for (let xx = x - 1; xx <= x + 1; xx++) {
                if (xx === x && yy === y) continue;
                if (xx < 0 || yy < 0 || xx >= width || yy >= height) continue;
                if (mask[yy * width + xx]) count++;
            }
        }
        return count;
    };

    for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
            const idx = y * width + x;
            if (mask[idx] && selectedNeighborCount(x, y) <= 1) next[idx] = 0;
            if (!mask[idx] && selectedNeighborCount(x, y) >= 6) next[idx] = 255;
        }
    }

    return next;
}

function shrinkWrapVisiblePixels(
    image: ImageData | null,
    geometry: NonNullable<SelectionOperation['mask']>,
    op: SelectionOp,
): NonNullable<SelectionOperation['mask']> {
    if (!image || (op === 'sub' && !options.objectSubtract)) return geometry;

    const data = new Uint8ClampedArray(geometry.data.length);
    let selected = 0;
    for (let i = 0; i < geometry.data.length; i++) {
        if (!geometry.data[i]) continue;
        if (image.data[i * 4 + 3] === 0) continue;
        data[i] = 255;
        selected++;
    }

    if (selected === 0) return geometry;
    const next = options.autoEnhance ? enhanceMask(data, geometry.width, geometry.height) : data;
    return { data: next, width: geometry.width, height: geometry.height };
}

function getSourceImage(ctx: Parameters<NonNullable<Tool['onPointerUp']>>[1]): ImageData | null {
    const store = ctx.getStore();
    const active = store.layers.find(layer => layer.id === store.activeLayerId);
    if (!active) return null;
    return sampleSourceImageData(store.layers, store.width, store.height, options.sampleAllLayers, active.canvas);
}

function commitRect(rect: MarqueeRect, ctx: Parameters<NonNullable<Tool['onPointerUp']>>[1]): void {
    if (rect.width <= 0 || rect.height <= 0) return;
    const store = ctx.getStore();
    const geometry = rasterizeBinaryRectMask(rect, store.width, store.height) as NonNullable<SelectionOperation['mask']>;
    const mask = shrinkWrapVisiblePixels(getSourceImage(ctx), geometry, state.op);
    commitSelectionOperation(store, { path: rectToPath(rect), type: 'rect', mask }, state.op);
}

function commitLasso(path: Point[], ctx: Parameters<NonNullable<Tool['onPointerUp']>>[1]): void {
    if (path.length < 3) return;
    const store = ctx.getStore();
    const geometry = rasterizeLassoPath(path, store.width, store.height);
    const mask = shrinkWrapVisiblePixels(getSourceImage(ctx), geometry, state.op);
    commitSelectionOperation(store, { path, type: 'lasso', mask }, state.op);
}

function previewMoveIfNeeded(point: Point): void {
    if (!state.move) return;
    const dx = point.x - state.move.anchor.x;
    const dy = point.y - state.move.anchor.y;
    if (Math.hypot(dx, dy) >= DRAG_THRESHOLD) previewSelectionMove(state.move, dx, dy);
}

export const objectSelectionTool: Tool = {
    id: 'object-selection',
    label: 'Object Selection',
    cursor: 'crosshair',
    onPointerDown: (e, ctx) => {
        if (e.button !== 0) return;
        const point = pointFromEvent(e);
        const store = ctx.getStore();
        state.drag = null;
        state.lassoPath = null;
        state.move = null;
        state.space = false;
        state.lastPoint = point;
        state.op = resolveSelectionOp(e.shift, e.alt || e.meta || e.ctrl);

        const decision = beginSelectionInteraction(e, store.selection, () => store.clearSelection(), state.op);
        if (decision.kind === 'move') {
            state.move = decision.move;
            return;
        }

        if (options.mode === 'lasso') {
            state.lassoPath = [point];
        } else {
            state.drag = { anchor: point, current: point };
        }
        ctx.requestRender();
    },
    onPointerMove: (e, ctx) => {
        const point = pointFromEvent(e);
        if (state.move) {
            previewMoveIfNeeded(point);
            return;
        }
        if (state.drag) {
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
            ctx.requestRender();
            return;
        }
        if (!state.lassoPath || e.buttons === 0) return;
        state.lassoPath.push(point);
        ctx.requestRender();
    },
    onPointerUp: (e, ctx) => {
        const point = pointFromEvent(e);
        if (state.move) {
            previewMoveIfNeeded(point);
            state.move = null;
            return;
        }
        if (state.drag) {
            if (state.space) {
                const previous = state.lastPoint ?? state.drag.current;
                const dx = point.x - previous.x;
                const dy = point.y - previous.y;
                state.drag.anchor = { x: state.drag.anchor.x + dx, y: state.drag.anchor.y + dy };
                state.drag.current = { x: state.drag.current.x + dx, y: state.drag.current.y + dy };
            } else {
                state.drag.current = point;
            }
            commitRect(rectFromDrag(state.drag), ctx);
            state.drag = null;
            state.space = false;
            state.lastPoint = null;
            ctx.requestRender();
            return;
        }
        if (state.lassoPath) {
            state.lassoPath.push(point);
            commitLasso([...state.lassoPath], ctx);
            state.lassoPath = null;
            ctx.requestRender();
        }
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
    renderOverlay: (overlay) => renderObjectSelectionOverlay(overlay),
};

function renderObjectSelectionOverlay(overlay: OverlayRenderContext): void {
    if (!state.drag && (!state.lassoPath || state.lassoPath.length < 2)) return;
    const { ctx, zoom } = overlay;
    const line = 1 / Math.max(0.0001, zoom);
    ctx.save();
    ctx.lineWidth = line;
    ctx.setLineDash([4 / Math.max(0.0001, zoom), 4 / Math.max(0.0001, zoom)]);
    ctx.strokeStyle = '#000';
    if (state.drag) {
        const rect = rectFromDrag(state.drag);
        ctx.strokeRect(rect.x, rect.y, rect.width, rect.height);
        ctx.strokeStyle = '#fff';
        ctx.lineDashOffset = 4 / Math.max(0.0001, zoom);
        ctx.strokeRect(rect.x, rect.y, rect.width, rect.height);
    } else if (state.lassoPath) {
        ctx.beginPath();
        ctx.moveTo(state.lassoPath[0].x, state.lassoPath[0].y);
        for (let i = 1; i < state.lassoPath.length; i++) ctx.lineTo(state.lassoPath[i].x, state.lassoPath[i].y);
        ctx.stroke();
        ctx.strokeStyle = '#fff';
        ctx.lineDashOffset = 4 / Math.max(0.0001, zoom);
        ctx.stroke();
    }
    ctx.restore();
}

registerTool(objectSelectionTool);
