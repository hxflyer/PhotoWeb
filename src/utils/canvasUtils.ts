
/**
 * Applies a fast high-quality blur to a canvas using 3-pass Box Blur behavior (approximating Gaussian).
 * This runs on the CPU and avoids browser-specific composite artifacts.
 */
export function superFastBlur(canvas: HTMLCanvasElement, radius: number) {
    // Force Integer Radius
    radius = Math.floor(radius);
    if (radius < 1) return;

    // Force Integer Dimensions
    const w = Math.floor(canvas.width);
    const h = Math.floor(canvas.height);

    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    if (!ctx) return;

    let imageData;
    try {
        imageData = ctx.getImageData(0, 0, w, h);
    } catch {
        return;
    }
    const src = imageData.data;

    // Buffers (Use Float32 for high precision accumulation to avoid banding)
    const buffer1 = new Float32Array(src);
    const buffer2 = new Float32Array(src.length);

    // 3 Iterations
    for (let i = 0; i < 3; i++) {
        boxBlurH_Target(buffer1, buffer2, w, h, radius);
        boxBlurT_Target(buffer2, buffer1, w, h, radius); // writes back to buffer1
    }

    // No dithering needed - we quantize for canvas display only
    imageData.data.set(buffer1);
    ctx.putImageData(imageData, 0, 0);
}

/**
 * Blur a canvas and return the result as a Float32Array (normalized 0-1).
 * This provides full floating-point precision for masking operations.
 * The blur is done directly in Float32, and the result is extracted without 8-bit quantization.
 */
export function superFastBlurToFloat32(canvas: HTMLCanvasElement, radius: number): Float32Array | null {
    radius = Math.floor(radius);

    const w = Math.floor(canvas.width);
    const h = Math.floor(canvas.height);

    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    if (!ctx) return null;

    let imageData;
    try {
        imageData = ctx.getImageData(0, 0, w, h);
    } catch {
        return null;
    }
    const src = imageData.data;

    // Create float buffer - this preserves full precision during blur
    const buffer1 = new Float32Array(src);
    const buffer2 = new Float32Array(src.length);

    // Apply blur if radius > 0 (even if already blurred on canvas, re-blur from float buffer)
    if (radius >= 1) {
        for (let i = 0; i < 3; i++) {
            boxBlurH_Target(buffer1, buffer2, w, h, radius);
            boxBlurT_Target(buffer2, buffer1, w, h, radius);
        }
    }

    // Extract the Alpha channel and normalize to 0-1
    // Our mask is white (255,255,255,255) on transparent (0,0,0,0)
    // Alpha channel is more reliable for masking
    const alphaMask = new Float32Array(w * h);
    for (let i = 0; i < w * h; i++) {
        // Use alpha channel (index +3) - normalized to 0.0-1.0 range
        alphaMask[i] = buffer1[i * 4 + 3] / 255.0;
    }

    return alphaMask;
}

// Helper to accept Float32Array or Uint8ClampedArray
function boxBlurH_Target(src: Float32Array | Uint8ClampedArray, tgt: Float32Array | Uint8ClampedArray, w: number, h: number, radius: number) {
    const wm = w - 1;
    const div = radius + radius + 1;

    for (let y = 0; y < h; y++) {
        let r = 0, g = 0, b = 0, a = 0;
        const rowStart = y * w * 4;

        // Initial Sum
        for (let i = -radius; i <= radius; i++) {
            const clampedX = Math.min(wm, Math.max(i, 0));
            const pIdx = rowStart + clampedX * 4;
            r += src[pIdx];
            g += src[pIdx + 1];
            b += src[pIdx + 2];
            a += src[pIdx + 3];
        }

        for (let x = 0; x < w; x++) {
            // Write Average (Keep Float Precision)
            const currentIdx = rowStart + x * 4;
            tgt[currentIdx] = r / div;
            tgt[currentIdx + 1] = g / div;
            tgt[currentIdx + 2] = b / div;
            tgt[currentIdx + 3] = a / div;

            // Slide Window
            const outX = Math.min(wm, Math.max(x - radius, 0));
            const outIdx = rowStart + outX * 4;

            const inX = Math.min(wm, Math.max(x + radius + 1, 0));
            const inIdx = rowStart + inX * 4;

            r = r - src[outIdx] + src[inIdx];
            g = g - src[outIdx + 1] + src[inIdx + 1];
            b = b - src[outIdx + 2] + src[inIdx + 2];
            a = a - src[outIdx + 3] + src[inIdx + 3];
        }
    }
}

function boxBlurT_Target(src: Float32Array | Uint8ClampedArray, tgt: Float32Array | Uint8ClampedArray, w: number, h: number, radius: number) {
    const hm = h - 1;
    const div = radius + radius + 1;

    for (let x = 0; x < w; x++) {
        let r = 0, g = 0, b = 0, a = 0;
        const colStart = x * 4;

        // Initial Sum
        for (let i = -radius; i <= radius; i++) {
            const clampedY = Math.min(hm, Math.max(i, 0));
            const pIdx = colStart + clampedY * w * 4;
            r += src[pIdx];
            g += src[pIdx + 1];
            b += src[pIdx + 2];
            a += src[pIdx + 3];
        }

        for (let y = 0; y < h; y++) {
            const currentIdx = colStart + y * w * 4;
            tgt[currentIdx] = r / div;
            tgt[currentIdx + 1] = g / div;
            tgt[currentIdx + 2] = b / div;
            tgt[currentIdx + 3] = a / div;

            const outY = Math.min(hm, Math.max(y - radius, 0));
            const outIdx = colStart + outY * w * 4;

            const inY = Math.min(hm, Math.max(y + radius + 1, 0));
            const inIdx = colStart + inY * w * 4;

            r = r - src[outIdx] + src[inIdx];
            g = g - src[outIdx + 1] + src[inIdx + 1];
            b = b - src[outIdx + 2] + src[inIdx + 2];
            a = a - src[outIdx + 3] + src[inIdx + 3];
        }
    }
}

/**
 * Returns the bounding box of non-transparent pixels in the canvas.
 */
export function getLayerContentBounds(canvas: HTMLCanvasElement): { x: number, y: number, w: number, h: number } | null {
    const ctx = canvas.getContext('2d');
    if (!ctx) return null;

    const w = canvas.width;
    const h = canvas.height;
    const imageData = ctx.getImageData(0, 0, w, h);
    const data = imageData.data;

    let minX = w, minY = h, maxX = 0, maxY = 0;
    let found = false;

    // Analyze alpha channel only
    for (let y = 0; y < h; y++) {
        for (let x = 0; x < w; x++) {
            const idx = (y * w + x) * 4;
            if (data[idx + 3] > 0) { // Non-transparent
                if (x < minX) minX = x;
                if (x > maxX) maxX = x;
                if (y < minY) minY = y;
                if (y > maxY) maxY = y;
                found = true;
            }
        }
    }

    if (!found) return null;

    return {
        x: minX,
        y: minY,
        w: maxX - minX + 1,
        h: maxY - minY + 1
    };
}
