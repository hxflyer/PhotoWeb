import type { Tool, ToolPointerEvent } from './Tool';
import { registerTool } from './registry';

export type ShapeMode = 'shape' | 'path' | 'pixels';
export type ShapeKind = 'rectangle' | 'rounded-rectangle' | 'ellipse' | 'polygon' | 'line' | 'custom';

export interface ShapeOptions {
    mode: ShapeMode;
    fill: string | null;
    stroke: string | null;
    strokeWidth: number;
    cornerRadius: number;
    polygonSides: number;
    lineWeight: number;
    customShapeId: string | null;
}

const options: ShapeOptions = {
    mode: 'shape',
    fill: '#000000',
    stroke: null,
    strokeWidth: 1,
    cornerRadius: 8,
    polygonSides: 5,
    lineWeight: 2,
    customShapeId: null,
};

export function setShapeOptions(next: Partial<ShapeOptions>): void {
    Object.assign(options, next);
}

interface DragState { kind: ShapeKind; anchor: { x: number; y: number }; current: { x: number; y: number }; layerId: string | null }
const drag: { state: DragState | null } = { state: null };

function p(e: ToolPointerEvent) { return { x: e.canvasX, y: e.canvasY }; }

function drawShape(ctx: CanvasRenderingContext2D, kind: ShapeKind, anchor: { x: number; y: number }, current: { x: number; y: number }, store: { primaryColor: string }): void {
    const x = Math.min(anchor.x, current.x);
    const y = Math.min(anchor.y, current.y);
    const w = Math.abs(current.x - anchor.x);
    const h = Math.abs(current.y - anchor.y);
    const fill = options.fill ?? store.primaryColor;
    ctx.save();
    ctx.fillStyle = fill;
    if (options.stroke) {
        ctx.strokeStyle = options.stroke;
        ctx.lineWidth = options.strokeWidth;
    }
    ctx.beginPath();
    if (kind === 'rectangle') {
        ctx.rect(x, y, w, h);
    } else if (kind === 'rounded-rectangle') {
        const r = Math.min(options.cornerRadius, w / 2, h / 2);
        ctx.moveTo(x + r, y);
        ctx.lineTo(x + w - r, y);
        ctx.quadraticCurveTo(x + w, y, x + w, y + r);
        ctx.lineTo(x + w, y + h - r);
        ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
        ctx.lineTo(x + r, y + h);
        ctx.quadraticCurveTo(x, y + h, x, y + h - r);
        ctx.lineTo(x, y + r);
        ctx.quadraticCurveTo(x, y, x + r, y);
        ctx.closePath();
    } else if (kind === 'ellipse') {
        ctx.ellipse(x + w / 2, y + h / 2, w / 2, h / 2, 0, 0, Math.PI * 2);
    } else if (kind === 'polygon') {
        const cx = x + w / 2, cy = y + h / 2, r = Math.min(w, h) / 2;
        for (let i = 0; i < options.polygonSides; i++) {
            const angle = (-Math.PI / 2) + (i * 2 * Math.PI) / options.polygonSides;
            const px = cx + r * Math.cos(angle);
            const py = cy + r * Math.sin(angle);
            if (i === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
        }
        ctx.closePath();
    } else if (kind === 'line') {
        ctx.moveTo(anchor.x, anchor.y);
        ctx.lineTo(current.x, current.y);
        ctx.lineWidth = options.lineWeight;
        ctx.strokeStyle = fill;
        ctx.stroke();
        ctx.restore();
        return;
    }
    if (options.fill) ctx.fill();
    if (options.stroke) ctx.stroke();
    ctx.restore();
}

function makeShapeTool(id: string, label: string, kind: ShapeKind): Tool {
    return {
        id,
        label,
        cursor: 'crosshair',
        onPointerDown: (e, ctx) => {
            if (e.button !== 0) return;
            const store = ctx.getStore();
            const layer = store.layers.find(l => l.id === store.activeLayerId);
            if (!layer) return;
            drag.state = { kind, anchor: p(e), current: p(e), layerId: layer.id };
        },
        onPointerMove: (e) => {
            if (!drag.state) return;
            drag.state.current = p(e);
        },
        onPointerUp: (_e, ctx) => {
            if (!drag.state || !drag.state.layerId) return;
            const store = ctx.getStore();
            const layer = store.layers.find(l => l.id === drag.state!.layerId);
            if (!layer) { drag.state = null; return; }
            drawShape(layer.ctx, drag.state.kind, drag.state.anchor, drag.state.current, store);
            layer.markDirty(null);
            drag.state = null;
        },
    };
}

export const rectangleShapeTool = makeShapeTool('shape-rectangle', 'Rectangle', 'rectangle');
export const roundedRectShapeTool = makeShapeTool('shape-rounded-rectangle', 'Rounded Rectangle', 'rounded-rectangle');
export const ellipseShapeTool = makeShapeTool('shape-ellipse', 'Ellipse', 'ellipse');
export const polygonShapeTool = makeShapeTool('shape-polygon', 'Polygon', 'polygon');
export const lineShapeTool = makeShapeTool('shape-line', 'Line', 'line');
export const customShapeTool = makeShapeTool('shape-custom', 'Custom Shape', 'custom');

[
    rectangleShapeTool,
    roundedRectShapeTool,
    ellipseShapeTool,
    polygonShapeTool,
    lineShapeTool,
    customShapeTool,
].forEach(registerTool);
