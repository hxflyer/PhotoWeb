import type { StateCreator } from 'zustand';
import { Layer } from '../core/Layer';
import {
    createCommandAction,
    globalHistory,
    type CompoundHistoryAction,
    type DocumentHistoryCommandOptions,
    type GenericHistoryAction,
    type HistoryAction,
    type HistoryEntry,
    type SerializedDocumentSnapshot,
} from '../core/history';
import { normalizeBlendMode } from '../core/blendModes';
import type { EditorStore, HistorySlice } from './types';

interface LayerSnapshotExtras extends Layer {
    adjustment?: { id: string; params: Record<string, unknown> };
    fillData?: unknown;
}

function cloneValue<T>(value: T): T {
    if (value === null || value === undefined) return value;
    if (typeof structuredClone === 'function') return structuredClone(value);
    return JSON.parse(JSON.stringify(value)) as T;
}

function captureDocumentSnapshot(state: EditorStore): SerializedDocumentSnapshot {
        return {
            width: state.width,
            height: state.height,
            resolution: state.resolution,
            selection: cloneValue(state.selection),
        quickMaskMode: state.quickMaskMode,
        selectedLayerIds: [...state.selectedLayerIds],
        layerSelectionAnchorId: state.layerSelectionAnchorId,
        layers: state.layers.map(layer => {
            const layerWithExtras = layer as LayerSnapshotExtras;
            return {
                id: layer.id,
                name: layer.name,
                visible: layer.visible,
                opacity: layer.opacity,
                fill: layer.fill,
                blendMode: layer.blendMode,
                kind: layer.kind,
                transform: cloneValue(layer.transform),
                effects: cloneValue(layer.effects),
                locks: cloneValue(layer.locks),
                colorTag: layer.colorTag,
                dirtyRect: layer.dirtyRect ? { ...layer.dirtyRect } : null,
                parentId: layer.parentId,
                expanded: layer.expanded,
                isBackground: layer.isBackground,
                clippedToBelow: layer.clippedToBelow,
                typeData: cloneValue(layer.typeData),
                shapeData: cloneValue(layer.shapeData),
                mask: layer.mask
                    ? {
                        imageData: layer.mask.ctx.getImageData(0, 0, layer.mask.canvas.width, layer.mask.canvas.height),
                        enabled: layer.mask.enabled,
                        linked: layer.mask.linked,
                    }
                    : null,
                adjustment: layerWithExtras.adjustment ? cloneValue(layerWithExtras.adjustment) : undefined,
                fillData: layerWithExtras.fillData ? cloneValue(layerWithExtras.fillData) : undefined,
                imageData: layer.ctx.getImageData(0, 0, layer.canvas.width, layer.canvas.height),
            };
        }),
        activeLayerId: state.activeLayerId,
    };
}

function restoreDocumentSnapshot(snapshot: SerializedDocumentSnapshot): Partial<Pick<EditorStore, 'width' | 'height' | 'resolution' | 'selection' | 'quickMaskMode' | 'selectedLayerIds' | 'layerSelectionAnchorId' | 'layers' | 'activeLayerId'>> {
    const layers = snapshot.layers.map(data => {
        const layer = new Layer(data.imageData.width, data.imageData.height, data.name, data.kind) as LayerSnapshotExtras;
        layer.id = data.id;
        layer.visible = data.visible;
        layer.opacity = data.opacity;
        layer.fill = data.fill;
        layer.blendMode = normalizeBlendMode(data.blendMode);
        layer.transform = cloneValue(data.transform);
        layer.effects = cloneValue(data.effects);
        layer.locks = cloneValue(data.locks);
        layer.colorTag = data.colorTag;
        layer.parentId = data.parentId;
        layer.expanded = data.expanded;
        layer.isBackground = data.isBackground;
        layer.clippedToBelow = data.clippedToBelow;
        layer.typeData = cloneValue(data.typeData);
        layer.shapeData = cloneValue(data.shapeData);
        layer.ctx.putImageData(data.imageData, 0, 0);
        layer.dirtyRect = data.dirtyRect ? { ...data.dirtyRect } : null;
        if (data.mask) {
            const maskCanvas = document.createElement('canvas');
            maskCanvas.width = data.mask.imageData.width;
            maskCanvas.height = data.mask.imageData.height;
            const maskCtx = maskCanvas.getContext('2d');
            if (!maskCtx) throw new Error('Could not get 2D context for restored layer mask');
            maskCtx.putImageData(data.mask.imageData, 0, 0);
            layer.mask = {
                canvas: maskCanvas,
                ctx: maskCtx,
                enabled: data.mask.enabled,
                linked: data.mask.linked,
            };
        }
        if (data.adjustment) layer.adjustment = cloneValue(data.adjustment);
        if (data.fillData) layer.fillData = cloneValue(data.fillData);
        layer.markDirty(null);
        return layer;
    });
        return {
        ...(snapshot.width !== undefined ? { width: snapshot.width } : {}),
        ...(snapshot.height !== undefined ? { height: snapshot.height } : {}),
        ...(snapshot.resolution !== undefined ? { resolution: snapshot.resolution } : {}),
        ...(snapshot.selection ? { selection: cloneValue(snapshot.selection) as EditorStore['selection'] } : {}),
        ...(snapshot.quickMaskMode !== undefined ? { quickMaskMode: snapshot.quickMaskMode } : {}),
        ...(snapshot.selectedLayerIds ? { selectedLayerIds: [...snapshot.selectedLayerIds] } : {}),
        ...(snapshot.layerSelectionAnchorId !== undefined ? { layerSelectionAnchorId: snapshot.layerSelectionAnchorId } : {}),
        layers,
        activeLayerId: layers.some(layer => layer.id === snapshot.activeLayerId) ? snapshot.activeLayerId : layers.at(-1)?.id ?? null,
    };
}

