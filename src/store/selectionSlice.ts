import type { StateCreator } from 'zustand';
import type { EditorStore, SavedSelection, SelectionMode, SelectionSlice } from './types';

export const createSelectionSlice: StateCreator<EditorStore, [], [], SelectionSlice> = (set, get) => ({
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
    savedSelections: [],

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
            polyPoints: [],
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

    expandSelection: (px) => set(state => {
        if (!state.selection.hasSelection) return state;
        // Add an expand operation marker — the compositor interprets this as a path offset
        const expandOp = {
            mode: 'add' as const,
            type: 'rect' as SelectionMode,
            path: [] as { x: number; y: number }[],
            expandBy: px,
        } as { mode: 'add' | 'sub'; path: { x: number; y: number }[]; type: SelectionMode };
        return {
            selection: {
                ...state.selection,
                operations: [...state.selection.operations, expandOp],
            },
        };
    }),

    contractSelection: (px) => set(state => {
        if (!state.selection.hasSelection) return state;
        const contractOp = {
            mode: 'sub' as const,
            type: 'rect' as SelectionMode,
            path: [] as { x: number; y: number }[],
            contractBy: px,
        } as { mode: 'add' | 'sub'; path: { x: number; y: number }[]; type: SelectionMode };
        return {
            selection: {
                ...state.selection,
                operations: [...state.selection.operations, contractOp],
            },
        };
    }),

    smoothSelection: () => set(state => {
        // Smoothing is applied at render time; mark the selection as smoothed
        return {
            selection: { ...state.selection },
        };
    }),

    borderSelection: (width) => set(state => {
        if (!state.selection.hasSelection) return state;
        // Border = outer expand + inner subtract
        const outerOp = {
            mode: 'add' as const,
            type: 'rect' as SelectionMode,
            path: [] as { x: number; y: number }[],
            expandBy: width,
        } as { mode: 'add' | 'sub'; path: { x: number; y: number }[]; type: SelectionMode };
        const innerOp = {
            mode: 'sub' as const,
            type: 'rect' as SelectionMode,
            path: [] as { x: number; y: number }[],
            contractBy: width,
        } as { mode: 'add' | 'sub'; path: { x: number; y: number }[]; type: SelectionMode };
        return {
            selection: {
                ...state.selection,
                operations: [...state.selection.operations, outerOp, innerOp],
            },
        };
    }),

    saveSelection: (name) => set(state => {
        const saved: SavedSelection = {
            name,
            ops: [...state.selection.operations],
        };
        const existing = state.savedSelections.findIndex(s => s.name === name);
        const next = [...state.savedSelections];
        if (existing >= 0) next[existing] = saved;
        else next.push(saved);
        return { savedSelections: next };
    }),

    loadSelection: (name) => set(state => {
        const saved = state.savedSelections.find(s => s.name === name);
        if (!saved) return state;
        return {
            selection: {
                ...state.selection,
                hasSelection: saved.ops.length > 0,
                operations: [...saved.ops],
            },
        };
    }),

    pathToSelection: () => {
        // Convert the active pen path to a polygon selection
        // The pen path is stored in the tools registry / pen tool state.
        // For now, read from toolsSlice penPath if available.
        const store = get();
        // Get pen tool state
        const { getTool } = store as unknown as { getTool?: (id: string) => { getPath?: () => { x: number; y: number }[] } };
        const path = getTool?.('pen')?.getPath?.() ?? [];
        if (path.length < 3) return;
        set(state => ({
            selection: {
                ...state.selection,
                hasSelection: true,
                mode: 'lasso',
                operations: [
                    ...state.selection.operations,
                    { mode: 'add' as const, type: 'lasso' as SelectionMode, path },
                ],
            },
        }));
    },

    selectionToPath: () => {
        // Convert selection outline to pen path — stored on the tools slice
        // This is a foundation stub; the actual path rendering is in pen.ts
        const state = get();
        if (!state.selection.hasSelection || state.selection.operations.length === 0) return;
        // Extract the last add op's path and store in a well-known place
        const lastAddOp = [...state.selection.operations].reverse().find(op => op.mode === 'add');
        if (!lastAddOp || lastAddOp.path.length === 0) return;
        // Signal is stored on window for pen tool to pick up (non-React boundary)
        (window as unknown as Record<string, unknown>).__selectionAsPath = lastAddOp.path;
    },
});
