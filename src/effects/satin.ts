import type { Effect, EffectRenderContext, EffectRenderResult } from './Effect';
import { registerEffect } from './registry';

type ContourName = 'linear' | 'cone' | 'gaussian';

interface SatinParams {
    color: string;
    opacity: number;            // 0..1
    blendMode: GlobalCompositeOperation;
    angle: number;              // deg
    distance: number;           // px
    size: number;               // px — blur radius
    contour: ContourName;
    invert: boolean;
}

const defaultParams: SatinParams = {
    color: '#000000',
    opacity: 0.5,
    blendMode: 'multiply',
    angle: 135,
    distance: 8,
    size: 8,
    contour: 'gaussian',
    invert: false,
};

function applyContour(value: number, name: ContourName): number {
    // value in 0..1 → 0..1 after the contour curve.
    const v = Math.max(0, Math.min(1, value));
    switch (name) {
        case 'linear':
            return v;
        case 'cone':
            // Symmetric peak at 0.5 — produces sharp banding.
            return 1 - Math.abs(2 * v - 1);
        case 'gaussian':
            // Wider, soft peak at 0.5 — silky banding.
            return Math.exp(-Math.pow((v - 0.5) * 4, 2));
    }
}

export const satinEffect: Effect = {
    kind: 'satin',
    label: 'Satin',
    defaultParams: defaultParams as unknown as Record<string, unknown>,
    apply(params, context: EffectRenderContext): EffectRenderResult | null {
        const p = { ...defaultParams, ...(params as Partial<SatinParams>) };
        const w = context.width;
        const h = context.height;

        const empty: EffectRenderResult = {
            canvas: document.createElement('canvas'),
            placement: 'overlay',
            blendMode: p.blendMode,
            opacity: p.opacity,
        };
        empty.canvas.width = w;
        empty.canvas.height = h;

        const aRad = (p.angle * Math.PI) / 180;
        const dx = Math.cos(aRad) * p.distance;
        const dy = Math.sin(aRad) * p.distance;

        // Step 1: stamp the layer alpha offset forward AND backward into two
        // buffers and compute the symmetric difference via ImageData arithmetic.
        // Canvas' 'xor' composite isn't reliably honoured by every backend, so
        // build it explicitly: |alpha_forward - alpha_backward|.
        const forward = document.createElement('canvas');
        forward.width = w; forward.height = h;
        const fctx = forward.getContext('2d');
        if (!fctx) return empty;
        fctx.drawImage(context.layerCanvas, dx, dy);

        const backward = document.createElement('canvas');
        backward.width = w; backward.height = h;
        const bctx = backward.getContext('2d');
        if (!bctx) return empty;
        bctx.drawImage(context.layerCanvas, -dx, -dy);

        const fImg = fctx.getImageData(0, 0, w, h);
        const bImg = bctx.getImageData(0, 0, w, h);
        const sym = document.createElement('canvas');
        sym.width = w; sym.height = h;
        const sctx = sym.getContext('2d');
        if (!sctx) return empty;
        const symRaw = sctx.createImageData(w, h);
        for (let i = 0; i < symRaw.data.length; i += 4) {
            const diff = Math.abs(fImg.data[i + 3] - bImg.data[i + 3]);
            symRaw.data[i] = 0;
            symRaw.data[i + 1] = 0;
            symRaw.data[i + 2] = 0;
            symRaw.data[i + 3] = diff;
        }
        sctx.putImageData(symRaw, 0, 0);

        // Step 2: blur by size.
        if (p.size > 0) {
            const blurred = document.createElement('canvas');
            blurred.width = w; blurred.height = h;
            const blctx = blurred.getContext('2d');
            if (!blctx) return empty;
            blctx.filter = `blur(${Math.max(0, p.size)}px)`;
            blctx.drawImage(sym, 0, 0);
            blctx.filter = 'none';
            sctx.clearRect(0, 0, w, h);
            sctx.drawImage(blurred, 0, 0);
        }

        // Step 3: read pixel alpha, run the contour over it, optionally invert,
        // multiply by layer alpha, tint with the satin colour.
        const layerCtx = context.layerCanvas.getContext('2d');
        if (!layerCtx) return empty;
        const symImg = sctx.getImageData(0, 0, w, h);
        const layerImg = layerCtx.getImageData(0, 0, w, h);

        for (let i = 0; i < symImg.data.length; i += 4) {
            const v = symImg.data[i + 3] / 255;
            let curved = applyContour(v, p.contour);
            if (p.invert) curved = 1 - curved;
            const layerAlpha = layerImg.data[i + 3] / 255;
            symImg.data[i + 3] = Math.round(curved * layerAlpha * 255);
            symImg.data[i] = 0;
            symImg.data[i + 1] = 0;
            symImg.data[i + 2] = 0;
        }
        sctx.putImageData(symImg, 0, 0);

        // Linear contour produces discrete banding at large distances because
        // the abs-difference of two offset alphas is a hard step function. A
        // 1–2 px post-blur smooths the steps into a continuous band without
        // changing the cone/gaussian contours (which are already smooth).
        if (p.contour === 'linear') {
            const postBlurPx = Math.min(2, Math.max(1, Math.round(p.distance * 0.05)));
            const blurredOut = document.createElement('canvas');
            blurredOut.width = w; blurredOut.height = h;
            const bctx2 = blurredOut.getContext('2d');
            if (bctx2) {
                bctx2.filter = `blur(${postBlurPx}px)`;
                bctx2.drawImage(sym, 0, 0);
                bctx2.filter = 'none';
                sctx.clearRect(0, 0, w, h);
                sctx.drawImage(blurredOut, 0, 0);
            }
        }

        // Tint to the satin colour.
        sctx.globalCompositeOperation = 'source-in';
        sctx.fillStyle = p.color;
        sctx.fillRect(0, 0, w, h);
        sctx.globalCompositeOperation = 'source-over';

        return { canvas: sym, placement: 'overlay', blendMode: p.blendMode, opacity: p.opacity };
    },
};

registerEffect(satinEffect);
