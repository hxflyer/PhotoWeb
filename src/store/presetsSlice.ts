// Adjustment + filter preset infrastructure. Each adjustment / filter kind
// stores its named presets keyed by `(kind, id, name)` in localStorage so the
// Save Preset… / Load Preset / Delete Preset menu items inside every dialog
// share the same backing store. Presets are pure parameter snapshots — no
// pixel data — so storage stays small and they round-trip across sessions.

import type { StateCreator } from 'zustand';
import type { EditorStore } from './types';
import type { LayerEffect } from '../core/Layer';
import type { BlendModeId } from '../core/blendModes';

const STORAGE_KEY = 'photoweb:adjustmentFilterPresets:v1';
const LAYER_STYLE_STORAGE_KEY = 'photoweb:layerStylePresets:v1';

export type PresetKind = 'adjustment' | 'filter';

export interface PresetEntry {
    id: string;
    name: string;
    params: Record<string, unknown>;
}

export interface LayerStylePresetEntry {
    id: string;
    name: string;
    effects: LayerEffect[];
    blendMode?: BlendModeId;
    opacity?: number;
    fill?: number;
}

export type PresetStore = Record<PresetKind, Record<string, PresetEntry[]>>;

function emptyStore(): PresetStore {
    return { adjustment: {}, filter: {} };
}

function loadStore(): PresetStore {
    if (typeof localStorage === 'undefined') return emptyStore();
    try {
        const raw = localStorage.getItem(STORAGE_KEY);
        if (!raw) return emptyStore();
        const parsed = JSON.parse(raw);
        if (!parsed || typeof parsed !== 'object') return emptyStore();
        const out = emptyStore();
        for (const kind of ['adjustment', 'filter'] as PresetKind[]) {
            const entry = parsed[kind];
            if (entry && typeof entry === 'object') {
                for (const id of Object.keys(entry)) {
                    const arr = entry[id];
                    if (Array.isArray(arr)) {
                        out[kind][id] = arr.filter(item =>
                            item && typeof item.id === 'string' && typeof item.name === 'string' && item.params && typeof item.params === 'object'
                        );
                    }
                }
            }
        }
        return out;
    } catch {
        return emptyStore();
    }
}

function cloneEffects(effects: LayerEffect[] | undefined): LayerEffect[] {
    return (effects ?? []).map(effect => ({
        kind: effect.kind,
        enabled: effect.enabled,
        params: typeof structuredClone === 'function'
            ? structuredClone(effect.params ?? {})
            : JSON.parse(JSON.stringify(effect.params ?? {})) as Record<string, unknown>,
    }));
}

function loadLayerStyles(): LayerStylePresetEntry[] {
    if (typeof localStorage === 'undefined') return [];
    try {
        const raw = localStorage.getItem(LAYER_STYLE_STORAGE_KEY);
        if (!raw) return [];
        const parsed = JSON.parse(raw);
        if (!Array.isArray(parsed)) return [];
        return parsed.filter(item =>
            item && typeof item.id === 'string' && typeof item.name === 'string' && Array.isArray(item.effects)
        ).map(item => ({
            id: item.id,
            name: item.name,
            effects: cloneEffects(item.effects),
            blendMode: item.blendMode,
            opacity: typeof item.opacity === 'number' ? item.opacity : undefined,
            fill: typeof item.fill === 'number' ? item.fill : undefined,
        }));
    } catch {
        return [];
    }
}

function persistStore(store: PresetStore): void {
    if (typeof localStorage === 'undefined') return;
    try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(store));
    } catch {
        // Quota — non-fatal, presets simply don't survive the session.
    }
}

function persistLayerStyles(styles: LayerStylePresetEntry[]): void {
    if (typeof localStorage === 'undefined') return;
    try {
        localStorage.setItem(LAYER_STYLE_STORAGE_KEY, JSON.stringify(styles));
    } catch {
        // Quota — non-fatal, styles simply don't survive the session.
    }
}

