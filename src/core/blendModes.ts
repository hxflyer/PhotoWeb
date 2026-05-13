export type BlendModeId =
    | 'normal'
    | 'dissolve'
    | 'darken'
    | 'multiply'
    | 'color-burn'
    | 'linear-burn'
    | 'darker-color'
    | 'lighten'
    | 'screen'
    | 'color-dodge'
    | 'linear-dodge'
    | 'lighter-color'
    | 'overlay'
    | 'soft-light'
    | 'hard-light'
    | 'vivid-light'
    | 'linear-light'
    | 'pin-light'
    | 'hard-mix'
    | 'difference'
    | 'exclusion'
    | 'subtract'
    | 'divide'
    | 'hue'
    | 'saturation'
    | 'color'
    | 'luminosity';

interface NativeMapping {
    kind: 'native';
    op: GlobalCompositeOperation;
}

interface CustomMapping {
    kind: 'custom';
    blend: (sR: number, sG: number, sB: number, sA: number, dR: number, dG: number, dB: number, dA: number) => [number, number, number, number];
}

export type BlendModeMapping = NativeMapping | CustomMapping;

export const PHOTOSHOP_BLEND_MODE_OPTIONS: { id: BlendModeId; label: string; group: 'normal' | 'darken' | 'lighten' | 'contrast' | 'comparative' | 'color' }[] = [
    { id: 'normal', label: 'Normal', group: 'normal' },
    { id: 'dissolve', label: 'Dissolve', group: 'normal' },
    { id: 'darken', label: 'Darken', group: 'darken' },
    { id: 'multiply', label: 'Multiply', group: 'darken' },
    { id: 'color-burn', label: 'Color Burn', group: 'darken' },
    { id: 'linear-burn', label: 'Linear Burn', group: 'darken' },
    { id: 'darker-color', label: 'Darker Color', group: 'darken' },
    { id: 'lighten', label: 'Lighten', group: 'lighten' },
    { id: 'screen', label: 'Screen', group: 'lighten' },
    { id: 'color-dodge', label: 'Color Dodge', group: 'lighten' },
    { id: 'linear-dodge', label: 'Linear Dodge (Add)', group: 'lighten' },
    { id: 'lighter-color', label: 'Lighter Color', group: 'lighten' },
    { id: 'overlay', label: 'Overlay', group: 'contrast' },
    { id: 'soft-light', label: 'Soft Light', group: 'contrast' },
    { id: 'hard-light', label: 'Hard Light', group: 'contrast' },
    { id: 'vivid-light', label: 'Vivid Light', group: 'contrast' },
    { id: 'linear-light', label: 'Linear Light', group: 'contrast' },
    { id: 'pin-light', label: 'Pin Light', group: 'contrast' },
    { id: 'hard-mix', label: 'Hard Mix', group: 'contrast' },
    { id: 'difference', label: 'Difference', group: 'comparative' },
    { id: 'exclusion', label: 'Exclusion', group: 'comparative' },
    { id: 'subtract', label: 'Subtract', group: 'comparative' },
    { id: 'divide', label: 'Divide', group: 'comparative' },
    { id: 'hue', label: 'Hue', group: 'color' },
    { id: 'saturation', label: 'Saturation', group: 'color' },
    { id: 'color', label: 'Color', group: 'color' },
    { id: 'luminosity', label: 'Luminosity', group: 'color' },
];

const BLEND_MODE_IDS = new Set<BlendModeId>(PHOTOSHOP_BLEND_MODE_OPTIONS.map(mode => mode.id));
const clamp = (v: number) => Math.max(0, Math.min(255, v));
const lum = (r: number, g: number, b: number) => (0.299 * r) + (0.587 * g) + (0.114 * b);

function rgbToHsl(r: number, g: number, b: number): [number, number, number] {
    r /= 255; g /= 255; b /= 255;
    const max = Math.max(r, g, b);
    const min = Math.min(r, g, b);
    const l = (max + min) / 2;
    let h = 0; let s = 0;
    if (max !== min) {
        const d = max - min;
        s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
        if (max === r) h = ((g - b) / d + (g < b ? 6 : 0));
        else if (max === g) h = ((b - r) / d + 2);
        else h = ((r - g) / d + 4);
        h /= 6;
    }
    return [h, s, l];
}

function hslToRgb(h: number, s: number, l: number): [number, number, number] {
    let r: number; let g: number; let b: number;
    if (s === 0) { r = g = b = l; }
    else {
        const hue2rgb = (p: number, q: number, t: number) => {
            if (t < 0) t += 1; if (t > 1) t -= 1;
            if (t < 1 / 6) return p + (q - p) * 6 * t;
            if (t < 1 / 2) return q;
            if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6;
            return p;
        };
        const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
        const p = 2 * l - q;
        r = hue2rgb(p, q, h + 1 / 3);
        g = hue2rgb(p, q, h);
        b = hue2rgb(p, q, h - 1 / 3);
    }
    return [Math.round(r * 255), Math.round(g * 255), Math.round(b * 255)];
}

