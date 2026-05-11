import type { Layer } from '../core/Layer';

export interface ViewportInfo {
    width: number;
    height: number;
    zoom: number;
    pan: { x: number; y: number };
}

export interface CompositeRequest {
    layers: Layer[];
    activeLayerId: string | null;
    viewport: ViewportInfo;
    target: HTMLCanvasElement;
    activeChannel?: 'rgb' | 'r' | 'g' | 'b';
    channelVisibility?: { r: boolean; g: boolean; b: boolean };
    skipTypeLayers?: boolean;
}

export interface DirtyRect {
    x: number;
    y: number;
    width: number;
    height: number;
}

export interface Compositor {
    beginFrame(target: HTMLCanvasElement, viewport: ViewportInfo): void;
    render(req: CompositeRequest): void;
    uploadRegion(layer: Layer, rect: DirtyRect): void;
    present(target: HTMLCanvasElement): void;
}
