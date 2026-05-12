/**
 * Compositor helpers for Select and Mask preview. Pulled out of the React
 * component so the eslint react-refresh rule can keep the `.tsx` file as a
 * components-only module.
 */
import type { Layer } from '../core/Layer';

export type SelectAndMaskViewMode =
    | 'onion-skin'
    | 'marching-ants'
    | 'overlay'
    | 'on-black'
    | 'on-white'
    | 'black-and-white'
    | 'on-layers';

export function renderSelectAndMaskToImageData(
    width: number,
    height: number,
    mask: Uint8ClampedArray | null,
    source: ImageData | null,
    underlay: ImageData | null,
    viewMode: SelectAndMaskViewMode,
): ImageData {
    const out = new ImageData(width, height);
    for (let i = 0; i < width * height; i++) {
        const idx = i * 4;
        const a = mask ? mask[i] / 255 : 1;
        const sr = source ? source.data[idx] : 0;
        const sg = source ? source.data[idx + 1] : 0;
        const sb = source ? source.data[idx + 2] : 0;
        const sa = source ? source.data[idx + 3] / 255 : 0;

        let br = 0, bg = 0, bb = 0, ba = 1;
        if (viewMode === 'on-white') { br = 255; bg = 255; bb = 255; }
        else if (viewMode === 'on-black') { br = 0; bg = 0; bb = 0; }
        else if (viewMode === 'black-and-white') {
            const g = Math.round(a * 255);
            out.data[idx] = g; out.data[idx + 1] = g; out.data[idx + 2] = g; out.data[idx + 3] = 255;
            continue;
        }
        else if (viewMode === 'overlay') {
            const tint = 1 - a;
            out.data[idx] = Math.round(sr * (1 - tint) + 255 * tint);
            out.data[idx + 1] = Math.round(sg * (1 - tint));
            out.data[idx + 2] = Math.round(sb * (1 - tint));
            out.data[idx + 3] = 255;
            continue;
        }
        else if (viewMode === 'onion-skin') {
            const effective = 0.5 + 0.5 * a;
            out.data[idx] = Math.round(sr * effective);
            out.data[idx + 1] = Math.round(sg * effective);
            out.data[idx + 2] = Math.round(sb * effective);
            out.data[idx + 3] = 255;
            continue;
        }
        else if (viewMode === 'on-layers' && underlay) {
            br = underlay.data[idx];
            bg = underlay.data[idx + 1];
            bb = underlay.data[idx + 2];
            ba = underlay.data[idx + 3] / 255;
        }
        else if (viewMode === 'marching-ants') {
            out.data[idx] = sr;
            out.data[idx + 1] = sg;
            out.data[idx + 2] = sb;
            out.data[idx + 3] = source ? source.data[idx + 3] : 255;
            continue;
        }

        const fgA = sa * a;
        const r = sr * fgA + br * ba * (1 - fgA);
        const g = sg * fgA + bg * ba * (1 - fgA);
        const b = sb * fgA + bb * ba * (1 - fgA);
        out.data[idx] = Math.round(r);
        out.data[idx + 1] = Math.round(g);
        out.data[idx + 2] = Math.round(b);
        out.data[idx + 3] = 255;
    }
    return out;
}

export function compositeLayersBelow(
    layers: Layer[],
    activeLayerId: string | null,
    width: number,
    height: number,
): ImageData | null {
    if (width <= 0 || height <= 0) return null;
    const canvas = document.createElement('canvas');
    canvas.width = width; canvas.height = height;
    const ctx = canvas.getContext('2d');
    if (!ctx) return null;
    let reachedActive = false;
    for (const layer of layers) {
        if (layer.id === activeLayerId) { reachedActive = true; continue; }
        if (reachedActive) break;
        if (!layer.visible || layer.kind === 'group') continue;
        ctx.globalAlpha = layer.opacity * layer.fill;
        ctx.globalCompositeOperation = layer.blendMode;
        ctx.drawImage(layer.canvas, 0, 0);
    }
    ctx.globalAlpha = 1;
    ctx.globalCompositeOperation = 'source-over';
    return ctx.getImageData(0, 0, width, height);
}
