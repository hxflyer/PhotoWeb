import type { Tool, ToolPointerEvent } from './Tool';
import { registerTool } from './registry';
import { Layer } from '../core/Layer';
import { captureLayerRegion, createPixelHistoryAction } from '../core/history';
import { rerenderShapeLayer } from './shapeRender';
import { useEditorStore } from '../store/editorStore';
import { buildSnapCandidates, snapPoint, type SnapTarget } from './snap';
import { CUSTOM_SHAPE_VIEWBOX, getCustomShapeById } from './customShapes';
import { renderCombinedShapeCanvas, type ShapeBooleanOp } from '../utils/shapeBoolean';
import { addPath, type PathShape } from './pen';
import type {
    ShapeData,
    ShapeFill,
    ShapeStroke,
    ShapeBounds,
} from '../store/types';

const SHAPE_SNAP_HYSTERESIS = 6;

function publishShapeSnapTargets(xSnap: SnapTarget | undefined, ySnap: SnapTarget | undefined): void {
    const targets: SnapTarget[] = [];
    if (xSnap) targets.push(xSnap);
    if (ySnap) targets.push(ySnap);
    useEditorStore.getState().setActiveSnapTargets(targets.length > 0 ? targets : null);
}

export type ShapeMode = 'shape' | 'path' | 'pixels';
export type ShapeKind = 'rectangle' | 'rounded-rectangle' | 'ellipse' | 'triangle' | 'polygon' | 'line' | 'custom';
export type ShapeCombineMode = 'new' | 'combine' | 'subtract' | 'intersect' | 'exclude';

export interface ShapeOptions {
    mode: ShapeMode;
    fill: string | null;
    stroke: string | null;
    strokeWidth: number;
    strokeOpacity: number;
    strokeAlignment: 'outside' | 'center' | 'inside';
    cornerRadius: number;
    polygonSides: number;
    polygonStar: boolean;       // GAP-05: Polygon → Star toggle
    polygonStarRatio: number;   // 0.1..1.0 — inner-radius / outer-radius
    /** Round the outer vertices of the polygon/star (Photoshop "Smooth Corners"). */
    polygonSmoothCorners: boolean;
    /** Round the inner vertices of a star (Photoshop "Smooth Indents"). */
    polygonSmoothIndents: boolean;
    lineWeight: number;
    lineArrowStart: boolean;    // GAP-06: arrowhead at line start
    lineArrowEnd: boolean;      // GAP-06: arrowhead at line end
    lineArrowSize: number;      // multiplier of lineWeight; head length
    customShapeId: string | null;
    /**
     * Active "Path operations" mode for the next shape created in the same
     * session. MVP: only `'new'` actually creates a new shape layer; the other
     * modes are recorded on the next ShapeData via the `combineMode` field so
     * Properties / Layers UI can surface the intent. Combining existing shape
     * layers into a single composed path is deferred.
     */
    combineMode: ShapeCombineMode;
}

const options: ShapeOptions = {
    mode: 'shape',
    fill: '#000000',
    stroke: null,
    strokeWidth: 1,
    strokeOpacity: 1,
    strokeAlignment: 'center',
    cornerRadius: 8,
    polygonSides: 5,
    polygonStar: false,
    polygonStarRatio: 0.5,
    polygonSmoothCorners: false,
    polygonSmoothIndents: false,
    lineWeight: 2,
    lineArrowStart: false,
    lineArrowEnd: false,
    lineArrowSize: 4,
    customShapeId: null,
    combineMode: 'new',
};

export function setShapeOptions(next: Partial<ShapeOptions>): void {
    Object.assign(options, next);
}

export function getShapeOptions(): ShapeOptions {
    return { ...options };
}

interface DragState {
    kind: ShapeKind;
    anchor: { x: number; y: number };
    current: { x: number; y: number };
    layerId: string | null;
    modifiers: { shift: boolean; alt: boolean };
    snapCandidates: SnapTarget[];
}
const drag: { state: DragState | null } = { state: null };

function p(e: ToolPointerEvent) { return { x: e.canvasX, y: e.canvasY }; }

function makeFill(color: string | null): ShapeFill | null {
    if (!color) return null;
    return { type: 'solid', color };
}

function makeStroke(color: string | null, width: number): ShapeStroke | null {
    if (!color || width <= 0) return null;
    return {
        color,
        width,
        opacity: options.strokeOpacity,
        alignment: options.strokeAlignment,
        enabled: true,
    };
}

