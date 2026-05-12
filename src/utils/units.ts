// Unit conversions between Photoshop-style units (pixels, percent, inches,
// centimeters, millimeters) given a DPI / reference base. All conversions
// pivot on pixels because that's photoweb's authoritative storage.

export type LengthUnit = 'px' | 'percent' | 'in' | 'cm' | 'mm';

export const LENGTH_UNIT_LABELS: Record<LengthUnit, string> = {
    px: 'Pixels',
    percent: 'Percent',
    in: 'Inches',
    cm: 'Centimeters',
    mm: 'Millimeters',
};

export interface UnitContext {
    /** Pixels per inch — defaults to 72, matching screen-resolution Photoshop defaults. */
    dpi?: number;
    /** Reference value for percent conversions, in pixels. */
    base?: number;
}

const DEFAULT_DPI = 72;

export function toPixels(value: number, unit: LengthUnit, ctx: UnitContext = {}): number {
    const dpi = ctx.dpi ?? DEFAULT_DPI;
    switch (unit) {
        case 'px': return value;
        case 'percent': return (value / 100) * (ctx.base ?? 0);
        case 'in': return value * dpi;
        case 'cm': return (value / 2.54) * dpi;
        case 'mm': return (value / 25.4) * dpi;
    }
}

export function fromPixels(value: number, unit: LengthUnit, ctx: UnitContext = {}): number {
    const dpi = ctx.dpi ?? DEFAULT_DPI;
    switch (unit) {
        case 'px': return value;
        case 'percent': return ctx.base ? (value / ctx.base) * 100 : 0;
        case 'in': return value / dpi;
        case 'cm': return (value / dpi) * 2.54;
        case 'mm': return (value / dpi) * 25.4;
    }
}

export function convertLength(
    value: number,
    from: LengthUnit,
    to: LengthUnit,
    ctx: UnitContext = {},
): number {
    if (from === to) return value;
    const px = toPixels(value, from, ctx);
    return fromPixels(px, to, ctx);
}
