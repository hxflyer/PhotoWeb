import type { StateCreator } from 'zustand';
import type { EditorStore, SelectionMode, SelectionSlice } from './types';

export const createSelectionSlice: StateCreator<EditorStore, [], [], SelectionSlice> = (set) => ({
    selection: {
        hasSelection: false,
        mode: 'rect',
        path: [],
        polyPoints: [],
        operations: [],
        isDraggingSelection: false,
        feather: 0,
        isFreeEditMode: false,
    },

    setSelectionMode: (mode) => set(state => ({ selection: { ...state.selection, mode } })),
    setSelectionPath: (path) => set(state => ({ selection: { ...state.selection, path } })),
    setSelectionOperations: (ops) => set(state => ({ selection: { ...state.selection, operations: ops } })),
    addSelectionOperation: (op) => set(state => ({
        selection: { ...state.selection, operations: [...state.selection.operations, op] },
    })),
    setHasSelection: (has) => set(state => ({ selection: { ...state.selection, hasSelection: has } })),
    setIsDraggingSelection: (is) => set(state => ({ selection: { ...state.selection, isDraggingSelection: is } })),
    clearSelection: () => set(state => ({
        selection: {
            ...state.selection,
            hasSelection: false,
            path: [],
            operations: [],
            isDraggingSelection: false,
            feather: 0,
        },
    })),
    toggleInvertSelection: () => set((state) => {
        const { width, height } = state;
        const padding = 500;
        const fullCanvasOp = {
            mode: 'add' as const,
            type: 'rect' as SelectionMode,
            path: [{ x: -padding, y: -padding }, { x: width + padding, y: height + padding }],
        };

        if (!state.selection.hasSelection && state.selection.operations.length === 0) {
            return {
                selection: {
                    ...state.selection,
                    hasSelection: true,
                    operations: [fullCanvasOp],
                },
            };
        }

        const invertedOps = state.selection.operations.map(op => ({
            ...op,
            mode: (op.mode === 'add' ? 'sub' : 'add') as 'add' | 'sub',
        }));

        if (state.selection.path.length > 0) {
            invertedOps.push({
                mode: 'sub' as const,
                type: state.selection.mode,
                path: state.selection.path,
            });
        }

        return {
            selection: {
                ...state.selection,
                hasSelection: true,
                path: [],
                operations: [fullCanvasOp, ...invertedOps],
            },
        };
    }),
    setSelectionFeather: (radius) => set(state => ({ selection: { ...state.selection, feather: radius } })),
    setFreeEditMode: (mode) => set(state => ({ selection: { ...state.selection, isFreeEditMode: mode } })),
    setPolyPoints: (points) => set(state => ({ selection: { ...state.selection, polyPoints: points } })),
});
