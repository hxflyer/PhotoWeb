import type { Tool, ToolPointerEvent } from './Tool';
import { registerTool } from './registry';

export type SampleSize = 1 | 3 | 5 | 11 | 31 | 51 | 101;
export type EyedropperSample = 'current-layer' | 'all-layers';

export interface EyedropperOptions {
    sampleSize: SampleSize;
    sample: EyedropperSample;
}

const options: EyedropperOptions = {
    sampleSize: 1,
    sample: 'all-layers',
};

export function setEyedropperOptions(next: Partial<EyedropperOptions>): void {
    Object.assign(options, next);
}

function p(e: ToolPointerEvent) { return { x: Math.floor(e.canvasX), y: Math.floor(e.canvasY) }; }

function flattenLayers(layers: { visible: boolean; canvas: HTMLCanvasElement }[], width: number, height: number): HTMLCanvasElement {
    const merged = document.createElement('canvas');
    merged.width = width;
    merged.height = height;
    const ctx = merged.getContext('2d');
    if (!ctx) return merged;
    layers.forEach(l => { if (l.visible) ctx.drawImage(l.canvas, 0, 0); });
    return merged;
}

function sampleAverage(canvas: HTMLCanvasElement, x: number, y: number, size: number): string {
    const ctx = canvas.getContext('2d');
    if (!ctx) return '#000000';
    const half = Math.floor(size / 2);
    const sx = Math.max(0, x - half);
    const sy = Math.max(0, y - half);
    const sw = Math.min(canvas.width - sx, size);
    const sh = Math.min(canvas.height - sy, size);
    if (sw <= 0 || sh <= 0) return '#000000';
    const data = ctx.getImageData(sx, sy, sw, sh).data;
    let r = 0, g = 0, b = 0, count = 0;
    for (let i = 0; i < data.length; i += 4) {
        if (data[i + 3] === 0) continue;
        r += data[i];
        g += data[i + 1];
        b += data[i + 2];
        count++;
    }
    if (count === 0) return '#000000';
    r = Math.round(r / count);
    g = Math.round(g / count);
    b = Math.round(b / count);
    return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`;
}

export const eyedropperTool: Tool = {
    id: 'eyedropper',
    label: 'Eyedropper',
    cursor: 'crosshair',
    onPointerDown: (e, ctx) => {
        if (e.button !== 0) return;
        const point = p(e);
        const store = ctx.getStore();
        const source = options.sample === 'all-layers'
            ? flattenLayers(store.layers, store.width, store.height)
            : (store.layers.find(l => l.id === store.activeLayerId)?.canvas ?? null);
        if (!source) return;
        const color = sampleAverage(source, point.x, point.y, options.sampleSize);
        if (e.alt) {
            store.setSecondaryColor(color);
        } else {
            store.setPrimaryColor(color);
        }
    },
};

registerTool(eyedropperTool);
