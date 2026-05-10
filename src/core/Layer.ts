export type LayerKind = 'raster' | 'type' | 'shape' | 'adjustment' | 'fill' | 'group';

export interface LayerMask {
    canvas: HTMLCanvasElement;
    ctx: CanvasRenderingContext2D;
    enabled: boolean;
    linked: boolean;
}

export interface LayerTransform {
    x: number;
    y: number;
    rotation: number;
    scaleX: number;
    scaleY: number;
}

export type LayerEffectKind =
    | 'drop-shadow'
    | 'inner-shadow'
    | 'outer-glow'
    | 'inner-glow'
    | 'stroke'
    | 'color-overlay'
    | 'gradient-overlay';

export interface LayerEffect {
    kind: LayerEffectKind;
    enabled: boolean;
    params: Record<string, unknown>;
}

export interface LayerLocks {
    transparency: boolean;
    image: boolean;
    position: boolean;
    all: boolean;
}

export type LayerColorTag = 'none' | 'red' | 'orange' | 'yellow' | 'green' | 'blue' | 'violet' | 'gray';

export interface DirtyRect {
    x: number;
    y: number;
    width: number;
    height: number;
}

export interface LayerData {
    id: string;
    name: string;
    visible: boolean;
    opacity: number;
    canvas: HTMLCanvasElement;
    ctx: CanvasRenderingContext2D;
    kind: LayerKind;
}

const identityTransform = (): LayerTransform => ({
    x: 0,
    y: 0,
    rotation: 0,
    scaleX: 1,
    scaleY: 1,
});

const noLocks = (): LayerLocks => ({
    transparency: false,
    image: false,
    position: false,
    all: false,
});

export class Layer {
    id: string;
    name: string;
    visible: boolean = true;
    opacity: number = 1.0;
    fill: number = 1.0;
    blendMode: GlobalCompositeOperation = 'source-over';
    canvas: HTMLCanvasElement;
    ctx: CanvasRenderingContext2D;
    kind: LayerKind = 'raster';
    mask: LayerMask | null = null;
    transform: LayerTransform = identityTransform();
    effects: LayerEffect[] = [];
    locks: LayerLocks = noLocks();
    colorTag: LayerColorTag = 'none';
    dirtyRect: DirtyRect | null = null;
    // Type-layer source-of-truth — present when kind === 'type'. Lets us re-edit
    // the layer's text + style without losing data after rasterization.
    // Stored as `unknown` here to avoid a circular type import; the type tool casts.
    typeData: unknown = null;

    constructor(width: number, height: number, name: string = 'New Layer', kind: LayerKind = 'raster') {
        this.id = crypto.randomUUID();
        this.name = name;
        this.kind = kind;

        this.canvas = document.createElement('canvas');
        this.canvas.width = width;
        this.canvas.height = height;

        const ctx = this.canvas.getContext('2d');
        if (!ctx) throw new Error('Could not get 2D context');
        this.ctx = ctx;
    }

    get lockTransparency(): boolean {
        return this.locks.transparency || this.locks.all;
    }

    get lockImage(): boolean {
        return this.locks.image || this.locks.all;
    }

    get lockPosition(): boolean {
        return this.locks.position || this.locks.all;
    }

    markDirty(rect: DirtyRect | null): void {
        if (!rect) {
            this.dirtyRect = { x: 0, y: 0, width: this.canvas.width, height: this.canvas.height };
            return;
        }
        if (!this.dirtyRect) {
            this.dirtyRect = { ...rect };
            return;
        }
        const x1 = Math.min(this.dirtyRect.x, rect.x);
        const y1 = Math.min(this.dirtyRect.y, rect.y);
        const x2 = Math.max(this.dirtyRect.x + this.dirtyRect.width, rect.x + rect.width);
        const y2 = Math.max(this.dirtyRect.y + this.dirtyRect.height, rect.y + rect.height);
        this.dirtyRect = { x: x1, y: y1, width: x2 - x1, height: y2 - y1 };
    }

    clearDirty(): void {
        this.dirtyRect = null;
    }

    toData(): LayerData {
        return {
            id: this.id,
            name: this.name,
            visible: this.visible,
            opacity: this.opacity,
            canvas: this.canvas,
            ctx: this.ctx,
            kind: this.kind,
        };
    }
}