function makeLineStroke(color: string, weight: number): ShapeStroke {
    return {
        color,
        width: weight,
        opacity: 1,
        alignment: 'center',
        enabled: true,
    };
}

/**
 * Resolves the drag rectangle into Photoshop-style geometry. Shift constrains
 * the proportions to a square/circle. Alt anchors from the center so the
 * shape grows outward from the original click point.
 */
function resolveBounds(
    anchor: { x: number; y: number },
    current: { x: number; y: number },
    constrain: boolean,
    fromCenter: boolean,
): ShapeBounds {
    let dx = current.x - anchor.x;
    let dy = current.y - anchor.y;
    if (constrain) {
        const m = Math.max(Math.abs(dx), Math.abs(dy));
        dx = (dx < 0 ? -m : m);
        dy = (dy < 0 ? -m : m);
    }
    if (fromCenter) {
        const x = anchor.x - Math.abs(dx);
        const y = anchor.y - Math.abs(dy);
        return { x, y, w: Math.abs(dx) * 2, h: Math.abs(dy) * 2 };
    }
    const x = Math.min(anchor.x, anchor.x + dx);
    const y = Math.min(anchor.y, anchor.y + dy);
    return { x, y, w: Math.abs(dx), h: Math.abs(dy) };
}

function resolvePolygonGeom(
    anchor: { x: number; y: number },
    current: { x: number; y: number },
    constrain: boolean,
    fromCenter: boolean,
): { center: { x: number; y: number }; radius: number } {
    if (fromCenter) {
        const r = constrain
            ? Math.max(Math.abs(current.x - anchor.x), Math.abs(current.y - anchor.y))
            : Math.hypot(current.x - anchor.x, current.y - anchor.y);
        return { center: { x: anchor.x, y: anchor.y }, radius: Math.max(1, r) };
    }
    const b = resolveBounds(anchor, current, constrain, false);
    return {
        center: { x: b.x + b.w / 2, y: b.y + b.h / 2 },
        radius: Math.max(1, Math.min(b.w, b.h) / 2),
    };
}

function resolveLineEndpoints(
    anchor: { x: number; y: number },
    current: { x: number; y: number },
    constrain: boolean,
): { p0: { x: number; y: number }; p1: { x: number; y: number } } {
    if (!constrain) return { p0: { ...anchor }, p1: { ...current } };
    const dx = current.x - anchor.x;
    const dy = current.y - anchor.y;
    const angle = Math.atan2(dy, dx);
    const len = Math.hypot(dx, dy);
    const snapped = Math.round(angle / (Math.PI / 4)) * (Math.PI / 4);
    return {
        p0: { ...anchor },
        p1: { x: anchor.x + Math.cos(snapped) * len, y: anchor.y + Math.sin(snapped) * len },
    };
}

