import type { CompositeRequest, Compositor, DirtyRect } from './Compositor';
import { getAdjustment } from '../adjustments';
import { getEffect } from '../effects';
import type { Layer, BlendIf, BlendIfChannelRange, LayerEffect } from '../core/Layer';
import { drawCanvasWithBlendMode } from '../core/blendModes';

const EFFECT_RENDER_ORDER = [
    'drop-shadow',
    'outer-glow',
    'bevel-emboss',
    'stroke',
    'inner-shadow',
    'inner-glow',
    'satin',
    'color-overlay',
    'gradient-overlay',
    'pattern-overlay',
];

function sortEffectsForRender(effects: LayerEffect[]): LayerEffect[] {
    return [...effects].sort((a, b) => {
        const ai = EFFECT_RENDER_ORDER.indexOf(a.kind);
        const bi = EFFECT_RENDER_ORDER.indexOf(b.kind);
        return (ai === -1 ? EFFECT_RENDER_ORDER.length : ai) - (bi === -1 ? EFFECT_RENDER_ORDER.length : bi);
    });
}

interface LayerWithAdjustment {
    adjustment?: { id: string; params: Record<string, unknown> };
}

export class Canvas2DCompositor implements Compositor {
    private maskCache = new WeakMap<HTMLCanvasElement, HTMLCanvasElement>();
    private frameCanvas: HTMLCanvasElement | null = null;
    private framePainted = false;
    private lastFrameSize: { width: number; height: number } | null = null;

    beginFrame(target: HTMLCanvasElement): void {
        // Signal the start of a new frame. Buffers are NOT cleared here; the
        // following render() decides between a full repaint (which clears the
        // frame buffer + target) and a clipped composite (which preserves
        // the previous frame outside the dirty union). This lets sequential
        // render() calls reuse the off-screen frame buffer for cheap incremental
        // composites; full-repaint is forced by setting framePainted = false.
        this.ensureFrameCanvas(target.width, target.height);
        this.framePainted = false;
    }

    /**
     * Compute the union of all visible layers' dirty rects, expanded by `pad`
     * pixels on each side (to cover selection-edge anti-alias). Returns null
     * when no layer has a non-full dirty rect set; the caller treats that as
     * "no localized hint" and falls back to a full-canvas composite.
     */
    unionDirtyRect(layers: Layer[], width: number, height: number, pad = 1): DirtyRect | null {
        let x1 = Infinity, y1 = Infinity, x2 = -Infinity, y2 = -Infinity;
        let any = false;
        for (const layer of layers) {
            if (!layer.visible) continue;
            const r = layer.dirtyRect;
            if (!r) continue;
            any = true;
            if (r.x < x1) x1 = r.x;
            if (r.y < y1) y1 = r.y;
            if (r.x + r.width > x2) x2 = r.x + r.width;
            if (r.y + r.height > y2) y2 = r.y + r.height;
        }
        if (!any) return null;
        x1 = Math.max(0, Math.floor(x1 - pad));
        y1 = Math.max(0, Math.floor(y1 - pad));
        x2 = Math.min(width, Math.ceil(x2 + pad));
        y2 = Math.min(height, Math.ceil(y2 + pad));
        if (x2 <= x1 || y2 <= y1) return null;
        return { x: x1, y: y1, width: x2 - x1, height: y2 - y1 };
    }

    private rectIsFullCanvas(rect: DirtyRect, width: number, height: number): boolean {
        return rect.x <= 0 && rect.y <= 0 && rect.x + rect.width >= width && rect.y + rect.height >= height;
    }

    private hasAdjustmentLayer(layers: Layer[]): boolean {
        for (const layer of layers) {
            if (layer.visible && layer.kind === 'adjustment') return true;
        }
        return false;
    }

    private markFrameClean(layers: Layer[]): void {
        for (const layer of layers) layer.clearDirty();
    }

    private currentGlobalLight: { angle: number; altitude: number } | undefined;

