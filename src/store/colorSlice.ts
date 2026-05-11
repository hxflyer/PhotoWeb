import type { StateCreator } from 'zustand';
import type { ColorSlice, EditorStore } from './types';

const DEFAULT_SWATCHES = [
    '#ff0000', '#ff8000', '#ffff00', '#80ff00',
    '#00ff00', '#00ff80', '#00ffff', '#0080ff',
    '#0000ff', '#8000ff', '#ff00ff', '#ff0080',
    '#000000', '#404040', '#808080', '#c0c0c0', '#ffffff',
];

const SWATCHES_STORAGE_KEY = 'photoweb:swatches:v1';

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

function persistSwatches(swatches: string[]): void {
    if (typeof localStorage === 'undefined') return;
    try {
        localStorage.setItem(SWATCHES_STORAGE_KEY, JSON.stringify(swatches));
    } catch {
        // Storage disabled or quota exceeded — non-fatal.
    }
}

export const createColorSlice: StateCreator<EditorStore, [], [], ColorSlice> = (set) => ({
    primaryColor: '#000000',
    secondaryColor: '#ffffff',
    swatches: loadSwatches(),
    setPrimaryColor: (color) => set({ primaryColor: color }),
    setSecondaryColor: (color) => set({ secondaryColor: color }),
    swapColors: () => set(state => ({
        primaryColor: state.secondaryColor,
        secondaryColor: state.primaryColor,
    })),
    resetColors: () => set({ primaryColor: '#000000', secondaryColor: '#ffffff' }),
    addSwatch: (color) => set(state => {
        const next = [...state.swatches, color];
        persistSwatches(next);
        return { swatches: next };
    }),
    removeSwatch: (index) => set(state => {
        const next = state.swatches.filter((_, i) => i !== index);
        persistSwatches(next);
        return { swatches: next };
    }),
});
