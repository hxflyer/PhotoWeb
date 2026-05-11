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
    polygonStar: boolean;       // GAP-05: Polygon → Star toggle
    polygonStarRatio: number;   // 0.1..1.0 — inner-radius / outer-radius
    lineWeight: number;
    lineArrowStart: boolean;    // GAP-06: arrowhead at line start
    lineArrowEnd: boolean;      // GAP-06: arrowhead at line end
    lineArrowSize: number;      // multiplier of lineWeight; head length
    customShapeId: string | null;
}

const options: ShapeOptions = {
    mode: 'shape',
    fill: '#000000',
    stroke: null,
    strokeWidth: 1,
    cornerRadius: 8,
    polygonSides: 5,
    polygonStar: false,
    polygonStarRatio: 0.5,
    lineWeight: 2,
    lineArrowStart: false,
    lineArrowEnd: false,
    lineArrowSize: 4,
    customShapeId: null,
};

export function setShapeOptions(next: Partial<ShapeOptions>): void {
    Object.assign(options, next);
}

export function getShapeOptions(): ShapeOptions {
    return { ...options };
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
        if (options.polygonStar) {
            // Star: alternate between outer and inner radius. The number of
            // points equals polygonSides; we emit 2 * sides vertices.
            const innerR = r * Math.max(0.05, Math.min(1, options.polygonStarRatio));
            const points = options.polygonSides * 2;
            for (let i = 0; i < points; i++) {
                const angle = (-Math.PI / 2) + (i * Math.PI) / options.polygonSides;
                const radius = i % 2 === 0 ? r : innerR;
                const px = cx + radius * Math.cos(angle);
                const py = cy + radius * Math.sin(angle);
                if (i === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
            }
        } else {
            for (let i = 0; i < options.polygonSides; i++) {
                const angle = (-Math.PI / 2) + (i * 2 * Math.PI) / options.polygonSides;
                const px = cx + r * Math.cos(angle);
                const py = cy + r * Math.sin(angle);
                if (i === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
            }
        }
        ctx.closePath();
    } else if (kind === 'line') {
        ctx.lineWidth = options.lineWeight;
        ctx.strokeStyle = fill;
        // Shaft: shorten on the arrow end(s) so the arrowhead fills the gap.
        const dx = current.x - anchor.x;
        const dy = current.y - anchor.y;
        const len = Math.hypot(dx, dy);
        const headLen = Math.max(2, options.lineArrowSize) * options.lineWeight;
        const shaftStart = { x: anchor.x, y: anchor.y };
        const shaftEnd = { x: current.x, y: current.y };
        if (len > 0) {
            const ux = dx / len, uy = dy / len;
            if (options.lineArrowStart) {
                shaftStart.x = anchor.x + ux * headLen;
                shaftStart.y = anchor.y + uy * headLen;
            }
            if (options.lineArrowEnd) {
                shaftEnd.x = current.x - ux * headLen;
                shaftEnd.y = current.y - uy * headLen;
            }
            ctx.beginPath();
            ctx.moveTo(shaftStart.x, shaftStart.y);
            ctx.lineTo(shaftEnd.x, shaftEnd.y);
            ctx.stroke();
            // Arrowheads as filled triangles.
            const drawArrow = (tip: { x: number; y: number }, dirX: number, dirY: number) => {
                const wing = headLen * 0.5;
                const perpX = -dirY, perpY = dirX;
                ctx.beginPath();
                ctx.moveTo(tip.x, tip.y);
                ctx.lineTo(tip.x - dirX * headLen + perpX * wing, tip.y - dirY * headLen + perpY * wing);
                ctx.lineTo(tip.x - dirX * headLen - perpX * wing, tip.y - dirY * headLen - perpY * wing);
                ctx.closePath();
                ctx.fillStyle = fill;
                ctx.fill();
            };
            if (options.lineArrowEnd) drawArrow({ x: current.x, y: current.y }, ux, uy);
            if (options.lineArrowStart) drawArrow({ x: anchor.x, y: anchor.y }, -ux, -uy);
        }
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
