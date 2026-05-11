import type { StateCreator } from 'zustand';
import type { EditorStore, ToolsSlice, BrushPreset, ToolPreset, PatternPreset } from './types';
import { commitActiveEditingType } from '../tools/type';
import { getTool } from '../tools/registry';
import { setBrushOptions } from '../tools/brush';

const BRUSH_PRESETS_KEY = 'photoweb:brushPresets:v1';
const TOOL_PRESETS_KEY = 'photoweb:toolPresets:v1';
const PATTERN_PRESETS_KEY = 'photoweb:patternPresets:v1';

function loadStoredToolPresets(): ToolPreset[] {
    if (typeof localStorage === 'undefined') return [];
    try {
        const raw = localStorage.getItem(TOOL_PRESETS_KEY);
        return raw ? JSON.parse(raw) as ToolPreset[] : [];
    } catch { return []; }
}

function persistToolPresets(presets: ToolPreset[]): void {
    if (typeof localStorage === 'undefined') return;
    try { localStorage.setItem(TOOL_PRESETS_KEY, JSON.stringify(presets)); } catch { /* quota */ }
}

function loadStoredBrushPresets(): BrushPreset[] {
    if (typeof localStorage === 'undefined') return [];
    try {
        const raw = localStorage.getItem(BRUSH_PRESETS_KEY);
        return raw ? JSON.parse(raw) as BrushPreset[] : [];
    } catch {
        return [];
    }
}

function persistBrushPresets(presets: BrushPreset[]): void {
    if (typeof localStorage === 'undefined') return;
    try {
        localStorage.setItem(BRUSH_PRESETS_KEY, JSON.stringify(presets));
    } catch {
        // Quota; non-fatal.
    }
}

function loadStoredPatternPresets(): PatternPreset[] {
    if (typeof localStorage === 'undefined') return [];
    try {
        const raw = localStorage.getItem(PATTERN_PRESETS_KEY);
        return raw ? JSON.parse(raw) as PatternPreset[] : [];
    } catch { return []; }
}

function persistPatternPresets(presets: PatternPreset[]): void {
    if (typeof localStorage === 'undefined') return;
    try { localStorage.setItem(PATTERN_PRESETS_KEY, JSON.stringify(presets)); } catch { /* quota */ }
}

function patternSourceToDataUrl(source: HTMLCanvasElement | ImageData): { dataUrl: string; width: number; height: number; tile: HTMLCanvasElement } {
    if (source instanceof HTMLCanvasElement) {
        return { dataUrl: source.toDataURL('image/png'), width: source.width, height: source.height, tile: source };
    }
    const c = document.createElement('canvas');
    c.width = source.width; c.height = source.height;
    const cx = c.getContext('2d')!;
    cx.putImageData(source, 0, 0);
    return { dataUrl: c.toDataURL('image/png'), width: c.width, height: c.height, tile: c };
}

const patternTileCache = new Map<string, HTMLCanvasElement>();

export function getPatternTile(id: string): HTMLCanvasElement | null {
    return patternTileCache.get(id) ?? null;
}

export function decodePatternPreset(preset: PatternPreset): Promise<HTMLCanvasElement> {
    return new Promise((resolve, reject) => {
        const cached = patternTileCache.get(preset.id);
        if (cached) return resolve(cached);
        const img = new Image();
        img.onload = () => {
            const c = document.createElement('canvas');
            c.width = preset.width; c.height = preset.height;
            c.getContext('2d')!.drawImage(img, 0, 0);
            patternTileCache.set(preset.id, c);
            resolve(c);
        };
        img.onerror = reject;
        img.src = preset.dataUrl;
    });
}

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
    brushPresets: loadStoredBrushPresets(),
    toolPresets: loadStoredToolPresets(),
    patternPresets: loadStoredPatternPresets(),
    activePatternId: null,

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

    saveBrushPreset: (name, extras) => set(state => {
        const preset: BrushPreset = {
            id: crypto.randomUUID(),
            name,
            settings: { ...state.brushSettings },
            smoothing: extras?.smoothing,
            spacing: extras?.spacing,
        };
        const next = [...state.brushPresets, preset];
        persistBrushPresets(next);
        return { brushPresets: next };
    }),

    applyBrushPreset: (id) => {
        const state = get();
        const preset = state.brushPresets.find(p => p.id === id);
        if (!preset) return;
        set({ brushSettings: { ...preset.settings } });
        if (preset.smoothing !== undefined || preset.spacing !== undefined) {
            setBrushOptions({
                smoothing: preset.smoothing ?? 0,
                spacing: preset.spacing ?? 0.15,
            });
        }
    },

    removeBrushPreset: (id) => set(state => {
        const next = state.brushPresets.filter(p => p.id !== id);
        persistBrushPresets(next);
        return { brushPresets: next };
    }),

    saveToolPreset: (name, optionsBlob) => set(state => {
        const preset: ToolPreset = {
            id: crypto.randomUUID(),
            name,
            toolId: state.activeTool,
            optionsBlob: structuredClone(optionsBlob),
        };
        const next = [...state.toolPresets, preset];
        persistToolPresets(next);
        return { toolPresets: next };
    }),

    applyToolPreset: (id, apply) => {
        const preset = get().toolPresets.find(p => p.id === id);
        if (!preset) return;
        apply(preset.optionsBlob);
    },

    removeToolPreset: (id) => set(state => {
        const next = state.toolPresets.filter(p => p.id !== id);
        persistToolPresets(next);
        return { toolPresets: next };
    }),

    definePattern: (name, source) => {
        const { dataUrl, width, height, tile } = patternSourceToDataUrl(source);
        const preset: PatternPreset = {
            id: crypto.randomUUID(),
            name,
            width,
            height,
            dataUrl,
        };
        patternTileCache.set(preset.id, tile);
        set(state => {
            const next = [...state.patternPresets, preset];
            persistPatternPresets(next);
            return { patternPresets: next, activePatternId: preset.id };
        });
        return preset.id;
    },

    removePatternPreset: (id) => set(state => {
        patternTileCache.delete(id);
        const next = state.patternPresets.filter(p => p.id !== id);
        persistPatternPresets(next);
        return {
            patternPresets: next,
            activePatternId: state.activePatternId === id ? null : state.activePatternId,
        };
    }),

    setActivePatternId: (id) => set({ activePatternId: id }),
});
