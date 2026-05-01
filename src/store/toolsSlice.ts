import type { StateCreator } from 'zustand';
import type { EditorStore, ToolsSlice } from './types';

export const createToolsSlice: StateCreator<EditorStore, [], [], ToolsSlice> = (set) => ({
    activeTool: 'brush',
    brushSettings: {
        size: 20,
        opacity: 1,
        hardness: 1,
    },
    cloneSource: null,
    shapeSettings: { filled: true },

    setTool: (tool) => set({ activeTool: tool }),
    setBrushSize: (size) => set(state => ({
        brushSettings: { ...state.brushSettings, size },
    })),
    setBrushHardness: (hardness) => set(state => ({
        brushSettings: { ...state.brushSettings, hardness },
    })),
    setBrushOpacity: (opacity) => set(state => ({
        brushSettings: { ...state.brushSettings, opacity },
    })),
    setCloneSource: (point) => set({ cloneSource: point }),
});
