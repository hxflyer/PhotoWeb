import type { Tool, ToolPointerEvent } from './Tool';
import { registerTool } from './registry';
import type { TextStyle } from '../components/Canvas/TextEditOverlay';
import type { Layer } from '../core/Layer';
import { resolveFontFamily, shouldEmitFallbackToast } from '../utils/fontList';
import { applyTextWarp } from '../utils/textWarp';

export type TypeOrientation = 'horizontal' | 'vertical';
export type TypeTextMode = 'point' | 'box' | 'path' | 'shape';

export interface TypeBounds { x: number; y: number; w: number; h: number }

export interface TypeStyleRun {
    start: number;
    end: number;
    style: Partial<TextStyle>;
}

export interface TypePathAnchor {
    x: number;
    y: number;
    inHandle?: { x: number; y: number };
    outHandle?: { x: number; y: number };
    type: 'corner' | 'smooth';
}

export interface TypePathShape {
    id: string;
    closed: boolean;
    anchors: TypePathAnchor[];
}

interface TypePathBridge {
    hitSegment: (x: number, y: number) => { path: TypePathShape; point: { x: number; y: number } } | null;
    hitInterior: (x: number, y: number) => { path: TypePathShape } | null;
    clonePath: (path: TypePathShape) => TypePathShape;
}

let typePathBridge: TypePathBridge | null = null;
export function bindTypePathBridge(bridge: TypePathBridge | null): void {
    typePathBridge = bridge;
}

/**
 * Photoshop's Warp Text presets. `none` disables warping entirely.
 * `bend` ranges -100..100, `distortH` / `distortV` range -100..100.
 */
export type TypeWarpStyle =
    | 'none'
    | 'arc'
    | 'arc-lower'
    | 'arc-upper'
    | 'arch'
    | 'bulge'
    | 'shell-lower'
    | 'shell-upper'
    | 'flag'
    | 'wave'
    | 'fish'
    | 'rise'
    | 'fisheye'
    | 'inflate'
    | 'squeeze'
    | 'twist';

export interface TypeWarp {
    style: TypeWarpStyle;
    bend: number;       // -100..100, % of width
    distortH: number;   // -100..100, % horizontal distortion
    distortV: number;   // -100..100, % vertical distortion
    horizontal: boolean; // orientation of the bend axis
}

export interface TypeLayerData {
    id: string;
    text: string;
    style: TextStyle;
    styleRuns?: TypeStyleRun[];
    textMode?: TypeTextMode;
    orientation: TypeOrientation;
    transform: { x: number; y: number; width: number; height: number; rotation: number };
    /** Bounds of the rendered text (in canvas coords). Updated on each rasterize. */
    bounds?: TypeBounds;
    /** When set, edit-mode is editing an existing type layer (re-edit flow). */
    targetLayerId?: string;
    /** Photoshop's Warp Text settings. When `style === 'none'` (or absent), no warp is applied. */
    warp?: TypeWarp;
    /** Text-on-path payload. Stored as a path copy so saved documents remain stable if the original path changes. */
    pathText?: {
        path: TypePathShape;
        startOffset: number;
        endOffset?: number;
        flipped: boolean;
    };
    /** Text constrained inside a closed path. */
    shapeText?: {
        path: TypePathShape;
    };
}

interface TypeToolState {
    editing: TypeLayerData | null;
    pendingBox: { start: { x: number; y: number }; current: { x: number; y: number }; orientation: TypeOrientation } | null;
    onCommit: ((data: TypeLayerData) => void) | null;
    onCancel: (() => void) | null;
}

export const typeToolState: TypeToolState = { editing: null, pendingBox: null, onCommit: null, onCancel: null };

export function bindTypeOverlayHandlers(commit: (data: TypeLayerData) => void, cancel: () => void): void {
    typeToolState.onCommit = commit;
    typeToolState.onCancel = cancel;
}

const typeListeners = new Set<() => void>();
let typeVersion = 0;
export function subscribeTypeTool(fn: () => void): () => void {
    typeListeners.add(fn);
    return () => { typeListeners.delete(fn); };
}
export function getTypeVersion(): number { return typeVersion; }
function notifyTypeChange(): void {
    typeVersion++;
    typeListeners.forEach(fn => fn());
}

function normalizeRect(a: { x: number; y: number }, b: { x: number; y: number }) {
    const x = Math.min(a.x, b.x);
    const y = Math.min(a.y, b.y);
    return { x, y, width: Math.abs(a.x - b.x), height: Math.abs(a.y - b.y) };
}

function isBoxDrag(a: { x: number; y: number }, b: { x: number; y: number }): boolean {
    return Math.hypot(a.x - b.x, a.y - b.y) >= 6;
}

function addImmediateTypeLayer(
    store: { addLayer: () => void; setActiveLayer: (id: string) => void },
    getStore: () => { layers: Layer[] },
    data: TypeLayerData,
): TypeLayerData {
    store.addLayer();
    const layer = getStore().layers.at(-1);
    if (!layer) return data;
    layer.kind = 'type';
    layer.name = data.text.slice(0, 24) || 'Type Layer';
    const next = { ...data, targetLayerId: layer.id };
    layer.typeData = next;
    layer.markDirty(null);
    store.setActiveLayer(layer.id);
    return next;
}
export function setEditingType(data: TypeLayerData | null): void {
    if (data) typeToolState.pendingBox = null;
    typeToolState.editing = data;
    notifyTypeChange();
}

