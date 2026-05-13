// LocalStorage helpers for the New Document dialog: saved-preset list, Recent
// list, and the Untitled-N counter. Pure functions; safe to call from React
// effects.

export type PresetBackground = 'white' | 'black' | 'transparent' | string;

export interface NewDocPreset {
    id: string;
    name: string;
    width: number;
    height: number;
    resolution: number;
    background: PresetBackground;
    ts: number;
}

const SAVED_KEY = 'photoweb:newDocPresets:v1';
const RECENT_KEY = 'photoweb:newDocRecent:v1';
const UNTITLED_KEY = 'photoweb:newDocUntitledIndex:v1';
const RECENT_CAP = 8;

function safeStorage(): Storage | null {
    try {
        if (typeof localStorage === 'undefined') return null;
        return localStorage;
    } catch {
        return null;
    }
}

function readList(key: string): NewDocPreset[] {
    const s = safeStorage();
    if (!s) return [];
    try {
        const raw = s.getItem(key);
        if (!raw) return [];
        const parsed = JSON.parse(raw);
        if (!Array.isArray(parsed)) return [];
        return parsed.filter((p): p is NewDocPreset =>
            p && typeof p.id === 'string'
            && typeof p.name === 'string'
            && Number.isFinite(p.width) && Number.isFinite(p.height)
            && Number.isFinite(p.resolution)
            && typeof p.background === 'string'
            && Number.isFinite(p.ts));
    } catch {
        return [];
    }
}

function writeList(key: string, list: NewDocPreset[]): void {
    const s = safeStorage();
    if (!s) return;
    try { s.setItem(key, JSON.stringify(list)); } catch { /* quota */ }
}

export function listSavedPresets(): NewDocPreset[] {
    return readList(SAVED_KEY);
}

export function savePreset(preset: Omit<NewDocPreset, 'id' | 'ts'>): NewDocPreset | null {
    if (!preset.name.trim()) return null;
    const list = readList(SAVED_KEY);
    const entry: NewDocPreset = {
        id: `np-${Date.now()}-${Math.floor(Math.random() * 1e6)}`,
        ts: Date.now(),
        ...preset,
        name: preset.name.trim(),
    };
    list.unshift(entry);
    writeList(SAVED_KEY, list);
    return entry;
}

export function deleteSavedPreset(id: string): void {
    const list = readList(SAVED_KEY).filter(p => p.id !== id);
    writeList(SAVED_KEY, list);
}

export function listRecentPresets(): NewDocPreset[] {
    return readList(RECENT_KEY);
}

export function pushRecentPreset(preset: Omit<NewDocPreset, 'id' | 'ts'>): void {
    const list = readList(RECENT_KEY);
    const entry: NewDocPreset = {
        id: `nr-${Date.now()}-${Math.floor(Math.random() * 1e6)}`,
        ts: Date.now(),
        ...preset,
    };
    list.unshift(entry);
    writeList(RECENT_KEY, list.slice(0, RECENT_CAP));
}

export function peekNextUntitledIndex(): number {
    const s = safeStorage();
    if (!s) return 1;
    try {
        const raw = s.getItem(UNTITLED_KEY);
        if (!raw) return 1;
        const n = Number(raw);
        if (!Number.isFinite(n) || n < 1) return 1;
        return Math.floor(n);
    } catch {
        return 1;
    }
}

export function consumeNextUntitledIndex(): number {
    const next = peekNextUntitledIndex();
    const s = safeStorage();
    if (s) {
        try { s.setItem(UNTITLED_KEY, String(next + 1)); } catch { /* quota */ }
    }
    return next;
}

// Used by tests to start from a clean slate.
export function __resetNewDocPresetsForTests(): void {
    const s = safeStorage();
    if (!s) return;
    try {
        s.removeItem(SAVED_KEY);
        s.removeItem(RECENT_KEY);
        s.removeItem(UNTITLED_KEY);
    } catch { /* */ }
}
