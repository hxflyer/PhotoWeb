import type { ReactNode } from 'react';

export interface AdjustmentApplyContext {
    image: ImageData;
    width: number;
    height: number;
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