// Hook for the panel layer — set by App so updateEditingStyle can reach the
// store / re-render the canvas without a circular import.
interface TypeStoreBridge {
    layers: Layer[];
    activeLayerId: string | null;
    /** Triggers a viewport re-composition (e.g. after we re-rasterize a type layer). */
    forceRender: () => void;
}
let getStoreRef: (() => TypeStoreBridge) | null = null;
export function bindTypePanelStore(getter: () => TypeStoreBridge): void {
    getStoreRef = getter;
}

interface TextEditorBridge {
    applyStylePatch: (patch: Partial<TextStyle>) => boolean;
    getSelectionStyle: () => TextStyle | null;
}

let textEditorBridge: TextEditorBridge | null = null;

export function bindTextEditorBridge(bridge: TextEditorBridge | null): void {
    textEditorBridge = bridge;
}

let typeToastBridge: ((message: string, type?: 'info' | 'error' | 'success') => void) | null = null;
export function bindTypeToastBridge(fn: ((message: string, type?: 'info' | 'error' | 'success') => void) | null): void {
    typeToastBridge = fn;
}

function normalizeRuns(runs: TypeStyleRun[] | undefined, textLength: number): TypeStyleRun[] {
    if (!runs) return [];
    return runs
        .map(run => ({
            start: Math.max(0, Math.min(textLength, run.start)),
            end: Math.max(0, Math.min(textLength, run.end)),
            style: { ...run.style },
        }))
        .filter(run => run.end > run.start && Object.keys(run.style).length > 0)
        .sort((a, b) => a.start - b.start || a.end - b.end);
}

export function styleAtOffset(data: TypeLayerData, offset: number): TextStyle {
    const merged: TextStyle = { ...data.style };
    const index = Math.max(0, Math.min(data.text.length, offset));
    normalizeRuns(data.styleRuns, data.text.length).forEach(run => {
        if (index >= run.start && index < run.end) Object.assign(merged, run.style);
    });
    return merged;
}

export function applyStyleRun(data: TypeLayerData, start: number, end: number, patch: Partial<TextStyle>): TypeLayerData {
    const textLength = data.text.length;
    const a = Math.max(0, Math.min(textLength, Math.min(start, end)));
    const b = Math.max(0, Math.min(textLength, Math.max(start, end)));
    if (a === b) return { ...data, style: { ...data.style, ...patch } };

    const nextRuns: TypeStyleRun[] = [];
    normalizeRuns(data.styleRuns, textLength).forEach(run => {
        if (run.end <= a || run.start >= b) {
            nextRuns.push(run);
            return;
        }
        if (run.start < a) nextRuns.push({ start: run.start, end: a, style: { ...run.style } });
        const overlapStart = Math.max(run.start, a);
        const overlapEnd = Math.min(run.end, b);
        nextRuns.push({ start: overlapStart, end: overlapEnd, style: { ...run.style, ...patch } });
        if (run.end > b) nextRuns.push({ start: b, end: run.end, style: { ...run.style } });
    });

    // Cover text ranges not already covered by existing runs.
    let cursor = a;
    nextRuns
        .filter(run => run.end > a && run.start < b)
        .sort((x, y) => x.start - y.start)
        .forEach(run => {
            if (run.start > cursor) nextRuns.push({ start: cursor, end: run.start, style: { ...patch } });
            cursor = Math.max(cursor, run.end);
        });
    if (cursor < b) nextRuns.push({ start: cursor, end: b, style: { ...patch } });

    return { ...data, styleRuns: normalizeRuns(nextRuns, textLength) };
}

/**
 * Live update of the active text style. Routes the patch to:
 *   1. The active editing session (if any) — preview updates live in the overlay
 *   2. Otherwise, the active layer if it's a type layer — re-rasterizes that layer
 *   3. Otherwise, defaultTextStyle — used for the NEXT new text layer
 * In every case, defaultTextStyle is also updated so subsequent new text inherits.
 */
export function updateEditingStyle(patch: Partial<TextStyle>): void {
    Object.assign(defaultTextStyle, patch);

    if (typeToolState.editing) {
        if (textEditorBridge?.applyStylePatch(patch)) {
            notifyTypeChange();
            return;
        }
        typeToolState.editing = {
            ...typeToolState.editing,
            style: { ...typeToolState.editing.style, ...patch },
        };
        notifyTypeChange();
        return;
    }

    // Not editing — try to update the selected type layer.
    const store = getStoreRef?.();
    if (store) {
        const active = store.layers.find(l => l.id === store.activeLayerId);
        if (active && active.kind === 'type' && active.typeData) {
            const data = active.typeData as TypeLayerData;
            data.style = { ...data.style, ...patch };
            rerenderTypeLayer(active);
            store.forceRender();
        }
    }
    notifyTypeChange();
}

