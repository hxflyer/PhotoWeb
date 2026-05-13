import type { StateCreator } from 'zustand';
import type { ColorSlice, EditorStore, SwatchGroup, SwatchItem } from './types';

const DEFAULT_SWATCHES = [
    '#ff0000', '#ff8000', '#ffff00', '#80ff00',
    '#00ff00', '#00ff80', '#00ffff', '#0080ff',
    '#0000ff', '#8000ff', '#ff00ff', '#ff0080',
    '#000000', '#404040', '#808080', '#c0c0c0', '#ffffff',
];

const SWATCHES_STORAGE_KEY = 'photoweb:swatches:v1';
const SWATCH_GROUPS_STORAGE_KEY = 'photoweb:swatchGroups:v1';

function swatchId(): string {
    return typeof crypto !== 'undefined' && 'randomUUID' in crypto
        ? crypto.randomUUID()
        : `swatch-${Math.random().toString(36).slice(2)}`;
}

function normalizeHex(color: string): string {
    const value = color.trim().toLowerCase();
    if (/^#[0-9a-f]{6}$/.test(value)) return value;
    if (/^#[0-9a-f]{3}$/.test(value)) {
        return `#${value[1]}${value[1]}${value[2]}${value[2]}${value[3]}${value[3]}`;
    }
    return color;
}

function colorName(color: string): string {
    return normalizeHex(color).toUpperCase();
}

function makeSwatch(color: string, name = colorName(color)): SwatchItem {
    return { id: swatchId(), color: normalizeHex(color), name };
}

function flattenGroups(groups: SwatchGroup[]): string[] {
    return groups.flatMap(group => group.swatches.map(swatch => swatch.color));
}

function defaultSwatchGroups(): SwatchGroup[] {
    return [
        {
            id: 'default-rgb',
            name: 'RGB',
            collapsed: false,
            swatches: DEFAULT_SWATCHES.slice(0, 12).map(color => makeSwatch(color)),
        },
        {
            id: 'default-grayscale',
            name: 'Grayscale',
            collapsed: false,
            swatches: DEFAULT_SWATCHES.slice(12).map(color => makeSwatch(color)),
        },
    ];
}

function isSwatchGroup(value: unknown): value is SwatchGroup {
    if (!value || typeof value !== 'object') return false;
    const group = value as Partial<SwatchGroup>;
    return typeof group.id === 'string'
        && typeof group.name === 'string'
        && typeof group.collapsed === 'boolean'
        && Array.isArray(group.swatches)
        && group.swatches.every(swatch => {
            const item = swatch as Partial<SwatchItem>;
            return typeof item.id === 'string'
                && typeof item.color === 'string'
                && typeof item.name === 'string';
        });
}

function loadSwatches(): string[] {
    if (typeof localStorage === 'undefined') return [...DEFAULT_SWATCHES];
    try {
        const raw = localStorage.getItem(SWATCHES_STORAGE_KEY);
        if (!raw) return [...DEFAULT_SWATCHES];
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed) && parsed.every(v => typeof v === 'string')) {
            return parsed as string[];
        }
        return [...DEFAULT_SWATCHES];
    } catch {
        return [...DEFAULT_SWATCHES];
    }
}

function loadSwatchGroups(): SwatchGroup[] {
    if (typeof localStorage === 'undefined') return defaultSwatchGroups();
    try {
        const rawGroups = localStorage.getItem(SWATCH_GROUPS_STORAGE_KEY);
        if (rawGroups) {
            const parsed = JSON.parse(rawGroups);
            if (Array.isArray(parsed) && parsed.every(isSwatchGroup) && parsed.length > 0) {
                return parsed.map(group => ({
                    ...group,
                    swatches: group.swatches.map(swatch => ({
                        ...swatch,
                        color: normalizeHex(swatch.color),
                    })),
                }));
            }
        }
        const flat = loadSwatches();
        return [{
            id: 'default-swatches',
            name: 'Default Swatches',
            collapsed: false,
            swatches: flat.map(color => makeSwatch(color)),
        }];
    } catch {
        return defaultSwatchGroups();
    }
}

function persistSwatches(swatches: string[], groups?: SwatchGroup[]): void {
    if (typeof localStorage === 'undefined') return;
    try {
        localStorage.setItem(SWATCHES_STORAGE_KEY, JSON.stringify(swatches));
        if (groups) localStorage.setItem(SWATCH_GROUPS_STORAGE_KEY, JSON.stringify(groups));
    } catch {
        // Storage disabled or quota exceeded — non-fatal.
    }
}

