import type { Layer } from '../core/Layer';
import type {
    ShapeData,
    ShapeRectData,
    ShapeRoundedRectData,
    ShapeEllipseData,
    ShapePolygonData,
    ShapeLineData,
    ShapeCustomData,
    ShapeStroke,
    ShapeFill,
} from '../store/types';
import { CUSTOM_SHAPE_VIEWBOX } from './customShapes';

function applyFill(ctx: CanvasRenderingContext2D, fill: ShapeFill | null): boolean {
    if (!fill) return false;
    if (fill.type === 'solid') {
        ctx.fillStyle = fill.color;
        return true;
    }
    return false;
}

function applyStrokeStyleOptions(ctx: CanvasRenderingContext2D, stroke: ShapeStroke): void {
    ctx.setLineDash(Array.isArray(stroke.dash) ? stroke.dash : []);
    ctx.lineCap = stroke.lineCap ?? 'butt';
    ctx.lineJoin = stroke.lineJoin ?? 'miter';
}

function strokePath(ctx: CanvasRenderingContext2D, stroke: ShapeStroke | null, alignmentSize?: () => { width: number; height: number }): void {
    if (!stroke || !stroke.enabled || stroke.width <= 0) return;
    const previousAlpha = ctx.globalAlpha;
    ctx.globalAlpha = previousAlpha * (typeof stroke.opacity === 'number' ? stroke.opacity : 1);
    ctx.strokeStyle = stroke.color;
    applyStrokeStyleOptions(ctx, stroke);
    // Center alignment: Canvas2D's default stroke spans equally inside and outside the path.
    // Inside / outside are approximated by doubling the line width and clipping later.
    if (stroke.alignment === 'center' || !alignmentSize) {
        ctx.lineWidth = stroke.width;
        ctx.stroke();
    } else if (stroke.alignment === 'inside') {
        ctx.save();
        ctx.clip();
        ctx.lineWidth = stroke.width * 2;
        applyStrokeStyleOptions(ctx, stroke);
        ctx.stroke();
        ctx.restore();
    } else {
        // 'outside': draw double-thickness, then clip away the inside of the path.
        ctx.save();
        ctx.lineWidth = stroke.width * 2;
        applyStrokeStyleOptions(ctx, stroke);
        ctx.stroke();
        ctx.setLineDash([]);
        ctx.globalCompositeOperation = 'destination-out';
        ctx.fill();
        ctx.restore();
    }
    ctx.setLineDash([]);
    ctx.globalAlpha = previousAlpha;
}

function rectPath(ctx: CanvasRenderingContext2D, b: { x: number; y: number; w: number; h: number }): void {
    ctx.beginPath();
    ctx.rect(b.x, b.y, b.w, b.h);
}

function roundedRectPath(ctx: CanvasRenderingContext2D, b: { x: number; y: number; w: number; h: number }, r: number): void {
    const rr = Math.max(0, Math.min(r, b.w / 2, b.h / 2));
    ctx.beginPath();
    ctx.moveTo(b.x + rr, b.y);
    ctx.lineTo(b.x + b.w - rr, b.y);
    ctx.quadraticCurveTo(b.x + b.w, b.y, b.x + b.w, b.y + rr);
    ctx.lineTo(b.x + b.w, b.y + b.h - rr);
    ctx.quadraticCurveTo(b.x + b.w, b.y + b.h, b.x + b.w - rr, b.y + b.h);
    ctx.lineTo(b.x + rr, b.y + b.h);
    ctx.quadraticCurveTo(b.x, b.y + b.h, b.x, b.y + b.h - rr);
    ctx.lineTo(b.x, b.y + rr);
    ctx.quadraticCurveTo(b.x, b.y, b.x + rr, b.y);
    ctx.closePath();
}

function ellipsePath(ctx: CanvasRenderingContext2D, b: { x: number; y: number; w: number; h: number }): void {
    ctx.beginPath();
    ctx.ellipse(b.x + b.w / 2, b.y + b.h / 2, Math.max(0, b.w / 2), Math.max(0, b.h / 2), 0, 0, Math.PI * 2);
}