function buildShapeData(
    kind: ShapeKind,
    anchor: { x: number; y: number },
    current: { x: number; y: number },
    fallbackFillColor: string,
    modifiers: { shift: boolean; alt: boolean },
): ShapeData | null {
    const fillColor = options.fill ?? fallbackFillColor;
    const fill = makeFill(fillColor);
    const stroke = makeStroke(options.stroke, options.strokeWidth);
    const combineMode = options.combineMode;
    switch (kind) {
        case 'rectangle': {
            const bounds = resolveBounds(anchor, current, modifiers.shift, modifiers.alt);
            if (bounds.w < 1 || bounds.h < 1) return null;
            return { kind: 'rect', bounds, fill, stroke, combineMode };
        }
        case 'rounded-rectangle': {
            const bounds = resolveBounds(anchor, current, modifiers.shift, modifiers.alt);
            if (bounds.w < 1 || bounds.h < 1) return null;
            return { kind: 'rounded-rect', bounds, cornerRadius: options.cornerRadius, fill, stroke, combineMode };
        }
        case 'ellipse': {
            const bounds = resolveBounds(anchor, current, modifiers.shift, modifiers.alt);
            if (bounds.w < 1 || bounds.h < 1) return null;
            return { kind: 'ellipse', bounds, fill, stroke, combineMode };
        }
        case 'triangle': {
            const geom = resolvePolygonGeom(anchor, current, modifiers.shift, modifiers.alt);
            if (geom.radius < 1) return null;
            return {
                kind: 'polygon',
                center: geom.center,
                radius: geom.radius,
                sides: 3,
                star: false,
                starRatio: 1,
                rotation: 0,
                fill,
                stroke,
                cornerRadius: options.cornerRadius,
                smoothCorners: options.cornerRadius > 0,
                smoothIndents: false,
                combineMode,
            };
        }
        case 'polygon': {
            const geom = resolvePolygonGeom(anchor, current, modifiers.shift, modifiers.alt);
            if (geom.radius < 1) return null;
            return {
                kind: 'polygon',
                center: geom.center,
                radius: geom.radius,
                sides: options.polygonSides,
                star: options.polygonStar,
                starRatio: options.polygonStarRatio,
                smoothCorners: options.polygonSmoothCorners,
                smoothIndents: options.polygonSmoothIndents,
                rotation: 0,
                fill,
                stroke,
                cornerRadius: options.cornerRadius,
                combineMode,
            };
        }
        case 'line': {
            const ends = resolveLineEndpoints(anchor, current, modifiers.shift);
            if (Math.hypot(ends.p1.x - ends.p0.x, ends.p1.y - ends.p0.y) < 1) return null;
            const lineColor = options.stroke ?? fillColor;
            return {
                kind: 'line',
                p0: ends.p0,
                p1: ends.p1,
                weight: options.lineWeight,
                arrowStart: options.lineArrowStart,
                arrowEnd: options.lineArrowEnd,
                arrowSize: options.lineArrowSize,
                stroke: makeLineStroke(lineColor, options.lineWeight),
                combineMode,
            };
        }
        case 'custom': {
            const id = options.customShapeId;
            if (!id) return null;
            const preset = getCustomShapeById(id);
            if (!preset) return null;
            const bounds = resolveBounds(anchor, current, modifiers.shift, modifiers.alt);
            if (bounds.w < 1 || bounds.h < 1) return null;
            return {
                kind: 'custom',
                presetId: preset.id,
                pathD: preset.pathD,
                bounds,
                fill,
                stroke,
                combineMode,
            };
        }
    }
}

function shapeDataToPath(data: ShapeData): PathShape | null {
    const id = crypto.randomUUID();
    const k = 0.5522847498307936;
    switch (data.kind) {
        case 'rect':
        case 'rounded-rect': {
            const { x, y, w, h } = data.bounds;
            if (w < 1 || h < 1) return null;
            return {
                id,
                closed: true,
                anchors: [
                    { x, y, type: 'corner' },
                    { x: x + w, y, type: 'corner' },
                    { x: x + w, y: y + h, type: 'corner' },
                    { x, y: y + h, type: 'corner' },
                ],
            };
        }
        case 'ellipse': {
            const { x, y, w, h } = data.bounds;
            if (w < 1 || h < 1) return null;
            const cx = x + w / 2;
            const cy = y + h / 2;
            const rx = w / 2;
            const ry = h / 2;
            return {
                id,
                closed: true,
                anchors: [
                    { x: cx + rx, y: cy, type: 'smooth', inHandle: { x: cx + rx, y: cy - k * ry }, outHandle: { x: cx + rx, y: cy + k * ry } },
                    { x: cx, y: cy + ry, type: 'smooth', inHandle: { x: cx + k * rx, y: cy + ry }, outHandle: { x: cx - k * rx, y: cy + ry } },
                    { x: cx - rx, y: cy, type: 'smooth', inHandle: { x: cx - rx, y: cy + k * ry }, outHandle: { x: cx - rx, y: cy - k * ry } },
                    { x: cx, y: cy - ry, type: 'smooth', inHandle: { x: cx - k * rx, y: cy - ry }, outHandle: { x: cx + k * rx, y: cy - ry } },
                ],
            };
        }
        case 'line':
            return {
                id,
                closed: false,
                anchors: [
                    { x: data.p0.x, y: data.p0.y, type: 'corner' },
                    { x: data.p1.x, y: data.p1.y, type: 'corner' },
                ],
            };
        case 'polygon': {
            const points = data.star ? data.sides * 2 : data.sides;
            const anchors = Array.from({ length: points }, (_, i) => {
                const angle = (-Math.PI / 2) + (i * 2 * Math.PI) / points;
                const radius = data.star && i % 2 === 1 ? data.radius * data.starRatio : data.radius;
                return {
                    x: data.center.x + radius * Math.cos(angle + data.rotation),
                    y: data.center.y + radius * Math.sin(angle + data.rotation),
                    type: 'corner' as const,
                };
            });
            return anchors.length > 1 ? { id, closed: true, anchors } : null;
        }
        case 'custom':
            return customShapeDataToPath(data, id);
    }
}

