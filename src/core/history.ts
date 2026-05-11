import type { DirtyRect, Layer, LayerColorTag, LayerEffect, LayerKind, LayerLocks, LayerTransform } from './Layer';

export type HistoryActionKind =
    | 'pixel'
    | 'layer-add'
    | 'layer-remove'
    | 'layer-reorder'
    | 'layer-property'
    | 'selection'
    | 'transform'
    | 'compound'
    | 'snapshot';

export interface HistoryActionBase {
    kind: HistoryActionKind;
    label: string;
    params?: Record<string, unknown>;
    layerId?: string;
    affectedIds?: string[];
    dirtyRect?: DirtyRect | null;
    timestamp: number;
}

export interface PixelHistoryAction extends HistoryActionBase {
    kind: 'pixel';
    layerId: string;
    dirtyRect: DirtyRect;
    beforeBuffer: ImageData;
    afterBuffer: ImageData;
}

export interface SnapshotHistoryAction extends HistoryActionBase {
    kind: 'snapshot';
    snapshot: SerializedDocumentSnapshot;
}

export interface GenericHistoryAction extends HistoryActionBase {
    kind: Exclude<HistoryActionKind, 'pixel' | 'snapshot' | 'compound'>;
    apply: () => void;
    revert: () => void;
}

export interface CompoundHistoryAction extends HistoryActionBase {
    kind: 'compound';
    actions: GenericHistoryAction[];
    apply: () => void;
    revert: () => void;
}

export type HistoryAction = PixelHistoryAction | SnapshotHistoryAction | GenericHistoryAction | CompoundHistoryAction;

export interface HistoryCommandOptions {
    kind: GenericHistoryAction['kind'];
    label: string;
    apply: () => void;
    revert: () => void;
    affectedIds?: string[];
    layerId?: string;
    dirtyRect?: DirtyRect | null;
    params?: Record<string, unknown>;
    timestamp?: number;
}

export interface CompoundHistoryCommandOptions {
    label: string;
    actions: GenericHistoryAction[];
    affectedIds?: string[];
    dirtyRect?: DirtyRect | null;
    params?: Record<string, unknown>;
    timestamp?: number;
}

export interface SerializedDocumentSnapshot {
    width?: number;
    height?: number;
    selection?: unknown;
    quickMaskMode?: boolean;
    selectedLayerIds?: string[];
    layerSelectionAnchorId?: string | null;
    layers: Array<{
        id: string;
        name: string;
        visible: boolean;
        opacity: number;
        fill: number;
        blendMode: GlobalCompositeOperation;
        kind: LayerKind;
        transform: LayerTransform;
        effects: LayerEffect[];
        locks: LayerLocks;
        colorTag: LayerColorTag;
        dirtyRect: DirtyRect | null;
        parentId: string | null;
        expanded: boolean;
        typeData: unknown;
        mask: {
            imageData: ImageData;
            enabled: boolean;
            linked: boolean;
        } | null;
        adjustment?: { id: string; params: Record<string, unknown> };
        fillData?: unknown;
        imageData: ImageData;
    }>;
    activeLayerId: string | null;
}

export interface DocumentHistoryCommandOptions {
    kind: GenericHistoryAction['kind'];
    label: string;
    run: () => void;
    affectedIds?: string[];
    layerId?: string;
    dirtyRect?: DirtyRect | null;
    params?: Record<string, unknown>;
    timestamp?: number;
}

export interface HistoryEntry {
    action: HistoryAction;
    id: string;
}

export class HistoryStack {
    private timeline: HistoryEntry[] = [];
    private cursor = -1;
    private listeners = new Set<() => void>();
    private maxSize = 50;

    commit(action: HistoryAction): HistoryEntry {
        const entry: HistoryEntry = { action, id: crypto.randomUUID() };
        if (this.cursor < this.timeline.length - 1) {
            this.timeline = this.timeline.slice(0, this.cursor + 1);
        }
        this.timeline.push(entry);
        this.cursor = this.timeline.length - 1;
        this.pruneToMaxSize();
        this.notify();
        return entry;
    }

    canUndo(): boolean {
        return this.cursor >= 0;
    }

    canRedo(): boolean {
        return this.cursor < this.timeline.length - 1;
    }

    undo(getLayerById: (id: string) => Layer | undefined): HistoryEntry | null {
        const entry = this.timeline[this.cursor];
        if (!entry) return null;
        revertAction(entry.action, getLayerById);
        this.cursor -= 1;
        this.notify();
        return entry;
    }

    redo(getLayerById: (id: string) => Layer | undefined): HistoryEntry | null {
        const entry = this.timeline[this.cursor + 1];
        if (!entry) return null;
        applyAction(entry.action, getLayerById);
        this.cursor += 1;
        this.notify();
        return entry;
    }

    states(): HistoryEntry[] {
        return [...this.timeline];
    }

    currentIndex(): number {
        return this.cursor;
    }

    getMaxSize(): number {
        return this.maxSize;
    }

    setMaxSize(maxSize: number): void {
        this.maxSize = normalizeHistoryMaxSize(maxSize);
        this.pruneToMaxSize();
        this.notify();
    }

    clear(): void {
        this.timeline = [];
        this.cursor = -1;
        this.notify();
    }

    subscribe(fn: () => void): () => void {
        this.listeners.add(fn);
        return () => this.listeners.delete(fn);
    }

    private notify(): void {
        this.listeners.forEach(fn => fn());
    }

    private pruneToMaxSize(): void {
        if (this.timeline.length <= this.maxSize) return;
        const removed = this.timeline.length - this.maxSize;
        this.timeline = this.timeline.slice(removed);
        this.cursor = Math.max(-1, this.cursor - removed);
    }
}

