import type { OverlayRenderContext, Tool, ToolContext, ToolPointerEvent } from './Tool';
import { registerTool } from './registry';
import { getBrushTip } from './brush';
import { drawCanvasWithBlendMode, type BlendModeId } from '../core/blendModes';

export type CloneStampSampleMode = 'current' | 'current-below' | 'all';

interface CloneStampOptions {
    aligned: boolean;
    sample: CloneStampSampleMode;
    mode: GlobalCompositeOperation;
    showOverlay: boolean;
    overlayOpacity: number; // 0..1
    sourceScale: number;    // 0.1..4, default 1
    sourceRotation: number; // radians, default 0
}

const options: CloneStampOptions = {
    aligned: true,
    sample: 'current',
    mode: 'source-over',
    showOverlay: true,
    overlayOpacity: 0.5,
    sourceScale: 1,
    sourceRotation: 0,
};

export function setCloneStampOptions(next: Partial<CloneStampOptions> & { sampleAllLayers?: boolean }): void {
    const { sampleAllLayers, ...rest } = next;
    Object.assign(options, rest);
    if (sampleAllLayers !== undefined) options.sample = sampleAllLayers ? 'all' : 'current';
}

export function getCloneStampOptions(): CloneStampOptions {
    return { ...options };
}

export function resetCloneSource(store: { setCloneSource: (p: { x: number; y: number } | null) => void }): void {
    state.source = null;
    state.anchor = null;
    state.last = null;
    store.setCloneSource(null);
}

interface State {
    source: { x: number; y: number } | null;
    anchor: { x: number; y: number } | null;
    layerId: string | null;
    last: { x: number; y: number } | null;
    hover: { x: number; y: number } | null;
    isSampling: boolean;
    leftover: number;
}

const state: State = { source: null, anchor: null, layerId: null, last: null, hover: null, isSampling: false, leftover: 0 };

function p(e: ToolPointerEvent) { return { x: e.canvasX, y: e.canvasY }; }

function sampleSourceCanvas(
    layers: Array<{
        id: string;
        visible: boolean;
        opacity: number;
        fill: number;
        blendMode: BlendModeId;
        canvas: HTMLCanvasElement;
    }>,
    activeLayerId: string,
    width: number,
    height: number,
): HTMLCanvasElement | null {
    const merged = document.createElement('canvas');
    merged.width = width;
    merged.height = height;
    const ctx = merged.getContext('2d');
    if (!ctx) return null;
    const activeIndex = layers.findIndex(l => l.id === activeLayerId);
    if (activeIndex < 0) return null;
    const sourceLayers = options.sample === 'all'
        ? layers
        : options.sample === 'current-below'
            ? layers.slice(0, activeIndex + 1)
            : [layers[activeIndex]];

    sourceLayers.forEach(layer => {
        if (!layer.visible) return;
        drawCanvasWithBlendMode(ctx, layer.canvas, layer.blendMode, layer.opacity * layer.fill);
    });
    return merged;
}

function stampAt(
    target: CanvasRenderingContext2D,
    sourceCanvas: HTMLCanvasElement,
    destination: { x: number; y: number },
    source: { x: number; y: number },
    size: number,
    hardness: number,
    opacity: number,
    flow: number,
): void {
    const stampCanvas = document.createElement('canvas');
    stampCanvas.width = Math.max(1, Math.ceil(size));
    stampCanvas.height = Math.max(1, Math.ceil(size));
    const sctx = stampCanvas.getContext('2d');
    if (!sctx) return;
    const scale = options.sourceScale || 1;
    const rotation = options.sourceRotation || 0;
    if (Math.abs(scale - 1) < 1e-4 && Math.abs(rotation) < 1e-4) {
        sctx.drawImage(
            sourceCanvas,
            source.x - size / 2,
            source.y - size / 2,
            size,
            size,
            0,
            0,
            stampCanvas.width,
            stampCanvas.height,
        );
    } else {
        // Affine source read: translate to stamp center, rotate, scale, then
        // draw the source canvas with source point pulled to origin. With
        // sourceScale > 1 the destination shows MORE source per stamp pixel,
        // so the read patch shrinks (read half-distance offsets), which is
        // what the spec calls for.
        sctx.save();
        sctx.translate(stampCanvas.width / 2, stampCanvas.height / 2);
        sctx.rotate(rotation);
        sctx.scale(scale, scale);
        sctx.translate(-source.x, -source.y);
        sctx.drawImage(sourceCanvas, 0, 0);
        sctx.restore();
    }
    sctx.globalCompositeOperation = 'destination-in';
    sctx.drawImage(getBrushTip({ size, hardness, color: '#000' }), 0, 0, stampCanvas.width, stampCanvas.height);

    target.save();
    target.globalCompositeOperation = options.mode;
    target.globalAlpha = Math.max(0, Math.min(1, opacity * flow));
    target.drawImage(stampCanvas, destination.x - size / 2, destination.y - size / 2, size, size);
    target.restore();
}

