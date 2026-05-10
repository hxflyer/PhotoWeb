import type { StateCreator } from 'zustand';
import type { ColorSlice, EditorStore } from './types';

const DEFAULT_SWATCHES = [
    '#ff0000', '#ff8000', '#ffff00', '#80ff00',
    '#00ff00', '#00ff80', '#00ffff', '#0080ff',
    '#0000ff', '#8000ff', '#ff00ff', '#ff0080',
    '#000000', '#404040', '#808080', '#c0c0c0', '#ffffff',
];

export const createColorSlice: StateCreator<EditorStore, [], [], ColorSlice> = (set) => ({
    primaryColor: '#000000',
    secondaryColor: '#ffffff',
    swatches: [...DEFAULT_SWATCHES],
    setPrimaryColor: (color) => set({ primaryColor: color }),
    setSecondaryColor: (color) => set({ secondaryColor: color }),
    swapColors: () => set(state => ({
        primaryColor: state.secondaryColor,
        secondaryColor: state.primaryColor,
    })),
    resetColors: () => set({ primaryColor: '#000000', secondaryColor: '#ffffff' }),
    addSwatch: (color) => set(state => ({ swatches: [...state.swatches, color] })),
    removeSwatch: (index) => set(state => ({
        swatches: state.swatches.filter((_, i) => i !== index),
    })),
});