function softLight(s: number, d: number): number {
    s /= 255; d /= 255;
    if (s <= 0.5) return clamp((d - (1 - 2 * s) * d * (1 - d)) * 255);
    const dq = d <= 0.25 ? ((16 * d - 12) * d + 4) * d : Math.sqrt(d);
    return clamp((d + (2 * s - 1) * (dq - d)) * 255);
}

function colorBurn(s: number, d: number): number {
    return s <= 0 ? 0 : clamp(255 - ((255 - d) * 255) / s);
}

function colorDodge(s: number, d: number): number {
    return s >= 255 ? 255 : clamp((d * 255) / (255 - s));
}

function vividLight(s: number, d: number): number {
    return s < 128 ? colorBurn(2 * s, d) : colorDodge(2 * (s - 128), d);
}

export const blendModes: Record<BlendModeId, BlendModeMapping> = {
    normal: { kind: 'native', op: 'source-over' },
    dissolve: {
        kind: 'custom',
        blend: (sR, sG, sB, sA, dR, dG, dB, dA) => {
            return Math.random() * 255 < sA
                ? [sR, sG, sB, 255]
                : [dR, dG, dB, dA];
        },
    },
    darken: { kind: 'native', op: 'darken' },
    multiply: { kind: 'native', op: 'multiply' },
    'color-burn': { kind: 'native', op: 'color-burn' },
    'linear-burn': {
        kind: 'custom',
        blend: (sR, sG, sB, sA, dR, dG, dB, dA) => [
            clamp(sR + dR - 255), clamp(sG + dG - 255), clamp(sB + dB - 255), Math.max(sA, dA),
        ],
    },
    'darker-color': {
        kind: 'custom',
        blend: (sR, sG, sB, sA, dR, dG, dB, dA) => (
            lum(sR, sG, sB) < lum(dR, dG, dB)
                ? [sR, sG, sB, Math.max(sA, dA)]
                : [dR, dG, dB, dA]
        ),
    },
    lighten: { kind: 'native', op: 'lighten' },
    screen: { kind: 'native', op: 'screen' },
    'color-dodge': { kind: 'native', op: 'color-dodge' },
    'linear-dodge': {
        kind: 'custom',
        blend: (sR, sG, sB, sA, dR, dG, dB, dA) => [
            clamp(sR + dR), clamp(sG + dG), clamp(sB + dB), Math.max(sA, dA),
        ],
    },
    'lighter-color': {
        kind: 'custom',
        blend: (sR, sG, sB, sA, dR, dG, dB, dA) => (
            lum(sR, sG, sB) > lum(dR, dG, dB)
                ? [sR, sG, sB, Math.max(sA, dA)]
                : [dR, dG, dB, dA]
        ),
    },
    overlay: { kind: 'native', op: 'overlay' },
    'soft-light': { kind: 'native', op: 'soft-light' },
    'hard-light': { kind: 'native', op: 'hard-light' },
    'vivid-light': {
        kind: 'custom',
        blend: (sR, sG, sB, sA, dR, dG, dB, dA) => [
            vividLight(sR, dR), vividLight(sG, dG), vividLight(sB, dB), Math.max(sA, dA),
        ],
    },
    'linear-light': {
        kind: 'custom',
        blend: (sR, sG, sB, sA, dR, dG, dB, dA) => [
            clamp(dR + (2 * sR) - 255), clamp(dG + (2 * sG) - 255), clamp(dB + (2 * sB) - 255), Math.max(sA, dA),
        ],
    },
    'pin-light': {
        kind: 'custom',
        blend: (sR, sG, sB, sA, dR, dG, dB, dA) => [
            sR < 128 ? Math.min(dR, 2 * sR) : Math.max(dR, 2 * (sR - 128)),
            sG < 128 ? Math.min(dG, 2 * sG) : Math.max(dG, 2 * (sG - 128)),
            sB < 128 ? Math.min(dB, 2 * sB) : Math.max(dB, 2 * (sB - 128)),
            Math.max(sA, dA),
        ],
    },
    'hard-mix': {
        kind: 'custom',
        blend: (sR, sG, sB, sA, dR, dG, dB, dA) => [
            vividLight(sR, dR) < 128 ? 0 : 255,
            vividLight(sG, dG) < 128 ? 0 : 255,
            vividLight(sB, dB) < 128 ? 0 : 255,
            Math.max(sA, dA),
        ],
    },
    difference: { kind: 'native', op: 'difference' },
    exclusion: { kind: 'native', op: 'exclusion' },
    subtract: {
        kind: 'custom',
        blend: (sR, sG, sB, sA, dR, dG, dB, dA) => [
            clamp(dR - sR), clamp(dG - sG), clamp(dB - sB), Math.max(sA, dA),
        ],
    },
    divide: {
        kind: 'custom',
        blend: (sR, sG, sB, sA, dR, dG, dB, dA) => [
            sR <= 0 ? 255 : clamp((dR * 255) / sR),
            sG <= 0 ? 255 : clamp((dG * 255) / sG),
            sB <= 0 ? 255 : clamp((dB * 255) / sB),
            Math.max(sA, dA),
        ],
    },
    hue: { kind: 'native', op: 'hue' },
    saturation: { kind: 'native', op: 'saturation' },
    color: { kind: 'native', op: 'color' },
    luminosity: { kind: 'native', op: 'luminosity' },
};

