import type { StateCreator } from 'zustand';
import { globalHistory, type HistoryAction, type HistoryEntry } from '../core/history';
import type { EditorStore, HistorySlice } from './types';

export const createHistorySlice: StateCreator<EditorStore, [], [], HistorySlice> = (set, get) => ({
    historyTick: 0,
    historyEntries: [],
    currentHistoryIndex: -1,
    canUndo: false,
    canRedo: false,
    commitHistory: (action: HistoryAction) => {
        const entry = globalHistory.commit(action);
        const entries = globalHistory.states();
        set({
            historyTick: get().historyTick + 1,
            historyEntries: entries,
            currentHistoryIndex: entries.length - 1,
            canUndo: globalHistory.canUndo(),
            canRedo: globalHistory.canRedo(),
        });
        return entry;
    },
    undo: () => {
        const { layers } = get();
        const layerById = (id: string) => layers.find(l => l.id === id);
        const entry = globalHistory.undo(layerById);
        const entries = globalHistory.states();
        set({
            historyTick: get().historyTick + 1,
            historyEntries: entries,
            currentHistoryIndex: entries.length - 1,
            canUndo: globalHistory.canUndo(),
            canRedo: globalHistory.canRedo(),
        });
        return entry;
    },
    redo: () => {
        const { layers } = get();
        const layerById = (id: string) => layers.find(l => l.id === id);
        const entry = globalHistory.redo(layerById);
        const entries = globalHistory.states();
        set({
            historyTick: get().historyTick + 1,
            historyEntries: entries,
            currentHistoryIndex: entries.length - 1,
            canUndo: globalHistory.canUndo(),
            canRedo: globalHistory.canRedo(),
        });
        return entry;
    },
    revertToHistoryIndex: (targetIndex) => {
        const state = get();
        const entries = globalHistory.states();
        const currentIndex = entries.length - 1;
        if (targetIndex === currentIndex) return;
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
        const newEntries = globalHistory.states();
        set({
            historyTick: get().historyTick + 1,
            historyEntries: newEntries,
            currentHistoryIndex: newEntries.length - 1,
            canUndo: globalHistory.canUndo(),
            canRedo: globalHistory.canRedo(),
        });
    },
    clearHistory: () => {
        globalHistory.clear();
        set({
            historyTick: get().historyTick + 1,
            historyEntries: [],
            currentHistoryIndex: -1,
            canUndo: false,
            canRedo: false,
        });
    },
    commitSnapshot: (label = 'Snapshot') => {
        const state = get();
        const snapshot = {
            layers: state.layers.map(l => ({
                id: l.id,
                name: l.name,
                visible: l.visible,
                opacity: l.opacity,
                blendMode: l.blendMode,
                kind: l.kind,
                imageData: l.ctx.getImageData(0, 0, l.canvas.width, l.canvas.height),
            })),
            activeLayerId: state.activeLayerId,
        };
        const entry = globalHistory.commit({
            kind: 'snapshot',
            label,
            timestamp: Date.now(),
            snapshot,
        });
        const entries = globalHistory.states();
        set({
            historyTick: get().historyTick + 1,
            historyEntries: entries,
            currentHistoryIndex: entries.length - 1,
            canUndo: globalHistory.canUndo(),
            canRedo: globalHistory.canRedo(),
        });
        return entry;
    },
});

export type { HistoryEntry };
