import { decodeBrushTipAlpha, type BrushTipData } from './brushTips';
import { brushDynamicsAlphaMultiplier, type BrushDynamicsStampOptions } from './brushDynamics';

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
    blendMode?: 'normal' | 'multiply';
    dynamics?: BrushDynamicsStampOptions;
    customTip?: BrushTipData;
    base: Uint8ClampedArray;
    work: Uint8ClampedArray;
    coverage: Float32Array;
    selectionMask?: Float32Array | null;
}

const tipAlphaCache = new Map<string, Uint8Array>();

function getTipAlpha(tip: BrushTipData): Uint8Array {
    const cached = tipAlphaCache.get(tip.alpha);
    if (cached) return cached;
    const alpha = decodeBrushTipAlpha(tip);
    tipAlphaCache.set(tip.alpha, alpha);
    return alpha;
}

export function brushTipAlpha(distance: number, radius: number, hardness: number): number {
    if (distance > radius) return 0;
    const hardRadius = radius * Math.max(0, Math.min(1, hardness));
    if (hardness >= 0.999 || distance <= hardRadius) return 1;
    const t = Math.max(0, Math.min(1, (distance - hardRadius) / Math.max(0.0001, radius - hardRadius)));
    return 1 - (t * t * (3 - 2 * t));
}

export function applyBrushDab(options: BrushDabOptions): void {
    if (options.customTip) {
        applyCustomBrushDab(options, options.customTip);
        return;
    }
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

            const dynamicAlpha = brushDynamicsAlphaMultiplier(px + 0.5, py + 0.5, options.dynamics);
            if (dynamicAlpha <= 0) continue;

            const dabAlpha = Math.max(0, Math.min(1, tipAlpha * dynamicAlpha * flow));
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

            const dstR = options.base[idx];
            const dstG = options.base[idx + 1];
            const dstB = options.base[idx + 2];
            const paintR = options.blendMode === 'multiply' ? Math.round((options.color.r * dstR) / 255) : options.color.r;
            const paintG = options.blendMode === 'multiply' ? Math.round((options.color.g * dstG) / 255) : options.color.g;
            const paintB = options.blendMode === 'multiply' ? Math.round((options.color.b * dstB) / 255) : options.color.b;
            const dstA = options.base[idx + 3] / 255;
            const srcA = effect;
            const outA = srcA + dstA * (1 - srcA);
            if (outA <= 0) {
                options.work[idx] = 0;
                options.work[idx + 1] = 0;
                options.work[idx + 2] = 0;
                options.work[idx + 3] = 0;
            } else {
                options.work[idx] = Math.round((paintR * srcA + dstR * dstA * (1 - srcA)) / outA);
                options.work[idx + 1] = Math.round((paintG * srcA + dstG * dstA * (1 - srcA)) / outA);
                options.work[idx + 2] = Math.round((paintB * srcA + dstB * dstA * (1 - srcA)) / outA);
                options.work[idx + 3] = Math.round(outA * 255);
            }
        }
    }
}

function applyBrushPixel(options: BrushDabOptions, pixel: number, effect: number): void {
    const idx = pixel * 4;
    if (options.mode === 'erase') {
        options.work[idx] = options.base[idx];
        options.work[idx + 1] = options.base[idx + 1];
        options.work[idx + 2] = options.base[idx + 2];
        options.work[idx + 3] = Math.round(options.base[idx + 3] * (1 - effect));
        return;
    }

    const dstR = options.base[idx];
    const dstG = options.base[idx + 1];
    const dstB = options.base[idx + 2];
    const paintR = options.blendMode === 'multiply' ? Math.round((options.color.r * dstR) / 255) : options.color.r;
    const paintG = options.blendMode === 'multiply' ? Math.round((options.color.g * dstG) / 255) : options.color.g;
    const paintB = options.blendMode === 'multiply' ? Math.round((options.color.b * dstB) / 255) : options.color.b;
    const dstA = options.base[idx + 3] / 255;
    const srcA = effect;
    const outA = srcA + dstA * (1 - srcA);
    if (outA <= 0) {
        options.work[idx] = 0;
        options.work[idx + 1] = 0;
        options.work[idx + 2] = 0;
        options.work[idx + 3] = 0;
    } else {
        options.work[idx] = Math.round((paintR * srcA + dstR * dstA * (1 - srcA)) / outA);
        options.work[idx + 1] = Math.round((paintG * srcA + dstG * dstA * (1 - srcA)) / outA);
        options.work[idx + 2] = Math.round((paintB * srcA + dstB * dstA * (1 - srcA)) / outA);
        options.work[idx + 3] = Math.round(outA * 255);
    }
}

function applyCustomBrushDab(options: BrushDabOptions, tip: BrushTipData): void {
    const opacityCap = Math.max(0, Math.min(1, options.opacity));
    const flow = Math.max(0, Math.min(1, options.flow));
    if (opacityCap <= 0 || flow <= 0) return;

    const alpha = getTipAlpha(tip);
    const scale = options.size / Math.max(1, tip.width, tip.height);
    const stampW = Math.max(1, Math.round(tip.width * scale));
    const stampH = Math.max(1, Math.round(tip.height * scale));
    const startX = Math.floor(options.x - stampW / 2);
    const startY = Math.floor(options.y - stampH / 2);

    for (let dy = 0; dy < stampH; dy++) {
        const py = startY + dy;
        if (py < 0 || py >= options.height) continue;
        const sourceY = Math.min(tip.height - 1, Math.floor((dy / stampH) * tip.height));
        for (let dx = 0; dx < stampW; dx++) {
            const px = startX + dx;
            if (px < 0 || px >= options.width) continue;
            const pixel = py * options.width + px;
            const mask = options.selectionMask ? options.selectionMask[pixel] : 1;
            if (mask <= 0) continue;
            const sourceX = Math.min(tip.width - 1, Math.floor((dx / stampW) * tip.width));
            const tipAlpha = alpha[sourceY * tip.width + sourceX] / 255;
            if (tipAlpha <= 0) continue;
            const dynamicAlpha = brushDynamicsAlphaMultiplier(px + 0.5, py + 0.5, options.dynamics);
            if (dynamicAlpha <= 0) continue;

            const dabAlpha = Math.max(0, Math.min(1, tipAlpha * dynamicAlpha * flow));
            options.coverage[pixel] = options.coverage[pixel] + (1 - options.coverage[pixel]) * dabAlpha;
            const effect = Math.min(options.coverage[pixel], opacityCap) * mask;
            applyBrushPixel(options, pixel, effect);
        }
    }
}
