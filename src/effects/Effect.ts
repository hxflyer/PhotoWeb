import type { Layer, LayerEffectKind } from '../core/Layer';

/**
 * Compositor pipeline for a layer effect. The compositor blits the layer's
 * source canvas (mask-applied) into a working buffer, then runs each enabled
 * effect's renderer through this contract.
 *
 *   - underlay: drawn beneath the layer canvas (drop shadow, outer glow).
 *   - overlay: drawn over the layer canvas, clipped to its alpha (color overlay,
 *     stroke when position=center/inside, inner shadow, inner glow).
 *
 * Renderers receive a fresh offscreen canvas to paint into; the compositor
 * handles position/blend-mode/opacity composition once the renderer returns.
 */
export interface EffectRenderContext {
    layer: Layer;
    layerCanvas: HTMLCanvasElement; // The mask-applied layer pixels
    width: number;
    height: number;
}

export interface EffectRenderResult {
    canvas: HTMLCanvasElement;
    placement: 'underlay' | 'overlay';
    blendMode: GlobalCompositeOperation;
    opacity: number; // 0..1
}

export interface Effect {
    kind: LayerEffectKind;
    label: string;
    defaultParams: Record<string, unknown>;
    apply(params: Record<string, unknown>, context: EffectRenderContext): EffectRenderResult | null;
}