function polygonPath(ctx: CanvasRenderingContext2D, d: ShapePolygonData): void {
    const { center, radius, sides, star, starRatio, rotation, smoothCorners, smoothIndents, cornerRadius } = d;
    const innerR = radius * Math.max(0.05, Math.min(1, starRatio));
    // Build the vertex list first so we can mid-point quadratic-curve through it.
    const points: { x: number; y: number; isOuter: boolean }[] = [];
    if (star) {
        const total = sides * 2;
        for (let i = 0; i < total; i++) {
            const angle = rotation + (-Math.PI / 2) + (i * Math.PI) / sides;
            const r = i % 2 === 0 ? radius : innerR;
            points.push({ x: center.x + r * Math.cos(angle), y: center.y + r * Math.sin(angle), isOuter: i % 2 === 0 });
        }
    } else {
        for (let i = 0; i < sides; i++) {
            const angle = rotation + (-Math.PI / 2) + (i * 2 * Math.PI) / sides;
            points.push({ x: center.x + radius * Math.cos(angle), y: center.y + radius * Math.sin(angle), isOuter: true });
        }
    }

    ctx.beginPath();
    const n = points.length;
    const numericRadius = Math.max(0, cornerRadius ?? 0);
    const anySmooth = numericRadius > 0 || !!smoothCorners || (!!smoothIndents && star);
    if (!anySmooth) {
        for (let i = 0; i < n; i++) {
            if (i === 0) ctx.moveTo(points[i].x, points[i].y);
            else ctx.lineTo(points[i].x, points[i].y);
        }
    } else {
        const pointToward = (from: { x: number; y: number }, to: { x: number; y: number }, distance: number) => {
            const len = Math.hypot(to.x - from.x, to.y - from.y);
            if (len <= 0) return { ...from };
            const t = Math.min(1, Math.max(0, distance / len));
            return { x: from.x + (to.x - from.x) * t, y: from.y + (to.y - from.y) * t };
        };
        const roundingFor = (prev: { x: number; y: number }, v: { x: number; y: number }, next: { x: number; y: number }) => {
            const prevLen = Math.hypot(v.x - prev.x, v.y - prev.y);
            const nextLen = Math.hypot(next.x - v.x, next.y - v.y);
            const fallback = Math.min(prevLen, nextLen) * 0.25;
            return Math.min(numericRadius > 0 ? numericRadius : fallback, prevLen / 2, nextLen / 2);
        };
        const first = points[0];
        const firstPrev = points[n - 1];
        const startDistance = roundingFor(firstPrev, first, points[1 % n]);
        const start = pointToward(first, firstPrev, startDistance);
        ctx.moveTo(start.x, start.y);
        for (let i = 0; i < n; i++) {
            const prev = points[(i - 1 + n) % n];
            const v = points[i];
            const next = points[(i + 1) % n];
            const shouldSmooth = numericRadius > 0 || (v.isOuter ? !!smoothCorners : !!smoothIndents);
            if (shouldSmooth) {
                const distance = roundingFor(prev, v, next);
                const incoming = pointToward(v, prev, distance);
                const outgoing = pointToward(v, next, distance);
                ctx.lineTo(incoming.x, incoming.y);
                ctx.quadraticCurveTo(v.x, v.y, outgoing.x, outgoing.y);
            } else {
                ctx.lineTo(v.x, v.y);
            }
        }
    }
    ctx.closePath();
}

function drawRect(ctx: CanvasRenderingContext2D, d: ShapeRectData): void {
    rectPath(ctx, d.bounds);
    if (applyFill(ctx, d.fill)) ctx.fill();
    strokePath(ctx, d.stroke, () => ({ width: d.bounds.w, height: d.bounds.h }));
}

function drawRoundedRect(ctx: CanvasRenderingContext2D, d: ShapeRoundedRectData): void {
    roundedRectPath(ctx, d.bounds, d.cornerRadius);
    if (applyFill(ctx, d.fill)) ctx.fill();
    strokePath(ctx, d.stroke, () => ({ width: d.bounds.w, height: d.bounds.h }));
}

function drawEllipse(ctx: CanvasRenderingContext2D, d: ShapeEllipseData): void {
    ellipsePath(ctx, d.bounds);
    if (applyFill(ctx, d.fill)) ctx.fill();
    strokePath(ctx, d.stroke, () => ({ width: d.bounds.w, height: d.bounds.h }));
}

function drawPolygon(ctx: CanvasRenderingContext2D, d: ShapePolygonData): void {
    polygonPath(ctx, d);
    if (applyFill(ctx, d.fill)) ctx.fill();
    strokePath(ctx, d.stroke, () => ({ width: d.radius * 2, height: d.radius * 2 }));
}

