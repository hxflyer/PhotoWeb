import type { OverlayRenderContext, Tool, ToolPointerEvent } from './Tool';
import { registerTool } from './registry';
import { buildSelectionMask } from '../filters/selectionMask';
import { blendModeToCompositeOp, applyBlendModeToImageData, type BlendModeId } from '../core/blendModes';
import { captureLayerRegion, createPixelHistoryAction } from '../core/history';

export type GradientType = 'linear' | 'radial' | 'angle' | 'reflected' | 'diamond';
export type GradientMethod = 'smooth' | 'classic';

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
    {
        id: 'black-to-white',
        name: 'Black, White',
        stops: [
            { position: 0, color: '#000000', opacity: 1 },
            { position: 1, color: '#ffffff', opacity: 1 },
        ],
    },
];

export interface GradientOptions {
    type: GradientType;
    presetId: string;
    reverse: boolean;
    dither: boolean;
    method: GradientMethod;
    transparency: boolean;
    opacity: number;            // 0-1
    mode: BlendModeId;
    stops?: GradientStop[];
    smoothness?: number;
}

let options: GradientOptions = {
    type: 'linear',
    presetId: 'foreground-to-background',
    reverse: false,
    dither: false,
    method: 'smooth',
    transparency: true,
    opacity: 1,
    mode: 'normal',
};

export function setGradientOptions(next: Partial<GradientOptions>): void {
    options = { ...options, ...next };
}

export function getGradientOptions(): GradientOptions {
    return { ...options };
}

export function getGradientPresets(): GradientPreset[] {
    return defaultPresets;
}

function p(e: ToolPointerEvent) { return { x: e.canvasX, y: e.canvasY }; }

interface DragState {
    start: { x: number; y: number } | null;
    end: { x: number; y: number } | null;
    layerId: string | null;
    shift: boolean;
    /**
     * Live Gradient post-release state. When `live` is set the gradient has
     * already been composited onto the layer once; subsequent drags on either
     * endpoint reposition the gradient (committing the previous result back
     * to the snapshot first). Cleared on commit (Enter / tool switch) or
     * cancel (Esc).
     */
    live: boolean;
    /** Which endpoint is being dragged in live-edit mode. */
    activeEnd: 'start' | 'end' | null;
}
const drag: DragState = { start: null, end: null, layerId: null, shift: false, live: false, activeEnd: null };

const LIVE_HANDLE_RADIUS = 8;

function nearPoint(a: { x: number; y: number }, b: { x: number; y: number }, r: number): boolean {
    return Math.hypot(a.x - b.x, a.y - b.y) <= r;
}

function clearLiveState(): void {
    drag.start = drag.end = null;
    drag.layerId = null;
    drag.live = false;
    drag.activeEnd = null;
}

function resolveStops(primaryColor: string, secondaryColor: string): GradientStop[] {
    const preset = defaultPresets.find(p => p.id === options.presetId) ?? defaultPresets[0];
    const stops = preset.stops.map((stop, i, arr) => ({
        ...stop,
        color: i === 0 ? primaryColor : i === arr.length - 1 ? secondaryColor : stop.color,
        opacity: options.transparency ? stop.opacity : 1,
    }));
    if (options.reverse) {
        return stops.map(s => ({ ...s, position: 1 - s.position })).sort((a, b) => a.position - b.position);
    }
    return stops;
}

function srgbToLinear(c: number): number {
    const v = c / 255;
    return v <= 0.04045 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
}

function linearToSrgb(v: number): number {
    const c = v <= 0.0031308 ? v * 12.92 : 1.055 * Math.pow(v, 1 / 2.4) - 0.055;
    return Math.max(0, Math.min(255, c * 255));
}

function withAlpha(color: string, alpha: number): string {
    if (!color.startsWith('#')) return color;
    const r = parseInt(color.slice(1, 3), 16);
    const g = parseInt(color.slice(3, 5), 16);
    const b = parseInt(color.slice(5, 7), 16);
    return `rgba(${r},${g},${b},${alpha})`;
}

