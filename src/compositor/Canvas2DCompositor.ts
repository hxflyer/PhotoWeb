import type { CompositeRequest, Compositor } from './Compositor';
import { getAdjustment } from '../adjustments';

interface LayerWithAdjustment {
    adjustment?: { id: string; params: Record<string, unknown> };
}

export class Canvas2DCompositor implements Compositor {
    beginFrame(target: HTMLCanvasElement): void {
        const ctx = target.getContext('2d');
        if (!ctx) return;
        ctx.clearRect(0, 0, target.width, target.height);
        this.drawCheckerboard(ctx, target.width, target.height);
    }

    render(req: CompositeRequest): void {
        const ctx = req.target.getContext('2d');
        if (!ctx) return;

        req.layers.forEach(layer => {
            if (!layer.visible || !layer.canvas) return;
            const meta = layer as unknown as LayerWithAdjustment;
            if (layer.kind === 'adjustment' && meta.adjustment) {
                this.applyAdjustmentToTarget(req.target, meta.adjustment, layer.opacity);
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
        const merged = document.createElement('canvas');
        merged.width = source.width;
        merged.height = source.height;
        const ctx = merged.getContext('2d');
        if (!ctx) return source;
        ctx.drawImage(source, 0, 0);
        ctx.globalCompositeOperation = 'destination-in';
        ctx.drawImage(mask, 0, 0);
        return merged;
    }

    uploadRegion(): void {
        // No-op for Canvas2D: the layer canvas is already the source of truth.
        // The WebGPU implementation will use this to update its texture cache.
    }

    present(): void {
        // Canvas2D paints synchronously; nothing to flush.
    }

    private drawCheckerboard(ctx: CanvasRenderingContext2D, w: number, h: number): void {
        const gridSize = 10;
        const cols = Math.ceil(w / gridSize);
        const rows = Math.ceil(h / gridSize);
        ctx.save();
        ctx.fillStyle = '#CCCCCC';
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
