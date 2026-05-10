import type { EditorStore } from '../store/types';
import type { Tool, ToolContext, ToolPointerEvent } from './Tool';
import { registerTool } from './registry';

export type CropAspectId = 'free' | '1:1' | '4:3' | '16:9' | '3:2' | '5:4' | 'custom';
export type CropOverlayId = 'rule-of-thirds' | 'grid' | 'diagonal' | 'triangle' | 'golden-ratio' | 'none';

export interface CropOptions {
    aspect: CropAspectId;
    customRatio: { w: number; h: number };
    overlay: CropOverlayId;
    deleteCroppedPixels: boolean;
    straighten: boolean;
}

interface CropRect {
    x: number;
    y: number;
    w: number;
    h: number;
}

type CropHandle = 'nw' | 'n' | 'ne' | 'e' | 'se' | 's' | 'sw' | 'w' | 'move';

interface CropDragState {
    handle: CropHandle;
    start: { x: number; y: number };
    rect: CropRect;
}

const options: CropOptions = {
    aspect: 'free',
    customRatio: { w: 1, h: 1 },
    overlay: 'rule-of-thirds',
    deleteCroppedPixels: false,
    straighten: false,
};

const state: {
    rect: CropRect | null;
    drag: CropDragState | null;
} = {
    rect: null,
    drag: null,
};

const overlayOrder: CropOverlayId[] = ['rule-of-thirds', 'grid', 'diagonal', 'triangle', 'golden-ratio', 'none'];
const MIN_CROP_SIZE = 8;

export function setCropOptions(next: Partial<CropOptions>): void {
    Object.assign(options, next);
}

export function getCropOptions(): CropOptions {
    return { ...options };
}

export function aspectRatio(): number | null {
    if (options.aspect === 'free') return null;
    if (options.aspect === 'custom') return options.customRatio.w / options.customRatio.h;
    const [w, h] = options.aspect.split(':').map(Number);
    return w / h;
}

export function getCropRect(): CropRect | null {
    return state.rect ? { ...state.rect } : null;
}

function p(e: ToolPointerEvent) { return { x: e.canvasX, y: e.canvasY }; }

function normalizeRect(rect: CropRect): CropRect {
    const x1 = Math.min(rect.x, rect.x + rect.w);
    const y1 = Math.min(rect.y, rect.y + rect.h);
    const x2 = Math.max(rect.x, rect.x + rect.w);
    const y2 = Math.max(rect.y, rect.y + rect.h);
    return {
        x: x1,
        y: y1,
        w: Math.max(MIN_CROP_SIZE, x2 - x1),
        h: Math.max(MIN_CROP_SIZE, y2 - y1),
    };
}

function initCrop(store: Pick<EditorStore, 'width' | 'height'>): void {
    state.rect = { x: 0, y: 0, w: store.width, h: store.height };
    state.drag = null;
}

function handleAtPoint(rect: CropRect, x: number, y: number, zoom: number): CropHandle | null {
    const size = 18 / zoom;
    const cx = rect.x + rect.w / 2;
    const cy = rect.y + rect.h / 2;
    const points: Array<{ handle: CropHandle; x: number; y: number }> = [
        { handle: 'nw', x: rect.x, y: rect.y },
        { handle: 'n', x: cx, y: rect.y },
        { handle: 'ne', x: rect.x + rect.w, y: rect.y },
        { handle: 'e', x: rect.x + rect.w, y: cy },
        { handle: 'se', x: rect.x + rect.w, y: rect.y + rect.h },
        { handle: 's', x: cx, y: rect.y + rect.h },
        { handle: 'sw', x: rect.x, y: rect.y + rect.h },
        { handle: 'w', x: rect.x, y: cy },
    ];
    for (const point of points) {
        if (Math.abs(x - point.x) <= size && Math.abs(y - point.y) <= size) return point.handle;
    }
    if (x >= rect.x && x <= rect.x + rect.w && y >= rect.y && y <= rect.y + rect.h) return 'move';
    return null;
}

