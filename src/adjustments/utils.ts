export const clampByte = (v: number): number => Math.max(0, Math.min(255, Math.round(v)));
export const clamp01 = (v: number): number => Math.max(0, Math.min(1, v));

export function mergeDefaults<P extends Record<string, unknown>>(
    defaults: P,
    params: Partial<P> | Record<string, unknown> | undefined,
): P {
    return { ...defaults, ...(params ?? {}) } as P;
}

export function numberParam(
    params: Record<string, unknown>,
    key: string,
    fallback: number,
    min = -Infinity,
    max = Infinity,
): number {
    const value = params[key];
    const n = typeof value === 'number' ? value : Number(value);
    if (!Number.isFinite(n)) return fallback;
    return Math.max(min, Math.min(max, n));
}

export function booleanParam(params: Record<string, unknown>, key: string, fallback: boolean): boolean {
    const value = params[key];
    return typeof value === 'boolean' ? value : fallback;
}

export function stringParam(params: Record<string, unknown>, key: string, fallback: string): string {
    const value = params[key];
    return typeof value === 'string' ? value : fallback;
}

export function parseHexColor(color: unknown, fallback: [number, number, number]): [number, number, number] {
    if (typeof color !== 'string') return fallback;
    const normalized = color.trim();
    const short = /^#([0-9a-f]{3})$/i.exec(normalized);
    if (short) {
        const [, hex] = short;
        return [
            parseInt(hex[0] + hex[0], 16),
            parseInt(hex[1] + hex[1], 16),
            parseInt(hex[2] + hex[2], 16),
        ];
    }
    const full = /^#([0-9a-f]{6})$/i.exec(normalized);
    if (!full) return fallback;
    const [, hex] = full;
    return [
        parseInt(hex.slice(0, 2), 16),
        parseInt(hex.slice(2, 4), 16),
        parseInt(hex.slice(4, 6), 16),
    ];
}