/** Style currently shown by the panels: editing > active type layer > default. */
export function getEditingStyle(): TextStyle {
    if (typeToolState.editing) return textEditorBridge?.getSelectionStyle() ?? typeToolState.editing.style;
    const store = getStoreRef?.();
    if (store) {
        const active = store.layers.find(l => l.id === store.activeLayerId);
        if (active && active.kind === 'type' && active.typeData) {
            return (active.typeData as TypeLayerData).style;
        }
    }
    return defaultTextStyle;
}
export function commitEditingType(text: string): void {
    if (!typeToolState.editing) return;
    const out: TypeLayerData = { ...typeToolState.editing, text };
    typeToolState.onCommit?.(out);
    typeToolState.editing = null;
    typeToolState.pendingBox = null;
    notifyTypeChange();
}

export function commitActiveEditingType(): void {
    if (!typeToolState.editing) return;
    commitEditingType(typeToolState.editing.text);
}
export function cancelEditingType(): void {
    typeToolState.pendingBox = null;
    // If we were editing an existing type layer, restore its rasterized text from typeData
    // (which we never mutated during the session).
    const editing = typeToolState.editing;
    if (editing?.targetLayerId) {
        const store = getStoreRef?.();
        const layer = store?.layers.find(l => l.id === editing.targetLayerId);
        if (layer) {
            rerenderTypeLayer(layer);
            store?.forceRender();
        }
    }
    typeToolState.onCancel?.();
    typeToolState.editing = null;
    notifyTypeChange();
}

export const defaultTextStyle: TextStyle = {
    fontFamily: 'system-ui',
    fontSize: 32,
    fontWeight: 400,
    fontStyle: 'normal',
    color: '#000000',
    letterSpacing: 0,
    lineHeight: 0,         // 0 = Auto (CSS falls back to 1.2)
    textAlign: 'left',
    scaleX: 1,
    scaleY: 1,
    baselineShift: 0,
    fauxBold: false,
    fauxItalic: false,
    allCaps: false,
    smallCaps: false,
    superscript: false,
    subscript: false,
    underline: false,
    strikethrough: false,
    antiAlias: 'crisp',
    indentLeft: 0,
    indentRight: 0,
    indentFirst: 0,
    spaceBefore: 0,
    spaceAfter: 0,
    hyphenate: false,
};

function p(e: ToolPointerEvent) { return { x: e.canvasX, y: e.canvasY }; }

interface PathSample {
    x: number;
    y: number;
    distance: number;
    angle: number;
}

function cubicAt(p0: { x: number; y: number }, p1: { x: number; y: number }, p2: { x: number; y: number }, p3: { x: number; y: number }, t: number): { x: number; y: number } {
    const u = 1 - t;
    return {
        x: u * u * u * p0.x + 3 * u * u * t * p1.x + 3 * u * t * t * p2.x + t * t * t * p3.x,
        y: u * u * u * p0.y + 3 * u * u * t * p1.y + 3 * u * t * t * p2.y + t * t * t * p3.y,
    };
}

function flattenTypePath(path: TypePathShape, samplesPerSegment = 24): PathSample[] {
    const anchors = path.anchors;
    if (anchors.length < 2) return [];
    const out: PathSample[] = [{ x: anchors[0].x, y: anchors[0].y, distance: 0, angle: 0 }];
    let distance = 0;
    const segments = path.closed ? anchors.length : anchors.length - 1;
    for (let i = 0; i < segments; i++) {
        const a = anchors[i];
        const b = anchors[(i + 1) % anchors.length];
        const c1 = a.outHandle ?? a;
        const c2 = b.inHandle ?? b;
        let prev = { x: a.x, y: a.y };
        for (let s = 1; s <= samplesPerSegment; s++) {
            const pt = cubicAt(a, c1, c2, b, s / samplesPerSegment);
            const dx = pt.x - prev.x;
            const dy = pt.y - prev.y;
            const step = Math.hypot(dx, dy);
            if (step > 0.001) {
                distance += step;
                out.push({ x: pt.x, y: pt.y, distance, angle: Math.atan2(dy, dx) });
            }
            prev = pt;
        }
    }
    if (out.length > 1) out[0].angle = out[1].angle;
    return out;
}

function samplePathAt(samples: PathSample[], distance: number): PathSample | null {
    if (samples.length === 0) return null;
    if (distance <= 0) return samples[0];
    const last = samples[samples.length - 1];
    if (distance >= last.distance) return last;
    for (let i = 1; i < samples.length; i++) {
        const a = samples[i - 1];
        const b = samples[i];
        if (distance <= b.distance) {
            const span = Math.max(0.0001, b.distance - a.distance);
            const t = (distance - a.distance) / span;
            return {
                x: a.x + (b.x - a.x) * t,
                y: a.y + (b.y - a.y) * t,
                distance,
                angle: b.angle,
            };
        }
    }
    return last;
}

function pathBounds(samples: PathSample[], pad: number): TypeBounds {
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    samples.forEach(pt => {
        minX = Math.min(minX, pt.x);
        minY = Math.min(minY, pt.y);
        maxX = Math.max(maxX, pt.x);
        maxY = Math.max(maxY, pt.y);
    });
    if (!Number.isFinite(minX)) return { x: 0, y: 0, w: 1, h: 1 };
    return {
        x: minX - pad,
        y: minY - pad,
        w: Math.max(1, maxX - minX + pad * 2),
        h: Math.max(1, maxY - minY + pad * 2),
    };
}

