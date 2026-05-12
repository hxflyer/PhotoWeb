// Adjustment + filter preset infrastructure. Each adjustment / filter kind
// stores its named presets keyed by `(kind, id, name)` in localStorage so the
// Save Preset… / Load Preset / Delete Preset menu items inside every dialog
// share the same backing store. Presets are pure parameter snapshots — no
// pixel data — so storage stays small and they round-trip across sessions.

import type { StateCreator } from 'zustand';
import type { EditorStore } from './types';

const STORAGE_KEY = 'photoweb:adjustmentFilterPresets:v1';

export type PresetKind = 'adjustment' | 'filter';

export interface PresetEntry {
    id: string;
    name: string;
    params: Record<string, unknown>;
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

function persistStore(store: PresetStore): void {
    if (typeof localStorage === 'undefined') return;
    try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(store));
    } catch {
        // Quota — non-fatal, presets simply don't survive the session.
    }
}

function makeId(): string {
    return `preset-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

export interface PresetsSlice {
    presetStore: PresetStore;
    listPresets: (kind: PresetKind, id: string) => PresetEntry[];
    savePreset: (kind: PresetKind, id: string, name: string, params: Record<string, unknown>) => PresetEntry;
    deletePreset: (kind: PresetKind, id: string, presetId: string) => void;
    renamePreset: (kind: PresetKind, id: string, presetId: string, newName: string) => void;
    /** Test-only: empty all stored presets. */
    clearAllPresets: () => void;
}

export const createPresetsSlice: StateCreator<EditorStore, [], [], PresetsSlice> = (set, get) => ({
    presetStore: loadStore(),
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
    clearAllPresets: () => {
        set({ presetStore: emptyStore() });
        if (typeof localStorage !== 'undefined') {
            try { localStorage.removeItem(STORAGE_KEY); } catch { /* noop */ }
        }
    },
});
