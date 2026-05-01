import type { DirtyRect, Layer } from './Layer';

export type HistoryActionKind =
    | 'pixel'
    | 'layer-add'
    | 'layer-remove'
    | 'layer-reorder'
    | 'layer-property'
    | 'selection'
    | 'transform'
    | 'snapshot';

export interface HistoryActionBase {
    kind: HistoryActionKind;
    label: string;
    params?: Record<string, unknown>;
    layerId?: string;
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
    kind: Exclude<HistoryActionKind, 'pixel' | 'snapshot'>;
    apply: () => void;
    revert: () => void;
}

export type HistoryAction = PixelHistoryAction | SnapshotHistoryAction | GenericHistoryAction;

export interface SerializedDocumentSnapshot {
    layers: Array<{
        id: string;
        name: string;
        visible: boolean;
        opacity: number;
        blendMode: GlobalCompositeOperation;
        kind: string;
        imageData: ImageData;
    }>;
    activeLayerId: string | null;
}

export interface HistoryEntry {
    action: HistoryAction;
    id: string;
}

export class HistoryStack {
    private undoStack: HistoryEntry[] = [];
    private redoStack: HistoryEntry[] = [];
    private listeners = new Set<() => void>();
    maxSize = 50;

    commit(action: HistoryAction): HistoryEntry {
        const entry: HistoryEntry = { action, id: crypto.randomUUID() };
        this.undoStack.push(entry);
        if (this.undoStack.length > this.maxSize) {
            this.undoStack.shift();
        }
        this.redoStack.length = 0;
        this.notify();
        return entry;
    }

    canUndo(): boolean {
        return this.undoStack.length > 0;
    }

    canRedo(): boolean {
        return this.redoStack.length > 0;
    }

    undo(getLayerById: (id: string) => Layer | undefined): HistoryEntry | null {
        const entry = this.undoStack.pop();
        if (!entry) return null;
        revertAction(entry.action, getLayerById);
        this.redoStack.push(entry);
        this.notify();
        return entry;
    }

    redo(getLayerById: (id: string) => Layer | undefined): HistoryEntry | null {
        const entry = this.redoStack.pop();
        if (!entry) return null;
        applyAction(entry.action, getLayerById);
        this.undoStack.push(entry);
        this.notify();
        return entry;
    }

    states(): HistoryEntry[] {
        return [...this.undoStack];
    }

    clear(): void {
        this.undoStack = [];
        this.redoStack = [];
        this.notify();
    }

    subscribe(fn: () => void): () => void {
        this.listeners.add(fn);
        return () => this.listeners.delete(fn);
    }

    private notify(): void {
        this.listeners.forEach(fn => fn());
    }
}

function applyAction(action: HistoryAction, getLayerById: (id: string) => Layer | undefined): void {
    if (action.kind === 'pixel') {
        const layer = getLayerById(action.layerId);
        if (!layer) return;
        layer.ctx.putImageData(action.afterBuffer, action.dirtyRect.x, action.dirtyRect.y);
        layer.markDirty(action.dirtyRect);
    } else if (action.kind === 'snapshot') {
        // Snapshot apply is handled by the historySlice — revert/apply identical.
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
    } else {
        action.revert();
    }
}

export const globalHistory = new HistoryStack();

export function captureLayerRegion(layer: Layer, rect: DirtyRect): ImageData {
    return layer.ctx.getImageData(rect.x, rect.y, rect.width, rect.height);
}

export function commitPixelAction(
    layer: Layer,
    rect: DirtyRect,
    before: ImageData,
    label: string,
): HistoryEntry {
    const after = captureLayerRegion(layer, rect);
    return globalHistory.commit({
        kind: 'pixel',
        label,
        layerId: layer.id,
        dirtyRect: rect,
        beforeBuffer: before,
        afterBuffer: after,
        timestamp: Date.now(),
    });
}
