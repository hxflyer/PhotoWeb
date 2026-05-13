import type { Layer } from '../core/Layer';
import { drawCanvasWithBlendMode } from '../core/blendModes';
import type { EditorStore, SelectionMaskData, SelectionOperation } from '../store/types';
import { rasterizeSelectionOperations } from '../utils/selectionUtils';
import {
    colorRangeMaskFromPreset,
    type ColorRangePresetId,
} from './colorRangePresets';

export type ColorRangeMode = 'replace' | 'add' | 'sub' | 'intersect';

export type ColorRangeSampleMode = 'add' | 'sub';

export interface ColorRangeSample {
    color: string;
    mode: ColorRangeSampleMode;
    /** Optional canvas-space anchor for Localized Color Clusters. */
    x?: number;
    y?: number;
}

export interface ColorRangeOptions {
    samples: ColorRangeSample[];
    fuzziness: number;
    invert?: boolean;
    /** Built-in Photoshop preset; defaults to 'sampled'. */
    preset?: ColorRangePresetId;
    /**
     * Localized Color Clusters range, in pixels. When set, only pixels within
     * this distance of a sample's `x` / `y` count toward the mask. Undefined
     * means unbounded (Photoshop default).
     */
    range?: number;
}

export type { ColorRangePresetId };

function hexToRgb(hex: string): [number, number, number] {
    const clean = hex.replace('#', '').trim();
    const full = clean.length === 3
        ? clean.split('').map(ch => ch + ch).join('')
        : clean.padEnd(6, '0').slice(0, 6);
    return [
        parseInt(full.slice(0, 2), 16) || 0,
        parseInt(full.slice(2, 4), 16) || 0,
        parseInt(full.slice(4, 6), 16) || 0,
    ];
}

function matchesSample(r: number, g: number, b: number, sample: [number, number, number], fuzziness: number): boolean {
    const dr = r - sample[0];
    const dg = g - sample[1];
    const db = b - sample[2];
    return Math.sqrt(dr * dr + dg * dg + db * db) <= Math.max(0, fuzziness);
}

function compositeVisibleLayers(layers: Layer[], width: number, height: number): ImageData {
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d');
    if (!ctx) return new ImageData(width, height);
    for (const layer of layers) {
        if (!layer.visible || layer.kind === 'group') continue;
        drawCanvasWithBlendMode(ctx, layer.canvas, layer.blendMode, layer.opacity * layer.fill);
    }
    ctx.globalAlpha = 1;
    ctx.globalCompositeOperation = 'source-over';
    return ctx.getImageData(0, 0, width, height);
}

export function buildColorRangeMask(
    image: ImageData,
    options: ColorRangeOptions,
): SelectionMaskData {
    // Built-in preset (Reds, Yellows, Highlights, Skin Tones, etc.) — when the
    // preset is anything other than 'sampled' the sampled-color list is
    // ignored and the preset's per-pixel rule produces the mask.
    if (options.preset && options.preset !== 'sampled') {
        const mask = colorRangeMaskFromPreset(image, options.preset);
        if (options.invert) {
            for (let i = 0; i < mask.data.length; i++) {
                if (image.data[i * 4 + 3] === 0) continue;
                mask.data[i] = 255 - mask.data[i];
            }
        }
        return mask;
    }

    const addSamples = options.samples.filter(sample => sample.mode === 'add');
    const subSamples = options.samples.filter(sample => sample.mode === 'sub');
    const addRgb = addSamples.map(sample => hexToRgb(sample.color));
    const subRgb = subSamples.map(sample => hexToRgb(sample.color));
    const data = new Uint8ClampedArray(image.width * image.height);
    if (addRgb.length === 0) return { data, width: image.width, height: image.height };

    const range = options.range;
    const rangeSquared = range !== undefined ? range * range : Infinity;
    const addAnchors: Array<{ x: number; y: number } | null> = addSamples.map(s =>
        s.x !== undefined && s.y !== undefined ? { x: s.x, y: s.y } : null);

    const width = image.width;

    for (let i = 0; i < data.length; i++) {
        const pixel = i * 4;
        const alpha = image.data[pixel + 3];
        if (alpha === 0) continue;
        const r = image.data[pixel];
        const g = image.data[pixel + 1];
        const b = image.data[pixel + 2];
        const px = i % width;
        const py = (i / width) | 0;
        let matched = false;
        for (let sIdx = 0; sIdx < addRgb.length; sIdx++) {
            if (!matchesSample(r, g, b, addRgb[sIdx], options.fuzziness)) continue;
            const anchor = addAnchors[sIdx];
            if (range !== undefined && anchor) {
                const dx = px - anchor.x;
                const dy = py - anchor.y;
                if (dx * dx + dy * dy > rangeSquared) continue;
            }
            matched = true;
            break;
        }
        if (!matched) continue;
        const inSub = subRgb.some(sample => matchesSample(r, g, b, sample, options.fuzziness));
        data[i] = inSub ? 0 : 255;
    }
    if (options.invert) {
        for (let i = 0; i < data.length; i++) {
            const pixel = i * 4;
            const alpha = image.data[pixel + 3];
            if (alpha === 0) continue;
            data[i] = 255 - data[i];
        }
    }
    return { data, width: image.width, height: image.height };
}

