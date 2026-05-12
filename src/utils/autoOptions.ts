// Pure types + mapping for Auto Color Correction Options. Kept out of
// AutoOptionsDialog.tsx so non-component exports do not trip Vite's
// react-refresh/only-export-components rule.

export type AutoEnhancementMode =
    | 'find-dark-light'
    | 'per-channel-contrast'
    | 'monochromatic-contrast'
    | 'brightness-contrast';

export interface AutoOptions {
    mode: AutoEnhancementMode;
    snapNeutralMidtones: boolean;
    shadowsColor: string;
    midtonesColor: string;
    highlightsColor: string;
    shadowsClipPercent: number;
    highlightsClipPercent: number;
}

export const DEFAULT_AUTO_OPTIONS: AutoOptions = {
    mode: 'find-dark-light',
    snapNeutralMidtones: true,
    shadowsColor: '#000000',
    midtonesColor: '#808080',
    highlightsColor: '#ffffff',
    shadowsClipPercent: 0.1,
    highlightsClipPercent: 0.1,
};

const STORAGE_KEY = 'photoweb:autoOptions:v1';

export function loadAutoOptions(): AutoOptions {
    if (typeof localStorage === 'undefined') return { ...DEFAULT_AUTO_OPTIONS };
    try {
        const raw = localStorage.getItem(STORAGE_KEY);
        if (!raw) return { ...DEFAULT_AUTO_OPTIONS };
        const parsed = JSON.parse(raw) as Partial<AutoOptions>;
        return { ...DEFAULT_AUTO_OPTIONS, ...parsed };
    } catch {
        return { ...DEFAULT_AUTO_OPTIONS };
    }
}

export function saveAutoOptions(opts: AutoOptions): void {
    if (typeof localStorage === 'undefined') return;
    try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(opts));
    } catch {
        // quota or storage disabled — non-fatal.
    }
}

export function autoOptionsToAdjustmentId(mode: AutoEnhancementMode): 'auto-tone' | 'auto-contrast' | 'auto-color' {
    if (mode === 'find-dark-light') return 'auto-color';
    if (mode === 'per-channel-contrast') return 'auto-tone';
    return 'auto-contrast';
}
