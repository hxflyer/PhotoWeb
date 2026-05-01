import type { StateCreator } from 'zustand';
import type { EditorStore, PanelsSlice } from './types';

export const createPanelsSlice: StateCreator<EditorStore, [], [], PanelsSlice> = (set) => ({
    dialogs: {
        isFeatherDialogOpen: false,
    },
    setFeatherDialogOpen: (open) => set(state => ({
        dialogs: { ...state.dialogs, isFeatherDialogOpen: open },
    })),
});