function constrainAngle(start: { x: number; y: number }, end: { x: number; y: number }): { x: number; y: number } {
    // Snap to nearest 45° when shift is held
    const dx = end.x - start.x;
    const dy = end.y - start.y;
    const len = Math.hypot(dx, dy);
    if (len === 0) return end;
    const angle = Math.atan2(dy, dx);
    const snapped = Math.round(angle / (Math.PI / 4)) * (Math.PI / 4);
    return { x: start.x + Math.cos(snapped) * len, y: start.y + Math.sin(snapped) * len };
}

/**
 * Sample a stop list at parameter t∈[0,1] → returns [r,g,b,a (0-1)].
 * Method = 'classic' interpolates in sRGB (linear in 0..255 space).
 * Method = 'smooth' interpolates in linear-light space (gamma-corrected).
 */
function sampleStops(stops: GradientStop[], t: number, method: GradientMethod): [number, number, number, number] {
    t = Math.max(0, Math.min(1, t));
    let lo = stops[0];
    let hi = stops[stops.length - 1];
    for (let i = 0; i < stops.length - 1; i++) {
        if (t >= stops[i].position && t <= stops[i + 1].position) {
            lo = stops[i]; hi = stops[i + 1];
            break;
        }
    }
    const span = hi.position - lo.position || 1;
    const k = (t - lo.position) / span;
    const parse = (c: string) => {
        const r = parseInt(c.slice(1, 3), 16);
        const g = parseInt(c.slice(3, 5), 16);
        const b = parseInt(c.slice(5, 7), 16);
        return [r, g, b];
    };
    const [r1, g1, b1] = parse(lo.color);
    const [r2, g2, b2] = parse(hi.color);
    const a = lo.opacity + (hi.opacity - lo.opacity) * k;
    if (method === 'smooth') {
        const r = linearToSrgb(srgbToLinear(r1) * (1 - k) + srgbToLinear(r2) * k);
        const g = linearToSrgb(srgbToLinear(g1) * (1 - k) + srgbToLinear(g2) * k);
        const b = linearToSrgb(srgbToLinear(b1) * (1 - k) + srgbToLinear(b2) * k);
        return [r, g, b, a];
    }
    return [
        r1 + (r2 - r1) * k,
        g1 + (g2 - g1) * k,
        b1 + (b2 - b1) * k,
        a,
    ];
}

/**
 * Render the gradient into a target canvas of the given dimensions.
 * Linear/radial/reflected use Canvas2D's native gradients (faster).
 * Angle/diamond walk pixels via ImageData.
 */
