/**
 * Mask operations used by selectionSlice's refineEdge and by the live-preview
 * helper in RefineEdgeDialog. Pure functions over Uint8ClampedArray masks.
 */

export function blurMask(mask: Uint8ClampedArray, width: number, height: number, radius: number): Uint8ClampedArray {
    const r = Math.max(1, Math.round(radius));
    const tmp = new Float32Array(width * height);
    const out = new Uint8ClampedArray(width * height);
    for (let y = 0; y < height; y++) {
        let sum = 0;
        for (let i = -r; i <= r; i++) sum += mask[y * width + Math.max(0, Math.min(width - 1, i))];
        for (let x = 0; x < width; x++) {
            tmp[y * width + x] = sum / (2 * r + 1);
            const xLeft = x - r;
            const xRight = x + r + 1;
            sum -= mask[y * width + Math.max(0, Math.min(width - 1, xLeft))];
            sum += mask[y * width + Math.max(0, Math.min(width - 1, xRight))];
        }
    }
    for (let x = 0; x < width; x++) {
        let sum = 0;
        for (let i = -r; i <= r; i++) sum += tmp[Math.max(0, Math.min(height - 1, i)) * width + x];
        for (let y = 0; y < height; y++) {
            out[y * width + x] = Math.round(sum / (2 * r + 1));
            const yTop = y - r;
            const yBot = y + r + 1;
            sum -= tmp[Math.max(0, Math.min(height - 1, yTop)) * width + x];
            sum += tmp[Math.max(0, Math.min(height - 1, yBot)) * width + x];
        }
    }
    return out;
}

export function applyMaskContrast(mask: Uint8ClampedArray, contrast: number): Uint8ClampedArray {
    if (contrast <= 0) return mask;
    const k = contrast / 100;
    const out = new Uint8ClampedArray(mask.length);
    for (let i = 0; i < mask.length; i++) {
        const v = mask[i] / 255;
        const stepped = v < 0.5 ? 0 : 1;
        const blended = v * (1 - k) + stepped * k;
        out[i] = Math.round(blended * 255);
    }
    return out;
}

export function smoothMaskMedian(mask: Uint8ClampedArray, width: number, height: number, smooth: number): Uint8ClampedArray {
    if (smooth <= 0) return mask;
    const r = Math.max(1, Math.round(smooth / 20));
    const out = new Uint8ClampedArray(mask.length);
    const window: number[] = [];
    for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
            window.length = 0;
            for (let dy = -r; dy <= r; dy++) {
                for (let dx = -r; dx <= r; dx++) {
                    const sx = Math.max(0, Math.min(width - 1, x + dx));
                    const sy = Math.max(0, Math.min(height - 1, y + dy));
                    window.push(mask[sy * width + sx]);
                }
            }
            window.sort((a, b) => a - b);
            out[y * width + x] = window[(window.length / 2) | 0];
        }
    }
    return out;
}

export function computeGradientMagnitude(image: ImageData, width: number, height: number): Float32Array {
    const lum = new Float32Array(width * height);
    const data = image.data;
    for (let i = 0; i < lum.length; i++) {
        lum[i] = 0.299 * data[i * 4] + 0.587 * data[i * 4 + 1] + 0.114 * data[i * 4 + 2];
    }
    const out = new Float32Array(width * height);
    for (let y = 1; y < height - 1; y++) {
        for (let x = 1; x < width - 1; x++) {
            const i = y * width + x;
            const tl = lum[i - width - 1], t = lum[i - width], tr = lum[i - width + 1];
            const l = lum[i - 1], r = lum[i + 1];
            const bl = lum[i + width - 1], b = lum[i + width], br = lum[i + width + 1];
            const gx = -tl + tr - 2 * l + 2 * r - bl + br;
            const gy = -tl - 2 * t - tr + bl + 2 * b + br;
            out[i] = Math.sqrt(gx * gx + gy * gy);
        }
    }
    return out;
}