function boundsForTypePath(path: TypePathShape, pad: number): TypeBounds {
    return pathBounds(flattenTypePath(path), pad);
}

function traceTypePath(ctx: CanvasRenderingContext2D, path: TypePathShape): void {
    if (path.anchors.length === 0) return;
    const first = path.anchors[0];
    ctx.beginPath();
    ctx.moveTo(first.x, first.y);
    for (let i = 1; i < path.anchors.length; i++) {
        const prev = path.anchors[i - 1];
        const curr = path.anchors[i];
        const c1 = prev.outHandle ?? prev;
        const c2 = curr.inHandle ?? curr;
        ctx.bezierCurveTo(c1.x, c1.y, c2.x, c2.y, curr.x, curr.y);
    }
    if (path.closed && path.anchors.length >= 2) {
        const prev = path.anchors[path.anchors.length - 1];
        const curr = path.anchors[0];
        const c1 = prev.outHandle ?? prev;
        const c2 = curr.inHandle ?? curr;
        ctx.bezierCurveTo(c1.x, c1.y, c2.x, c2.y, curr.x, curr.y);
        ctx.closePath();
    }
}

function nearestPathDistance(path: TypePathShape, x: number, y: number): number {
    const samples = flattenTypePath(path);
    let best = samples[0]?.distance ?? 0;
    let bestD = Infinity;
    samples.forEach(sample => {
        const d = Math.hypot(sample.x - x, sample.y - y);
        if (d < bestD) {
            bestD = d;
            best = sample.distance;
        }
    });
    return best;
}

function typePathHandlePositions(data: TypeLayerData): { start: PathSample; end: PathSample } | null {
    if (data.textMode !== 'path' || !data.pathText?.path) return null;
    const samples = flattenTypePath(data.pathText.path);
    const total = samples.at(-1)?.distance ?? 0;
    if (samples.length < 2 || total <= 0) return null;
    const start = samplePathAt(samples, Math.max(0, Math.min(total, data.pathText.startOffset)));
    const end = samplePathAt(samples, Math.max(0, Math.min(total, data.pathText.endOffset ?? total)));
    return start && end ? { start, end } : null;
}

export function hitTypePathHandleAt(layers: Layer[], x: number, y: number, threshold = 8): { layer: Layer; handle: 'start' | 'end' } | null {
    for (let i = layers.length - 1; i >= 0; i--) {
        const layer = layers[i];
        if (!layer.visible || layer.kind !== 'type') continue;
        const data = layer.typeData as TypeLayerData | null;
        if (!data) continue;
        const handles = typePathHandlePositions(data);
        if (!handles) continue;
        if (Math.hypot(handles.start.x - x, handles.start.y - y) <= threshold) return { layer, handle: 'start' };
        if (Math.hypot(handles.end.x - x, handles.end.y - y) <= threshold) return { layer, handle: 'end' };
    }
    return null;
}

export function moveTypePathHandle(layer: Layer, handle: 'start' | 'end', point: { x: number; y: number }): void {
    const data = layer.typeData as TypeLayerData | null;
    if (!data?.pathText?.path) return;
    const samples = flattenTypePath(data.pathText.path);
    const total = samples.at(-1)?.distance ?? 0;
    if (samples.length < 2 || total <= 0) return;
    const distance = Math.max(0, Math.min(total, nearestPathDistance(data.pathText.path, point.x, point.y)));
    const nearest = samplePathAt(samples, distance);
    if (nearest) {
        const nx = -Math.sin(nearest.angle);
        const ny = Math.cos(nearest.angle);
        const signedSide = (point.x - nearest.x) * nx + (point.y - nearest.y) * ny;
        data.pathText.flipped = signedSide > 0;
    }
    if (handle === 'start') {
        data.pathText.startOffset = Math.min(distance, data.pathText.endOffset ?? total);
    } else {
        data.pathText.endOffset = Math.max(distance, data.pathText.startOffset);
    }
    rerenderTypeLayer(layer);
}

/** Hit-test: returns the topmost type layer whose stored bounds contain (x, y), or null. */
export function findTypeLayerAt(layers: Layer[], x: number, y: number): Layer | null {
    // Iterate top-down (reverse order) so the topmost layer wins.
    for (let i = layers.length - 1; i >= 0; i--) {
        const layer = layers[i];
        if (!layer.visible || layer.kind !== 'type') continue;
        const data = layer.typeData as TypeLayerData | null;
        if (!data?.bounds) continue;
        const b = data.bounds;
        // Rotate the test point into the layer's local frame so a rotated type
        // layer can be re-edited by clicking on its visible text rather than on
        // its axis-aligned bounding box.
        const rot = data.transform.rotation ?? 0;
        let lx = x, ly = y;
        if (rot !== 0) {
            const cx = data.transform.x;
            const cy = data.transform.y;
            const cos = Math.cos(-rot);
            const sin = Math.sin(-rot);
            const dx = x - cx;
            const dy = y - cy;
            lx = cx + dx * cos - dy * sin;
            ly = cy + dx * sin + dy * cos;
        }
        // 4-px slack so clicks just outside the text rect still re-enter edit mode.
        if (lx >= b.x - 4 && lx <= b.x + b.w + 4 && ly >= b.y - 4 && ly <= b.y + b.h + 4) return layer;
    }
    return null;
}

