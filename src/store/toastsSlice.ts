import type { StateCreator } from 'zustand';
import type { EditorStore, ToastsSlice, ToastErrorChannel } from './types';

export const createToastsSlice: StateCreator<EditorStore, [], [], ToastsSlice> = (set, get) => ({
    toasts: [],
    lastErrorChannel: null,
    addToast: (message, type = 'info') => {
        const id = crypto.randomUUID();
        set(state => ({ toasts: [...state.toasts, { id, message, type }] }));
        // Auto-remove after 4 seconds
        setTimeout(() => {
            set(state => ({ toasts: state.toasts.filter(t => t.id !== id) }));
        }, 4000);
    },
    reportError: (channel: ToastErrorChannel, message: string, type: 'info' | 'error' | 'success' = 'error') => {
        if (get().lastErrorChannel === channel) return;
        set({ lastErrorChannel: channel });
        const id = crypto.randomUUID();
        set(state => ({ toasts: [...state.toasts, { id, message, type }] }));
        setTimeout(() => {
            set(state => ({ toasts: state.toasts.filter(t => t.id !== id) }));
        }, 4000);
    },
    removeToast: (id) => set(state => ({ toasts: state.toasts.filter(t => t.id !== id) })),
    clearLastErrorChannel: () => set({ lastErrorChannel: null }),
});
