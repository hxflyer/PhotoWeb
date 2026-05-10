import type { ReactNode } from 'react';

export interface FilterApplyContext {
    image: ImageData;
    width: number;
    height: number;
    /** Selection mask: same dimensions as image, alpha channel is selection weight 0-255. Null = full image selected. */
    selectionMask: ImageData | null;
    /** Dirty region to restrict processing. Null = full image. */
    dirtyRect: { x: number; y: number; width: number; height: number } | null;
}

export interface Filter<P = Record<string, unknown>> {
    id: string;
    label: string;
    defaultParams: P;
    /** Pure transform — returns a new ImageData (same dimensions). */
    apply: (params: P, ctx: FilterApplyContext) => ImageData;
    /** Optional React UI rendered inside FilterDialog. */
    renderUI?: (params: P, onChange: (next: P) => void) => ReactNode;
}
