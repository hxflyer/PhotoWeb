import type { Layer } from '../core/Layer';

export type JpegBaseline = 'standard' | 'optimized' | 'progressive';

function flattenLayers(layers: Layer[], width: number, height: number): HTMLCanvasElement | null {
    if (width < 1 || height < 1) return null;
    const c = document.createElement('canvas');
    c.width = width;
    c.height = height;
    const ctx = c.getContext('2d');
    if (!ctx) return null;
    layers.forEach(l => {
        if (!l.visible) return;
        ctx.globalAlpha = l.opacity;
        ctx.globalCompositeOperation = l.blendMode;
        ctx.drawImage(l.canvas, 0, 0);
    });
    ctx.globalAlpha = 1;
    ctx.globalCompositeOperation = 'source-over';
    return c;
}

function triggerDownload(blob: Blob, filename: string): void {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
}

interface ExportOptions {
    layers: Layer[];
    width: number;
    height: number;
    filename: string;
}

interface JpegExportOptions extends ExportOptions {
    quality: number; // 1..12 (Photoshop scale)
    baseline: JpegBaseline;
}

// Photoshop's JPEG quality slider runs 1..12. Browsers' toBlob accepts 0..1.
// Anchor 12 → 1.0 and 1 → ~0.08; the curve is roughly linear in Photoshop's
// own tables.
export function photoshopJpegQualityToBlobQ(q: number): number {
    if (!Number.isFinite(q)) return 0.9;
    const clamped = Math.max(1, Math.min(12, Math.round(q)));
    return clamped / 12;
}

export async function exportAsJpeg(opts: JpegExportOptions): Promise<boolean> {
    const c = flattenLayers(opts.layers, opts.width, opts.height);
    if (!c) return false;
    const q = photoshopJpegQualityToBlobQ(opts.quality);
    // Baseline mode (Standard / Optimized / Progressive) is metadata-only at
    // the encoder level; the browser's canvas.toBlob does not expose the
    // toggle. We accept the choice for future use (and for testing the
    // habit), but the current implementation always writes optimized JPEG —
    // the browser default. See divergence-log.
    void opts.baseline;
    return new Promise(resolve => {
        c.toBlob(b => {
            if (!b) { resolve(false); return; }
            triggerDownload(b, opts.filename);
            resolve(true);
        }, 'image/jpeg', q);
    });
}

export async function exportAsPng(opts: ExportOptions): Promise<boolean> {
    const c = flattenLayers(opts.layers, opts.width, opts.height);
    if (!c) return false;
    return new Promise(resolve => {
        c.toBlob(b => {
            if (!b) { resolve(false); return; }
            triggerDownload(b, opts.filename);
            resolve(true);
        }, 'image/png');
    });
}

const IMG_EXT_RE = /\.(jpe?g|png|gif|bmp|tiff?|webp|pwbdoc|psd)$/i;

// Strip a known image extension so the Format selector can append its own.
export function stripImageExtension(name: string): string {
    return name.replace(IMG_EXT_RE, '');
}
