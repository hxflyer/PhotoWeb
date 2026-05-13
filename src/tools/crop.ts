import type { EditorStore } from '../store/types';
import { useEditorStore } from '../store/editorStore';
import { nearestAxisStraightenDegrees } from '../core/imageTransforms';
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
    classicMode: boolean;
    hideCroppedArea: boolean;
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
    deleteCroppedPixels: true,
    straighten: false,
    classicMode: false,
    hideCroppedArea: false,
};

interface StraightenState {
    start: { x: number; y: number };
    end: { x: number; y: number };
}

const state: {
    rect: CropRect | null;
    drag: CropDragState | null;
    straighten: StraightenState | null;
} = {
    rect: null,
    drag: null,
    straighten: null,
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

function resizeFromHandle(base: CropRect, handle: CropHandle, dx: number, dy: number, shift = false, alt = false): CropRect {
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

    // Aspect ratio constraint. Existing Slice F behavior uses Shift as a
    // square override; the canvas-expansion flow keeps Shift+Alt centered
    // expansion on the starting crop ratio.
    const presetRatio = aspectRatio();
    const ratio = shift ? (alt ? base.w / base.h : 1) : presetRatio;
    if (ratio !== null) {
        const isCorner = handle.length === 2;
        if (isCorner) {
            const w = x2 - x1;
            const h = y2 - y1;
            const target = Math.max(Math.abs(w), Math.abs(h) * ratio);
            const newW = Math.sign(w || 1) * target;
            const newH = Math.sign(h || 1) * (target / ratio);
            if (handle.includes('w')) x1 = x2 - newW;
            else x2 = x1 + newW;
            if (handle.includes('n')) y1 = y2 - newH;
            else y2 = y1 + newH;
        } else {
            // Side handles: lock the perpendicular dimension to the ratio.
            const w = x2 - x1;
            const h = y2 - y1;
            if (handle === 'n' || handle === 's') {
                const cx = (x1 + x2) / 2;
                const targetW = Math.abs(h) * ratio;
                x1 = cx - targetW / 2;
                x2 = cx + targetW / 2;
            } else {
                const cy = (y1 + y2) / 2;
                const targetH = Math.abs(w) / ratio;
                y1 = cy - targetH / 2;
                y2 = cy + targetH / 2;
            }
        }
    }

    // Alt = grow symmetrically about the opposite edge/center. Mirror the
    // pulled side onto the fixed side, so the rect expands from its center.
    if (alt) {
        const cx = (base.x + base.x + base.w) / 2;
        const cy = (base.y + base.y + base.h) / 2;
        if (handle.includes('w')) x2 = 2 * cx - x1;
        else if (handle.includes('e')) x1 = 2 * cx - x2;
        if (handle.includes('n')) y2 = 2 * cy - y1;
        else if (handle.includes('s')) y1 = 2 * cy - y2;
    }

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
        if (options.straighten || e.ctrl || e.meta) {
            const point = p(e);
            state.straighten = { start: point, end: point };
            ctx.requestRender();
            return;
        }
        if (!state.rect) initCrop(store);
        const rect = state.rect;
        if (!rect) return;
        const point = p(e);
        const handle = handleAtPoint(rect, point.x, point.y, store.zoom) ?? 'move';
        state.drag = { handle, start: point, rect: { ...rect } };
    },
    onPointerMove: (e, ctx) => {
        if (state.straighten) {
            state.straighten.end = p(e);
            ctx.requestRender();
            return;
        }
        if (!state.drag || !state.rect) return;
        const point = p(e);
        const dx = point.x - state.drag.start.x;
        const dy = point.y - state.drag.start.y;
        state.rect = resizeFromHandle(state.drag.rect, state.drag.handle, dx, dy, e.shift, e.alt);
        ctx.requestRender();
    },
    onPointerUp: (_e, ctx) => {
        if (state.straighten) {
            const { start, end } = state.straighten;
            const dx = end.x - start.x;
            const dy = end.y - start.y;
            const len = Math.hypot(dx, dy);
            state.straighten = null;
            options.straighten = false;
            if (len > 4) {
                const correction = nearestAxisStraightenDegrees(dx, dy);
                ctx.getStore().rotateCanvas(correction);
                initCrop(ctx.getStore());
            }
            ctx.requestRender();
            return;
        }
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
            state.straighten = null;
            options.straighten = false;
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
        if (e.key.toLowerCase() === 'h') {
            options.hideCroppedArea = !options.hideCroppedArea;
            ctx.requestRender();
        }
        if (e.key.toLowerCase() === 'p') {
            options.classicMode = !options.classicMode;
            ctx.requestRender();
        }
        if (e.key.toLowerCase() === 'x') {
            const rect = state.rect ?? { x: 0, y: 0, w: ctx.getStore().width, h: ctx.getStore().height };
            const cx = rect.x + rect.w / 2;
            const cy = rect.y + rect.h / 2;
            state.rect = normalizeRect({ x: cx - rect.h / 2, y: cy - rect.w / 2, w: rect.h, h: rect.w });
            if (options.aspect === 'custom') {
                options.customRatio = { w: options.customRatio.h, h: options.customRatio.w };
            }
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

    ctx.fillStyle = options.hideCroppedArea ? 'rgba(0, 0, 0, 0.92)' : 'rgba(0, 0, 0, 0.42)';
    ctx.beginPath();
    ctx.rect(0, 0, width, height);
    ctx.rect(x, y, w, h);
    ctx.fill('evenodd');

    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = lineWidth;
    ctx.setLineDash([]);
    ctx.strokeRect(x, y, w, h);

    if (options.overlay !== 'none') {
        ctx.strokeStyle = 'rgba(255,255,255,0.86)';
        ctx.lineWidth = 1 / zoom;
        if (options.overlay === 'rule-of-thirds') {
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
        } else if (options.overlay === 'grid') {
            const step = 32 / zoom;
            for (let gx = x + step; gx < x + w; gx += step) {
                ctx.beginPath();
                ctx.moveTo(gx, y);
                ctx.lineTo(gx, y + h);
                ctx.stroke();
            }
            for (let gy = y + step; gy < y + h; gy += step) {
                ctx.beginPath();
                ctx.moveTo(x, gy);
                ctx.lineTo(x + w, gy);
                ctx.stroke();
            }
        } else if (options.overlay === 'diagonal') {
            ctx.beginPath();
            ctx.moveTo(x, y);
            ctx.lineTo(x + w, y + h);
            ctx.moveTo(x + w, y);
            ctx.lineTo(x, y + h);
            ctx.stroke();
        } else if (options.overlay === 'triangle') {
            ctx.beginPath();
            ctx.moveTo(x, y);
            ctx.lineTo(x + w, y + h);
            ctx.stroke();
            const len = Math.hypot(w, h);
            const ux = w / len;
            const uy = h / len;
            const ortho = (px: number, py: number) => {
                ctx.beginPath();
                ctx.moveTo(px, py);
                ctx.lineTo(px + uy * len, py - ux * len);
                ctx.stroke();
            };
            ortho(x + w, y);
            ortho(x, y + h);
        } else if (options.overlay === 'golden-ratio') {
            const phi = 1 / 1.618;
            const vx1 = x + w * phi;
            const vx2 = x + w * (1 - phi);
            const hy1 = y + h * phi;
            const hy2 = y + h * (1 - phi);
            for (const vx of [vx1, vx2]) {
                ctx.beginPath();
                ctx.moveTo(vx, y);
                ctx.lineTo(vx, y + h);
                ctx.stroke();
            }
            for (const hy of [hy1, hy2]) {
                ctx.beginPath();
                ctx.moveTo(x, hy);
                ctx.lineTo(x + w, hy);
                ctx.stroke();
            }
        }
    }

    if (state.straighten) {
        ctx.save();
        ctx.strokeStyle = '#22a3ff';
        ctx.lineWidth = 2 / zoom;
        ctx.beginPath();
        ctx.moveTo(state.straighten.start.x, state.straighten.start.y);
        ctx.lineTo(state.straighten.end.x, state.straighten.end.y);
        ctx.stroke();
        ctx.restore();
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
    store: EditorStore,
    x: number, y: number, w: number, h: number,
): void {
    const cropW = Math.round(w);
    const cropH = Math.round(h);
    const offsetX = Math.round(x);
    const offsetY = Math.round(y);
    const deletePixels = options.deleteCroppedPixels;
    store.executeDocumentCommand({
        kind: 'transform',
        label: 'Crop',
        run: () => {
            store.layers.forEach(layer => {
                const origW = layer.canvas.width;
                const origH = layer.canvas.height;
                if (deletePixels) {
                    const tmp = document.createElement('canvas');
                    tmp.width = cropW;
                    tmp.height = cropH;
                    const tctx = tmp.getContext('2d');
                    if (!tctx) return;
                    tctx.drawImage(layer.canvas, -offsetX, -offsetY);
                    layer.canvas.width = cropW;
                    layer.canvas.height = cropH;
                    layer.ctx.drawImage(tmp, 0, 0);
                } else {
                    // Preserve cropped pixels: keep layer canvas at its
                    // original size but shift content by (-offsetX,-offsetY)
                    // so the crop area aligns with the new document origin.
                    // Pixels outside the new document bounds remain on the
                    // layer canvas and become visible again on a wider crop.
                    const tmp = document.createElement('canvas');
                    tmp.width = origW;
                    tmp.height = origH;
                    const tctx = tmp.getContext('2d');
                    if (!tctx) return;
                    tctx.drawImage(layer.canvas, -offsetX, -offsetY);
                    layer.ctx.clearRect(0, 0, origW, origH);
                    layer.ctx.drawImage(tmp, 0, 0);
                }
                layer.markDirty(null);
            });
            useEditorStore.setState({ width: cropW, height: cropH });
        },
    });
}

export const perspectiveCropTool: Tool = {
    ...cropTool,
    id: 'perspective-crop',
    label: 'Perspective Crop',
};

registerTool(cropTool);
registerTool(perspectiveCropTool);