export function applyBlendModeToImageData(
    src: ImageData,
    dst: ImageData,
    mode: BlendModeId,
    opacity = 1,
): ImageData {
    const mapping = blendModes[mode];
    if (mapping.kind === 'native') {
        // Native modes are applied via globalCompositeOperation by the caller.
        return dst;
    }
    const out = new ImageData(new Uint8ClampedArray(dst.data), dst.width, dst.height);
    const blend = mapping.blend;
    const layerOpacity = Math.max(0, Math.min(1, opacity));
    for (let i = 0; i < src.data.length; i += 4) {
        const sR = src.data[i];
        const sG = src.data[i + 1];
        const sB = src.data[i + 2];
        const sA = src.data[i + 3] * layerOpacity;
        const dR = dst.data[i];
        const dG = dst.data[i + 1];
        const dB = dst.data[i + 2];
        const dA = dst.data[i + 3];
        const [r, g, b, a] = blend(sR, sG, sB, sA, dR, dG, dB, dA);
        const sa = sA / 255;
        const da = dA / 255;
        const outA = sa + (da * (1 - sa));
        out.data[i] = outA <= 0 ? 0 : clamp(((r * sa) + (dR * da * (1 - sa))) / outA);
        out.data[i + 1] = outA <= 0 ? 0 : clamp(((g * sa) + (dG * da * (1 - sa))) / outA);
        out.data[i + 2] = outA <= 0 ? 0 : clamp(((b * sa) + (dB * da * (1 - sa))) / outA);
        out.data[i + 3] = clamp(a * sa + dA * (1 - sa));
    }
    return out;
}

export function isBlendModeId(mode: string): mode is BlendModeId {
    return BLEND_MODE_IDS.has(mode as BlendModeId);
}

export function normalizeBlendMode(mode: string | undefined | null): BlendModeId {
    if (!mode || mode === 'source-over') return 'normal';
    return isBlendModeId(mode) ? mode : 'normal';
}

export function blendModeLabel(mode: BlendModeId): string {
    return PHOTOSHOP_BLEND_MODE_OPTIONS.find(item => item.id === mode)?.label ?? 'Normal';
}

export function blendModeToCompositeOp(mode: BlendModeId): GlobalCompositeOperation | null {
    const mapping = blendModes[mode];
    return mapping.kind === 'native' ? mapping.op : null;
}

export function drawCanvasWithBlendMode(
    ctx: CanvasRenderingContext2D,
    source: HTMLCanvasElement,
    mode: string | undefined | null,
    opacity = 1,
): void {
    const blendMode = normalizeBlendMode(mode);
    const nativeOp = blendModeToCompositeOp(blendMode);
    if (nativeOp) {
        ctx.save();
        ctx.globalAlpha = opacity;
        ctx.globalCompositeOperation = nativeOp;
        ctx.drawImage(source, 0, 0);
        ctx.restore();
        return;
    }

    const w = ctx.canvas.width;
    const h = ctx.canvas.height;
    if (w <= 0 || h <= 0) return;
    const srcCanvas = document.createElement('canvas');
    srcCanvas.width = w;
    srcCanvas.height = h;
    const srcCtx = srcCanvas.getContext('2d');
    if (!srcCtx) return;
    srcCtx.drawImage(source, 0, 0);
    const srcImage = srcCtx.getImageData(0, 0, w, h);
    const dstImage = ctx.getImageData(0, 0, w, h);
    const blended = applyBlendModeToImageData(srcImage, dstImage, blendMode, opacity);
    ctx.putImageData(blended, 0, 0);
}

// Re-export HSL helpers — used by the hue/sat/luminosity custom modes if Canvas2D
// implementations differ across browsers.
export { rgbToHsl, hslToRgb, softLight };
