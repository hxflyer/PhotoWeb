import type { CompositeRequest, Compositor } from './Compositor';
import { getAdjustment } from '../adjustments';

interface LayerWithAdjustment {
    adjustment?: { id: string; params: Record<string, unknown> };
}

export class Canvas2DCompositor implements Compositor {
    private maskCache = new WeakMap<HTMLCanvasElement, HTMLCanvasElement>();
    private frameCanvas: HTMLCanvasElement | null = null;

    beginFrame(target: HTMLCanvasElement): void {
        const ctx = target.getContext('2d');
        if (!ctx) return;
        ctx.clearRect(0, 0, target.width, target.height);
        const frame = this.ensureFrameCanvas(target.width, target.height);
        const frameCtx = frame.getContext('2d');
        frameCtx?.clearRect(0, 0, frame.width, frame.height);
    }

    render(req: CompositeRequest): void {
        const frame = this.ensureFrameCanvas(req.target.width, req.target.height);
        const ctx = frame.getContext('2d');
        const targetCtx = req.target.getContext('2d');
        if (!ctx || !targetCtx) return;

        req.layers.forEach(layer => {
            if (!layer.visible || !layer.canvas) return;
            if (req.skipTypeLayers && layer.kind === 'type') return;
            const meta = layer as unknown as LayerWithAdjustment;
            if (layer.kind === 'adjustment' && meta.adjustment) {
                this.applyAdjustmentToTarget(frame, meta.adjustment, layer.opacity);
                return;
            }
            const sourceCanvas = layer.mask && layer.mask.enabled
                ? this.applyMask(layer.canvas, layer.mask.canvas)
                : layer.canvas;
            ctx.globalAlpha = layer.opacity * layer.fill;
            ctx.globalCompositeOperation = layer.blendMode;
            ctx.drawImage(sourceCanvas, 0, 0);
        });
        ctx.globalAlpha = 1;
        ctx.globalCompositeOperation = 'source-over';

        // Channel isolation — when a single channel is active, replace each pixel's
        // RGB with the selected channel's value (greyscale view of that channel).
        if (req.activeChannel && req.activeChannel !== 'rgb') {
            this.applyChannelFilter(frame, req.activeChannel);
        }

        targetCtx.clearRect(0, 0, req.target.width, req.target.height);
        this.drawCheckerboard(targetCtx, req.target.width, req.target.height);
        targetCtx.drawImage(frame, 0, 0);
    }

    private applyChannelFilter(frame: HTMLCanvasElement, channel: 'r' | 'g' | 'b'): void {
        const ctx = frame.getContext('2d');
        if (!ctx) return;
        const img = ctx.getImageData(0, 0, frame.width, frame.height);
        const d = img.data;
        const offset = channel === 'r' ? 0 : channel === 'g' ? 1 : 2;
        for (let i = 0; i < d.length; i += 4) {
            const v = d[i + offset];
            d[i] = v;
            d[i + 1] = v;
            d[i + 2] = v;
        }
        ctx.putImageData(img, 0, 0);
    }

    private applyAdjustmentToTarget(
        target: HTMLCanvasElement,
        adjustment: { id: string; params: Record<string, unknown> },
        amount: number,
    ): void {
        const ctx = target.getContext('2d');
        if (!ctx) return;
        const adj = getAdjustment(adjustment.id);
        if (!adj) return;
        const image = ctx.getImageData(0, 0, target.width, target.height);
        const adjusted = adj.apply(adjustment.params, { image, width: target.width, height: target.height });
        if (amount >= 1) {
            ctx.putImageData(adjusted, 0, 0);
            return;
        }
        for (let i = 0; i < adjusted.data.length; i += 4) {
            adjusted.data[i] = Math.round(image.data[i] * (1 - amount) + adjusted.data[i] * amount);
            adjusted.data[i + 1] = Math.round(image.data[i + 1] * (1 - amount) + adjusted.data[i + 1] * amount);
            adjusted.data[i + 2] = Math.round(image.data[i + 2] * (1 - amount) + adjusted.data[i + 2] * amount);
        }
        ctx.putImageData(adjusted, 0, 0);
    }

    private applyMask(source: HTMLCanvasElement, mask: HTMLCanvasElement): HTMLCanvasElement {
        let merged = this.maskCache.get(source);
        if (!merged || merged.width !== source.width || merged.height !== source.height) {
            merged = document.createElement('canvas');
            merged.width = source.width;
            merged.height = source.height;
            this.maskCache.set(source, merged);
        }
        const ctx = merged.getContext('2d');
        if (!ctx) return source;
        ctx.clearRect(0, 0, merged.width, merged.height);
        ctx.globalCompositeOperation = 'source-over';
        ctx.drawImage(source, 0, 0);
        ctx.globalCompositeOperation = 'destination-in';
        ctx.drawImage(mask, 0, 0);
        ctx.globalCompositeOperation = 'source-over';
        return merged;
    }

    uploadRegion(): void {
        // No-op for Canvas2D: the layer canvas is already the source of truth.
        // The WebGPU implementation will use this to update its texture cache.
    }

    present(): void {
        // Canvas2D paints synchronously; nothing to flush.
    }

    private ensureFrameCanvas(width: number, height: number): HTMLCanvasElement {
        if (!this.frameCanvas) {
            this.frameCanvas = document.createElement('canvas');
        }
        if (this.frameCanvas.width !== width || this.frameCanvas.height !== height) {
            this.frameCanvas.width = width;
            this.frameCanvas.height = height;
        }
        return this.frameCanvas;
    }

    private drawCheckerboard(ctx: CanvasRenderingContext2D, w: number, h: number): void {
        const gridSize = 10;
        const cols = Math.ceil(w / gridSize);
        const rows = Math.ceil(h / gridSize);
        ctx.save();
        ctx.fillStyle = '#f2f2f2';
        ctx.fillRect(0, 0, w, h);
        ctx.fillStyle = '#d0d0d0';
        for (let y = 0; y < rows; y++) {
            for (let x = 0; x < cols; x++) {
                if ((x + y) % 2 === 1) {
                    ctx.fillRect(x * gridSize, y * gridSize, gridSize, gridSize);
                }
            }
        }
        ctx.restore();
    }
}
