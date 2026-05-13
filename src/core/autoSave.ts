/**
 * Auto-save logic: saves to OPFS slot "autosave.pwbdoc" every 60 seconds.
 * On app start, callers should check for an existing autosave and show a
 * recovery banner.
 */
import { autosave, checkAutosave, clearAutosaveSlot, readAutosaveRaw } from './persistence';
import { useEditorStore } from '../store/editorStore';

type MinimalStore = {
    layers: import('./Layer').Layer[];
    activeLayerId: string | null;
    width: number;
    height: number;
    resolution: number;
    documentName: string;
    historyTick?: number;
    setHasAutosave: (has: boolean) => void;
};

let autoSaveTimer: ReturnType<typeof setInterval> | null = null;
let lastAutosaveHistoryTick = -1;
let autosaveErrorActive = false;

async function runAutosaveTick(store: MinimalStore): Promise<void> {
    try {
        await autosave(store);
        if (autosaveErrorActive) {
            autosaveErrorActive = false;
            const s = useEditorStore.getState();
            if (s.lastErrorChannel === 'autosave' || s.lastErrorChannel === 'quota') {
                s.clearLastErrorChannel?.();
            }
        }
    } catch {
        // First failure already pushed a deduped toast via saveDocument. Retry
        // once after a short tick — many transient OPFS / quota races resolve
        // on the next attempt. saveDocument internally also tries localStorage
        // as a fallback when OPFS fails, so this retry mainly covers the case
        // where both backends were momentarily contested.
        try {
            await new Promise(r => setTimeout(r, 50));
            await autosave(store);
            autosaveErrorActive = false;
            const s = useEditorStore.getState();
            if (s.lastErrorChannel === 'autosave' || s.lastErrorChannel === 'quota') {
                s.clearLastErrorChannel?.();
            }
        } catch {
            // Both attempts failed. saveDocument already pushed a deduped
            // toast on the 'autosave' or 'quota' channel; we don't double-toast.
            // Clear the slot so a corrupt blob doesn't keep failing every tick.
            autosaveErrorActive = true;
            await clearAutosaveSlot().catch(() => { /* ignore */ });
            useEditorStore.getState().setHasAutosave?.(false);
        }
    }
}

export function startAutoSave(getStore: () => MinimalStore, intervalMs = 60_000): void {
    if (autoSaveTimer !== null) return;
    // Snapshot the history tick at start so a fresh File > New (one blank layer,
    // no edits) doesn't trigger an autosave on the very first interval.
    lastAutosaveHistoryTick = getStore().historyTick ?? 0;
    autoSaveTimer = setInterval(async () => {
        const store = getStore();
        if (store.layers.length === 0) return;
        const tick = store.historyTick ?? 0;
        if (tick === lastAutosaveHistoryTick) return; // No edits since last save.
        await runAutosaveTick(store);
        lastAutosaveHistoryTick = tick;
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
        // STAB-02: validate the autosave blob is parseable before exposing the
        // Recover banner. A corrupt slot would otherwise greet the user every
        // session and fail on every Recover click.
        const raw = await readAutosaveRaw();
        let valid = false;
        if (raw) {
            try {
                const parsed = JSON.parse(raw) as { version?: unknown; layers?: unknown };
                valid = typeof parsed === 'object'
                    && parsed !== null
                    && Array.isArray(parsed.layers);
            } catch {
                valid = false;
            }
        }
        if (valid) {
            getStore().setHasAutosave(true);
        } else {
            await clearAutosaveSlot();
            useEditorStore.getState().addToast?.(
                'Corrupt recovery information cleared.',
                'info',
            );
        }
    }
    startAutoSave(getStore);
}

export async function performAutosaveOnce(getStore: () => MinimalStore): Promise<void> {
    await runAutosaveTick(getStore());
}

export function resetAutosaveErrorState(): void {
    autosaveErrorActive = false;
}
