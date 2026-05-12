/**
 * Color Range built-in presets — per-Photoshop the "Select" dropdown picks a
 * preset whose mask is a function of luminance / hue / saturation instead of
 * the user-sampled color list. Detect Faces and Out-of-Gamut are skipped
 * (AI / color-management out of scope per CLAUDE.md §4).
 */
import type { SelectionMaskData } from '../store/types';

export type ColorRangePresetId =
    | 'sampled'
    | 'reds'
    | 'yellows'
    | 'greens'
    | 'cyans'
    | 'blues'
    | 'magentas'
    | 'highlights'
    | 'midtones'
    | 'shadows'
    | 'skin-tones';

export const COLOR_RANGE_PRESETS: ReadonlyArray<{ id: ColorRangePresetId; label: string }> = [
    { id: 'sampled', label: 'Sampled Colors' },
    { id: 'reds', label: 'Reds' },
    { id: 'yellows', label: 'Yellows' },
    { id: 'greens', label: 'Greens' },
    { id: 'cyans', label: 'Cyans' },
    { id: 'blues', label: 'Blues' },
    { id: 'magentas', label: 'Magentas' },
    { id: 'highlights', label: 'Highlights' },
    { id: 'midtones', label: 'Midtones' },
    { id: 'shadows', label: 'Shadows' },
    { id: 'skin-tones', label: 'Skin Tones' },
];

function luminance(r: number, g: number, b: number): number {
    return 0.299 * r + 0.587 * g + 0.114 * b;
}

function hue(r: number, g: number, b: number): number {
    // Returns hue in degrees [0..360); returns -1 for grays.
    const max = Math.max(r, g, b);
    const min = Math.min(r, g, b);
    const d = max - min;
    if (d === 0) return -1;
    let h: number;
    if (max === r) h = ((g - b) / d) % 6;
    else if (max === g) h = (b - r) / d + 2;
    else h = (r - g) / d + 4;
    h *= 60;
    if (h < 0) h += 360;
    return h;
}

function saturation(r: number, g: number, b: number): number {
    const max = Math.max(r, g, b);
    const min = Math.min(r, g, b);
    if (max === 0) return 0;
    return (max - min) / max;
}

function hueBand(centerDeg: number, halfWidthDeg: number, h: number): number {
    if (h < 0) return 0;
    let d = Math.abs(h - centerDeg);
    if (d > 180) d = 360 - d;
    if (d > halfWidthDeg) return 0;
    // Soft falloff: full inside the inner two-thirds, linear ramp to zero at the edge.
    const ramp = halfWidthDeg / 3;
    if (d <= halfWidthDeg - ramp) return 255;
    return Math.round(255 * (halfWidthDeg - d) / ramp);
}

/**
 * Build the mask for a named preset. The preset operates on the visible-layer
 * composite passed in. `sampled` always returns an empty mask — sampled-color
 * mode is built by buildColorRangeMask in colorRange.ts.
 */
export function colorRangeMaskFromPreset(image: ImageData, preset: ColorRangePresetId): SelectionMaskData {
    const { width, height, data } = image;
    const out = new Uint8ClampedArray(width * height);
    if (preset === 'sampled') return { data: out, width, height };

    for (let i = 0; i < out.length; i++) {
        const p = i * 4;
        const a = data[p + 3];
        if (a === 0) continue;
        const r = data[p], g = data[p + 1], b = data[p + 2];
        let value = 0;
        switch (preset) {
            case 'reds':       value = saturation(r, g, b) >= 0.15 ? hueBand(0, 30, hue(r, g, b)) : 0; break;
            case 'yellows':    value = saturation(r, g, b) >= 0.15 ? hueBand(60, 30, hue(r, g, b)) : 0; break;
            case 'greens':     value = saturation(r, g, b) >= 0.15 ? hueBand(120, 30, hue(r, g, b)) : 0; break;
            case 'cyans':      value = saturation(r, g, b) >= 0.15 ? hueBand(180, 30, hue(r, g, b)) : 0; break;
            case 'blues':      value = saturation(r, g, b) >= 0.15 ? hueBand(240, 30, hue(r, g, b)) : 0; break;
            case 'magentas':   value = saturation(r, g, b) >= 0.15 ? hueBand(300, 30, hue(r, g, b)) : 0; break;
            case 'highlights': {
                const l = luminance(r, g, b);
                if (l > 192) value = 255;
                else if (l > 160) value = Math.round(255 * (l - 160) / 32);
                break;
            }
            case 'midtones': {
                const l = luminance(r, g, b);
                if (l >= 64 && l <= 192) {
                    const d = Math.abs(l - 128);
                    value = d <= 32 ? 255 : Math.max(0, Math.round(255 * (1 - (d - 32) / 32)));
                }
                break;
            }
            case 'shadows': {
                const l = luminance(r, g, b);
                if (l < 64) value = 255;
                else if (l < 96) value = Math.round(255 * (96 - l) / 32);
                break;
            }
            case 'skin-tones': {
                // YCbCr range filter following the Photoshop heuristic.
                const y = 0.299 * r + 0.587 * g + 0.114 * b;
                const cb = -0.168736 * r - 0.331264 * g + 0.5 * b + 128;
                const cr = 0.5 * r - 0.418688 * g - 0.081312 * b + 128;
                if (y >= 80 && y <= 230 && cb >= 85 && cb <= 135 && cr >= 135 && cr <= 180) value = 255;
                break;
            }
        }
        out[i] = value;
    }
    return { data: out, width, height };
}
