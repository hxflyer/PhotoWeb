import { blendWithMask, buildEffectiveMask, buildSelectionMask } from '../filters/selectionMask';
import { captureLayerRegion, createPixelHistoryAction } from '../core/history';
import { getPatternTile } from '../store/toolsSlice';
import { useEditorStore } from '../store/editorStore';

export type FillUse = 'foreground' | 'background' | 'pattern';

export interface PatternFillOptions {
    use: FillUse;
    patternId?: string | null;
    opacity?: number;
    preserveTransparency?: boolean;
}

function hexToCanvasColor(value: string): string {
    return /^#[0-9a-f]{6}$/i.test(value) ? value : '#000000';
}

function selectionBounds(mask: ImageData): { x: number; y: number; width: number; height: number } | null {
    let minX = mask.width;
    let minY = mask.height;
    let maxX = -1;
    let maxY = -1;
    for (let y = 0; y < mask.height; y++) {
        for (let x = 0; x < mask.width; x++) {
            const alpha = mask.data[(y * mask.width + x) * 4 + 3];
            if (alpha === 0) continue;
            minX = Math.min(minX, x);
            minY = Math.min(minY, y);
            maxX = Math.max(maxX, x);
            maxY = Math.max(maxY, y);
        }
    }
    if (maxX < minX || maxY < minY) return null;
    return { x: minX, y: minY, width: maxX - minX + 1, height: maxY - minY + 1 };
}

export function captureActiveLayerPatternTile(): HTMLCanvasElement | null {
    const store = useEditorStore.getState();
    const layer = store.layers.find(item => item.id === store.activeLayerId);
    if (!layer) return null;

    const mask = buildSelectionMask(store.selection, layer.canvas.width, layer.canvas.height);
    const bounds = mask ? selectionBounds(mask) : { x: 0, y: 0, width: layer.canvas.width, height: layer.canvas.height };
    if (!bounds || bounds.width <= 0 || bounds.height <= 0) return null;

    const tile = document.createElement('canvas');
    tile.width = bounds.width;
    tile.height = bounds.height;
    const tctx = tile.getContext('2d');
    if (!tctx) return null;
    tctx.drawImage(layer.canvas, bounds.x, bounds.y, bounds.width, bounds.height, 0, 0, bounds.width, bounds.height);

    if (mask) {
        const img = tctx.getImageData(0, 0, bounds.width, bounds.height);
        for (let y = 0; y < bounds.height; y++) {
            for (let x = 0; x < bounds.width; x++) {
                const dst = (y * bounds.width + x) * 4 + 3;
                const src = ((bounds.y + y) * mask.width + bounds.x + x) * 4 + 3;
                img.data[dst] = Math.round(img.data[dst] * (mask.data[src] / 255));
            }
        }
        tctx.putImageData(img, 0, 0);
    }

    return tile;
}

export function defineActiveLayerAsPattern(name: string): string | null {
    const tile = captureActiveLayerPatternTile();
    if (!tile) return null;
    return useEditorStore.getState().definePattern(name, tile);
}

export function fillActiveLayer(options: PatternFillOptions): boolean {
    const store = useEditorStore.getState();
    const layer = store.layers.find(item => item.id === store.activeLayerId);
    if (!layer) return false;

    const width = layer.canvas.width;
    const height = layer.canvas.height;
    const opacity = Math.max(0, Math.min(1, options.opacity ?? 1));
    const before = captureLayerRegion(layer, { x: 0, y: 0, width, height });
    const original = layer.ctx.getImageData(0, 0, width, height);
    const fillCanvas = document.createElement('canvas');
    fillCanvas.width = width;
    fillCanvas.height = height;
    const fctx = fillCanvas.getContext('2d');
    if (!fctx) return false;

    if (options.use === 'pattern') {
        const patternId = options.patternId ?? store.activePatternId;
        const tile = patternId ? getPatternTile(patternId) : null;
        if (!tile) return false;
        const tileCtx = tile.getContext('2d');
        if (!tileCtx) return false;
        const tileImage = tileCtx.getImageData(0, 0, tile.width, tile.height);
        const fillImage = fctx.createImageData(width, height);
        for (let y = 0; y < height; y++) {
            for (let x = 0; x < width; x++) {
                const tx = x % tile.width;
                const ty = y % tile.height;
                const src = (ty * tile.width + tx) * 4;
                const dst = (y * width + x) * 4;
                fillImage.data[dst] = tileImage.data[src];
                fillImage.data[dst + 1] = tileImage.data[src + 1];
                fillImage.data[dst + 2] = tileImage.data[src + 2];
                fillImage.data[dst + 3] = Math.round(tileImage.data[src + 3] * opacity);
            }
        }
        fctx.putImageData(fillImage, 0, 0);
    } else {
        fctx.fillStyle = hexToCanvasColor(options.use === 'background' ? store.secondaryColor : store.primaryColor);
        fctx.globalAlpha = opacity;
        fctx.fillRect(0, 0, width, height);
        fctx.globalAlpha = 1;
    }

    const fillImage = fctx.getImageData(0, 0, width, height);
    const mask = buildEffectiveMask(store.selection, layer.mask, width, height);
    if (options.preserveTransparency) {
        const target = mask ?? new ImageData(width, height);
        if (!mask) {
            for (let i = 0; i < target.data.length; i += 4) target.data[i + 3] = 255;
        }
        for (let i = 0; i < target.data.length; i += 4) {
            target.data[i + 3] = Math.round(target.data[i + 3] * (original.data[i + 3] / 255));
        }
        layer.ctx.putImageData(blendWithMask(original, fillImage, target), 0, 0);
    } else {
        layer.ctx.putImageData(blendWithMask(original, fillImage, mask), 0, 0);
    }
    layer.markDirty(null);
    store.commitHistory(createPixelHistoryAction(layer, { x: 0, y: 0, width, height }, before, options.use === 'pattern' ? 'Fill Pattern' : 'Fill'));
    return true;
}
