import type { CompositeRequest, Compositor } from './Compositor';
import { getAdjustment } from '../adjustments';
import { getEffect } from '../effects';
import type { Layer } from '../core/Layer';

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

        req.layers
            .filter(layer => layer.parentId === null)
            .forEach(layer => this.renderLayer(ctx, layer, req.layers, req.skipTypeLayers));
        ctx.globalAlpha = 1;
        ctx.globalCompositeOperation = 'source-over';

        // Channel isolation — when a single channel is active, replace each pixel's
        // RGB with the selected channel's value (greyscale view of that channel).
        if (req.activeChannel && req.activeChannel !== 'rgb') {
            this.applyChannelFilter(frame, req.activeChannel);
        } else if (req.channelVisibility && (!req.channelVisibility.r || !req.channelVisibility.g || !req.channelVisibility.b)) {
            // Visibility eye icons in the Channels panel: zero out hidden channels
            // so the user can preview the composite without one or more channels.
            this.applyChannelVisibility(frame, req.channelVisibility);
        }

        targetCtx.clearRect(0, 0, req.target.width, req.target.height);
        this.drawCheckerboard(targetCtx, req.target.width, req.target.height);
        targetCtx.drawImage(frame, 0, 0);
    }

    private applyChannelVisibility(frame: HTMLCanvasElement, vis: { r: boolean; g: boolean; b: boolean }): void {
        const ctx = frame.getContext('2d');
        if (!ctx) return;
        const img = ctx.getImageData(0, 0, frame.width, frame.height);
        const d = img.data;
        for (let i = 0; i < d.length; i += 4) {
            if (!vis.r) d[i] = 0;
            if (!vis.g) d[i + 1] = 0;
            if (!vis.b) d[i + 2] = 0;
        }
        ctx.putImageData(img, 0, 0);
    }

    private renderLayer(
        ctx: CanvasRenderingContext2D,
        layer: Layer,
        layers: Layer[],
        skipTypeLayers?: boolean,
    ): void {
        if (!layer.visible || !layer.canvas) return;
        if (skipTypeLayers && layer.kind === 'type') return;
        if (layer.kind === 'group') {
            this.renderGroup(ctx, layer, layers, skipTypeLayers);
            return;
        }
        this.renderDrawableLayer(ctx, layer);
    }

    private renderDrawableLayer(ctx: CanvasRenderingContext2D, layer: Layer): void {
        const meta = layer as unknown as LayerWithAdjustment;
        if (layer.kind === 'adjustment' && meta.adjustment) {
            const target = ctx.canvas;
            this.applyAdjustmentToTarget(target, meta.adjustment, layer.opacity);
            return;
        }
        const sourceCanvas = layer.mask && layer.mask.enabled
            ? this.applyMask(layer.canvas, layer.mask.canvas, { density: layer.mask.density, feather: layer.mask.feather })
            : layer.canvas;

        const enabledEffects = layer.effects?.filter(e => e.enabled) ?? [];
        if (enabledEffects.length === 0) {
            ctx.globalAlpha = layer.opacity * layer.fill;
            ctx.globalCompositeOperation = layer.blendMode;
            ctx.drawImage(sourceCanvas, 0, 0);
            return;
        }

        // With effects, composite into a per-layer scratch buffer so we can
        // place underlay effects (drop shadow, outer glow) below the layer
        // and overlay effects (stroke, color overlay) above without affecting
        // the layer below in the document.
        const scratch = document.createElement('canvas');
        scratch.width = ctx.canvas.width;
        scratch.height = ctx.canvas.height;
        const sctx = scratch.getContext('2d');
        if (!sctx) {
            ctx.globalAlpha = layer.opacity * layer.fill;
            ctx.globalCompositeOperation = layer.blendMode;
            ctx.drawImage(sourceCanvas, 0, 0);
            return;
        }

        // 1) Render underlay effects first.
        for (const e of enabledEffects) {
            const renderer = getEffect(e.kind);
            if (!renderer) continue;
            const result = renderer.apply(e.params, { layer, layerCanvas: sourceCanvas, width: scratch.width, height: scratch.height });
            if (!result || result.placement !== 'underlay') continue;
            sctx.globalAlpha = result.opacity;
            sctx.globalCompositeOperation = result.blendMode;
            sctx.drawImage(result.canvas, 0, 0);
        }

        // 2) The layer itself.
        sctx.globalAlpha = 1;
        sctx.globalCompositeOperation = 'source-over';
        sctx.drawImage(sourceCanvas, 0, 0);

        // 3) Overlay effects, clipped to the layer's alpha so e.g. color overlay
        // only paints where the layer pixels exist.
        for (const e of enabledEffects) {
            const renderer = getEffect(e.kind);
            if (!renderer) continue;
            const result = renderer.apply(e.params, { layer, layerCanvas: sourceCanvas, width: scratch.width, height: scratch.height });
            if (!result || result.placement !== 'overlay') continue;
            sctx.globalAlpha = result.opacity;
            sctx.globalCompositeOperation = result.blendMode;
            sctx.drawImage(result.canvas, 0, 0);
        }

        ctx.globalAlpha = layer.opacity * layer.fill;
        ctx.globalCompositeOperation = layer.blendMode;
        ctx.drawImage(scratch, 0, 0);
    }

    private renderGroup(
        ctx: CanvasRenderingContext2D,
        group: Layer,
        layers: Layer[],
        skipTypeLayers?: boolean,
    ): void {
        const groupCanvas = document.createElement('canvas');
        groupCanvas.width = ctx.canvas.width;
        groupCanvas.height = ctx.canvas.height;
        const groupCtx = groupCanvas.getContext('2d');
        if (!groupCtx) return;
        layers
            .filter(layer => layer.parentId === group.id)
            .forEach(layer => this.renderLayer(groupCtx, layer, layers, skipTypeLayers));
        const sourceCanvas = group.mask && group.mask.enabled
            ? this.applyMask(groupCanvas, group.mask.canvas)
            : groupCanvas;
        ctx.globalAlpha = group.opacity * group.fill;
        ctx.globalCompositeOperation = group.blendMode;
        ctx.drawImage(sourceCanvas, 0, 0);
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

    private applyMask(
        source: HTMLCanvasElement,
        mask: HTMLCanvasElement,
        options?: { density?: number; feather?: number },
    ): HTMLCanvasElement {
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

        const density = options?.density ?? 1;
        const feather = options?.feather ?? 0;

        // Photoshop-style mask: white pixels reveal, black pixels hide. The
        // mask canvas stores visibility in its RGB channels; convert to alpha
        // so destination-in actually applies it.
        const alphaMask = document.createElement('canvas');
        alphaMask.width = mask.width; alphaMask.height = mask.height;
        const actx = alphaMask.getContext('2d');
        if (!actx) {
            ctx.globalCompositeOperation = 'destination-in';
            ctx.drawImage(mask, 0, 0);
            ctx.globalCompositeOperation = 'source-over';
            return merged;
        }
        if (feather > 0) actx.filter = `blur(${Math.max(0, feather)}px)`;
        actx.drawImage(mask, 0, 0);
        actx.filter = 'none';
        const img = actx.getImageData(0, 0, alphaMask.width, alphaMask.height);
        for (let i = 0; i < img.data.length; i += 4) {
            // Luminance from the RGB channels becomes the mask's alpha; scale
            // by density to attenuate the mask's effect non-destructively.
            const r = img.data[i], g = img.data[i + 1], b = img.data[i + 2];
            const luma = (0.299 * r + 0.587 * g + 0.114 * b);
            const a = Math.max(0, Math.min(255, Math.round((255 - (255 - luma) * density))));
            img.data[i + 3] = a;
            // RGB doesn't matter once we use destination-in, but zero them to
            // avoid surprises if something later samples colour from the mask.
            img.data[i] = 255;
            img.data[i + 1] = 255;
            img.data[i + 2] = 255;
        }
        actx.putImageData(img, 0, 0);

        ctx.globalCompositeOperation = 'destination-in';
        ctx.drawImage(alphaMask, 0, 0);
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