export function applyColorRangeSelection(store: EditorStore, options: ColorRangeOptions): boolean {
    return applyColorRangeSelectionWithMode(store, options, 'replace');
}

/**
 * Build the color-range mask from the visible layer composite, then combine it
 * with the current selection using the requested mode:
 *   - replace   : drop any existing selection, install the color-range mask.
 *   - add       : union of existing selection and color-range mask.
 *   - sub       : subtract color-range mask from existing selection.
 *   - intersect : AND of existing selection and color-range mask.
 */
export function applyColorRangeSelectionWithMode(
    store: EditorStore,
    options: ColorRangeOptions,
    mode: ColorRangeMode,
): boolean {
    const image = compositeVisibleLayers(store.layers, store.width, store.height);
    const mask = buildColorRangeMask(image, options);
    const hasPixels = mask.data.some(alpha => alpha > 0);
    const { width, height } = store;

    if (mode === 'replace' || !store.selection.hasSelection) {
        store.setSelectionOperations(hasPixels
            ? [{ mode: 'add', type: 'rect', path: [{ x: 0, y: 0 }, { x: width, y: height }], mask }]
            : []);
        store.setHasSelection(hasPixels);
        return hasPixels;
    }

    if (!hasPixels) {
        // Add/intersect with empty mask: leave selection unchanged for add, become empty
        // for intersect, and unchanged for sub.
        if (mode === 'intersect') {
            store.setSelectionOperations([]);
            store.setHasSelection(false);
            return false;
        }
        return store.selection.hasSelection;
    }

    const existing = rasterizeSelectionOperations(store.selection.operations, width, height);
    const out = new Uint8ClampedArray(width * height);
    let any = false;
    if (mode === 'add') {
        for (let i = 0; i < out.length; i++) {
            const v = Math.max(existing[i], mask.data[i]);
            out[i] = v;
            if (v > 0) any = true;
        }
    } else if (mode === 'sub') {
        for (let i = 0; i < out.length; i++) {
            const v = Math.max(0, existing[i] - mask.data[i]);
            out[i] = v;
            if (v > 0) any = true;
        }
    } else {
        // intersect
        for (let i = 0; i < out.length; i++) {
            const v = Math.min(existing[i], mask.data[i]);
            out[i] = v;
            if (v > 0) any = true;
        }
    }

    if (!any) {
        store.setSelectionOperations([]);
        store.setHasSelection(false);
        return false;
    }
    const combined: SelectionOperation = {
        mode: 'add',
        type: 'lasso',
        path: [],
        mask: { data: out, width, height },
    };
    store.setSelectionOperations([combined]);
    store.setHasSelection(true);
    return true;
}
