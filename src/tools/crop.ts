import type { Tool, ToolPointerEvent } from './Tool';
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

const options: CropOptions = {
    aspect: 'free',
    customRatio: { w: 1, h: 1 },
    overlay: 'rule-of-thirds',
    deleteCroppedPixels: false,
    straighten: false,
};

const overlayOrder: CropOverlayId[] = ['rule-of-thirds', 'grid', 'diagonal', 'triangle', 'golden-ratio', 'none'];

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

interface CropDragState {
    anchor: { x: number; y: number };
    current: { x: number; y: number };
}

const drag: { state: CropDragState | null } = { state: null };

function p(e: ToolPointerEvent) { return { x: e.canvasX, y: e.canvasY }; }

export const cropTool: Tool = {
    id: 'crop',
    label: 'Crop',
    cursor: 'crosshair',
    onPointerDown: (e) => {
        if (e.button !== 0) return;
        drag.state = { anchor: p(e), current: p(e) };
    },
    onPointerMove: (e) => {
        if (!drag.state) return;
        drag.state.current = p(e);
    },
    onPointerUp: (_e, ctx) => {
        if (!drag.state) return;
        const { anchor, current } = drag.state;
        const x = Math.min(anchor.x, current.x);
        const y = Math.min(anchor.y, current.y);
        let w = Math.abs(current.x - anchor.x);
        let h = Math.abs(current.y - anchor.y);
        const ratio = aspectRatio();
        if (ratio) {
            if (w / h > ratio) w = h * ratio;
            else h = w / ratio;
        }
        if (w < 1 || h < 1) {
            drag.state = null;
            return;
        }
        const store = ctx.getStore();
        applyCrop(store, x, y, w, h);
        drag.state = null;
    },
    onKeyDown: (e) => {
        if (e.key.toLowerCase() === 'o') {
            const idx = overlayOrder.indexOf(options.overlay);
            options.overlay = overlayOrder[(idx + 1) % overlayOrder.length];
        }
    },
};

function applyCrop(
    store: { layers: Array<{ canvas: HTMLCanvasElement; ctx: CanvasRenderingContext2D; markDirty: (r: null) => void }>; setCanvasSize: (w: number, h: number) => void },
    x: number, y: number, w: number, h: number,
): void {
    const cropW = Math.round(w);
    const cropH = Math.round(h);
    const offsetX = Math.round(x);
    const offsetY = Math.round(y);
    if (options.deleteCroppedPixels) {
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
    } else {
        // Non-destructive crop: shrink the document but keep layer pixels intact at their original positions.
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
}

registerTool(cropTool);
