/**
 * Centralized font registry used by the Character and Properties panels.
 *
 * - `getAvailableFonts()` returns the current cached list (synchronous).
 * - `refreshAvailableFonts()` re-queries `document.fonts` and merges in any
 *    new families the host has loaded since the last call.
 * - `resolveFontFamily()` tells the renderer whether a requested family is
 *    available; missing families fall back to `sans-serif` and the caller
 *    can surface a one-shot "Replace Missing Fonts" toast.
 *
 * The hardcoded baseline list is treated as always-available so a fresh tab
 * with no `document.fonts.values()` results still has a usable picker.
 */

export const BASE_FONT_FAMILIES = [
    'system-ui',
    'Arial',
    'Helvetica',
    'Georgia',
    'Times New Roman',
    'Courier New',
    'Verdana',
    'Tahoma',
    'Trebuchet MS',
    'Impact',
    'Comic Sans MS',
    'Myriad Pro',
    'Inter',
    'sans-serif',
    'serif',
    'monospace',
];

let cachedFonts: string[] = [...BASE_FONT_FAMILIES];

function dedupePreserveOrder(items: string[]): string[] {
    const seen = new Set<string>();
    const out: string[] = [];
    for (const item of items) {
        const key = item.toLowerCase();
        if (seen.has(key)) continue;
        seen.add(key);
        out.push(item);
    }
    return out;
}

export function getAvailableFonts(): string[] {
    return cachedFonts.slice();
}

export async function refreshAvailableFonts(): Promise<string[]> {
    const extras: string[] = [];
    try {
        const fonts = (typeof document !== 'undefined' ? document.fonts : null) as
            | (FontFaceSet & { ready?: Promise<unknown>; values?: () => IterableIterator<FontFace> })
            | null;
        if (fonts) {
            if (typeof fonts.ready?.then === 'function') {
                await fonts.ready;
            }
            const iter = fonts.values?.();
            if (iter) {
                for (const face of iter as IterableIterator<FontFace>) {
                    const family = face.family?.replace(/^['"]|['"]$/g, '');
                    if (family) extras.push(family);
                }
            }
        }
    } catch {
        // document.fonts can throw in restrictive sandboxes; keep the base list.
    }
    cachedFonts = dedupePreserveOrder([...BASE_FONT_FAMILIES, ...extras]).sort((a, b) => a.localeCompare(b));
    return cachedFonts.slice();
}

export function resolveFontFamily(requested: string): { resolved: string; isFallback: boolean } {
    if (!requested) return { resolved: 'sans-serif', isFallback: true };
    const lower = requested.toLowerCase();
    const present = cachedFonts.some(f => f.toLowerCase() === lower);
    if (present) return { resolved: requested, isFallback: false };
    return { resolved: 'sans-serif', isFallback: true };
}

const fallbackToastedLayers = new Set<string>();

export function shouldEmitFallbackToast(layerId: string): boolean {
    if (fallbackToastedLayers.has(layerId)) return false;
    fallbackToastedLayers.add(layerId);
    return true;
}

export function resetFontFallbackToastTracking(): void {
    fallbackToastedLayers.clear();
}

/**
 * Test-only helper to inject a known font list synchronously without going
 * through `document.fonts`.
 */
export function __setAvailableFontsForTest(list: string[]): void {
    cachedFonts = dedupePreserveOrder(list);
}