export function renderGradientCanvas(
    width: number,
    height: number,
    type: GradientType,
    start: { x: number; y: number },
    end: { x: number; y: number },
    stops: GradientStop[],
    dither: boolean,
    method: GradientMethod,
): HTMLCanvasElement {
    const c = document.createElement('canvas');
    c.width = width; c.height = height;
    const ctx = c.getContext('2d')!;

    // Native CanvasGradient interpolates in sRGB; this matches "classic". For
    // "smooth" we always walk pixels through sampleStops, which interpolates
    // in linear-light space.
    if (method === 'classic' && (type === 'linear' || type === 'radial' || type === 'reflected')) {
        let g: CanvasGradient;
        if (type === 'linear') {
            g = ctx.createLinearGradient(start.x, start.y, end.x, end.y);
            stops.forEach(s => g.addColorStop(s.position, withAlpha(s.color, s.opacity)));
        } else if (type === 'radial') {
            const r = Math.hypot(end.x - start.x, end.y - start.y) || 1;
            g = ctx.createRadialGradient(start.x, start.y, 0, start.x, start.y, r);
            stops.forEach(s => g.addColorStop(s.position, withAlpha(s.color, s.opacity)));
        } else {
            // reflected: mirror stops around the start point
            const dx = end.x - start.x;
            const dy = end.y - start.y;
            g = ctx.createLinearGradient(start.x - dx, start.y - dy, start.x + dx, start.y + dy);
            // Reflected = stops 1..0..1 — fold by mapping each stop p to 0.5 - p/2 and 0.5 + p/2
            stops.forEach(s => {
                g.addColorStop(0.5 - s.position * 0.5, withAlpha(s.color, s.opacity));
                g.addColorStop(0.5 + s.position * 0.5, withAlpha(s.color, s.opacity));
            });
        }
        ctx.fillStyle = g;
        ctx.fillRect(0, 0, width, height);
    } else {
        // Pixel-walked path: always for angle/diamond, also for linear/radial/
        // reflected when method='smooth' so we can interpolate in linear light.
        const img = ctx.createImageData(width, height);
        const d = img.data;
        const dx = end.x - start.x;
        const dy = end.y - start.y;
        const len = Math.hypot(dx, dy) || 1;
        const computeT = (x: number, y: number): number => {
            const px = x - start.x;
            const py = y - start.y;
            if (type === 'linear') {
                return (px * dx + py * dy) / (len * len);
            }
            if (type === 'radial') {
                return Math.hypot(px, py) / len;
            }
            if (type === 'reflected') {
                return Math.abs(px * dx + py * dy) / (len * len);
            }
            if (type === 'angle') {
                const baseAngle = Math.atan2(dy, dx);
                let a = Math.atan2(py, px) - baseAngle;
                a = ((a % (Math.PI * 2)) + Math.PI * 2) % (Math.PI * 2);
                return a / (Math.PI * 2);
            }
            // diamond
            const ux = dx / len; const uy = dy / len;
            const vx = -uy;      const vy = ux;
            const u = px * ux + py * uy;
            const v = px * vx + py * vy;
            return Math.max(Math.abs(u), Math.abs(v)) / len;
        };
        for (let y = 0; y < height; y++) {
            for (let x = 0; x < width; x++) {
                const t = computeT(x, y);
                const [r, g, b, alpha] = sampleStops(stops, t, method);
                const idx = (y * width + x) * 4;
                d[idx]     = r;
                d[idx + 1] = g;
                d[idx + 2] = b;
                d[idx + 3] = Math.round(alpha * 255);
            }
        }
        ctx.putImageData(img, 0, 0);
    }

    if (dither) {
        // Lightweight ordered-dither: add ±2 luminance jitter to break banding.
        const img2 = ctx.getImageData(0, 0, width, height);
        const d = img2.data;
        for (let i = 0; i < d.length; i += 4) {
            const n = (Math.random() - 0.5) * 4;
            d[i]     = Math.max(0, Math.min(255, d[i] + n));
            d[i + 1] = Math.max(0, Math.min(255, d[i + 1] + n));
            d[i + 2] = Math.max(0, Math.min(255, d[i + 2] + n));
        }
        ctx.putImageData(img2, 0, 0);
    }

    return c;
}

function compositeGradient(
    layerCtx: CanvasRenderingContext2D,
    width: number,
    height: number,
    gradientCanvas: HTMLCanvasElement,
    selectionMask: ImageData | null,
): void {
    // Apply selection mask to the gradient canvas (destination-in clips it).
    if (selectionMask) {
        const maskCanvas = document.createElement('canvas');
        maskCanvas.width = width; maskCanvas.height = height;
        maskCanvas.getContext('2d')!.putImageData(selectionMask, 0, 0);
        const gctx = gradientCanvas.getContext('2d')!;
        gctx.globalCompositeOperation = 'destination-in';
        gctx.drawImage(maskCanvas, 0, 0);
        gctx.globalCompositeOperation = 'source-over';
    }

    const nativeOp = blendModeToCompositeOp(options.mode);
    if (nativeOp) {
        layerCtx.save();
        layerCtx.globalAlpha = options.opacity;
        layerCtx.globalCompositeOperation = nativeOp;
        layerCtx.drawImage(gradientCanvas, 0, 0);
        layerCtx.restore();
    } else {
        // Custom blend: walk per-pixel.
        const src = gradientCanvas.getContext('2d')!.getImageData(0, 0, width, height);
        const dst = layerCtx.getImageData(0, 0, width, height);
        const blended = applyBlendModeToImageData(src, dst, options.mode);
        const op = options.opacity;
        const out = blended.data;
        const od = dst.data;
        const sd = src.data;
        for (let i = 0; i < out.length; i += 4) {
            const w = (sd[i + 3] / 255) * op;
            if (w === 0) continue;
            out[i]     = Math.round(od[i]     * (1 - w) + out[i]     * w);
            out[i + 1] = Math.round(od[i + 1] * (1 - w) + out[i + 1] * w);
            out[i + 2] = Math.round(od[i + 2] * (1 - w) + out[i + 2] * w);
            out[i + 3] = Math.round(od[i + 3] * (1 - w) + out[i + 3] * w);
        }
        layerCtx.putImageData(new ImageData(out, dst.width, dst.height), 0, 0);
    }
}