function paintSegment(
    layer: { ctx: CanvasRenderingContext2D; markDirty: (rect: null) => void },
    sourceCanvas: HTMLCanvasElement,
    from: { x: number; y: number },
    to: { x: number; y: number },
    offset: { x: number; y: number },
    settings: { size: number; hardness: number; opacity: number; flow: number },
): void {
    const dx = to.x - from.x;
    const dy = to.y - from.y;
    const dist = Math.hypot(dx, dy);
    const spacing = Math.max(1, settings.size * 0.12);
    const start = state.leftover === 0 ? 0 : spacing - state.leftover;
    let i = start;
    while (i <= dist) {
        const x = from.x + (dx * i) / (dist || 1);
        const y = from.y + (dy * i) / (dist || 1);
        stampAt(
            layer.ctx,
            sourceCanvas,
            { x, y },
            { x: x + offset.x, y: y + offset.y },
            settings.size,
            settings.hardness,
            settings.opacity,
            settings.flow,
        );
        i += spacing;
    }
    const lastStamp = i - spacing;
    state.leftover = lastStamp < start ? state.leftover + dist : dist - lastStamp;
    layer.markDirty(null);
}

export const cloneStampTool: Tool = {
    id: 'clone-stamp',
    label: 'Clone Stamp',
    cursor: 'crosshair',
    onKeyDown: (e, ctx) => {
        if (e.key === 'Alt' || e.key === 'Option') {
            state.isSampling = true;
            ctx.requestRender();
        }
    },
    onKeyUp: (e, ctx) => {
        if (e.key === 'Alt' || e.key === 'Option') {
            state.isSampling = false;
            ctx.requestRender();
        }
    },
    onPointerDown: (e, ctx) => {
        if (e.button !== 0) return;
        const store = ctx.getStore();
        if (e.alt) {
            state.isSampling = true;
            state.source = p(e);
            state.hover = state.source;
            state.anchor = null;
            state.last = null;
            state.leftover = 0;
            store.setCloneSource(state.source);
            ctx.requestRender();
            return;
        }
        if (!state.source) return;
        const layer = store.layers.find(l => l.id === store.activeLayerId);
        if (!layer || layer.lockImage || layer.kind === 'adjustment') return;
        const point = p(e);
        if (!state.anchor || !options.aligned) state.anchor = point;
        state.layerId = layer.id;
        state.last = point;
        state.leftover = 0;

        const sourceCanvas = sampleSourceCanvas(store.layers, layer.id, store.width, store.height);
        if (!sourceCanvas || !state.anchor) return;
        const offset = { x: state.source.x - state.anchor.x, y: state.source.y - state.anchor.y };
        const { size, hardness, opacity, flow } = store.brushSettings;
        paintSegment(layer, sourceCanvas, point, point, offset, { size, hardness, opacity, flow });
        ctx.requestRender();
    },
    onPointerMove: (e, ctx) => {
        state.hover = p(e);
        state.isSampling = e.alt;
        if (!state.source || !state.anchor || !state.last || !state.layerId) {
            ctx.requestRender();
            return;
        }
        const store = ctx.getStore();
        const layer = store.layers.find(l => l.id === state.layerId);
        if (!layer) return;
        const sourceCanvas = sampleSourceCanvas(store.layers, layer.id, store.width, store.height);
        if (!sourceCanvas) return;
        const point = p(e);
        const offsetX = state.source.x - state.anchor.x;
        const offsetY = state.source.y - state.anchor.y;
        const { size, hardness, opacity, flow } = store.brushSettings;
        paintSegment(layer, sourceCanvas, state.last, point, { x: offsetX, y: offsetY }, { size, hardness, opacity, flow });
        state.last = point;
        ctx.requestRender();
    },
    onPointerUp: () => {
        state.last = null;
        state.layerId = null;
        state.isSampling = false;
        state.leftover = 0;
        if (!options.aligned) state.anchor = null;
    },
    renderOverlay: (overlay, ctx) => {
        renderCloneStampOverlay(overlay, ctx);
    },
};

registerTool(cloneStampTool);

