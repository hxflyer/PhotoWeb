// Edit > Fade computes per-pixel blend(before, after, mode) and then linearly
// interpolates with `before` at `1 - opacity`. The blend formulas mirror the
// ones in `src/core/blendModes.ts`, restated here as pure pixel math so the
// dialog can preview without round-tripping through a Canvas2DCompositor.

import type { BlendModeId } from '../core/blendModes';

export const BLEND_MODE_OPTIONS: { value: BlendModeId; label: string }[] = [
    { value: 'normal', label: 'Normal' },
    { value: 'dissolve', label: 'Dissolve' },
    { value: 'darken', label: 'Darken' },
    { value: 'multiply', label: 'Multiply' },
    { value: 'color-burn', label: 'Color Burn' },
    { value: 'linear-burn', label: 'Linear Burn' },
    { value: 'lighten', label: 'Lighten' },
    { value: 'screen', label: 'Screen' },
    { value: 'color-dodge', label: 'Color Dodge' },
    { value: 'linear-dodge', label: 'Linear Dodge' },
    { value: 'overlay', label: 'Overlay' },
    { value: 'soft-light', label: 'Soft Light' },
    { value: 'hard-light', label: 'Hard Light' },
    { value: 'difference', label: 'Difference' },
    { value: 'exclusion', label: 'Exclusion' },
    { value: 'hue', label: 'Hue' },
    { value: 'saturation', label: 'Saturation' },
    { value: 'luminosity', label: 'Luminosity' },
];

const clamp = (v: number) => v < 0 ? 0 : v > 255 ? 255 : v;

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
    return [r * 255, g * 255, b * 255];
}

function blendChannel(mode: BlendModeId, s: number, d: number): number {
    switch (mode) {
        case 'normal': return s;
        case 'darken': return Math.min(s, d);
        case 'multiply': return (s * d) / 255;
        case 'color-burn': return s === 0 ? 0 : Math.max(0, 255 - ((255 - d) * 255) / s);
        case 'linear-burn': return s + d - 255;
        case 'lighten': return Math.max(s, d);
        case 'screen': return 255 - ((255 - s) * (255 - d)) / 255;
        case 'color-dodge': return s === 255 ? 255 : Math.min(255, (d * 255) / (255 - s));
        case 'linear-dodge': return s + d;
        case 'overlay':
            return d < 128
                ? (2 * s * d) / 255
                : 255 - (2 * (255 - s) * (255 - d)) / 255;
        case 'hard-light':
            return s < 128
                ? (2 * s * d) / 255
                : 255 - (2 * (255 - s) * (255 - d)) / 255;
        case 'soft-light': {
            const sn = s / 255; const dn = d / 255;
            if (sn <= 0.5) return ((dn - (1 - 2 * sn) * dn * (1 - dn)) * 255);
            const dq = dn <= 0.25 ? ((16 * dn - 12) * dn + 4) * dn : Math.sqrt(dn);
            return ((dn + (2 * sn - 1) * (dq - dn)) * 255);
        }
        case 'difference': return Math.abs(s - d);
        case 'exclusion': return s + d - (2 * s * d) / 255;
        default: return s;
    }
}

/**
 * Computes the per-pixel blend of `after` onto `before` for the given blend mode,
 * then crossfades the blended result with `before` by `opacity` (0..1).
 *
 * Output pixel = lerp(before, blend(before, after, mode), opacity).
 *
 * Photoshop's Fade command works on the result of the last operation: the
 * "source" is the effect's after-state, the "destination" is the before-state.
 */
export function fadeImageData(
    before: ImageData,
    after: ImageData,
    opacity: number,
    mode: BlendModeId,
): ImageData {
    if (before.width !== after.width || before.height !== after.height) {
        throw new Error('Fade: before/after dimensions must match');
    }
    const out = new ImageData(new Uint8ClampedArray(before.data), before.width, before.height);
    const o = clamp(opacity * 255 + 0.5) / 255; // clamp to 0..1
    for (let i = 0; i < out.data.length; i += 4) {
        const sR = after.data[i];
        const sG = after.data[i + 1];
        const sB = after.data[i + 2];
        const dR = before.data[i];
        const dG = before.data[i + 1];
        const dB = before.data[i + 2];

        let blendedR: number;
        let blendedG: number;
        let blendedB: number;

        if (mode === 'dissolve') {
            // Photoshop's dissolve replaces pixels at random per opacity.
            if (Math.random() < o) {
                blendedR = sR; blendedG = sG; blendedB = sB;
            } else {
                blendedR = dR; blendedG = dG; blendedB = dB;
            }
            out.data[i] = clamp(blendedR);
            out.data[i + 1] = clamp(blendedG);
            out.data[i + 2] = clamp(blendedB);
            out.data[i + 3] = before.data[i + 3];
            continue;
        }

        if (mode === 'hue' || mode === 'saturation' || mode === 'luminosity') {
            const [sH, sS, sL] = rgbToHsl(sR, sG, sB);
            const [dH, dS, dL] = rgbToHsl(dR, dG, dB);
            let h = dH; let s = dS; let l = dL;
            if (mode === 'hue') h = sH;
            else if (mode === 'saturation') s = sS;
            else if (mode === 'luminosity') l = sL;
            const [bR, bG, bB] = hslToRgb(h, s, l);
            blendedR = bR; blendedG = bG; blendedB = bB;
        } else {
            blendedR = blendChannel(mode, sR, dR);
            blendedG = blendChannel(mode, sG, dG);
            blendedB = blendChannel(mode, sB, dB);
        }

        out.data[i] = clamp(dR * (1 - o) + blendedR * o);
        out.data[i + 1] = clamp(dG * (1 - o) + blendedG * o);
        out.data[i + 2] = clamp(dB * (1 - o) + blendedB * o);
        out.data[i + 3] = before.data[i + 3];
    }
    return out;
}