function makeTypeTool(id: string, label: string, orientation: TypeOrientation): Tool {
    return {
        id,
        label,
        cursor: 'text',
        onPointerDown: (e, ctx) => {
            if (e.button !== 0) return;
            const point = p(e);
            const store = ctx.getStore();

            // Click outside any contenteditable always reaches us — so if we're
            // currently editing, the user clicked outside the text → commit.
            const wasEditing = typeToolState.editing;
            if (wasEditing) {
                commitEditingType(wasEditing.text);
                return;
            }

            // Did the click land on an existing type layer? Re-enter edit mode.
            const hit = findTypeLayerAt(store.layers, point.x, point.y);
            if (hit) {
                const data = hit.typeData as TypeLayerData;
                // Clear the rasterized text on the layer so the contenteditable preview
                // is the only visible copy while editing. cancelEditingType /
                // commitEditingType will re-rasterize.
                hit.ctx.clearRect(0, 0, hit.canvas.width, hit.canvas.height);
                hit.markDirty(null);
                setEditingType({
                    ...data,
                    targetLayerId: hit.id,
                });
                store.setActiveLayer(hit.id);
                getStoreRef?.().forceRender();
                return;
            }

            const bridge = typePathBridge;
            const pathHit = bridge?.hitSegment(point.x, point.y);
            if (bridge && pathHit) {
                const path = bridge.clonePath(pathHit.path);
                const data = addImmediateTypeLayer(store, ctx.getStore, {
                    id: crypto.randomUUID(),
                    text: 'text',
                    textMode: 'path',
                    style: { ...defaultTextStyle, color: store.primaryColor },
                    orientation,
                    transform: {
                        x: pathHit.point.x,
                        y: pathHit.point.y - defaultTextStyle.fontSize,
                        width: 0,
                        height: defaultTextStyle.fontSize * 1.4,
                        rotation: 0,
                    },
                    pathText: {
                        path,
                        startOffset: nearestPathDistance(path, pathHit.point.x, pathHit.point.y),
                        flipped: false,
                    },
                });
                setEditingType(data);
                return;
            }

            const interiorHit = bridge?.hitInterior(point.x, point.y);
            if (bridge && interiorHit) {
                const path = bridge.clonePath(interiorHit.path);
                const bounds = boundsForTypePath(path, 0);
                const data = addImmediateTypeLayer(store, ctx.getStore, {
                    id: crypto.randomUUID(),
                    text: 'text',
                    textMode: 'shape',
                    style: { ...defaultTextStyle, color: store.primaryColor },
                    orientation,
                    transform: {
                        x: bounds.x,
                        y: bounds.y,
                        width: bounds.w,
                        height: bounds.h,
                        rotation: 0,
                    },
                    shapeText: { path },
                });
                setEditingType(data);
                return;
            }

            // Otherwise start a fresh text edit at the click point.
            typeToolState.pendingBox = { start: point, current: point, orientation };
            notifyTypeChange();
        },
        onPointerMove: (e, ctx) => {
            if (!typeToolState.pendingBox) return;
            typeToolState.pendingBox.current = p(e);
            notifyTypeChange();
            ctx.requestRender();
        },
        onPointerUp: (e, ctx) => {
            const pending = typeToolState.pendingBox;
            if (!pending) return;
            const point = p(e);
            const store = ctx.getStore();
            typeToolState.pendingBox = null;
            const dragged = isBoxDrag(pending.start, point);
            const rect = normalizeRect(pending.start, point);
            const data = addImmediateTypeLayer(store, ctx.getStore, {
                id: crypto.randomUUID(),
                text: 'text',
                textMode: dragged ? 'box' : 'point',
                style: { ...defaultTextStyle, color: store.primaryColor },
                orientation: pending.orientation,
                transform: dragged
                    ? {
                        x: rect.x,
                        y: rect.y,
                        width: Math.max(24, rect.width),
                        height: Math.max(defaultTextStyle.fontSize * 1.5, rect.height),
                        rotation: 0,
                    }
                    : {
                        x: pending.start.x,
                        y: pending.start.y - defaultTextStyle.fontSize,
                        width: 0,
                        height: defaultTextStyle.fontSize * 1.4,
                        rotation: 0,
                    },
            });
            setEditingType(data);
        },
        renderOverlay: (overlay) => {
            const pending = typeToolState.pendingBox;
            if (!pending || !isBoxDrag(pending.start, pending.current)) return;
            const rect = normalizeRect(pending.start, pending.current);
            const ctx = overlay.ctx;
            ctx.save();
            ctx.strokeStyle = '#ffffff';
            ctx.lineWidth = 1 / overlay.zoom;
            ctx.setLineDash([4 / overlay.zoom, 4 / overlay.zoom]);
            ctx.strokeRect(rect.x, rect.y, rect.width, rect.height);
            ctx.strokeStyle = '#111827';
            ctx.setLineDash([4 / overlay.zoom, 4 / overlay.zoom]);
            ctx.lineDashOffset = 4 / overlay.zoom;
            ctx.strokeRect(rect.x, rect.y, rect.width, rect.height);
            ctx.restore();
        },
        onKeyDown: (e) => {
            if (e.key === 'Escape') cancelEditingType();
        },
    };
}

