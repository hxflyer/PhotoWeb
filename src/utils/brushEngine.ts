export interface BrushDabOptions {
    x: number;
    y: number;
    width: number;
    height: number;
    size: number;
    hardness: number;
    opacity: number;
    flow: number;
    color: { r: number; g: number; b: number };
    mode: 'paint' | 'erase';
    base: Uint8ClampedArray;
    work: Uint8ClampedArray;
    coverage: Float32Array;
    selectionMask?: Float32Array | null;
}

export function brushTipAlpha(distance: number, radius: number, hardness: number): number {
    if (distance > radius) return 0;
    const hardRadius = radius * Math.max(0, Math.min(1, hardness));
    if (hardness >= 0.999 || distance <= hardRadius) return 1;
    const t = Math.max(0, Math.min(1, (distance - hardRadius) / Math.max(0.0001, radius - hardRadius)));
    return 1 - (t * t * (3 - 2 * t));
}

export function applyBrushDab(options: BrushDabOptions): void {
    const radius = Math.max(0.5, options.size / 2);
    const opacityCap = Math.max(0, Math.min(1, options.opacity));
    const flow = Math.max(0, Math.min(1, options.flow));
    if (opacityCap <= 0 || flow <= 0) return;

    const minX = Math.max(0, Math.floor(options.x - radius));
    const maxX = Math.min(options.width - 1, Math.ceil(options.x + radius));
    const minY = Math.max(0, Math.floor(options.y - radius));
    const maxY = Math.min(options.height - 1, Math.ceil(options.y + radius));

    for (let py = minY; py <= maxY; py++) {
        for (let px = minX; px <= maxX; px++) {
            const distance = Math.hypot(px + 0.5 - options.x, py + 0.5 - options.y);
            const tipAlpha = brushTipAlpha(distance, radius, options.hardness);
            if (tipAlpha <= 0) continue;

            const pixel = py * options.width + px;
            const mask = options.selectionMask ? options.selectionMask[pixel] : 1;
            if (mask <= 0) continue;

            const dabAlpha = Math.max(0, Math.min(1, tipAlpha * flow));
            options.coverage[pixel] = options.coverage[pixel] + (1 - options.coverage[pixel]) * dabAlpha;
            const effect = Math.min(options.coverage[pixel], opacityCap) * mask;
            const idx = pixel * 4;

            if (options.mode === 'erase') {
                options.work[idx] = options.base[idx];
                options.work[idx + 1] = options.base[idx + 1];
                options.work[idx + 2] = options.base[idx + 2];
                options.work[idx + 3] = Math.round(options.base[idx + 3] * (1 - effect));
                continue;
            }

            const dstA = options.base[idx + 3] / 255;
            const srcA = effect;
            const outA = srcA + dstA * (1 - srcA);
            if (outA <= 0) {
                options.work[idx] = 0;
                options.work[idx + 1] = 0;
                options.work[idx + 2] = 0;
                options.work[idx + 3] = 0;
            } else {
                options.work[idx] = Math.round((options.color.r * srcA + options.base[idx] * dstA * (1 - srcA)) / outA);
                options.work[idx + 1] = Math.round((options.color.g * srcA + options.base[idx + 1] * dstA * (1 - srcA)) / outA);
                options.work[idx + 2] = Math.round((options.color.b * srcA + options.base[idx + 2] * dstA * (1 - srcA)) / outA);
                options.work[idx + 3] = Math.round(outA * 255);
            }
        }
    }
}
