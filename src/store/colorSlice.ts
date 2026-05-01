import type { StateCreator } from 'zustand';
import type { ColorSlice, EditorStore } from './types';

export const createColorSlice: StateCreator<EditorStore, [], [], ColorSlice> = (set) => ({
    primaryColor: '#000000',
    secondaryColor: '#ffffff',
    setPrimaryColor: (color) => set({ primaryColor: color }),
    setSecondaryColor: (color) => set({ secondaryColor: color }),
    swapColors: () => set(state => ({
        primaryColor: state.secondaryColor,
        secondaryColor: state.primaryColor,
    })),
});
