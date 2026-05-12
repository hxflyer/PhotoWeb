/**
 * Boolean path operations on shape layers via raster compositing.
 *
 * Photoshop's shape layers can compose multiple sub-paths with Combine /
 * Subtract / Intersect / Exclude operators. Photoweb stores per-kind shape
 * geometry, so the composite silhouette cannot be expressed by the existing
 * ShapeData kinds. We rasterize both source shapes into binary alpha masks,
 * combine them with Canvas2D's `globalCompositeOperation`, and the caller
 * writes the resulting canvas into the layer (converting it from a shape
 * layer to a raster layer in the process — same approach Photoshop takes
 * when the user explicitly rasterizes a shape).
 */
import { Layer } from '../core/Layer';
import { rerenderShapeLayer } from '../tools/shapeRender';
import type { ShapeData } from '../store/types';

export type ShapeBooleanOp = 'combine' | 'subtract' | 'intersect' | 'exclude';

const COMPOSITE_FOR_OP: Record<ShapeBooleanOp, GlobalCompositeOperation> = {
    combine: 'source-over',     // union
    subtract: 'destination-out',
    intersect: 'destination-in',
    exclude: 'xor',
};

function renderShapeToCanvas(data: ShapeData, width: number, height: number): HTMLCanvasElement {
    // Use a Layer so we can reuse the existing shapeRender pipeline without
    // duplicating per-kind path logic.
    const layer = new Layer(width, height, '__bool', 'shape');
    layer.shapeData = data;
    rerenderShapeLayer(layer);
    return layer.canvas;
}

/**
 * Render two shapes combined via a boolean op into a fresh canvas at the
 * document's dimensions. Returns null if the canvas context can't be acquired.
 *
 * `existing` is drawn as the destination, `incoming` as the source with the
 * compositing op applied. The caller is responsible for writing the result
 * into the active layer and flipping its kind to 'raster' (Photoshop's
 * rasterize-on-combine behavior).
 */
export function renderCombinedShapeCanvas(
    existing: ShapeData,
    incoming: ShapeData,
    op: ShapeBooleanOp,
    docWidth: number,
    docHeight: number,
): HTMLCanvasElement | null {
    const target = document.createElement('canvas');
    target.width = docWidth;
    target.height = docHeight;
    const ctx = target.getContext('2d');
    if (!ctx) return null;
    ctx.drawImage(renderShapeToCanvas(existing, docWidth, docHeight), 0, 0);
    ctx.save();
    ctx.globalCompositeOperation = COMPOSITE_FOR_OP[op];
    ctx.drawImage(renderShapeToCanvas(incoming, docWidth, docHeight), 0, 0);
    ctx.restore();
    return target;
}
