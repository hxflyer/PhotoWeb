import type { StateCreator } from 'zustand';
import type {
    EditorStore, ToolsSlice, BrushPreset, BrushPresetGroup, PaintSymmetryMode, ToolPreset, PatternPreset,
    GradientPresetEntry, GradientColorStop, GradientOpacityStop,
} from './types';
import { commitActiveEditingType } from '../tools/type';
import { getTool } from '../tools/registry';
import { getBrushOptions, setBrushOptions } from '../tools/brush';

const BRUSH_PRESETS_KEY = 'photoweb:brushPresets:v1';
const BRUSH_PRESET_GROUPS_KEY = 'photoweb:brushPresetGroups:v1';
const TOOL_PRESETS_KEY = 'photoweb:toolPresets:v1';
const GRADIENT_PRESETS_KEY = 'photoweb:gradientPresets:v1';
const PATTERN_PRESETS_KEY = 'photoweb:patternPresets:v1';
const DEFAULT_BRUSH_GROUP_ID = 'general';
const DEFAULT_BRUSH_PRESET_GROUPS: BrushPresetGroup[] = [
    { id: DEFAULT_BRUSH_GROUP_ID, name: 'General Brushes' },
    { id: 'dry-media', name: 'Dry Media Brushes' },
    { id: 'wet-media', name: 'Wet Media Brushes' },
    { id: 'special-effects', name: 'Special Effects Brushes' },
];

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

