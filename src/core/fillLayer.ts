import { Layer } from './Layer';
import { renderGradientCanvas, type GradientMethod, type GradientStop, type GradientType } from '../tools/gradient';

export type FillLayerKind = 'solid-color' | 'gradient';

export interface SolidColorFill {
    kind: 'solid-color';
    color: string;
}

export interface GradientFill {
    kind: 'gradient';
    type: GradientType;
    angle: number;
    stops: GradientStop[];
    start?: { x: number; y: number };
    end?: { x: number; y: number };
    dither?: boolean;
    method?: GradientMethod;
    smoothness?: number;
}

export type FillLayerData = SolidColorFill | GradientFill;

export function paintFillLayer(layer: Layer, data: FillLayerData, width: number, height: number): void {
    const ctx = layer.ctx;
    ctx.save();
    ctx.clearRect(0, 0, width, height);
    if (data.kind === 'solid-color') {
        ctx.fillStyle = data.color;
        ctx.fillRect(0, 0, width, height);
    } else {
        if (data.start && data.end) {
            const gradientCanvas = renderGradientCanvas(
                width,
                height,
                data.type,
                data.start,
                data.end,
                data.stops,
                data.dither ?? false,
                data.method ?? 'classic',
                data.smoothness ?? 0,
            );
            ctx.drawImage(gradientCanvas, 0, 0);
            ctx.restore();
            layer.markDirty(null);
            return;
        }
        let grad: CanvasGradient;
        if (data.type === 'linear') {
            const rad = (data.angle * Math.PI) / 180;
            const cx = width / 2;
            const cy = height / 2;
            const len = Math.max(width, height);
            const x0 = cx - Math.cos(rad) * len / 2;
            const y0 = cy - Math.sin(rad) * len / 2;
            const x1 = cx + Math.cos(rad) * len / 2;
            const y1 = cy + Math.sin(rad) * len / 2;
            grad = ctx.createLinearGradient(x0, y0, x1, y1);
        } else {
            grad = ctx.createRadialGradient(width / 2, height / 2, 0, width / 2, height / 2, Math.max(width, height) / 2);
        }
        data.stops.forEach(s => {
            const r = parseInt(s.color.slice(1, 3), 16);
            const g = parseInt(s.color.slice(3, 5), 16);
            const b = parseInt(s.color.slice(5, 7), 16);
            grad.addColorStop(s.position, `rgba(${r},${g},${b},${s.opacity})`);
        });
        ctx.fillStyle = grad;
        ctx.fillRect(0, 0, width, height);
    }
    ctx.restore();
    layer.markDirty(null);
}

export function createFillLayer(width: number, height: number, name: string, data: FillLayerData): Layer {
    const layer = new Layer(width, height, name, 'fill');
    paintFillLayer(layer, data, width, height);
    return layer;
}
