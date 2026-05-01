import type { Tool, ToolPointerEvent } from './Tool';
import { registerTool } from './registry';

export type GradientType = 'linear' | 'radial' | 'angle' | 'reflected' | 'diamond';

export interface GradientStop {
    position: number;
    color: string;
    opacity: number;
}

export interface GradientPreset {
    id: string;
    name: string;
    stops: GradientStop[];
}

const defaultPresets: GradientPreset[] = [
    {
        id: 'foreground-to-background',
        name: 'Foreground to Background',
        stops: [
            { position: 0, color: '#000000', opacity: 1 },
            { position: 1, color: '#ffffff', opacity: 1 },
        ],
    },
    {
        id: 'foreground-to-transparent',
        name: 'Foreground to Transparent',
        stops: [
            { position: 0, color: '#000000', opacity: 1 },
            { position: 1, color: '#000000', opacity: 0 },
        ],
    },
];

export interface GradientOptions {
    type: GradientType;
    presetId: string;
    reverse: boolean;
    dither: boolean;
    transparency: boolean;
    opacity: number;
}

const options: GradientOptions = {
    type: 'linear',
    presetId: 'foreground-to-background',
    reverse: false,
    dither: false,
    transparency: true,
    opacity: 1,
};

export function setGradientOptions(next: Partial<GradientOptions>): void {
    Object.assign(options, next);
}

export function getGradientPresets(): GradientPreset[] {
    return defaultPresets;
}

function p(e: ToolPointerEvent) { return { x: e.canvasX, y: e.canvasY }; }

interface DragState { start: { x: number; y: number } | null; end: { x: number; y: number } | null; layerId: string | null }
const drag: DragState = { start: null, end: null, layerId: null };

function resolveStops(primaryColor: string, secondaryColor: string): GradientStop[] {
    const preset = defaultPresets.find(p => p.id === options.presetId) ?? defaultPresets[0];
    return preset.stops.map((stop, i) => ({
        ...stop,
        color: i === 0 ? primaryColor : i === preset.stops.length - 1 ? secondaryColor : stop.color,
        position: options.reverse ? 1 - stop.position : stop.position,
    }));
}

function applyGradient(
    ctx: CanvasRenderingContext2D,
    width: number,
    height: number,
    type: GradientType,
    start: { x: number; y: number },
    end: { x: number; y: number },
    stops: GradientStop[],
): void {
    let g: CanvasGradient;
    const cx = (start.x + end.x) / 2;
    const cy = (start.y + end.y) / 2;
    const r = Math.hypot(end.x - start.x, end.y - start.y);
    if (type === 'linear') {
        g = ctx.createLinearGradient(start.x, start.y, end.x, end.y);
    } else if (type === 'radial') {
        g = ctx.createRadialGradient(start.x, start.y, 0, start.x, start.y, r || 1);
    } else if (type === 'reflected') {
        const dx = end.x - start.x;
        const dy = end.y - start.y;
        g = ctx.createLinearGradient(start.x - dx, start.y - dy, start.x + dx, start.y + dy);
    } else {
        // angle and diamond fall back to linear; angle/diamond require shader-style fills.
        g = ctx.createLinearGradient(start.x, start.y, end.x, end.y);
    }
    stops.forEach(stop => g.addColorStop(stop.position, withAlpha(stop.color, stop.opacity)));
    ctx.save();
    ctx.globalAlpha = options.opacity;
    ctx.fillStyle = g;
    if (type === 'angle') {
        const angle = Math.atan2(end.y - start.y, end.x - start.x);
        ctx.translate(cx, cy);
        ctx.rotate(angle);
        ctx.translate(-cx, -cy);
    }
    ctx.fillRect(0, 0, width, height);
    ctx.restore();
}

function withAlpha(color: string, alpha: number): string {
    if (!color.startsWith('#')) return color;
    const r = parseInt(color.slice(1, 3), 16);
    const g = parseInt(color.slice(3, 5), 16);
    const b = parseInt(color.slice(5, 7), 16);
    return `rgba(${r},${g},${b},${alpha})`;
}

export const gradientTool: Tool = {
    id: 'gradient',
    label: 'Gradient',
    cursor: 'crosshair',
    onPointerDown: (e, ctx) => {
        if (e.button !== 0) return;
        const store = ctx.getStore();
        const layer = store.layers.find(l => l.id === store.activeLayerId);
        if (!layer) return;
        drag.start = p(e);
        drag.end = drag.start;
        drag.layerId = layer.id;
    },
    onPointerMove: (e) => {
        if (!drag.start) return;
        drag.end = p(e);
    },
    onPointerUp: (_e, ctx) => {
        if (!drag.start || !drag.end || !drag.layerId) {
            drag.start = drag.end = null;
            return;
        }
        const store = ctx.getStore();
        const layer = store.layers.find(l => l.id === drag.layerId);
        if (!layer) return;
        const stops = resolveStops(store.primaryColor, store.secondaryColor);
        applyGradient(layer.ctx, store.width, store.height, options.type, drag.start, drag.end, stops);
        layer.markDirty(null);
        drag.start = drag.end = null;
    },
};

registerTool(gradientTool);