function loadStoredBrushPresetGroups(): BrushPresetGroup[] {
    if (typeof localStorage === 'undefined') return DEFAULT_BRUSH_PRESET_GROUPS;
    try {
        const raw = localStorage.getItem(BRUSH_PRESET_GROUPS_KEY);
        const parsed = raw ? JSON.parse(raw) as BrushPresetGroup[] : [];
        const byId = new Map<string, BrushPresetGroup>();
        for (const group of DEFAULT_BRUSH_PRESET_GROUPS) byId.set(group.id, group);
        for (const group of parsed) byId.set(group.id, group);
        return [...byId.values()];
    } catch {
        return DEFAULT_BRUSH_PRESET_GROUPS;
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

function persistBrushPresetGroups(groups: BrushPresetGroup[]): void {
    if (typeof localStorage === 'undefined') return;
    try {
        localStorage.setItem(BRUSH_PRESET_GROUPS_KEY, JSON.stringify(groups));
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

function loadStoredGradientPresets(): GradientPresetEntry[] {
    if (typeof localStorage === 'undefined') return [];
    try {
        const raw = localStorage.getItem(GRADIENT_PRESETS_KEY);
        return raw ? JSON.parse(raw) as GradientPresetEntry[] : [];
    } catch { return []; }
}

function persistGradientPresets(presets: GradientPresetEntry[]): void {
    if (typeof localStorage === 'undefined') return;
    try { localStorage.setItem(GRADIENT_PRESETS_KEY, JSON.stringify(presets)); } catch { /* quota */ }
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

/**
 * Seed the pattern tile cache directly. Useful for tests (jsdom can't load
 * data URLs through `new Image()`) and for save/load paths that have already
 * decoded the tile elsewhere. Overwrites any prior cached canvas for `id`.
 */
export function cachePatternTile(id: string, canvas: HTMLCanvasElement): void {
    patternTileCache.set(id, canvas);
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
    brushPresetGroups: loadStoredBrushPresetGroups(),
    selectedBrushPresetGroupId: DEFAULT_BRUSH_GROUP_ID,
    paintSymmetry: { mode: 'none', lastMode: null, visible: true, pending: false, segments: 5 },
    toolPresets: loadStoredToolPresets(),
    patternPresets: loadStoredPatternPresets(),
    gradientPresets: loadStoredGradientPresets(),
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

    saveBrushPreset: (name, extras) => {
        const id = crypto.randomUUID();
        set(state => {
        const options = getBrushOptions();
        const captureSize = extras?.captureSize ?? true;
        const includeToolSettings = extras?.includeToolSettings ?? true;
        const includeColor = extras?.includeColor ?? false;
        const tip = extras?.tip ?? state.brushSettings.customTip;
        const groupId = extras?.groupId ?? state.selectedBrushPresetGroupId ?? DEFAULT_BRUSH_GROUP_ID;
        const preset: BrushPreset = {
            id,
            name,
            settings: {
                ...state.brushSettings,
                ...(tip ? { customTip: tip, size: captureSize ? Math.max(tip.width, tip.height) : state.brushSettings.size } : {}),
            },
            smoothing: extras?.smoothing ?? options.smoothing,
            spacing: extras?.spacing ?? options.spacing,
            mode: extras?.mode ?? options.mode,
            color: includeColor ? (extras?.color ?? state.primaryColor) : undefined,
            captureSize,
            includeToolSettings,
            includeColor,
            groupId: groupId ?? DEFAULT_BRUSH_GROUP_ID,
        };
        const next = [...state.brushPresets, preset];
        persistBrushPresets(next);
        return { brushPresets: next };
        });
        return id;
    },

    applyBrushPreset: (id) => {
        const state = get();
        const preset = state.brushPresets.find(p => p.id === id);
        if (!preset) return;
        const applySize = preset.captureSize !== false;
        const applyToolSettings = preset.includeToolSettings !== false;
        set({
            activeTool: 'brush',
            brushSettings: {
                ...state.brushSettings,
                hardness: preset.settings.hardness,
                customTip: preset.settings.customTip,
                ...(applySize ? { size: preset.settings.size } : {}),
                ...(applyToolSettings ? { opacity: preset.settings.opacity, flow: preset.settings.flow } : {}),
            },
            ...(preset.includeColor && preset.color ? { primaryColor: preset.color } : {}),
        });
        if (applyToolSettings && (preset.smoothing !== undefined || preset.spacing !== undefined || preset.mode !== undefined)) {
            setBrushOptions({
                smoothing: preset.smoothing ?? 0,
                spacing: preset.spacing ?? 0.15,
                mode: preset.mode ?? 'source-over',
            });
        }
    },

    removeBrushPreset: (id) => set(state => {
        const next = state.brushPresets.filter(p => p.id !== id);
        persistBrushPresets(next);
        return { brushPresets: next };
    }),

    renameBrushPreset: (id, name) => set(state => {
        const next = state.brushPresets.map(p => p.id === id ? { ...p, name } : p);
        persistBrushPresets(next);
        return { brushPresets: next };
    }),

    reorderBrushPreset: (fromIdx, toIdx) => set(state => {
        if (fromIdx === toIdx) return state;
        if (fromIdx < 0 || fromIdx >= state.brushPresets.length) return state;
        if (toIdx < 0 || toIdx > state.brushPresets.length) return state;
        const next = state.brushPresets.slice();
        const [moved] = next.splice(fromIdx, 1);
        const clampedTo = Math.min(Math.max(0, toIdx), next.length);
        next.splice(clampedTo, 0, moved);
        persistBrushPresets(next);
        return { brushPresets: next };
    }),

    duplicateBrushPreset: (id) => set(state => {
        const source = state.brushPresets.find(p => p.id === id);
        if (!source) return state;
        const copy: BrushPreset = {
            id: crypto.randomUUID(),
            name: `${source.name} copy`,
            settings: { ...source.settings },
            smoothing: source.smoothing,
            spacing: source.spacing,
            mode: source.mode,
            color: source.color,
            captureSize: source.captureSize,
            includeToolSettings: source.includeToolSettings,
            includeColor: source.includeColor,
            groupId: source.groupId,
        };
        const idx = state.brushPresets.findIndex(p => p.id === id);
        const next = state.brushPresets.slice();
        next.splice(idx + 1, 0, copy);
        persistBrushPresets(next);
        return { brushPresets: next };
    }),

    createBrushPresetGroup: (name) => {
        const id = crypto.randomUUID();
        const group: BrushPresetGroup = { id, name };
        set(state => {
            const next = [...state.brushPresetGroups, group];
            persistBrushPresetGroups(next);
            return { brushPresetGroups: next, selectedBrushPresetGroupId: id };
        });
        return id;
    },

    setSelectedBrushPresetGroup: (id) => set({ selectedBrushPresetGroupId: id }),

    toggleBrushPresetGroup: (id) => set(state => {
        const next = state.brushPresetGroups.map(group => (
            group.id === id ? { ...group, collapsed: !group.collapsed } : group
        ));
        persistBrushPresetGroups(next);
        return { brushPresetGroups: next };
    }),

    setPaintSymmetryMode: (mode, segments) => set(state => {
        const nextMode = mode === 'none' ? 'none' : mode;
        const lastMode = nextMode === 'none'
            ? state.paintSymmetry.lastMode
            : nextMode as Exclude<PaintSymmetryMode, 'none'>;
        return {
            paintSymmetry: {
                ...state.paintSymmetry,
                mode: nextMode,
                lastMode,
                visible: true,
                pending: nextMode !== 'none',
                segments: segments ?? state.paintSymmetry.segments,
            },
        };
    }),

    setPaintSymmetryVisible: (visible) => set(state => ({
        paintSymmetry: { ...state.paintSymmetry, visible },
    })),

    setPaintSymmetrySegments: (segments) => set(state => ({
        paintSymmetry: {
            ...state.paintSymmetry,
            segments: Math.max(2, Math.min(state.paintSymmetry.mode === 'mandala' ? 10 : 12, Math.round(segments))),
        },
    })),

    commitPaintSymmetryPath: () => set(state => ({
        paintSymmetry: { ...state.paintSymmetry, pending: false, visible: true },
    })),

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

    renamePatternPreset: (id, name) => set(state => {
        const next = state.patternPresets.map(p => p.id === id ? { ...p, name } : p);
        persistPatternPresets(next);
        return { patternPresets: next };
    }),

    setActivePatternId: (id) => set({ activePatternId: id }),

    saveGradientPreset: (name, colorStops, opacityStops, smoothness) => {
        const preset: GradientPresetEntry = {
            id: crypto.randomUUID(),
            name,
            colorStops: colorStops.map((s: GradientColorStop) => ({ ...s })),
            opacityStops: opacityStops.map((s: GradientOpacityStop) => ({ ...s })),
            smoothness,
        };
        set(state => {
            const next = [...state.gradientPresets, preset];
            persistGradientPresets(next);
            return { gradientPresets: next };
        });
        return preset.id;
    },

    applyGradientPreset: (id) => {
        const preset = get().gradientPresets.find(p => p.id === id);
        return preset ? { ...preset, colorStops: preset.colorStops.map(s => ({ ...s })), opacityStops: preset.opacityStops.map(s => ({ ...s })) } : null;
    },

    removeGradientPreset: (id) => set(state => {
        const next = state.gradientPresets.filter(p => p.id !== id);
        persistGradientPresets(next);
        return { gradientPresets: next };
    }),
});
