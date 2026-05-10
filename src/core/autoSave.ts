/**
 * Auto-save logic: saves to OPFS slot "autosave.pwbdoc" every 60 seconds.
 * On app start, callers should check for an existing autosave and show a
 * recovery banner.
 */
import { autosave, checkAutosave } from './persistence';

type MinimalStore = {
    layers: import('./Layer').Layer[];
    activeLayerId: string | null;
    width: number;
    height: number;
    documentName: string;
    setHasAutosave: (has: boolean) => void;
};

let autoSaveTimer: ReturnType<typeof setInterval> | null = null;

export function startAutoSave(getStore: () => MinimalStore, intervalMs = 60_000): void {
    if (autoSaveTimer !== null) return;
    autoSaveTimer = setInterval(async () => {
        const store = getStore();
        if (store.layers.length === 0) return;
        await autosave(store);
    }, intervalMs);
}

export function stopAutoSave(): void {
    if (autoSaveTimer !== null) {
        clearInterval(autoSaveTimer);
        autoSaveTimer = null;
    }
}

export async function initAutoSaveCheck(getStore: () => MinimalStore): Promise<void> {
    const has = await checkAutosave();
    if (has) {
        getStore().setHasAutosave(true);
    }
    startAutoSave(getStore);
}
