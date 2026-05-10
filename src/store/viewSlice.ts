import type { StateCreator } from 'zustand';
import type { EditorStore, ViewSlice } from './types';

export const createViewSlice: StateCreator<EditorStore, [], [], ViewSlice> = (set) => ({
    zoom: 1,
    pan: { x: 0, y: 0 },
    showRulers: true,
    showGrid: false,
    gridSize: 10,
    snapEnabled: false,
    quickMaskMode: false,
    enablePerfLogging: false,
    activeChannel: 'rgb',
    setZoom: (zoom) => set({ zoom }),
    setPan: (x, y) => set({ pan: { x, y } }),
    setShowRulers: (show) => set({ showRulers: show }),
    setShowGrid: (show) => set({ showGrid: show }),
    setGridSize: (size) => set({ gridSize: size }),
    setSnapEnabled: (snap) => set({ snapEnabled: snap }),
    setQuickMaskMode: (on) => set({ quickMaskMode: on }),
    setEnablePerfLogging: (on) => set({ enablePerfLogging: on }),
    setActiveChannel: (channel) => set({ activeChannel: channel }),
});