function renderCloneStampOverlay(overlay: OverlayRenderContext, ctx: ToolContext): void {
    if (!options.showOverlay) return;
    const store = ctx.getStore();
    const { size } = store.brushSettings;
    const radius = Math.max(1, size / 2);
    const zoom = Math.max(overlay.zoom, 0.01);

    overlay.ctx.save();

    // Alt-pre-sample state: still picking the source. Show the sample-here
    // marker so the user knows where the click will set the anchor.
    if (state.isSampling && state.hover) {
        overlay.ctx.globalAlpha = options.overlayOpacity;
        drawStampMarker(overlay.ctx, state.hover, radius, zoom, true);
        overlay.ctx.restore();
        return;
    }

    if (!state.source) {
        overlay.ctx.restore();
        return;
    }
    // Cursor anchor: prefer the in-stroke `last` position; otherwise track
    // the hover position so the ghost follows the mouse even before any
    // pointer-down (Photoshop behavior with Show Overlay on).
    const cursor = state.last ?? state.hover;
    if (!cursor) {
        overlay.ctx.restore();
        return;
    }
    // Use the recorded anchor if the user already started a stroke; otherwise
    // treat the current cursor as a virtual anchor so the ghost previews
    // what the next click would clone.
    const anchor = state.anchor ?? cursor;
    const sourcePoint = {
        x: cursor.x + state.source.x - anchor.x,
        y: cursor.y + state.source.y - anchor.y,
    };

    // Render a translucent ghost of the sampled source patch directly under
    // the brush cursor — matches Photoshop's "Show Overlay" behavior.
    const sourceCanvas = sampleSourceCanvas(store.layers, state.layerId ?? store.activeLayerId ?? '', store.width, store.height);
    if (sourceCanvas) {
        overlay.ctx.save();
        // Clip to the brush footprint.
        overlay.ctx.beginPath();
        overlay.ctx.arc(cursor.x, cursor.y, radius, 0, Math.PI * 2);
        overlay.ctx.clip();
        overlay.ctx.globalAlpha = options.overlayOpacity;
        // Translate so the source point lines up under the cursor, then draw
        // the full merged canvas. The clip + translation gives us a clean
        // round preview that tracks the mouse.
        const dx = cursor.x - sourcePoint.x;
        const dy = cursor.y - sourcePoint.y;
        overlay.ctx.drawImage(sourceCanvas, dx, dy);
        overlay.ctx.restore();
    }

    // Light source-circle outline so the user can still see where the
    // sample originates.
    overlay.ctx.globalAlpha = options.overlayOpacity;
    drawStampMarker(overlay.ctx, sourcePoint, radius, zoom, false);
    overlay.ctx.restore();
}

function drawStampMarker(
    ctx: CanvasRenderingContext2D,
    point: { x: number; y: number },
    radius: number,
    zoom: number,
    sampling: boolean,
): void {
    const line = 1.5 / zoom;
    const icon = 12 / zoom;
    const top = point.y - radius - icon - (4 / zoom);
    ctx.save();
    ctx.lineWidth = line;
    ctx.strokeStyle = sampling ? '#ffffff' : '#111111';
    ctx.fillStyle = sampling ? 'rgba(30, 144, 255, 0.24)' : 'rgba(255, 255, 255, 0.18)';
    ctx.setLineDash([]);

    ctx.beginPath();
    ctx.arc(point.x, point.y, radius, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    ctx.strokeStyle = sampling ? '#111111' : '#ffffff';
    ctx.beginPath();
    ctx.arc(point.x, point.y, radius + line, 0, Math.PI * 2);
    ctx.stroke();

    // Small stamp glyph above the sampled/source circle.
    ctx.strokeStyle = sampling ? '#ffffff' : '#ffffff';
    ctx.fillStyle = sampling ? '#ffffff' : '#ffffff';
    ctx.lineJoin = 'round';
    ctx.beginPath();
    ctx.roundRect(point.x - icon * 0.45, top + icon * 0.38, icon * 0.9, icon * 0.28, icon * 0.08);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(point.x - icon * 0.22, top + icon * 0.38);
    ctx.lineTo(point.x - icon * 0.14, top + icon * 0.1);
    ctx.quadraticCurveTo(point.x, top, point.x + icon * 0.14, top + icon * 0.1);
    ctx.lineTo(point.x + icon * 0.22, top + icon * 0.38);
    ctx.stroke();
    ctx.beginPath();
    ctx.roundRect(point.x - icon * 0.58, top + icon * 0.66, icon * 1.16, icon * 0.18, icon * 0.04);
    ctx.fill();
    ctx.restore();
}
