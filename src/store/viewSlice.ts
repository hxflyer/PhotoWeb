import type { StateCreator } from 'zustand';
import type { EditorStore, ViewSlice } from './types';

const VIEW_PREFS_STORAGE_KEY = 'photoweb:viewPrefs:v1';

interface StoredViewPrefs {
    showSelectionEdges?: boolean;
}

function loadStoredViewPrefs(): StoredViewPrefs {
    if (typeof localStorage === 'undefined') return {};
    try {
        const raw = localStorage.getItem(VIEW_PREFS_STORAGE_KEY);
        return raw ? JSON.parse(raw) as StoredViewPrefs : {};
    } catch {
        return {};
    }
}

function persistStoredViewPrefs(prefs: StoredViewPrefs): void {
    if (typeof localStorage === 'undefined') return;
    try {
        const current = loadStoredViewPrefs();
        localStorage.setItem(VIEW_PREFS_STORAGE_KEY, JSON.stringify({ ...current, ...prefs }));
    } catch {
        // View preferences should never block editing.
    }
}

export const createViewSlice: StateCreator<EditorStore, [], [], ViewSlice> = (set) => ({
    ...(() => {
        const prefs = loadStoredViewPrefs();
        return { showSelectionEdges: prefs.showSelectionEdges ?? true };
    })(),
    zoom: 1,
    pan: { x: 0, y: 0 },
    showRulers: true,
    showGrid: false,
    gridSize: 10,
    snapEnabled: false,
    guides: [],
    quickMaskMode: false,
    enablePerfLogging: false,
    activeChannel: 'rgb',
    channelVisibility: { r: true, g: true, b: true },
    setZoom: (zoom) => set({ zoom }),
    setPan: (x, y) => set({ pan: { x, y } }),
    setShowRulers: (show) => set({ showRulers: show }),
    setShowGrid: (show) => set({ showGrid: show }),
    setShowSelectionEdges: (show) => {
        persistStoredViewPrefs({ showSelectionEdges: show });
        set({ showSelectionEdges: show });
    },
    setGridSize: (size) => set({ gridSize: size }),
    setSnapEnabled: (snap) => set({ snapEnabled: snap }),
    addGuide: (orientation, position) => set(state => ({
        guides: [...state.guides, { orientation, position: Math.round(position) }],
    })),
    removeGuide: (index) => set(state => ({
        guides: state.guides.filter((_, i) => i !== index),
    })),
    moveGuide: (index, position) => set(state => ({
        guides: state.guides.map((g, i) => i === index ? { ...g, position: Math.round(position) } : g),
    })),
    clearGuides: () => set({ guides: [] }),
    setQuickMaskMode: (on) => set({ quickMaskMode: on }),
    setEnablePerfLogging: (on) => set({ enablePerfLogging: on }),
    setActiveChannel: (channel) => set({ activeChannel: channel }),
    setChannelVisibility: (channel, visible) => set(state => ({
        channelVisibility: { ...state.channelVisibility, [channel]: visible },
    })),
    toggleChannelVisibility: (channel) => set(state => ({
        channelVisibility: { ...state.channelVisibility, [channel]: !state.channelVisibility[channel] },
    })),
});