function makeId(): string {
    return `preset-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

export interface PresetsSlice {
    presetStore: PresetStore;
    layerStylePresets: LayerStylePresetEntry[];
    listPresets: (kind: PresetKind, id: string) => PresetEntry[];
    savePreset: (kind: PresetKind, id: string, name: string, params: Record<string, unknown>) => PresetEntry;
    deletePreset: (kind: PresetKind, id: string, presetId: string) => void;
    renamePreset: (kind: PresetKind, id: string, presetId: string, newName: string) => void;
    saveLayerStylePresetFromLayer: (layerId: string, name: string, includeEffects: boolean, includeBlendingOptions: boolean) => LayerStylePresetEntry | null;
    applyLayerStylePreset: (layerId: string, presetId: string) => void;
    deleteLayerStylePreset: (presetId: string) => void;
    /** Test-only: empty all stored presets. */
    clearAllPresets: () => void;
}

export const createPresetsSlice: StateCreator<EditorStore, [], [], PresetsSlice> = (set, get) => ({
    presetStore: loadStore(),
    layerStylePresets: loadLayerStyles(),
    listPresets: (kind, id) => {
        const slot = get().presetStore[kind][id];
        return slot ? [...slot] : [];
    },
    savePreset: (kind, id, name, params) => {
        const entry: PresetEntry = { id: makeId(), name, params: { ...params } };
        set(state => {
            const next: PresetStore = {
                adjustment: { ...state.presetStore.adjustment },
                filter: { ...state.presetStore.filter },
            };
            const existing = next[kind][id] ?? [];
            // Replace by name (case-insensitive) to mirror Photoshop's Save behavior.
            const filtered = existing.filter(p => p.name.toLowerCase() !== name.toLowerCase());
            next[kind][id] = [...filtered, entry];
            persistStore(next);
            return { presetStore: next };
        });
        return entry;
    },
    deletePreset: (kind, id, presetId) => {
        set(state => {
            const slot = state.presetStore[kind][id];
            if (!slot) return state;
            const next: PresetStore = {
                adjustment: { ...state.presetStore.adjustment },
                filter: { ...state.presetStore.filter },
            };
            next[kind][id] = slot.filter(p => p.id !== presetId);
            if (next[kind][id].length === 0) delete next[kind][id];
            persistStore(next);
            return { presetStore: next };
        });
    },
    renamePreset: (kind, id, presetId, newName) => {
        set(state => {
            const slot = state.presetStore[kind][id];
            if (!slot) return state;
            const next: PresetStore = {
                adjustment: { ...state.presetStore.adjustment },
                filter: { ...state.presetStore.filter },
            };
            next[kind][id] = slot.map(p => p.id === presetId ? { ...p, name: newName } : p);
            persistStore(next);
            return { presetStore: next };
        });
    },
    saveLayerStylePresetFromLayer: (layerId, name, includeEffects, includeBlendingOptions) => {
        const layer = get().layers.find(l => l.id === layerId);
        if (!layer) return null;
        const trimmed = name.trim() || 'New Style';
        const entry: LayerStylePresetEntry = {
            id: makeId(),
            name: trimmed,
            effects: includeEffects ? cloneEffects(layer.effects) : [],
            ...(includeBlendingOptions ? { blendMode: layer.blendMode, opacity: layer.opacity, fill: layer.fill } : {}),
        };
        set(state => {
            const next = [
                ...state.layerStylePresets.filter(style => style.name.toLowerCase() !== trimmed.toLowerCase()),
                entry,
            ];
            persistLayerStyles(next);
            return { layerStylePresets: next };
        });
        return entry;
    },
    applyLayerStylePreset: (layerId, presetId) => {
        const preset = get().layerStylePresets.find(style => style.id === presetId);
        if (!preset) return;
        get().executeDocumentCommand({
            kind: 'layer-property',
            label: `Apply Style ${preset.name}`,
            affectedIds: [layerId],
            layerId,
            run: () => {
                const { layers } = get();
                const layer = layers.find(l => l.id === layerId);
                if (!layer || layer.isBackground) return;
                layer.effects = cloneEffects(preset.effects);
                if (preset.blendMode) layer.blendMode = preset.blendMode;
                if (typeof preset.opacity === 'number') layer.opacity = preset.opacity;
                if (typeof preset.fill === 'number') layer.fill = preset.fill;
                layer.markDirty(null);
                set({ layers: [...layers] });
            },
        });
    },
    deleteLayerStylePreset: (presetId) => {
        set(state => {
            const next = state.layerStylePresets.filter(style => style.id !== presetId);
            persistLayerStyles(next);
            return { layerStylePresets: next };
        });
    },
    clearAllPresets: () => {
        set({ presetStore: emptyStore(), layerStylePresets: [] });
        if (typeof localStorage !== 'undefined') {
            try {
                localStorage.removeItem(STORAGE_KEY);
                localStorage.removeItem(LAYER_STYLE_STORAGE_KEY);
            } catch { /* noop */ }
        }
    },
});
