import type { StateCreator } from 'zustand';
import type { EditorStore, ViewSlice } from './types';

export const createViewSlice: StateCreator<EditorStore, [], [], ViewSlice> = (set) => ({
    zoom: 1,
    pan: { x: 0, y: 0 },
    setZoom: (zoom) => set({ zoom }),
    setPan: (x, y) => set({ pan: { x, y } }),
});
