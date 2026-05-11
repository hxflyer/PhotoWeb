import type { StateCreator } from 'zustand';
import { createCommandAction } from '../core/history';
import type { EditorStore, ViewSlice } from './types';

const VIEW_PREFS_STORAGE_KEY = 'photoweb:viewPrefs:v1';

interface StoredViewPrefs {
    showSelectionEdges?: boolean;
    showGuides?: boolean;
    guidesLocked?: boolean;
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

type Guide = ViewSlice['guides'][number];

function cloneGuides(guides: Guide[]): Guide[] {
    return guides.map(g => ({ orientation: g.orientation, position: g.position }));
}

interface GuideDragSession {
    index: number;
    before: Guide[];
}

let activeGuideDrag: GuideDragSession | null = null;

export const createViewSlice: StateCreator<EditorStore, [], [], ViewSlice> = (set, get) => ({
    ...(() => {
        const prefs = loadStoredViewPrefs();
        return {
            showSelectionEdges: prefs.showSelectionEdges ?? true,
            showGuides: prefs.showGuides ?? true,
            guidesLocked: prefs.guidesLocked ?? false,
        };
    })(),
    zoom: 1,
    pan: { x: 0, y: 0 },
    showRulers: true,
    showGrid: false,
    gridSize: 10,
    snapEnabled: false,
    guides: [],
    activeSnapTargets: null,
    isNewGuideDialogOpen: false,
    quickMaskMode: false,
    quickMaskBuffer: null,
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
    setShowGuides: (show) => {
        persistStoredViewPrefs({ showGuides: show });
        set({ showGuides: show });
    },
    setGuidesLocked: (locked) => {
        persistStoredViewPrefs({ guidesLocked: locked });
        set({ guidesLocked: locked });
    },
    setNewGuideDialogOpen: (open) => set({ isNewGuideDialogOpen: open }),
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
    addGuideWithHistory: (orientation, position) => {
        const before = cloneGuides(get().guides);
        const after: Guide[] = [...before, { orientation, position: Math.round(position) }];
        const action = createCommandAction({
            kind: 'layer-property',
            label: `New ${orientation === 'horizontal' ? 'Horizontal' : 'Vertical'} Guide`,
            apply: () => set({ guides: cloneGuides(after) }),
            revert: () => set({ guides: cloneGuides(before) }),
        });
        get().executeCommand(action);
    },
    removeGuideWithHistory: (index) => {
        const before = cloneGuides(get().guides);
        if (index < 0 || index >= before.length) return;
        const after = before.filter((_, i) => i !== index);
        const action = createCommandAction({
            kind: 'layer-property',
            label: 'Remove Guide',
            apply: () => set({ guides: cloneGuides(after) }),
            revert: () => set({ guides: cloneGuides(before) }),
        });
        get().executeCommand(action);
    },
    moveGuideWithHistory: (index, position) => {
        if (get().guidesLocked) return;
        const before = cloneGuides(get().guides);
        if (index < 0 || index >= before.length) return;
        const after = before.map((g, i) => i === index ? { ...g, position: Math.round(position) } : g);
        if (before[index].position === after[index].position) return;
        const action = createCommandAction({
            kind: 'layer-property',
            label: 'Move Guide',
            apply: () => set({ guides: cloneGuides(after) }),
            revert: () => set({ guides: cloneGuides(before) }),
        });
        get().executeCommand(action);
    },
    beginGuideDrag: (index) => {
        if (get().guidesLocked) return;
        const current = get().guides;
        if (index < 0 || index >= current.length) return;
        activeGuideDrag = { index, before: cloneGuides(current) };
    },
    updateGuideDrag: (position) => {
        if (!activeGuideDrag) return;
        if (get().guidesLocked) return;
        const idx = activeGuideDrag.index;
        set(state => ({
            guides: state.guides.map((g, i) => i === idx ? { ...g, position: Math.round(position) } : g),
        }));
    },
    commitGuideDrag: () => {
        const session = activeGuideDrag;
        activeGuideDrag = null;
        if (!session) return;
        const after = cloneGuides(get().guides);
        const before = session.before;
        if (before.length === after.length && before.every((g, i) => g.position === after[i].position && g.orientation === after[i].orientation)) {
            return;
        }
        const action = createCommandAction({
            kind: 'layer-property',
            label: 'Move Guide',
            apply: () => set({ guides: cloneGuides(after) }),
            revert: () => set({ guides: cloneGuides(before) }),
        });
        get().commitHistory(action);
    },
    cancelGuideDrag: () => {
        const session = activeGuideDrag;
        activeGuideDrag = null;
        if (!session) return;
        set({ guides: cloneGuides(session.before) });
    },
    setActiveSnapTargets: (targets) => set({ activeSnapTargets: targets }),
    clearGuidesWithHistory: () => {
        const before = cloneGuides(get().guides);
        if (before.length === 0) return;
        const action = createCommandAction({
            kind: 'layer-property',
            label: 'Clear Guides',
            apply: () => set({ guides: [] }),
            revert: () => set({ guides: cloneGuides(before) }),
        });
        get().executeCommand(action);
    },
    setQuickMaskMode: (on) => {
        if (!on && get().quickMaskBuffer) {
            // Convert painted mask into a selection before exiting Quick Mask.
            get().convertQuickMaskBufferToSelection();
        }
        set({ quickMaskMode: on, ...(on ? {} : { quickMaskBuffer: null }) });
    },
    setQuickMaskBuffer: (buffer) => set({ quickMaskBuffer: buffer }),
    convertQuickMaskBufferToSelection: () => {
        const buffer = get().quickMaskBuffer;
        if (!buffer) return;
        const w = buffer.width;
        const h = buffer.height;
        const mask = new Uint8ClampedArray(w * h);
        // The quick-mask buffer stores red pixels with alpha proportional to paint
        // strength. Treat alpha as the selection coverage (255 = fully selected).
        for (let i = 0; i < w * h; i++) {
            mask[i] = buffer.data[i * 4 + 3];
        }
        const hasAny = mask.some(v => v > 0);
        if (!hasAny) return;
        const op = {
            mode: 'add' as const,
            type: 'lasso' as const,
            path: [{ x: 0, y: 0 }, { x: w, y: 0 }, { x: w, y: h }, { x: 0, y: h }],
            mask: { data: mask, width: w, height: h },
        };
        get().setSelectionOperations([op]);
    },
    setEnablePerfLogging: (on) => set({ enablePerfLogging: on }),
    setActiveChannel: (channel) => set({ activeChannel: channel }),
    setChannelVisibility: (channel, visible) => set(state => ({
        channelVisibility: { ...state.channelVisibility, [channel]: visible },
    })),
    toggleChannelVisibility: (channel) => set(state => ({
        channelVisibility: { ...state.channelVisibility, [channel]: !state.channelVisibility[channel] },
    })),
});