function historyStateUpdate(state: EditorStore): Pick<EditorStore, 'historyTick' | 'historyEntries' | 'currentHistoryIndex' | 'historyMaxSize' | 'canUndo' | 'canRedo' | 'isDirty'> {
    const nextTick = state.historyTick + 1;
    return {
        historyTick: nextTick,
        historyEntries: globalHistory.states(),
        currentHistoryIndex: globalHistory.currentIndex(),
        historyMaxSize: globalHistory.getMaxSize(),
        canUndo: globalHistory.canUndo(),
        canRedo: globalHistory.canRedo(),
        // STAB-02: any history advance past lastSavedHistoryTick marks dirty.
        isDirty: nextTick !== state.lastSavedHistoryTick,
    };
}

export const createHistorySlice: StateCreator<EditorStore, [], [], HistorySlice> = (set, get) => ({
    historyTick: 0,
    historyEntries: [],
    currentHistoryIndex: -1,
    historyMaxSize: globalHistory.getMaxSize(),
    canUndo: false,
    canRedo: false,
    lastEffect: null,
    setLastEffect: (snapshot) => set({ lastEffect: snapshot }),
    commitHistory: (action: HistoryAction) => {
        const entry = globalHistory.commit(action);
        set(historyStateUpdate(get()));
        return entry;
    },
    executeCommand: (action: GenericHistoryAction) => {
        action.apply();
        const entry = globalHistory.commit(action);
        set(historyStateUpdate(get()));
        return entry;
    },
    executeCompoundCommand: (action: CompoundHistoryAction) => {
        action.apply();
        const entry = globalHistory.commit(action);
        set(historyStateUpdate(get()));
        return entry;
    },
    executeDocumentCommand: (options: DocumentHistoryCommandOptions) => {
        const before = captureDocumentSnapshot(get());
        options.run();
        const after = captureDocumentSnapshot(get());
        const action = createCommandAction({
            kind: options.kind,
            label: options.label,
            affectedIds: options.affectedIds,
            layerId: options.layerId,
            dirtyRect: options.dirtyRect,
            params: options.params,
            timestamp: options.timestamp,
            apply: () => set(restoreDocumentSnapshot(after)),
            revert: () => set(restoreDocumentSnapshot(before)),
        });
        const entry = globalHistory.commit(action);
        set(historyStateUpdate(get()));
        return entry;
    },
    undo: () => {
        const { layers } = get();
        const layerById = (id: string) => layers.find(l => l.id === id);
        const entry = globalHistory.undo(layerById);
        const currentEntry = globalHistory.states()[globalHistory.currentIndex()];
        set({
            ...(currentEntry?.action.kind === 'snapshot' ? restoreDocumentSnapshot(currentEntry.action.snapshot) : {}),
            ...historyStateUpdate(get()),
        });
        return entry;
    },
    redo: () => {
        const { layers } = get();
        const layerById = (id: string) => layers.find(l => l.id === id);
        const entry = globalHistory.redo(layerById);
        const currentEntry = globalHistory.states()[globalHistory.currentIndex()];
        set({
            ...(currentEntry?.action.kind === 'snapshot' ? restoreDocumentSnapshot(currentEntry.action.snapshot) : {}),
            ...historyStateUpdate(get()),
        });
        return entry;
    },
    revertToHistoryIndex: (targetIndex) => {
        const state = get();
        const entries = globalHistory.states();
        const currentIndex = globalHistory.currentIndex();
        const targetEntry = entries[targetIndex];
        if (!targetEntry) return;
        const { layers } = state;
        const layerById = (id: string) => layers.find(l => l.id === id);

        if (targetIndex < currentIndex) {
            // Undo multiple times
            const steps = currentIndex - targetIndex;
            for (let i = 0; i < steps; i++) {
                globalHistory.undo(layerById);
            }
        } else {
            // Redo multiple times
            const steps = targetIndex - currentIndex;
            for (let i = 0; i < steps; i++) {
                globalHistory.redo(layerById);
            }
        }
        set({
            ...(targetEntry.action.kind === 'snapshot' ? restoreDocumentSnapshot(targetEntry.action.snapshot) : {}),
            ...historyStateUpdate(get()),
        });
    },
    clearHistory: () => {
        globalHistory.clear();
        set({
            historyTick: get().historyTick + 1,
            historyEntries: [],
            currentHistoryIndex: -1,
            historyMaxSize: globalHistory.getMaxSize(),
            canUndo: false,
            canRedo: false,
        });
    },
    setHistoryMaxSize: (maxSize) => {
        globalHistory.setMaxSize(maxSize);
        set(historyStateUpdate(get()));
    },
    commitSnapshot: (label = 'Snapshot') => {
        const state = get();
        const entry = globalHistory.commit({
            kind: 'snapshot',
            label,
            timestamp: Date.now(),
            snapshot: captureDocumentSnapshot(state),
        });
        set(historyStateUpdate(get()));
        return entry;
    },
});

export type { HistoryEntry };