export const createColorSlice: StateCreator<EditorStore, [], [], ColorSlice> = (set, get) => {
    const initialGroups = loadSwatchGroups();
    return ({
    primaryColor: '#000000',
    secondaryColor: '#ffffff',
    swatchGroups: initialGroups,
    selectedSwatchGroupId: initialGroups[0]?.id ?? 'default-swatches',
    swatches: flattenGroups(initialGroups),
    setPrimaryColor: (color) => set({ primaryColor: color }),
    setSecondaryColor: (color) => set({ secondaryColor: color }),
    swapColors: () => set(state => ({
        primaryColor: state.secondaryColor,
        secondaryColor: state.primaryColor,
    })),
    resetColors: () => set({ primaryColor: '#000000', secondaryColor: '#ffffff' }),
    addSwatch: (color, name, groupId) => set(state => {
        const existingGroups = state.swatchGroups?.length ? state.swatchGroups : [{
            id: 'default-swatches',
            name: 'Default Swatches',
            collapsed: false,
            swatches: (state.swatches ?? []).map(value => makeSwatch(value)),
        }];
        const selectedId = groupId ?? state.selectedSwatchGroupId ?? existingGroups[0]?.id;
        const nextGroups = existingGroups.map(group => group.id === selectedId
            ? { ...group, collapsed: false, swatches: [...group.swatches, makeSwatch(color, name)] }
            : group);
        const next = flattenGroups(nextGroups);
        persistSwatches(next, nextGroups);
        return { swatches: next, swatchGroups: nextGroups, selectedSwatchGroupId: selectedId };
    }),
    removeSwatch: (index, groupId) => set(state => {
        const existingGroups = state.swatchGroups?.length ? state.swatchGroups : [{
            id: 'default-swatches',
            name: 'Default Swatches',
            collapsed: false,
            swatches: (state.swatches ?? []).map(value => makeSwatch(value)),
        }];
        if (!groupId) {
            let remaining = index;
            const nextGroups = existingGroups.map(group => {
                if (remaining >= group.swatches.length) {
                    remaining -= group.swatches.length;
                    return group;
                }
                if (remaining < 0) return group;
                const next = group.swatches.filter((_, i) => i !== remaining);
                remaining = -1;
                return { ...group, swatches: next };
            });
            const next = flattenGroups(nextGroups);
            persistSwatches(next, nextGroups);
            return { swatches: next, swatchGroups: nextGroups };
        }
        const nextGroups = existingGroups.map(group => group.id === groupId
            ? { ...group, swatches: group.swatches.filter((_, i) => i !== index) }
            : group);
        const next = flattenGroups(nextGroups);
        persistSwatches(next, nextGroups);
        return { swatches: next, swatchGroups: nextGroups };
    }),
    addSwatchGroup: (name) => {
        const id = swatchId();
        const group: SwatchGroup = {
            id,
            name: name?.trim() || `Swatch Group ${get().swatchGroups.length + 1}`,
            collapsed: false,
            swatches: [],
        };
        set(state => {
            const nextGroups = [...(state.swatchGroups ?? []), group];
            const next = flattenGroups(nextGroups);
            persistSwatches(next, nextGroups);
            return { swatchGroups: nextGroups, selectedSwatchGroupId: id, swatches: next };
        });
        return id;
    },
    selectSwatchGroup: (id) => set({ selectedSwatchGroupId: id }),
    toggleSwatchGroup: (id, all = false) => set(state => {
        const target = state.swatchGroups.find(group => group.id === id);
        if (!target) return {};
        const collapsed = !target.collapsed;
        const nextGroups = all
            ? state.swatchGroups.map(group => ({ ...group, collapsed }))
            : state.swatchGroups.map(group => group.id === id ? { ...group, collapsed } : group);
        persistSwatches(state.swatches, nextGroups);
        return { swatchGroups: nextGroups };
    }),
    renameSwatchGroup: (id, name) => set(state => {
        const trimmed = name.trim();
        if (!trimmed) return {};
        const nextGroups = state.swatchGroups.map(group => group.id === id ? { ...group, name: trimmed } : group);
        persistSwatches(state.swatches, nextGroups);
        return { swatchGroups: nextGroups };
    }),
    });
};