function drawLine(ctx: CanvasRenderingContext2D, d: ShapeLineData): void {
    const dx = d.p1.x - d.p0.x;
    const dy = d.p1.y - d.p0.y;
    const len = Math.hypot(dx, dy);
    if (len <= 0) return;
    const ux = dx / len, uy = dy / len;
    const headLen = Math.max(2, d.arrowSize) * d.weight;
    const shaftStart = { x: d.p0.x, y: d.p0.y };
    const shaftEnd = { x: d.p1.x, y: d.p1.y };
    if (d.arrowStart) {
        shaftStart.x = d.p0.x + ux * headLen;
        shaftStart.y = d.p0.y + uy * headLen;
    }
    if (d.arrowEnd) {
        shaftEnd.x = d.p1.x - ux * headLen;
        shaftEnd.y = d.p1.y - uy * headLen;
    }
    const previousAlpha = ctx.globalAlpha;
    ctx.globalAlpha = previousAlpha * (typeof d.stroke.opacity === 'number' ? d.stroke.opacity : 1);
    ctx.strokeStyle = d.stroke.color;
    ctx.fillStyle = d.stroke.color;
    ctx.lineWidth = d.weight;
    applyStrokeStyleOptions(ctx, d.stroke);
    ctx.beginPath();
    ctx.moveTo(shaftStart.x, shaftStart.y);
    ctx.lineTo(shaftEnd.x, shaftEnd.y);
    ctx.stroke();
    ctx.setLineDash([]);
    const drawArrow = (tip: { x: number; y: number }, dirX: number, dirY: number) => {
        const wing = headLen * 0.5;
        const perpX = -dirY, perpY = dirX;
        ctx.beginPath();
        ctx.moveTo(tip.x, tip.y);
        ctx.lineTo(tip.x - dirX * headLen + perpX * wing, tip.y - dirY * headLen + perpY * wing);
        ctx.lineTo(tip.x - dirX * headLen - perpX * wing, tip.y - dirY * headLen - perpY * wing);
        ctx.closePath();
        ctx.fill();
    };
    if (d.arrowEnd) drawArrow({ x: d.p1.x, y: d.p1.y }, ux, uy);
    if (d.arrowStart) drawArrow({ x: d.p0.x, y: d.p0.y }, -ux, -uy);
    ctx.globalAlpha = previousAlpha;
}

function drawCustomShape(ctx: CanvasRenderingContext2D, d: ShapeCustomData): void {
    const { bounds, pathD } = d;
    if (bounds.w <= 0 || bounds.h <= 0) return;
    let path: Path2D;
    try {
        path = new Path2D(pathD);
    } catch {
        return;
    }
    // Letterbox the path inside `bounds` using the smaller axis so the stroke
    // width is consistent on both axes (no pinching at non-1:1 aspect ratios).
    const uniformScale = Math.min(bounds.w / CUSTOM_SHAPE_VIEWBOX, bounds.h / CUSTOM_SHAPE_VIEWBOX);
    const drawnSize = CUSTOM_SHAPE_VIEWBOX * uniformScale;
    const offsetX = (bounds.w - drawnSize) / 2;
    const offsetY = (bounds.h - drawnSize) / 2;
    ctx.save();
    ctx.translate(bounds.x + offsetX, bounds.y + offsetY);
    ctx.scale(uniformScale, uniformScale);
    if (d.fill && d.fill.type === 'solid') {
        ctx.fillStyle = d.fill.color;
        ctx.fill(path, 'evenodd');
    }
    if (d.stroke && d.stroke.enabled && d.stroke.width > 0) {
        const previousAlpha = ctx.globalAlpha;
        ctx.globalAlpha = previousAlpha * (typeof d.stroke.opacity === 'number' ? d.stroke.opacity : 1);
        ctx.strokeStyle = d.stroke.color;
        ctx.lineWidth = uniformScale > 0 ? d.stroke.width / uniformScale : d.stroke.width;
        applyStrokeStyleOptions(ctx, d.stroke);
        ctx.stroke(path);
        ctx.setLineDash([]);
        ctx.globalAlpha = previousAlpha;
    }
    ctx.restore();
}

export function drawShapeData(ctx: CanvasRenderingContext2D, data: ShapeData): void {
    ctx.save();
    switch (data.kind) {
        case 'rect': drawRect(ctx, data); break;
        case 'rounded-rect': drawRoundedRect(ctx, data); break;
        case 'ellipse': drawEllipse(ctx, data); break;
        case 'polygon': drawPolygon(ctx, data); break;
        case 'line': drawLine(ctx, data); break;
        case 'custom': drawCustomShape(ctx, data); break;
    }
    ctx.restore();
}

export function rerenderShapeLayer(layer: Layer): void {
    const data = layer.shapeData as ShapeData | null;
    if (!data) return;
    layer.ctx.clearRect(0, 0, layer.canvas.width, layer.canvas.height);
    drawShapeData(layer.ctx, data);
    layer.markDirty(null);
}