// Last-committed snapshot for live preview: when the user repositions a
// gradient handle in live mode, we revert the layer to this snapshot before
// recompositing so successive drags don't stack on each other.
let liveSnapshot: ImageData | null = null;

function commitLive(ctx: { getStore: () => import('../store/types').EditorStore }): void {
    // Settle the current live preview as a single history entry.
    if (!drag.live || !drag.start || !drag.end || !drag.layerId || !liveSnapshot) {
        clearLiveState();
        liveSnapshot = null;
        return;
    }
    const store = ctx.getStore();
    const layer = store.layers.find(l => l.id === drag.layerId);
    if (!layer) {
        clearLiveState();
        liveSnapshot = null;
        return;
    }
    const w = layer.canvas.width;
    const h = layer.canvas.height;
    // The layer already shows the live preview. Use the pre-stroke snapshot
    // as the "before" so undo restores it to the pre-stroke state.
    store.commitHistory(createPixelHistoryAction(layer, { x: 0, y: 0, width: w, height: h }, liveSnapshot, 'Gradient'));
    clearLiveState();
    liveSnapshot = null;
}

function repaintLive(ctx: { getStore: () => import('../store/types').EditorStore }): void {
    if (!drag.start || !drag.end || !drag.layerId || !liveSnapshot) return;
    const store = ctx.getStore();
    const layer = store.layers.find(l => l.id === drag.layerId);
    if (!layer) return;
    const w = layer.canvas.width;
    const h = layer.canvas.height;
    const endPt = drag.shift ? constrainAngle(drag.start, drag.end) : drag.end;
    // Revert to the pre-stroke snapshot, then composite the new gradient.
    layer.ctx.putImageData(liveSnapshot, 0, 0);
    const stops = resolveStops(store.primaryColor, store.secondaryColor);
    const grad = renderGradientCanvas(w, h, options.type, drag.start, endPt, stops, options.dither, options.method);
    const selectionMask = buildSelectionMask(store.selection, w, h);
    compositeGradient(layer.ctx, w, h, grad, selectionMask);
    layer.markDirty(null);
}

