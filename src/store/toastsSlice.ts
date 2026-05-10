import type { StateCreator } from 'zustand';
import type { EditorStore, ToastsSlice } from './types';

export const createToastsSlice: StateCreator<EditorStore, [], [], ToastsSlice> = (set) => ({
    toasts: [],
    addToast: (message, type = 'info') => {
        const id = crypto.randomUUID();
        set(state => ({ toasts: [...state.toasts, { id, message, type }] }));
        // Auto-remove after 4 seconds
        setTimeout(() => {
            set(state => ({ toasts: state.toasts.filter(t => t.id !== id) }));
        }, 4000);
    },
    removeToast: (id) => set(state => ({ toasts: state.toasts.filter(t => t.id !== id) })),
});
