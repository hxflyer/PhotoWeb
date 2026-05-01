import type { StateCreator } from 'zustand';
import { globalHistory, type HistoryAction, type HistoryEntry } from '../core/history';
import type { EditorStore, HistorySlice } from './types';

export const createHistorySlice: StateCreator<EditorStore, [], [], HistorySlice> = (set, get) => ({
    historyTick: 0,
    historyEntries: [],
    canUndo: false,
    canRedo: false,
    commitHistory: (action: HistoryAction) => {
        const entry = globalHistory.commit(action);
        set({
            historyTick: get().historyTick + 1,
            historyEntries: globalHistory.states(),
            canUndo: globalHistory.canUndo(),
            canRedo: globalHistory.canRedo(),
        });
        return entry;
    },
    undo: () => {
        const { layers } = get();
        const layerById = (id: string) => layers.find(l => l.id === id);
        const entry = globalHistory.undo(layerById);
        set({
            historyTick: get().historyTick + 1,
            historyEntries: globalHistory.states(),
            canUndo: globalHistory.canUndo(),
            canRedo: globalHistory.canRedo(),
        });
        return entry;
    },
    redo: () => {
        const { layers } = get();
        const layerById = (id: string) => layers.find(l => l.id === id);
        const entry = globalHistory.redo(layerById);
        set({
            historyTick: get().historyTick + 1,
            historyEntries: globalHistory.states(),
            canUndo: globalHistory.canUndo(),
            canRedo: globalHistory.canRedo(),
        });
        return entry;
    },
    clearHistory: () => {
        globalHistory.clear();
        set({
            historyTick: get().historyTick + 1,
            historyEntries: [],
            canUndo: false,
            canRedo: false,
        });
    },
});

export type { HistoryEntry };