function resizeFromHandle(base: CropRect, handle: CropHandle, dx: number, dy: number): CropRect {
    let x1 = base.x;
    let y1 = base.y;
    let x2 = base.x + base.w;
    let y2 = base.y + base.h;

    if (handle === 'move') {
        return { x: base.x + dx, y: base.y + dy, w: base.w, h: base.h };
    }

    if (handle.includes('w')) x1 += dx;
    if (handle.includes('e')) x2 += dx;
    if (handle.includes('n')) y1 += dy;
    if (handle.includes('s')) y2 += dy;

    if (x2 - x1 < MIN_CROP_SIZE) {
        if (handle.includes('w')) x1 = x2 - MIN_CROP_SIZE;
        else x2 = x1 + MIN_CROP_SIZE;
    }
    if (y2 - y1 < MIN_CROP_SIZE) {
        if (handle.includes('n')) y1 = y2 - MIN_CROP_SIZE;
        else y2 = y1 + MIN_CROP_SIZE;
    }

    return normalizeRect({ x: x1, y: y1, w: x2 - x1, h: y2 - y1 });
}

function commitCrop(ctx: ToolContext): void {
    const rect = state.rect;
    if (!rect) return;
    const store = ctx.getStore();
    const cropRect = normalizeRect(rect);
    if (Math.round(cropRect.w) === store.width && Math.round(cropRect.h) === store.height && Math.round(cropRect.x) === 0 && Math.round(cropRect.y) === 0) {
        state.rect = null;
        state.drag = null;
        ctx.requestRender();
        return;
    }
    applyCrop(store, cropRect.x, cropRect.y, cropRect.w, cropRect.h);
    state.rect = null;
    state.drag = null;
    ctx.requestRender();
}

export function commitActiveCrop(ctx: ToolContext): void {
    commitCrop(ctx);
}

export const cropTool: Tool = {
    id: 'crop',
    label: 'Crop',
    cursor: 'default',
    onActivate: (ctx) => {
        initCrop(ctx.getStore());
        ctx.requestRender();
    },
    onDeactivate: (ctx) => {
        commitCrop(ctx);
    },
    onPointerDown: (e, ctx) => {
        if (e.button !== 0) return;
        const store = ctx.getStore();
        if (!state.rect) initCrop(store);
        const rect = state.rect;
        if (!rect) return;
        const point = p(e);
        const handle = handleAtPoint(rect, point.x, point.y, store.zoom) ?? 'move';
        state.drag = { handle, start: point, rect: { ...rect } };
    },
    onPointerMove: (e, ctx) => {
        if (!state.drag || !state.rect) return;
        const point = p(e);
        const dx = point.x - state.drag.start.x;
        const dy = point.y - state.drag.start.y;
        state.rect = resizeFromHandle(state.drag.rect, state.drag.handle, dx, dy);
        ctx.requestRender();
    },
    onPointerUp: () => {
        state.drag = null;
    },
    onKeyDown: (e, ctx) => {
        if (e.key === 'Enter') {
            e.rawEvent.preventDefault();
            commitCrop(ctx);
            return;
        }
        if (e.key === 'Escape') {
            e.rawEvent.preventDefault();
            state.rect = null;
            state.drag = null;
            ctx.requestRender();
            return;
        }
        if (e.key.toLowerCase() === 'o') {
            const idx = overlayOrder.indexOf(options.overlay);
            options.overlay = overlayOrder[(idx + 1) % overlayOrder.length];
            ctx.requestRender();
        }
    },
    renderOverlay: (overlay, toolCtx) => {
        const store = toolCtx.getStore();
        if (!state.rect) initCrop(store);
        const rect = state.rect;
        if (!rect) return;
        drawCropOverlay(overlay.ctx, rect, overlay.canvasWidth, overlay.canvasHeight, overlay.zoom);
    },
};

