export interface BrushTipData {
    kind: 'bitmap';
    width: number;
    height: number;
    alpha: string;
}

const BASE64_CHUNK = 0x8000;

function bytesToBase64(bytes: Uint8ClampedArray | Uint8Array): string {
    let binary = '';
    for (let i = 0; i < bytes.length; i += BASE64_CHUNK) {
        const chunk = bytes.subarray(i, Math.min(i + BASE64_CHUNK, bytes.length));
        binary += String.fromCharCode(...chunk);
    }
    return btoa(binary);
}

export function decodeBrushTipAlpha(tip: BrushTipData): Uint8Array {
    const binary = atob(tip.alpha);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
    return bytes;
}

export function createBrushTipFromCanvas(source: HTMLCanvasElement, maxSize = 2500): BrushTipData {
    const scale = Math.min(1, maxSize / Math.max(1, source.width, source.height));
    const width = Math.max(1, Math.round(source.width * scale));
    const height = Math.max(1, Math.round(source.height * scale));
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d')!;
    ctx.imageSmoothingEnabled = true;
    ctx.drawImage(source, 0, 0, width, height);
    const data = ctx.getImageData(0, 0, width, height).data;
    const alpha = new Uint8Array(width * height);
    for (let i = 0, p = 0; i < data.length; i += 4, p++) {
        const a = data[i + 3] / 255;
        const lum = data[i] * 0.299 + data[i + 1] * 0.587 + data[i + 2] * 0.114;
        const compositedOverWhite = lum * a + 255 * (1 - a);
        alpha[p] = Math.max(0, Math.min(255, Math.round(255 - compositedOverWhite)));
    }
    return { kind: 'bitmap', width, height, alpha: bytesToBase64(alpha) };
}

export function drawBrushTipPreview(
    ctx: CanvasRenderingContext2D,
    tip: BrushTipData,
    x: number,
    y: number,
    width: number,
    height: number,
    color = '#222222',
): void {
    const alpha = decodeBrushTipAlpha(tip);
    const image = ctx.createImageData(tip.width, tip.height);
    const rgb = /^#([0-9a-f]{6})$/i.exec(color);
    const r = rgb ? parseInt(rgb[1].slice(0, 2), 16) : 34;
    const g = rgb ? parseInt(rgb[1].slice(2, 4), 16) : 34;
    const b = rgb ? parseInt(rgb[1].slice(4, 6), 16) : 34;
    for (let p = 0, i = 0; p < alpha.length; p++, i += 4) {
        image.data[i] = r;
        image.data[i + 1] = g;
        image.data[i + 2] = b;
        image.data[i + 3] = alpha[p];
    }
    const offscreen = document.createElement('canvas');
    offscreen.width = tip.width;
    offscreen.height = tip.height;
    offscreen.getContext('2d')!.putImageData(image, 0, 0);
    const scale = Math.min(width / tip.width, height / tip.height);
    const drawW = tip.width * scale;
    const drawH = tip.height * scale;
    ctx.drawImage(offscreen, x + (width - drawW) / 2, y + (height - drawH) / 2, drawW, drawH);
}