function customShapeDataToPath(data: Extract<ShapeData, { kind: 'custom' }>, id: string): PathShape | null {
    const { bounds, pathD } = data;
    if (bounds.w < 1 || bounds.h < 1) return null;
    const uniformScale = Math.min(bounds.w / CUSTOM_SHAPE_VIEWBOX, bounds.h / CUSTOM_SHAPE_VIEWBOX);
    const drawnSize = CUSTOM_SHAPE_VIEWBOX * uniformScale;
    const offsetX = bounds.x + (bounds.w - drawnSize) / 2;
    const offsetY = bounds.y + (bounds.h - drawnSize) / 2;
    const map = (x: number, y: number) => ({ x: offsetX + x * uniformScale, y: offsetY + y * uniformScale });
    const tokens = pathD.match(/[AaCcLlMmZz]|-?\d*\.?\d+(?:e[-+]?\d+)?/g) ?? [];
    const anchors: PathShape['anchors'] = [];
    let i = 0;
    let cmd = '';
    let current = { x: 0, y: 0 };
    let closed = false;
    const isCmd = (token: string) => /^[AaCcLlMmZz]$/.test(token);
    const num = () => Number(tokens[i++]);
    while (i < tokens.length) {
        if (isCmd(tokens[i])) cmd = tokens[i++];
        if (cmd === 'M' || cmd === 'm') {
            if (anchors.length > 0) break;
            const x = num();
            const y = num();
            current = cmd === 'm' ? { x: current.x + x, y: current.y + y } : { x, y };
            anchors.push({ ...map(current.x, current.y), type: 'corner' });
            cmd = cmd === 'm' ? 'l' : 'L';
        } else if (cmd === 'L' || cmd === 'l') {
            const x = num();
            const y = num();
            current = cmd === 'l' ? { x: current.x + x, y: current.y + y } : { x, y };
            anchors.push({ ...map(current.x, current.y), type: 'corner' });
        } else if (cmd === 'C' || cmd === 'c') {
            const c1 = { x: num(), y: num() };
            const c2 = { x: num(), y: num() };
            const end = { x: num(), y: num() };
            const absC1 = cmd === 'c' ? { x: current.x + c1.x, y: current.y + c1.y } : c1;
            const absC2 = cmd === 'c' ? { x: current.x + c2.x, y: current.y + c2.y } : c2;
            const absEnd = cmd === 'c' ? { x: current.x + end.x, y: current.y + end.y } : end;
            const prev = anchors[anchors.length - 1];
            if (prev) prev.outHandle = map(absC1.x, absC1.y);
            anchors.push({ ...map(absEnd.x, absEnd.y), inHandle: map(absC2.x, absC2.y), type: 'smooth' });
            current = absEnd;
        } else if (cmd === 'A' || cmd === 'a') {
            // Arc-to is approximated as a straight segment for editable path mode.
            num(); num(); num(); num(); num();
            const x = num();
            const y = num();
            current = cmd === 'a' ? { x: current.x + x, y: current.y + y } : { x, y };
            anchors.push({ ...map(current.x, current.y), type: 'corner' });
        } else if (cmd === 'Z' || cmd === 'z') {
            closed = true;
            break;
        } else {
            break;
        }
    }
    return anchors.length >= 2 ? { id, closed, anchors } : null;
}