export const gradientTool: Tool = {
    id: 'gradient',
    label: 'Gradient',
    cursor: 'crosshair',
    onDeactivate: (ctx) => {
        commitLive(ctx);
    },
    onPointerDown: (e, ctx) => {
        if (e.button !== 0) return;
        const store = ctx.getStore();
        const layer = store.layers.find(l => l.id === store.activeLayerId);
        if (!layer) return;
        const point = p(e);
        // Live-edit mode: if we have a pending gradient on this layer and the
        // user clicked near an endpoint, reposition that endpoint without
        // starting a new gradient.
        if (drag.live && drag.start && drag.end && drag.layerId === layer.id) {
            if (nearPoint(point, drag.start, LIVE_HANDLE_RADIUS)) {
                drag.activeEnd = 'start';
                drag.shift = e.shift;
                return;
            }
            if (nearPoint(point, drag.end, LIVE_HANDLE_RADIUS)) {
                drag.activeEnd = 'end';
                drag.shift = e.shift;
                return;
            }
            // Click somewhere else: commit the live preview, then start a
            // fresh gradient at the click point.
            commitLive(ctx);
        }
        // Fresh gradient: snapshot the layer pixels so repaintLive can
        // revert before each composite, and reset drag state.
        drag.start = point;
        drag.end = point;
        drag.layerId = layer.id;
        drag.shift = e.shift;
        drag.live = false;
        drag.activeEnd = null;
        liveSnapshot = captureLayerRegion(layer, { x: 0, y: 0, width: layer.canvas.width, height: layer.canvas.height });
    },
    onPointerMove: (e, ctx) => {
        if (!drag.start) return;
        const point = p(e);
        drag.shift = e.shift;
        if (drag.live && drag.activeEnd) {
            if (drag.activeEnd === 'start') drag.start = point;
            else drag.end = point;
            repaintLive(ctx);
            return;
        }
        drag.end = point;
        if (drag.live) repaintLive(ctx);
    },
    onPointerUp: (_e, ctx) => {
        if (!drag.start || !drag.end || !drag.layerId) {
            clearLiveState();
            liveSnapshot = null;
            return;
        }
        // First pointer-up of a fresh gradient: composite once, then enter
        // live-edit mode (NOT committing history yet — that happens on
        // Enter, tool switch, or click-off).
        if (!drag.live) {
            const store = ctx.getStore();
            const layer = store.layers.find(l => l.id === drag.layerId);
            if (!layer) { clearLiveState(); liveSnapshot = null; return; }
            void store;
            // First composite already runs through repaintLive's path.
            repaintLive(ctx);
            drag.live = true;
            drag.activeEnd = null;
            return;
        }
        // Subsequent endpoint drags: just clear the active handle.
        drag.activeEnd = null;
    },
    onKeyDown: (e, ctx) => {
        if (e.key === 'Enter') {
            e.rawEvent.preventDefault();
            commitLive(ctx);
        } else if (e.key === 'Escape') {
            e.rawEvent.preventDefault();
            // Revert any live-preview pixels to the snapshot, then clear.
            if (drag.live && drag.layerId && liveSnapshot) {
                const layer = ctx.getStore().layers.find(l => l.id === drag.layerId);
                if (layer) {
                    layer.ctx.putImageData(liveSnapshot, 0, 0);
                    layer.markDirty(null);
                }
            }
            clearLiveState();
            liveSnapshot = null;
        }
    },
    renderOverlay: (overlay: OverlayRenderContext) => {
        if (!drag.start || !drag.end) return;
        const { ctx, zoom } = overlay;
        const endPt = drag.shift ? constrainAngle(drag.start, drag.end) : drag.end;
        const lw = 1 / Math.max(0.0001, zoom);
        const dash = 4 / Math.max(0.0001, zoom);
        ctx.save();
        ctx.lineWidth = lw;
        ctx.setLineDash([dash, dash]);
        ctx.strokeStyle = '#000';
        ctx.beginPath();
        ctx.moveTo(drag.start.x, drag.start.y);
        ctx.lineTo(endPt.x, endPt.y);
        ctx.stroke();
        ctx.strokeStyle = '#fff';
        ctx.lineDashOffset = dash;
        ctx.stroke();
        ctx.setLineDash([]);
        // Endpoint handles: white-filled disc with a black outline. Shown
        // only after pointer-up so the user knows the gradient is editable.
        if (drag.live) {
            const r = 5 / Math.max(0.0001, zoom);
            for (const point of [drag.start, endPt]) {
                ctx.beginPath();
                ctx.arc(point.x, point.y, r, 0, Math.PI * 2);
                ctx.fillStyle = '#fff';
                ctx.fill();
                ctx.lineWidth = 1 / Math.max(0.0001, zoom);
                ctx.strokeStyle = '#000';
                ctx.stroke();
            }
        }
        ctx.restore();
    },
};

registerTool(gradientTool);
