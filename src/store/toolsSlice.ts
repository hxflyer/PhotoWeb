import type { StateCreator } from 'zustand';
import type { EditorStore, ToolsSlice } from './types';
import { commitActiveEditingType } from '../tools/type';
import { getTool } from '../tools/registry';

export const createToolsSlice: StateCreator<EditorStore, [], [], ToolsSlice> = (set, get) => ({
    activeTool: 'brush',
    brushSettings: {
        size: 20,
        opacity: 1,
        hardness: 1,
        flow: 1,
    },
    cloneSource: null,
    shapeSettings: { filled: true },

    setTool: (tool) => {
        commitActiveEditingType();
        const currentState = get();
        const currentTool = getTool(currentState.activeTool);
        const nextTool = getTool(tool);
        const ctx = {
            store: currentState,
            getStore: get,
            requestRender: () => {},
        };
        if (currentState.activeTool !== tool) currentTool?.onDeactivate?.(ctx);
        set({ activeTool: tool });
        if (currentState.activeTool !== tool) nextTool?.onActivate?.({ ...ctx, store: get() });
    },
    setBrushSize: (size) => set(state => ({
        brushSettings: { ...state.brushSettings, size },
    })),
    setBrushHardness: (hardness) => set(state => ({
        brushSettings: { ...state.brushSettings, hardness },
    })),
    setBrushOpacity: (opacity) => set(state => ({
        brushSettings: { ...state.brushSettings, opacity },
    })),
    setBrushFlow: (flow) => set(state => ({
        brushSettings: { ...state.brushSettings, flow },
    })),
    setCloneSource: (point) => set({ cloneSource: point }),
});