function normalizeHistoryMaxSize(maxSize: number): number {
    if (!Number.isFinite(maxSize)) return 50;
    return Math.max(1, Math.floor(maxSize));
}

function applyAction(action: HistoryAction, getLayerById: (id: string) => Layer | undefined): void {
    if (action.kind === 'pixel') {
        const layer = getLayerById(action.layerId);
        if (!layer) return;
        layer.ctx.putImageData(action.afterBuffer, action.dirtyRect.x, action.dirtyRect.y);
        layer.markDirty(action.dirtyRect);
    } else if (action.kind === 'snapshot') {
        // Snapshot apply is handled by the historySlice — revert/apply identical.
    } else if (action.kind === 'compound') {
        action.apply();
    } else {
        action.apply();
    }
}

function revertAction(action: HistoryAction, getLayerById: (id: string) => Layer | undefined): void {
    if (action.kind === 'pixel') {
        const layer = getLayerById(action.layerId);
        if (!layer) return;
        layer.ctx.putImageData(action.beforeBuffer, action.dirtyRect.x, action.dirtyRect.y);
        layer.markDirty(action.dirtyRect);
    } else if (action.kind === 'snapshot') {
        // Snapshot revert handled by historySlice.
    } else if (action.kind === 'compound') {
        action.revert();
    } else {
        action.revert();
    }
}

export const globalHistory = new HistoryStack();

export function captureLayerRegion(layer: Layer, rect: DirtyRect): ImageData {
    return layer.ctx.getImageData(rect.x, rect.y, rect.width, rect.height);
}

export function cropImageData(src: ImageData, x: number, y: number, w: number, h: number): ImageData {
    const out = new ImageData(w, h);
    const sd = src.data;
    const od = out.data;
    const srcW = src.width;
    for (let row = 0; row < h; row++) {
        const sOff = ((y + row) * srcW + x) * 4;
        const dOff = row * w * 4;
        od.set(sd.subarray(sOff, sOff + w * 4), dOff);
    }
    return out;
}

export interface StrokeBounds {
    minX: number;
    minY: number;
    maxX: number;
    maxY: number;
}

export function makeStrokeBounds(): StrokeBounds {
    return { minX: Infinity, minY: Infinity, maxX: -Infinity, maxY: -Infinity };
}

export function expandStrokeBounds(b: StrokeBounds, x: number, y: number, radius: number): void {
    if (x - radius < b.minX) b.minX = x - radius;
    if (y - radius < b.minY) b.minY = y - radius;
    if (x + radius > b.maxX) b.maxX = x + radius;
    if (y + radius > b.maxY) b.maxY = y + radius;
}

export function strokeBoundsToRect(b: StrokeBounds, canvasW: number, canvasH: number): DirtyRect | null {
    if (!isFinite(b.minX)) return null;
    const x = Math.max(0, Math.floor(b.minX));
    const y = Math.max(0, Math.floor(b.minY));
    const right = Math.min(canvasW, Math.ceil(b.maxX));
    const bottom = Math.min(canvasH, Math.ceil(b.maxY));
    const width = right - x;
    const height = bottom - y;
    if (width <= 0 || height <= 0) return null;
    return { x, y, width, height };
}

export function createCommandAction(options: HistoryCommandOptions): GenericHistoryAction {
    return {
        kind: options.kind,
        label: options.label,
        apply: options.apply,
        revert: options.revert,
        affectedIds: options.affectedIds,
        layerId: options.layerId,
        dirtyRect: options.dirtyRect,
        params: options.params,
        timestamp: options.timestamp ?? Date.now(),
    };
}

export function createCompoundHistoryAction(options: CompoundHistoryCommandOptions): CompoundHistoryAction {
    const affectedIds = options.affectedIds ?? Array.from(new Set(options.actions.flatMap(action => action.affectedIds ?? [])));
    return {
        kind: 'compound',
        label: options.label,
        actions: options.actions,
        affectedIds,
        dirtyRect: options.dirtyRect,
        params: options.params,
        timestamp: options.timestamp ?? Date.now(),
        apply: () => {
            options.actions.forEach(action => action.apply());
        },
        revert: () => {
            [...options.actions].reverse().forEach(action => action.revert());
        },
    };
}

export function createPixelHistoryAction(
    layer: Layer,
    rect: DirtyRect,
    before: ImageData,
    label: string,
): PixelHistoryAction {
    return {
        kind: 'pixel',
        label,
        layerId: layer.id,
        dirtyRect: rect,
        beforeBuffer: before,
        afterBuffer: captureLayerRegion(layer, rect),
        timestamp: Date.now(),
    };
}

export function commitPixelAction(
    layer: Layer,
    rect: DirtyRect,
    before: ImageData,
    label: string,
): HistoryEntry {
    return globalHistory.commit(createPixelHistoryAction(layer, rect, before, label));
}

/**
 * Mask pixel-paint history entry. Layer masks are stored on layer.mask.canvas,
 * which is a side channel not covered by PixelHistoryAction's layer.ctx restore.
 * This wraps a generic command-action with apply/revert closures that putImageData
 * onto the mask context, so undo/redo round-trips brush/eraser strokes targeted
 * at masks.
 */
export function createMaskPixelHistoryAction(
    layer: Layer,
    before: ImageData,
    after: ImageData,
    label: string,
): GenericHistoryAction {
    const layerId = layer.id;
    return {
        kind: 'layer-property',
        label,
        layerId,
        timestamp: Date.now(),
        apply: () => {
            if (!layer.mask) return;
            layer.mask.ctx.putImageData(after, 0, 0);
            layer.markDirty(null);
        },
        revert: () => {
            if (!layer.mask) return;
            layer.mask.ctx.putImageData(before, 0, 0);
            layer.markDirty(null);
        },
    };
}