    render(req: CompositeRequest): void {
        const frame = this.ensureFrameCanvas(req.target.width, req.target.height);
        const ctx = frame.getContext('2d');
        const targetCtx = req.target.getContext('2d');
        if (!ctx || !targetCtx) return;

        this.currentGlobalLight = req.globalLight;

        const w = req.target.width;
        const h = req.target.height;

        // Channel isolation / visibility post-process needs to walk the whole
        // frame, so it forces a full repaint. Adjustment layers do the same
        // (their applyAdjustmentToTarget putImageData ignores canvas clipping).
        const channelPostprocess = (req.activeChannel && req.activeChannel !== 'rgb')
            || (req.channelVisibility && (!req.channelVisibility.r || !req.channelVisibility.g || !req.channelVisibility.b));

        const sizeChanged = !this.lastFrameSize || this.lastFrameSize.width !== w || this.lastFrameSize.height !== h;
        const union = this.unionDirtyRect(req.layers, w, h, 1);
        const unionIsFullCanvas = union ? this.rectIsFullCanvas(union, w, h) : false;

        // A clipped composite is only safe when the off-screen frame buffer
        // still holds a valid previous-frame composite. framePainted tracks
        // whether the buffer survived the last render; beginFrame() forces it
        // to false so callers that explicitly start a new frame still see a
        // full repaint. The optimization kicks in for callers that issue
        // back-to-back render() calls (e.g., a tool that marks a tight rect
        // dirty and re-renders without calling beginFrame in between).
        const canUseClip = this.framePainted
            && !sizeChanged
            && !channelPostprocess
            && !this.hasAdjustmentLayer(req.layers)
            && union !== null
            && !unionIsFullCanvas;

        if (canUseClip && union) {
            ctx.save();
            ctx.beginPath();
            ctx.rect(union.x, union.y, union.width, union.height);
            ctx.clip();
            ctx.clearRect(union.x, union.y, union.width, union.height);
            this.renderLayerStack(ctx, req.layers.filter(layer => layer.parentId === null), req.layers, req.skipTypeLayers);
            ctx.restore();

            targetCtx.save();
            targetCtx.beginPath();
            targetCtx.rect(union.x, union.y, union.width, union.height);
            targetCtx.clip();
            targetCtx.clearRect(union.x, union.y, union.width, union.height);
            this.drawCheckerboard(targetCtx, w, h);
            targetCtx.drawImage(frame, 0, 0);
            targetCtx.restore();
        } else {
            ctx.clearRect(0, 0, w, h);
            this.renderLayerStack(ctx, req.layers.filter(layer => layer.parentId === null), req.layers, req.skipTypeLayers);
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

            targetCtx.clearRect(0, 0, w, h);
            this.drawCheckerboard(targetCtx, w, h);
            targetCtx.drawImage(frame, 0, 0);
        }

        this.framePainted = true;
        this.lastFrameSize = { width: w, height: h };
        this.markFrameClean(req.layers);
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

    private renderLayerStack(
        ctx: CanvasRenderingContext2D,
        siblings: Layer[],
        allLayers: Layer[],
        skipTypeLayers?: boolean,
    ): void {
        for (let i = 0; i < siblings.length; i++) {
            const base = siblings[i];
            if (base.clippedToBelow) {
                this.renderLayer(ctx, base, allLayers, skipTypeLayers);
                continue;
            }
            this.renderLayer(ctx, base, allLayers, skipTypeLayers);
            const baseMask = this.clippingMaskForLayer(base, allLayers, skipTypeLayers);
            let j = i + 1;
            while (j < siblings.length && siblings[j].clippedToBelow) {
                this.renderClippedLayer(ctx, siblings[j], allLayers, baseMask, skipTypeLayers);
                j++;
            }
            i = j - 1;
        }
    }

    private renderClippedLayer(
        ctx: CanvasRenderingContext2D,
        layer: Layer,
        layers: Layer[],
        baseMask: HTMLCanvasElement,
        skipTypeLayers?: boolean,
    ): void {
        if (!layer.visible || !layer.canvas) return;
        if (skipTypeLayers && layer.kind === 'type') return;
        const scratch = document.createElement('canvas');
        scratch.width = ctx.canvas.width;
        scratch.height = ctx.canvas.height;
        const sctx = scratch.getContext('2d');
        if (!sctx) return;
        this.renderLayer(sctx, layer, layers, skipTypeLayers);
        const clipped = this.applyAlphaMask(scratch, baseMask);
        ctx.save();
        ctx.globalAlpha = 1;
        ctx.globalCompositeOperation = 'source-over';
        ctx.drawImage(clipped, 0, 0);
        ctx.restore();
    }

    private clippingMaskForLayer(layer: Layer, layers: Layer[], skipTypeLayers?: boolean): HTMLCanvasElement {
        const mask = document.createElement('canvas');
        mask.width = layer.canvas.width;
        mask.height = layer.canvas.height;
        const mctx = mask.getContext('2d');
        if (!mctx) return mask;
        if (!layer.visible || (skipTypeLayers && layer.kind === 'type')) return mask;
        if (layer.kind === 'group') {
            const children = layers.filter(child => child.parentId === layer.id);
            this.renderLayerStack(mctx, children, layers, skipTypeLayers);
        } else if (layer.mask && layer.mask.enabled) {
            mctx.drawImage(this.applyMask(layer.canvas, layer.mask.canvas, { density: layer.mask.density, feather: layer.mask.feather }), 0, 0);
        } else {
            mctx.drawImage(layer.canvas, 0, 0);
        }
        return mask;
    }

    private renderDrawableLayer(ctx: CanvasRenderingContext2D, layer: Layer): void {
        const meta = layer as unknown as LayerWithAdjustment;
        if (layer.kind === 'adjustment' && meta.adjustment) {
            const target = ctx.canvas;
            this.applyAdjustmentToTarget(target, meta.adjustment, layer.opacity);
            return;
        }
        const rawSource = layer.mask && layer.mask.enabled
            ? this.applyMask(layer.canvas, layer.mask.canvas, { density: layer.mask.density, feather: layer.mask.feather })
            : layer.canvas;
        // Blend If reshapes the layer's alpha against either its own pixels
        // (thisLayer) or the underlying composite (underlyingLayer). The
        // result is applied as an extra mask on the layer's source canvas so
        // every downstream pass (effects, opacity, blend mode) reads the
        // Blend-If-aware silhouette.
        const sourceCanvas = applyBlendIf(rawSource, layer.blendIf, ctx.canvas);

        const enabledEffects = sortEffectsForRender(layer.effects?.filter(e => e.enabled) ?? []);
        if (enabledEffects.length === 0) {
            drawCanvasWithBlendMode(ctx, sourceCanvas, layer.blendMode, layer.opacity * layer.fill);
            return;
        }

        // With effects, composite into a per-layer scratch buffer so we can
        // place underlay effects (drop shadow, outer glow) below the layer
        // and overlay effects (stroke, color overlay) above without affecting
        // the layer below in the document. Fill Opacity attenuates the layer
        // pixels themselves but NOT the effects, so we draw the layer with
        // `fill` alpha and the effects at full alpha. Opacity (the outer
        // multiplier) attenuates everything uniformly at the final draw.
        const scratch = document.createElement('canvas');
        scratch.width = ctx.canvas.width;
        scratch.height = ctx.canvas.height;
        const sctx = scratch.getContext('2d');
        if (!sctx) {
            drawCanvasWithBlendMode(ctx, sourceCanvas, layer.blendMode, layer.opacity * layer.fill);
            return;
        }

        // 1) Render underlay effects first.
        for (const e of enabledEffects) {
            const renderer = getEffect(e.kind);
            if (!renderer) continue;
            const result = renderer.apply(e.params, { layer, layerCanvas: sourceCanvas, width: scratch.width, height: scratch.height, globalLight: this.currentGlobalLight });
            if (!result || result.placement !== 'underlay') continue;
            sctx.globalAlpha = result.opacity;
            sctx.globalCompositeOperation = result.blendMode;
            sctx.drawImage(result.canvas, 0, 0);
        }

        // 2) The layer itself — attenuated by Fill Opacity only.
        sctx.globalAlpha = layer.fill;
        sctx.globalCompositeOperation = 'source-over';
        sctx.drawImage(sourceCanvas, 0, 0);

        // 3) Overlay effects, clipped to the layer's alpha so e.g. color overlay
        // only paints where the layer pixels exist.
        for (const e of enabledEffects) {
            const renderer = getEffect(e.kind);
            if (!renderer) continue;
            const result = renderer.apply(e.params, { layer, layerCanvas: sourceCanvas, width: scratch.width, height: scratch.height, globalLight: this.currentGlobalLight });
            if (!result || result.placement !== 'overlay') continue;
            sctx.globalAlpha = result.opacity;
            sctx.globalCompositeOperation = result.blendMode;
            sctx.drawImage(result.canvas, 0, 0);
        }

        const finalScratch = layer.layerMaskHidesEffects && layer.mask?.enabled
            ? this.applyMask(scratch, layer.mask.canvas, { density: layer.mask.density, feather: layer.mask.feather })
            : scratch;
        drawCanvasWithBlendMode(ctx, finalScratch, layer.blendMode, layer.opacity);
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
        this.renderLayerStack(groupCtx, layers.filter(layer => layer.parentId === group.id), layers, skipTypeLayers);
        const sourceCanvas = group.mask && group.mask.enabled
            ? this.applyMask(groupCanvas, group.mask.canvas, { density: group.mask.density, feather: group.mask.feather })
            : groupCanvas;

        const enabledEffects = sortEffectsForRender(group.effects?.filter(e => e.enabled) ?? []);
        if (enabledEffects.length === 0) {
            drawCanvasWithBlendMode(ctx, sourceCanvas, group.blendMode, group.opacity * group.fill);
            return;
        }

        // Mirror renderDrawableLayer's underlay/overlay split so a group's
        // effects (e.g. a shared Drop Shadow under the whole group) render
        // exactly like a layer's. The group's composited result is the
        // alpha silhouette every effect renderer sees.
        const scratch = document.createElement('canvas');
        scratch.width = ctx.canvas.width;
        scratch.height = ctx.canvas.height;
        const sctx = scratch.getContext('2d');
        if (!sctx) {
            drawCanvasWithBlendMode(ctx, sourceCanvas, group.blendMode, group.opacity * group.fill);
            return;
        }

        for (const e of enabledEffects) {
            const renderer = getEffect(e.kind);
            if (!renderer) continue;
            const result = renderer.apply(e.params, { layer: group, layerCanvas: sourceCanvas, width: scratch.width, height: scratch.height, globalLight: this.currentGlobalLight });
            if (!result || result.placement !== 'underlay') continue;
            sctx.globalAlpha = result.opacity;
            sctx.globalCompositeOperation = result.blendMode;
            sctx.drawImage(result.canvas, 0, 0);
        }

        sctx.globalAlpha = group.fill;
        sctx.globalCompositeOperation = 'source-over';
        sctx.drawImage(sourceCanvas, 0, 0);

        for (const e of enabledEffects) {
            const renderer = getEffect(e.kind);
            if (!renderer) continue;
            const result = renderer.apply(e.params, { layer: group, layerCanvas: sourceCanvas, width: scratch.width, height: scratch.height, globalLight: this.currentGlobalLight });
            if (!result || result.placement !== 'overlay') continue;
            sctx.globalAlpha = result.opacity;
            sctx.globalCompositeOperation = result.blendMode;
            sctx.drawImage(result.canvas, 0, 0);
        }

        const finalScratch = group.layerMaskHidesEffects && group.mask?.enabled
            ? this.applyMask(scratch, group.mask.canvas, { density: group.mask.density, feather: group.mask.feather })
            : scratch;
        drawCanvasWithBlendMode(ctx, finalScratch, group.blendMode, group.opacity);
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
        const adjusted = adj.apply(adjustment.params, { image, width: target.width, height: target.height, selectionMask: null, dirtyRect: null });
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

    private applyAlphaMask(source: HTMLCanvasElement, mask: HTMLCanvasElement): HTMLCanvasElement {
        const merged = document.createElement('canvas');
        merged.width = source.width;
        merged.height = source.height;
        const ctx = merged.getContext('2d');
        if (!ctx) return source;
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

// --- Blend If implementation ---------------------------------------------
// Photoshop's "Blend If" sliders mask a layer's pixels by either the layer's
// own channel values ("This Layer") or the underlying composite's channel
// values ("Underlying Layer"). Two split-triangle ranges produce a smooth
// attenuation: pixels with channel value < low fade to 0, between low/lowMax
// ramp from 0..1, between lowMax/highMin stay at 1, and between highMin/high
// ramp back down to 0 (values > high are 0).
//
// This implementation pre-composes "the layer below" into an underlay buffer
// before each layer renders. We approximate that by reading the running
// composite canvas (`bottom`) for the Underlying-Layer side.
function rangeWeight(value: number, r: BlendIfChannelRange): number {
    // The triangle pair fully blocks pixels where value < low or value > high
    // ONLY when the low/lowMax (or highMin/high) pair has a real ramp. A pair
    // at the channel boundary (low = lowMax = 0 OR highMin = high = 255)
    // means "no falloff on that side" → pixels at the boundary stay visible.
    if (value < r.low) return 0;
    if (value > r.high) return 0;
    if (value < r.lowMax) {
        const span = r.lowMax - r.low;
        if (span <= 0) return 1; // no low ramp — boundary value passes
        return (value - r.low) / span;
    }
    if (value > r.highMin) {
        const span = r.high - r.highMin;
        if (span <= 0) return 1; // no high ramp — boundary value passes
        return 1 - (value - r.highMin) / span;
    }
    return 1;
}

function isIdentityRange(r: BlendIfChannelRange): boolean {
    return r.low === 0 && r.lowMax === 0 && r.highMin === 255 && r.high === 255;
}

function applyBlendIf(
    source: HTMLCanvasElement,
    blendIf: BlendIf | undefined,
    bottom: HTMLCanvasElement,
): HTMLCanvasElement {
    if (!blendIf) return source;
    const channel = blendIf.channel;
    const ranges = blendIf[channel];
    if (isIdentityRange(ranges.thisLayer) && isIdentityRange(ranges.underlyingLayer)) {
        return source;
    }
    const sCtx = source.getContext('2d');
    const bCtx = bottom.getContext('2d');
    if (!sCtx || !bCtx) return source;
    const out = document.createElement('canvas');
    out.width = source.width; out.height = source.height;
    const oCtx = out.getContext('2d');
    if (!oCtx) return source;
    const sImg = sCtx.getImageData(0, 0, source.width, source.height);
    const bImg = bCtx.getImageData(0, 0, Math.min(bottom.width, source.width), Math.min(bottom.height, source.height));
    const oImg = oCtx.createImageData(source.width, source.height);
    const channelOffset = channel === 'r' ? 0 : channel === 'g' ? 1 : channel === 'b' ? 2 : -1;
    for (let i = 0; i < sImg.data.length; i += 4) {
        const sr = sImg.data[i];
        const sg = sImg.data[i + 1];
        const sb = sImg.data[i + 2];
        const sa = sImg.data[i + 3];
        const sVal = channelOffset === -1
            ? Math.round(sr * 0.299 + sg * 0.587 + sb * 0.114)
            : sImg.data[i + channelOffset];
        let bVal = 0;
        if (i < bImg.data.length) {
            const br = bImg.data[i];
            const bg = bImg.data[i + 1];
            const bb = bImg.data[i + 2];
            bVal = channelOffset === -1
                ? Math.round(br * 0.299 + bg * 0.587 + bb * 0.114)
                : bImg.data[i + channelOffset];
        }
        const wThis = rangeWeight(sVal, ranges.thisLayer);
        const wUnder = rangeWeight(bVal, ranges.underlyingLayer);
        const w = wThis * wUnder;
        oImg.data[i] = sr;
        oImg.data[i + 1] = sg;
        oImg.data[i + 2] = sb;
        oImg.data[i + 3] = Math.round(sa * w);
    }
    oCtx.putImageData(oImg, 0, 0);
    return out;
}