export const horizontalTypeTool = makeTypeTool('type-horizontal', 'Horizontal Type', 'horizontal');
export const verticalTypeTool = makeTypeTool('type-vertical', 'Vertical Type', 'vertical');

registerTool(horizontalTypeTool);
registerTool(verticalTypeTool);

function applyWarpToCommittedType(ctx: CanvasRenderingContext2D, layerCanvas: HTMLCanvasElement, data: TypeLayerData): void {
    if (!data.warp || data.warp.style === 'none' || !data.bounds) return;
    const b = data.bounds;
    const margin = 4;
    const x0 = Math.max(0, Math.floor(b.x - margin));
    const y0 = Math.max(0, Math.floor(b.y - margin));
    const w = Math.min(layerCanvas.width - x0, Math.ceil(b.w + margin * 2));
    const h = Math.min(layerCanvas.height - y0, Math.ceil(b.h + margin * 2));
    if (w <= 0 || h <= 0) return;
    const snap = document.createElement('canvas');
    snap.width = w;
    snap.height = h;
    const snapCtx = snap.getContext('2d');
    if (!snapCtx) return;
    snapCtx.drawImage(layerCanvas, x0, y0, w, h, 0, 0, w, h);
    ctx.clearRect(x0, y0, w, h);
    applyTextWarp(ctx, snap, data.warp, { x: x0, y: y0, w, h });
}

/**
 * Rasterize a type layer's text onto its layer canvas. Clears any previously
 * rasterized text first, then writes the new text and updates `data.bounds` so
 * subsequent hit-tests know where the text actually is.
 */
