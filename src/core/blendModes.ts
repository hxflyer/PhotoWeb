// Phase 2.1 — 18 v1 blend modes. Each mode maps to either a Canvas2D
// `globalCompositeOperation` value when supported, or a per-pixel formula that
// the compositor walks via `applyBlendModeToImageData` over a dirty rect.

export type BlendModeId =
    | 'normal'
    | 'dissolve'
    | 'darken'
    | 'multiply'
    | 'color-burn'
    | 'linear-burn'
    | 'lighten'
    | 'screen'
    | 'color-dodge'
    | 'linear-dodge'
    | 'overlay'
    | 'soft-light'
    | 'hard-light'
    | 'difference'
    | 'exclusion'
    | 'hue'
    | 'saturation'
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

const clamp = (v: number) => Math.max(0, Math.min(255, v));

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
    lighten: { kind: 'native', op: 'lighten' },
    screen: { kind: 'native', op: 'screen' },
    'color-dodge': { kind: 'native', op: 'color-dodge' },
    'linear-dodge': {
        kind: 'custom',
        blend: (sR, sG, sB, sA, dR, dG, dB, dA) => [
            clamp(sR + dR), clamp(sG + dG), clamp(sB + dB), Math.max(sA, dA),
        ],
    },
    overlay: { kind: 'native', op: 'overlay' },
    'soft-light': { kind: 'native', op: 'soft-light' },
    'hard-light': { kind: 'native', op: 'hard-light' },
    difference: { kind: 'native', op: 'difference' },
    exclusion: { kind: 'native', op: 'exclusion' },
    hue: { kind: 'native', op: 'hue' },
    saturation: { kind: 'native', op: 'saturation' },
    luminosity: { kind: 'native', op: 'luminosity' },
};

export function applyBlendModeToImageData(
    src: ImageData,
    dst: ImageData,
    mode: BlendModeId,
): ImageData {
    const mapping = blendModes[mode];
    if (mapping.kind === 'native') {
        // Native modes are applied via globalCompositeOperation by the caller.
        return dst;
    }
    const out = new ImageData(new Uint8ClampedArray(dst.data), dst.width, dst.height);
    const blend = mapping.blend;
    for (let i = 0; i < src.data.length; i += 4) {
        const sR = src.data[i];
        const sG = src.data[i + 1];
        const sB = src.data[i + 2];
        const sA = src.data[i + 3];
        const dR = dst.data[i];
        const dG = dst.data[i + 1];
        const dB = dst.data[i + 2];
        const dA = dst.data[i + 3];
        const [r, g, b, a] = blend(sR, sG, sB, sA, dR, dG, dB, dA);
        out.data[i] = clamp(r);
        out.data[i + 1] = clamp(g);
        out.data[i + 2] = clamp(b);
        out.data[i + 3] = clamp(a);
    }
    return out;
}

export function blendModeToCompositeOp(mode: BlendModeId): GlobalCompositeOperation | null {
    const mapping = blendModes[mode];
    return mapping.kind === 'native' ? mapping.op : null;
}

// Re-export HSL helpers — used by the hue/sat/luminosity custom modes if Canvas2D
// implementations differ across browsers.
export { rgbToHsl, hslToRgb, softLight };