function drawPixelShape(
    ctx: CanvasRenderingContext2D,
    kind: ShapeKind,
    anchor: { x: number; y: number },
    current: { x: number; y: number },
    primaryColor: string,
    modifiers: { shift: boolean; alt: boolean },
): void {
    const fill = options.fill ?? primaryColor;
    ctx.save();
    ctx.fillStyle = fill;
    if (options.stroke) {
        ctx.strokeStyle = options.stroke;
        ctx.lineWidth = options.strokeWidth;
    }
    ctx.beginPath();
    if (kind === 'line') {
        const ends = resolveLineEndpoints(anchor, current, modifiers.shift);
        const dx = ends.p1.x - ends.p0.x;
        const dy = ends.p1.y - ends.p0.y;
        const len = Math.hypot(dx, dy);
        const headLen = Math.max(2, options.lineArrowSize) * options.lineWeight;
        const shaftStart = { x: ends.p0.x, y: ends.p0.y };
        const shaftEnd = { x: ends.p1.x, y: ends.p1.y };
        ctx.lineWidth = options.lineWeight;
        const lineColor = options.stroke ?? fill;
        ctx.strokeStyle = lineColor;
        if (len > 0) {
            const ux = dx / len, uy = dy / len;
            if (options.lineArrowStart) {
                shaftStart.x = ends.p0.x + ux * headLen;
                shaftStart.y = ends.p0.y + uy * headLen;
            }
            if (options.lineArrowEnd) {
                shaftEnd.x = ends.p1.x - ux * headLen;
                shaftEnd.y = ends.p1.y - uy * headLen;
            }
            ctx.beginPath();
            ctx.moveTo(shaftStart.x, shaftStart.y);
            ctx.lineTo(shaftEnd.x, shaftEnd.y);
            ctx.stroke();
            const drawArrow = (tip: { x: number; y: number }, dirX: number, dirY: number) => {
                const wing = headLen * 0.5;
                const perpX = -dirY, perpY = dirX;
                ctx.beginPath();
                ctx.moveTo(tip.x, tip.y);
                ctx.lineTo(tip.x - dirX * headLen + perpX * wing, tip.y - dirY * headLen + perpY * wing);
                ctx.lineTo(tip.x - dirX * headLen - perpX * wing, tip.y - dirY * headLen - perpY * wing);
                ctx.closePath();
                ctx.fillStyle = lineColor;
                ctx.fill();
            };
            if (options.lineArrowEnd) drawArrow({ x: ends.p1.x, y: ends.p1.y }, ux, uy);
            if (options.lineArrowStart) drawArrow({ x: ends.p0.x, y: ends.p0.y }, -ux, -uy);
        }
        ctx.restore();
        return;
    }
    const b = resolveBounds(anchor, current, modifiers.shift, modifiers.alt);
    if (kind === 'rectangle') {
        ctx.rect(b.x, b.y, b.w, b.h);
    } else if (kind === 'rounded-rectangle') {
        const r = Math.min(options.cornerRadius, b.w / 2, b.h / 2);
        ctx.moveTo(b.x + r, b.y);
        ctx.lineTo(b.x + b.w - r, b.y);
        ctx.quadraticCurveTo(b.x + b.w, b.y, b.x + b.w, b.y + r);
        ctx.lineTo(b.x + b.w, b.y + b.h - r);
        ctx.quadraticCurveTo(b.x + b.w, b.y + b.h, b.x + b.w - r, b.y + b.h);
        ctx.lineTo(b.x + r, b.y + b.h);
        ctx.quadraticCurveTo(b.x, b.y + b.h, b.x, b.y + b.h - r);
        ctx.lineTo(b.x, b.y + r);
        ctx.quadraticCurveTo(b.x, b.y, b.x + r, b.y);
        ctx.closePath();
    } else if (kind === 'ellipse') {
        ctx.ellipse(b.x + b.w / 2, b.y + b.h / 2, b.w / 2, b.h / 2, 0, 0, Math.PI * 2);
    } else if (kind === 'polygon' || kind === 'triangle') {
        const geom = resolvePolygonGeom(anchor, current, modifiers.shift, modifiers.alt);
        const cx = geom.center.x, cy = geom.center.y, r = geom.radius;
        const sides = kind === 'triangle' ? 3 : options.polygonSides;
        const star = kind === 'polygon' && options.polygonStar;
        if (star) {
            const innerR = r * Math.max(0.05, Math.min(1, options.polygonStarRatio));
            const points = sides * 2;
            for (let i = 0; i < points; i++) {
                const angle = (-Math.PI / 2) + (i * Math.PI) / sides;
                const radius = i % 2 === 0 ? r : innerR;
                const px = cx + radius * Math.cos(angle);
                const py = cy + radius * Math.sin(angle);
                if (i === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
            }
        } else {
            for (let i = 0; i < sides; i++) {
                const angle = (-Math.PI / 2) + (i * 2 * Math.PI) / sides;
                const px = cx + r * Math.cos(angle);
                const py = cy + r * Math.sin(angle);
                if (i === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
            }
        }
        ctx.closePath();
    }
    if (options.fill) ctx.fill();
    if (options.stroke) ctx.stroke();
    ctx.restore();
}

function commitShapeLayer(
    ctx: import('./Tool').ToolContext,
    kind: ShapeKind,
    anchor: { x: number; y: number },
    current: { x: number; y: number },
    modifiers: { shift: boolean; alt: boolean },
): void {
    const store = ctx.getStore();
    const data = buildShapeData(kind, anchor, current, store.primaryColor, modifiers);
    if (!data) return;

    // Path-operations: when combineMode != 'new' and a shape layer is active,
    // boolean-combine the new shape into the existing layer's path instead
    // of creating a new layer.
    const op = options.combineMode;
    if (op !== 'new' && (op === 'combine' || op === 'subtract' || op === 'intersect' || op === 'exclude')) {
        const activeLayer = store.layers.find(l => l.id === store.activeLayerId);
        if (activeLayer && activeLayer.kind === 'shape' && activeLayer.shapeData) {
            const before = activeLayer.shapeData as ShapeData;
            const combinedCanvas = renderCombinedShapeCanvas(before, data, op as ShapeBooleanOp, store.width, store.height);
            if (combinedCanvas) {
                store.executeDocumentCommand({
                    kind: 'layer-property',
                    label: `${labelForOp(op as ShapeBooleanOp)} Shape`,
                    affectedIds: [activeLayer.id],
                    run: () => {
                        const state = ctx.getStore();
                        const layer = state.layers.find(l => l.id === activeLayer.id);
                        if (!layer) return;
                        // Boolean combines rasterize the shape layer — the
                        // composite silhouette cannot be expressed by the
                        // existing per-kind ShapeData and Photoshop also
                        // rasterizes in this case.
                        layer.kind = 'raster';
                        layer.shapeData = null;
                        layer.ctx.clearRect(0, 0, layer.canvas.width, layer.canvas.height);
                        layer.ctx.drawImage(combinedCanvas, 0, 0);
                        layer.markDirty(null);
                        useEditorStore.setState(s => ({ layers: [...s.layers] }));
                    },
                });
                options.combineMode = 'new';
                return;
            }
        }
        // Fall through to creating a new layer if no active shape layer exists.
    }

    store.executeDocumentCommand({
        kind: 'layer-add',
        label: `Add ${labelForKind(kind)}`,
        run: () => {
            const state = ctx.getStore();
            const newLayer = new Layer(state.width, state.height, labelForKind(kind), 'shape');
            newLayer.shapeData = data;
            rerenderShapeLayer(newLayer);
            useEditorStore.setState({
                layers: [...state.layers, newLayer],
                activeLayerId: newLayer.id,
                selectedLayerIds: [newLayer.id],
                layerSelectionAnchorId: newLayer.id,
                activeLayerEditTarget: 'layer',
            });
        },
    });
    // Path-operations buttons only affect the next shape in the session.
    // Reset to the default so subsequent drags create new shape layers.
    options.combineMode = 'new';
}

export function addCustomShapeLayerFromPreset(
    presetId: string,
    center: { x: number; y: number },
    size = 96,
): string | null {
    const preset = getCustomShapeById(presetId);
    if (!preset) return null;
    const store = useEditorStore.getState();
    const side = Math.max(8, size);
    const bounds = {
        x: Math.max(0, Math.min(store.width - side, center.x - side / 2)),
        y: Math.max(0, Math.min(store.height - side, center.y - side / 2)),
        w: side,
        h: side,
    };
    const data: ShapeData = {
        kind: 'custom',
        presetId: preset.id,
        pathD: preset.pathD,
        bounds,
        fill: makeFill(options.fill ?? store.primaryColor),
        stroke: makeStroke(options.stroke, options.strokeWidth),
        combineMode: 'new',
    };
    const id = crypto.randomUUID();
    store.executeDocumentCommand({
        kind: 'layer-add',
        label: `Add ${preset.name}`,
        run: () => {
            const state = useEditorStore.getState();
            const newLayer = new Layer(state.width, state.height, preset.name, 'shape');
            newLayer.id = id;
            newLayer.shapeData = data;
            rerenderShapeLayer(newLayer);
            useEditorStore.setState({
                layers: [...state.layers, newLayer],
                activeLayerId: newLayer.id,
                selectedLayerIds: [newLayer.id],
                layerSelectionAnchorId: newLayer.id,
                activeLayerEditTarget: 'layer',
            });
        },
    });
    return id;
}

function labelForOp(op: ShapeBooleanOp): string {
    switch (op) {
        case 'combine': return 'Combine';
        case 'subtract': return 'Subtract';
        case 'intersect': return 'Intersect';
        case 'exclude': return 'Exclude';
    }
}

function labelForKind(kind: ShapeKind): string {
    switch (kind) {
        case 'rectangle': return 'Rectangle';
        case 'rounded-rectangle': return 'Rounded Rectangle';
        case 'ellipse': return 'Ellipse';
        case 'triangle': return 'Triangle';
        case 'polygon': return options.polygonStar ? 'Star' : 'Polygon';
        case 'line': return 'Line';
        case 'custom': return 'Custom Shape';
    }
}

function makeShapeTool(id: string, label: string, kind: ShapeKind): Tool {
    return {
        id,
        label,
        cursor: 'crosshair',
        onPointerDown: (e, ctx) => {
            if (e.button !== 0) return;
            const store = ctx.getStore();
            const layer = store.layers.find(l => l.id === store.activeLayerId);
            // Shape mode does not require an existing layer (it creates one).
            // Pixels mode requires an active layer to draw onto.
            if (options.mode === 'pixels' && !layer) return;
            const snapCandidates = store.snapEnabled ? buildSnapCandidates(store) : [];
            drag.state = {
                kind,
                anchor: p(e),
                current: p(e),
                layerId: layer?.id ?? null,
                modifiers: { shift: e.shift, alt: e.alt },
                snapCandidates,
            };
        },
        onPointerMove: (e) => {
            if (!drag.state) return;
            const raw = p(e);
            if (drag.state.snapCandidates.length > 0) {
                const snapped = snapPoint(raw, drag.state.snapCandidates, SHAPE_SNAP_HYSTERESIS);
                drag.state.current = { x: snapped.x, y: snapped.y };
                publishShapeSnapTargets(snapped.xSnap, snapped.ySnap);
            } else {
                drag.state.current = raw;
                publishShapeSnapTargets(undefined, undefined);
            }
            drag.state.modifiers = { shift: e.shift, alt: e.alt };
        },
        onPointerUp: (e, ctx) => {
            if (!drag.state) return;
            const modifiers = { shift: e.shift || drag.state.modifiers.shift, alt: e.alt || drag.state.modifiers.alt };
            const { anchor, current, layerId, kind: dragKind } = drag.state;
            drag.state = null;
            publishShapeSnapTargets(undefined, undefined);
            if (options.mode === 'shape') {
                commitShapeLayer(ctx, dragKind, anchor, current, modifiers);
                return;
            }
            if (options.mode === 'path') {
                const store = ctx.getStore();
                const data = buildShapeData(dragKind, anchor, current, store.primaryColor, modifiers);
                const path = data ? shapeDataToPath(data) : null;
                if (path) {
                    addPath(path);
                    ctx.requestRender();
                    window.dispatchEvent(new Event('photoweb:paths-changed'));
                }
                return;
            }
            // Pixels mode: paint directly onto the active layer.
            if (!layerId) return;
            const store = ctx.getStore();
            const layer = store.layers.find(l => l.id === layerId);
            if (!layer) return;
            const rect = { x: 0, y: 0, width: layer.canvas.width, height: layer.canvas.height };
            const before = captureLayerRegion(layer, rect);
            drawPixelShape(layer.ctx, dragKind, anchor, current, store.primaryColor, modifiers);
            layer.markDirty(null);
            store.commitHistory(createPixelHistoryAction(layer, rect, before, `Draw ${labelForKind(dragKind)} Pixels`));
            ctx.requestRender();
        },
    };
}

export const rectangleShapeTool = makeShapeTool('shape-rectangle', 'Rectangle', 'rectangle');
export const roundedRectShapeTool = makeShapeTool('shape-rounded-rectangle', 'Rounded Rectangle', 'rounded-rectangle');
export const ellipseShapeTool = makeShapeTool('shape-ellipse', 'Ellipse', 'ellipse');
export const triangleShapeTool = makeShapeTool('shape-triangle', 'Triangle', 'triangle');
export const polygonShapeTool = makeShapeTool('shape-polygon', 'Polygon', 'polygon');
export const lineShapeTool = makeShapeTool('shape-line', 'Line', 'line');
export const customShapeTool = makeShapeTool('shape-custom', 'Custom Shape', 'custom');

[
    rectangleShapeTool,
    roundedRectShapeTool,
    ellipseShapeTool,
    triangleShapeTool,
    polygonShapeTool,
    lineShapeTool,
    customShapeTool,
].forEach(registerTool);