export function commitTypeLayer(layerCanvas: HTMLCanvasElement, data: TypeLayerData): void {
    const ctx = layerCanvas.getContext('2d');
    if (!ctx) return;
    // 1. Clear the layer first — re-rasterizing from a stale canvas would otherwise
    //    leave ghost pixels of the previous text.
    ctx.clearRect(0, 0, layerCanvas.width, layerCanvas.height);

    const base = data.style;
    const lineH = base.lineHeight === 0 ? 1.2 : base.lineHeight;
    ctx.save();
    // Anti-alias rendering hint mapped to Canvas2D capabilities:
    //   none   — no smoothing (pixelated)
    //   sharp  — geometric precision, no smoothing
    //   crisp  — default (smooth)
    //   strong — optimizeLegibility
    //   smooth — optimizeQuality
    const aa = base.antiAlias ?? 'crisp';
    if (aa === 'none') {
        ctx.imageSmoothingEnabled = false;
    } else {
        ctx.imageSmoothingEnabled = true;
    }
    const textCtx = ctx as CanvasRenderingContext2D & { textRendering?: string };
    if (aa === 'sharp') textCtx.textRendering = 'geometricPrecision';
    else if (aa === 'strong') textCtx.textRendering = 'optimizeLegibility';
    else if (aa === 'smooth') textCtx.textRendering = 'optimizeSpeed';
    else textCtx.textRendering = 'auto';
    const lineStep = base.fontSize * lineH;
    if (data.textMode === 'shape' && data.shapeText?.path) {
        const b = boundsForTypePath(data.shapeText.path, 0);
        data.transform = { ...data.transform, x: b.x, y: b.y, width: b.w, height: b.h };
        ctx.save();
        traceTypePath(ctx, data.shapeText.path);
        ctx.clip();
        ctx.textBaseline = 'top';
        ctx.fillStyle = base.color;
        const words = data.text.split(/(\s+)/);
        let x = b.x + base.indentLeft + base.indentFirst;
        let y = b.y + base.spaceBefore - base.baselineShift;
        const maxX = b.x + b.w - base.indentRight;
        const drawToken = (token: string, index: number) => {
            const s = styleAtOffset(data, Math.min(data.text.length - 1, index));
            const out = s.allCaps ? token.toUpperCase() : token;
            const weight = s.fauxBold ? 700 : s.fontWeight;
            const fontStyleStr = s.fauxItalic || s.fontStyle === 'italic' ? 'italic' : 'normal';
            ctx.font = `${fontStyleStr} ${weight} ${s.fontSize}px ${s.fontFamily}`;
            ctx.fillStyle = s.color;
            const tracking = (s.letterSpacing / 1000) * s.fontSize;
            (ctx as CanvasRenderingContext2D & { letterSpacing?: string }).letterSpacing = `${tracking}px`;
            const w = ctx.measureText(out).width + tracking * out.length;
            if (x > b.x + base.indentLeft && x + w > maxX && !/^\s+$/.test(token)) {
                x = b.x + base.indentLeft;
                y += lineStep;
            }
            if (y + s.fontSize <= b.y + b.h - base.spaceAfter) {
                ctx.fillText(out, x, y - s.baselineShift);
                if (s.fauxBold) ctx.fillText(out, x + 0.5, y - s.baselineShift);
            }
            x += w;
        };
        let offset = 0;
        words.forEach(token => {
            if (token.includes('\n')) {
                token.split(/(\n)/).forEach(part => {
                    if (part === '\n') {
                        x = b.x + base.indentLeft;
                        y += lineStep;
                        offset++;
                    } else if (part) {
                        drawToken(part, offset);
                        offset += part.length;
                    }
                });
                return;
            }
            drawToken(token, offset);
            offset += token.length;
        });
        ctx.restore();
        data.bounds = { x: b.x, y: b.y, w: b.w, h: b.h };
        ctx.restore();
        applyWarpToCommittedType(ctx, layerCanvas, data);
        return;
    }
    if (data.textMode === 'path' && data.pathText?.path) {
        const samples = flattenTypePath(data.pathText.path);
        const totalLength = samples.at(-1)?.distance ?? 0;
        if (samples.length > 1 && totalLength > 0) {
            let cursor = Math.max(0, Math.min(totalLength, data.pathText.startOffset));
            const maxDistance = Math.min(totalLength, data.pathText.endOffset ?? totalLength);
            for (let i = 0; i < data.text.length; i++) {
                const raw = data.text[i];
                if (raw === '\n') continue;
                const s = styleAtOffset(data, i);
                const ch = s.allCaps ? raw.toUpperCase() : raw;
                const weight = s.fauxBold ? 700 : s.fontWeight;
                const fontStyleStr = s.fauxItalic || s.fontStyle === 'italic' ? 'italic' : 'normal';
                ctx.font = `${fontStyleStr} ${weight} ${s.fontSize}px ${s.fontFamily}`;
                ctx.fillStyle = s.color;
                const tracking = (s.letterSpacing / 1000) * s.fontSize;
                (ctx as CanvasRenderingContext2D & { letterSpacing?: string }).letterSpacing = `${tracking}px`;
                const advance = ctx.measureText(ch).width + tracking;
                const centerDistance = cursor + advance / 2;
                if (centerDistance > maxDistance) break;
                const sample = samplePathAt(samples, centerDistance);
                if (!sample) break;
                const normalOffset = (data.pathText.flipped ? 1 : -1) * (s.baselineShift || 0);
                const angle = sample.angle + (data.pathText.flipped ? Math.PI : 0);
                ctx.save();
                ctx.translate(
                    sample.x + Math.cos(angle - Math.PI / 2) * normalOffset,
                    sample.y + Math.sin(angle - Math.PI / 2) * normalOffset,
                );
                ctx.rotate(angle);
                ctx.textBaseline = 'alphabetic';
                ctx.fillText(ch, -advance / 2, 0);
                if (s.fauxBold) ctx.fillText(ch, -advance / 2 + 0.5, 0);
                if (s.underline) ctx.fillRect(-advance / 2, s.fontSize * 0.1, Math.max(1, advance), Math.max(1, s.fontSize / 16));
                if (s.strikethrough) ctx.fillRect(-advance / 2, -s.fontSize * 0.3, Math.max(1, advance), Math.max(1, s.fontSize / 16));
                ctx.restore();
                cursor += advance;
            }
            data.bounds = pathBounds(samples, Math.max(base.fontSize, lineStep));
        } else {
            data.bounds = { x: data.transform.x, y: data.transform.y, w: 1, h: Math.max(1, base.fontSize) };
        }
        ctx.restore();
        applyWarpToCommittedType(ctx, layerCanvas, data);
        return;
    }
    ctx.translate(data.transform.x, data.transform.y);
    ctx.rotate(data.transform.rotation);
    ctx.scale(base.scaleX, base.scaleY);
    ctx.textBaseline = 'top';

    let maxLineWidth = 0;
    let lineCount = 1;

    if (data.orientation === 'horizontal') {
        let x = base.indentLeft + base.indentFirst;
        let y = base.spaceBefore - base.baselineShift;
        for (let i = 0; i < data.text.length; i++) {
            const raw = data.text[i];
            if (raw === '\n') {
                maxLineWidth = Math.max(maxLineWidth, x);
                lineCount++;
                x = base.indentLeft;
                y = base.spaceBefore + (lineCount - 1) * lineStep - base.baselineShift;
                continue;
            }
            const s = styleAtOffset(data, i);
            const ch = s.allCaps ? raw.toUpperCase() : raw;
            const weight = s.fauxBold ? 700 : s.fontWeight;
            const fontStyleStr = s.fauxItalic || s.fontStyle === 'italic' ? 'italic' : 'normal';
            ctx.font = `${fontStyleStr} ${weight} ${s.fontSize}px ${s.fontFamily}`;
            ctx.fillStyle = s.color;
            const tracking = (s.letterSpacing / 1000) * s.fontSize;
            (ctx as CanvasRenderingContext2D & { letterSpacing?: string }).letterSpacing = `${tracking}px`;
            let charY = y - s.baselineShift;
            if (s.superscript) charY -= s.fontSize * 0.35;
            if (s.subscript) charY += s.fontSize * 0.25;
            // Faux italic: apply a horizontal skew so the glyph slants even if
            // the font lacks an italic variant.
            const useSkew = s.fauxItalic && s.fontStyle !== 'italic';
            if (useSkew) {
                ctx.save();
                ctx.transform(1, 0, -0.2, 1, x + 0.2 * charY, 0);
                ctx.fillText(ch, 0, charY);
                ctx.restore();
            } else {
                ctx.fillText(ch, x, charY);
            }
            // Faux bold: re-stroke at +1px offset to thicken the glyph if the
            // font lacks a 700-weight variant. Cheap and visually adequate.
            if (s.fauxBold) {
                if (useSkew) {
                    ctx.save();
                    ctx.transform(1, 0, -0.2, 1, x + 0.2 * charY + 0.5, 0);
                    ctx.fillText(ch, 0, charY);
                    ctx.restore();
                } else {
                    ctx.fillText(ch, x + 0.5, charY);
                }
            }
            const w = ctx.measureText(ch).width + tracking;
            if (s.underline) ctx.fillRect(x, charY + s.fontSize * 0.95, Math.max(1, w), Math.max(1, s.fontSize / 16));
            if (s.strikethrough) ctx.fillRect(x, charY + s.fontSize * 0.55, Math.max(1, w), Math.max(1, s.fontSize / 16));
            x += w;
            maxLineWidth = Math.max(maxLineWidth, x);
        }
    } else {
        // Vertical type: stack glyphs top-to-bottom inside each column, walking
        // characters by their *measured* advance so wide chars (M) occupy more
        // vertical space than narrow ones (i). Baseline shift / superscript /
        // subscript become a horizontal offset (across the writing direction)
        // in vertical mode. Columns wrap on '\n'.
        const columnStep = base.fontSize * 1.2;
        let lineIdx = 0;
        let cumulativeAdvance = 0;
        let maxColumnAdvance = 0;
        for (let i = 0; i < data.text.length; i++) {
            const raw = data.text[i];
            if (raw === '\n') {
                maxColumnAdvance = Math.max(maxColumnAdvance, cumulativeAdvance);
                lineIdx++;
                cumulativeAdvance = 0;
                continue;
            }
            const s = styleAtOffset(data, i);
            const ch = s.allCaps ? raw.toUpperCase() : raw;
            const weight = s.fauxBold ? 700 : s.fontWeight;
            const fontStyleStr = s.fauxItalic || s.fontStyle === 'italic' ? 'italic' : 'normal';
            ctx.font = `${fontStyleStr} ${weight} ${s.fontSize}px ${s.fontFamily}`;
            ctx.fillStyle = s.color;
            const tracking = (s.letterSpacing / 1000) * s.fontSize;
            (ctx as CanvasRenderingContext2D & { letterSpacing?: string }).letterSpacing = `${tracking}px`;
            const advance = ctx.measureText(ch).width + tracking;
            let charX = lineIdx * columnStep - s.baselineShift;
            if (s.superscript) charX -= s.fontSize * 0.35;
            if (s.subscript) charX += s.fontSize * 0.25;
            const charY = cumulativeAdvance;
            ctx.fillText(ch, charX, charY);
            if (s.fauxBold) ctx.fillText(ch, charX + 0.5, charY);
            if (s.underline) ctx.fillRect(charX, charY + s.fontSize * 0.95, Math.max(1, advance), Math.max(1, s.fontSize / 16));
            if (s.strikethrough) ctx.fillRect(charX, charY + s.fontSize * 0.55, Math.max(1, advance), Math.max(1, s.fontSize / 16));
            cumulativeAdvance += advance;
        }
        maxColumnAdvance = Math.max(maxColumnAdvance, cumulativeAdvance);
        lineCount = Math.max(1, Math.ceil(maxColumnAdvance / Math.max(1, lineStep)));
        maxLineWidth = (lineIdx + 1) * columnStep;
    }
    ctx.restore();

    // Untransformed bounds: place at the layer's transform offset; account for scale.
    data.bounds = {
        x: data.transform.x,
        y: data.transform.y,
        w: Math.max(maxLineWidth, 1) * base.scaleX,
        h: Math.max(lineCount * lineStep + base.spaceBefore + base.spaceAfter, base.fontSize) * base.scaleY,
    };

    // Warp Text: snapshot the rasterized glyphs, clear, and re-apply through
    // the warp displacement function. Skipped when warp is unset or style='none'.
    applyWarpToCommittedType(ctx, layerCanvas, data);
}


/** Re-rasterize a type layer in-place from its stored typeData (used after panel edits). */
export function rerenderTypeLayer(layer: Layer): void {
    const data = layer.typeData as TypeLayerData | null;
    if (!data) return;
    const original = data.style.fontFamily;
    const { resolved, isFallback } = resolveFontFamily(original);
    if (isFallback) {
        if (shouldEmitFallbackToast(layer.id) && typeToastBridge) {
            typeToastBridge(`Missing font '${original}' replaced with sans-serif`, 'info');
        }
        const patched: TypeLayerData = { ...data, style: { ...data.style, fontFamily: resolved } };
        commitTypeLayer(layer.canvas, patched);
    } else {
        commitTypeLayer(layer.canvas, data);
    }
    layer.markDirty(null);
}