function drawCropOverlay(ctx: CanvasRenderingContext2D, rect: CropRect, width: number, height: number, zoom: number): void {
    const x = rect.x;
    const y = rect.y;
    const w = rect.w;
    const h = rect.h;
    const lineWidth = 2.5 / zoom;
    const handleThickness = 8 / zoom;
    const cornerLength = 44 / zoom;
    const sideLength = 56 / zoom;
    ctx.save();

    ctx.fillStyle = 'rgba(0, 0, 0, 0.42)';
    ctx.beginPath();
    ctx.rect(0, 0, width, height);
    ctx.rect(x, y, w, h);
    ctx.fill('evenodd');

    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = lineWidth;
    ctx.setLineDash([]);
    ctx.strokeRect(x, y, w, h);

    if (options.overlay === 'rule-of-thirds') {
        ctx.strokeStyle = 'rgba(255,255,255,0.86)';
        ctx.lineWidth = 1 / zoom;
        for (let i = 1; i <= 2; i++) {
            const vx = x + (w * i) / 3;
            const hy = y + (h * i) / 3;
            ctx.beginPath();
            ctx.moveTo(vx, y);
            ctx.lineTo(vx, y + h);
            ctx.moveTo(x, hy);
            ctx.lineTo(x + w, hy);
            ctx.stroke();
        }
    }

    ctx.fillStyle = '#ffffff';
    const roundedRect = (rx: number, ry: number, rw: number, rh: number) => {
        const r = Math.min(handleThickness / 2, Math.abs(rw) / 2, Math.abs(rh) / 2);
        ctx.beginPath();
        ctx.roundRect(rx, ry, rw, rh, r);
        ctx.fill();
    };
    const cx = x + w / 2;
    const cy = y + h / 2;
    const right = x + w;
    const bottom = y + h;
    const half = handleThickness / 2;

    // Photoshop-style handles sit centered on the crop edge, so half of each
    // handle remains outside the current image when the box snaps to the edge.
    roundedRect(x - half, y - half, cornerLength, handleThickness);
    roundedRect(x - half, y - half, handleThickness, cornerLength);
    roundedRect(right - cornerLength + half, y - half, cornerLength, handleThickness);
    roundedRect(right - half, y - half, handleThickness, cornerLength);
    roundedRect(right - cornerLength + half, bottom - half, cornerLength, handleThickness);
    roundedRect(right - half, bottom - cornerLength + half, handleThickness, cornerLength);
    roundedRect(x - half, bottom - half, cornerLength, handleThickness);
    roundedRect(x - half, bottom - cornerLength + half, handleThickness, cornerLength);
    roundedRect(cx - sideLength / 2, y - half, sideLength, handleThickness);
    roundedRect(cx - sideLength / 2, bottom - half, sideLength, handleThickness);
    roundedRect(x - half, cy - sideLength / 2, handleThickness, sideLength);
    roundedRect(right - half, cy - sideLength / 2, handleThickness, sideLength);
    ctx.restore();
}

function applyCrop(
    store: { layers: Array<{ canvas: HTMLCanvasElement; ctx: CanvasRenderingContext2D; markDirty: (r: null) => void }>; setCanvasSize: (w: number, h: number) => void },
    x: number, y: number, w: number, h: number,
): void {
    const cropW = Math.round(w);
    const cropH = Math.round(h);
    const offsetX = Math.round(x);
    const offsetY = Math.round(y);
    store.layers.forEach(layer => {
        const tmp = document.createElement('canvas');
        tmp.width = cropW;
        tmp.height = cropH;
        const tctx = tmp.getContext('2d');
        if (!tctx) return;
        tctx.drawImage(layer.canvas, -offsetX, -offsetY);
        layer.canvas.width = cropW;
        layer.canvas.height = cropH;
        layer.ctx.drawImage(tmp, 0, 0);
        layer.markDirty(null);
    });
    store.setCanvasSize(cropW, cropH);
}

registerTool(cropTool);
