import { blurMask } from './maskOps';

export interface FocusAreaOptions {
    range: number;
    noiseLevel: number;
    softenEdges: boolean;
}

export interface FocusAreaBrushStroke {
    mode: 'add' | 'sub';
    x: number;
    y: number;
    radius: number;
}

export function computeFocusAreaMask(
    image: ImageData,
    options: FocusAreaOptions,
    strokes: FocusAreaBrushStroke[] = [],
): Uint8ClampedArray {
    const { width, height, data } = image;
    const luma = new Float32Array(width * height);
    for (let i = 0, p = 0; i < data.length; i += 4, p++) {
        luma[p] = 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2];
    }

    const focus = new Float32Array(width * height);
    let maxFocus = 0;
    for (let y = 1; y < height - 1; y++) {
        for (let x = 1; x < width - 1; x++) {
            const idx = y * width + x;
            const gx =
                -luma[idx - width - 1] - 2 * luma[idx - 1] - luma[idx + width - 1]
                + luma[idx - width + 1] + 2 * luma[idx + 1] + luma[idx + width + 1];
            const gy =
                -luma[idx - width - 1] - 2 * luma[idx - width] - luma[idx - width + 1]
                + luma[idx + width - 1] + 2 * luma[idx + width] + luma[idx + width + 1];
            const mag = Math.sqrt(gx * gx + gy * gy);
            focus[idx] = mag;
            if (mag > maxFocus) maxFocus = mag;
        }
    }

    const smoothed = smoothFocus(focus, width, height);
    const range = Math.max(0, Math.min(100, options.range));
    const noise = Math.max(0, Math.min(100, options.noiseLevel));
    const threshold = maxFocus * (0.72 - range * 0.0052 + noise * 0.002);
    const mask = new Uint8ClampedArray(width * height);
    for (let i = 0; i < smoothed.length; i++) {
        mask[i] = smoothed[i] >= threshold && maxFocus > 0 ? 255 : 0;
    }

    for (const stroke of strokes) {
        paintStroke(mask, width, height, stroke);
    }

    return options.softenEdges ? blurMask(mask, width, height, 2) : mask;
}

function smoothFocus(focus: Float32Array, width: number, height: number): Float32Array {
    const out = new Float32Array(focus.length);
    for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
            let sum = 0;
            let count = 0;
            for (let yy = -1; yy <= 1; yy++) {
                const sy = Math.max(0, Math.min(height - 1, y + yy));
                for (let xx = -1; xx <= 1; xx++) {
                    const sx = Math.max(0, Math.min(width - 1, x + xx));
                    sum += focus[sy * width + sx];
                    count++;
                }
            }
            out[y * width + x] = sum / count;
        }
    }
    return out;
}

function paintStroke(mask: Uint8ClampedArray, width: number, height: number, stroke: FocusAreaBrushStroke): void {
    const r = Math.max(1, Math.round(stroke.radius));
    const r2 = r * r;
    const x0 = Math.max(0, Math.floor(stroke.x - r));
    const x1 = Math.min(width - 1, Math.ceil(stroke.x + r));
    const y0 = Math.max(0, Math.floor(stroke.y - r));
    const y1 = Math.min(height - 1, Math.ceil(stroke.y + r));
    const value = stroke.mode === 'add' ? 255 : 0;
    for (let y = y0; y <= y1; y++) {
        for (let x = x0; x <= x1; x++) {
            const dx = x - stroke.x;
            const dy = y - stroke.y;
            if (dx * dx + dy * dy <= r2) mask[y * width + x] = value;
        }
    }
}

export function focusMaskToSelectionOperation(mask: Uint8ClampedArray, width: number, height: number) {
    return {
        mode: 'add' as const,
        type: 'lasso' as const,
        path: [{ x: 0, y: 0 }, { x: width, y: 0 }, { x: width, y: height }, { x: 0, y: height }],
        mask: { data: mask, width, height },
    };
}
