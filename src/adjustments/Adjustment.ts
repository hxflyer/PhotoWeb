import type { ReactNode } from 'react';

export interface AdjustmentApplyContext {
    image: ImageData;
    width: number;
    height: number;
    /** Selection mask: same dimensions as image, alpha channel is selection weight 0-255. Null = full image selected. */
    selectionMask: ImageData | null;
    /** Dirty region to restrict processing. Null = full image. */
    dirtyRect: { x: number; y: number; width: number; height: number } | null;
}

export interface Adjustment<P = Record<string, unknown>> {
    id: string;
    label: string;
    defaultParams: P;
    apply: (params: P, ctx: AdjustmentApplyContext) => ImageData;
    renderUI?: (params: P, onChange: (next: P) => void) => ReactNode;
}

export interface AdjustmentLayerData {
    id: string;
    adjustmentId: string;
    params: Record<string, unknown>;
}
