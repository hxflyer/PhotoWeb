import type { Tool, ToolPointerEvent } from './Tool';
import { registerTool } from './registry';
import type { TextStyle } from '../components/Canvas/TextEditOverlay';
import type { Layer } from '../core/Layer';

export type TypeOrientation = 'horizontal' | 'vertical';
export type TypeTextMode = 'point' | 'box';

export interface TypeBounds { x: number; y: number; w: number; h: number }

export interface TypeStyleRun {
    start: number;
    end: number;
    style: Partial<TextStyle>;
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
    indentLeft: 0,
    indentRight: 0,
    indentFirst: 0,
    spaceBefore: 0,
    spaceAfter: 0,
    hyphenate: false,
};

function p(e: ToolPointerEvent) { return { x: e.canvasX, y: e.canvasY }; }

/** Hit-test: returns the topmost type layer whose stored bounds contain (x, y), or null. */
export function findTypeLayerAt(layers: Layer[], x: number, y: number): Layer | null {
    // Iterate top-down (reverse order) so the topmost layer wins.
    for (let i = layers.length - 1; i >= 0; i--) {
        const layer = layers[i];
        if (!layer.visible || layer.kind !== 'type') continue;
        const data = layer.typeData as TypeLayerData | null;
        if (!data?.bounds) continue;
        const b = data.bounds;
        // 4-px slack so clicks just outside the text rect still re-enter edit mode.
        if (x >= b.x - 4 && x <= b.x + b.w + 4 && y >= b.y - 4 && y <= b.y + b.h + 4) return layer;
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
    ctx.translate(data.transform.x, data.transform.y);
    ctx.rotate(data.transform.rotation);
    ctx.scale(base.scaleX, base.scaleY);
    ctx.textBaseline = 'top';
    const lineStep = base.fontSize * lineH;

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
            ctx.fillText(ch, x, charY);
            const w = ctx.measureText(ch).width + tracking;
            if (s.underline) ctx.fillRect(x, charY + s.fontSize * 0.95, Math.max(1, w), Math.max(1, s.fontSize / 16));
            if (s.strikethrough) ctx.fillRect(x, charY + s.fontSize * 0.55, Math.max(1, w), Math.max(1, s.fontSize / 16));
            x += w;
            maxLineWidth = Math.max(maxLineWidth, x);
        }
    } else {
        const text = base.allCaps ? data.text.toUpperCase() : data.text;
        const lines = text.split('\n');
        lineCount = Math.max(...lines.map(l => l.length || 1));
        lines.forEach((line, lineIdx) => {
            line.split('').forEach((ch, i) => {
                const s = styleAtOffset(data, i);
                const weight = s.fauxBold ? 700 : s.fontWeight;
                const fontStyleStr = s.fauxItalic || s.fontStyle === 'italic' ? 'italic' : 'normal';
                ctx.font = `${fontStyleStr} ${weight} ${s.fontSize}px ${s.fontFamily}`;
                ctx.fillStyle = s.color;
                ctx.fillText(ch, lineIdx * s.fontSize * 1.2, i * lineStep);
            });
            maxLineWidth = Math.max(maxLineWidth, (lineIdx + 1) * base.fontSize * 1.2);
        });
    }
    ctx.restore();

    // Untransformed bounds: place at the layer's transform offset; account for scale.
    data.bounds = {
        x: data.transform.x,
        y: data.transform.y,
        w: Math.max(maxLineWidth, 1) * base.scaleX,
        h: Math.max(lineCount * lineStep + base.spaceBefore + base.spaceAfter, base.fontSize) * base.scaleY,
    };
}

/** Re-rasterize a type layer in-place from its stored typeData (used after panel edits). */
export function rerenderTypeLayer(layer: Layer): void {
    const data = layer.typeData as TypeLayerData | null;
    if (!data) return;
    commitTypeLayer(layer.canvas, data);
    layer.markDirty(null);
}
