
export interface Point {
    x: number;
    y: number;
}

export type SelectionShapeType = 'rect' | 'circle' | 'lasso' | 'lasso-poly';

export function drawSelectionShape(
    ctx: CanvasRenderingContext2D,
    path: Point[],
    type: SelectionShapeType,
): void {
    if (path.length === 0) return;
    ctx.beginPath();
    if (type === 'rect' && path.length >= 2) {
        ctx.rect(path[0].x, path[0].y, path[1].x - path[0].x, path[1].y - path[0].y);
    } else if (type === 'circle' && path.length >= 2) {
        const cx = (path[0].x + path[1].x) / 2;
        const cy = (path[0].y + path[1].y) / 2;
        ctx.ellipse(cx, cy, Math.abs(path[1].x - path[0].x) / 2, Math.abs(path[1].y - path[0].y) / 2, 0, 0, Math.PI * 2);
    } else {
        ctx.moveTo(path[0].x, path[0].y);
        for (let i = 1; i < path.length; i++) ctx.lineTo(path[i].x, path[i].y);
        ctx.closePath();
    }
}

export function rasterizeSelectionOperations(
    ops: SelectionOperation[],
    width: number,
    height: number,
): Uint8ClampedArray {
    const c = document.createElement('canvas');
    c.width = width; c.height = height;
    const ctx = c.getContext('2d');
    if (!ctx) return new Uint8ClampedArray(width * height);
    ctx.fillStyle = '#fff';
    for (const op of ops) {
        ctx.globalCompositeOperation = op.mode === 'add' ? 'source-over' : 'destination-out';
        if (op.mask) {
            const tmp = document.createElement('canvas');
            tmp.width = op.mask.width; tmp.height = op.mask.height;
            const tctx = tmp.getContext('2d');
            if (!tctx) continue;
            const img = tctx.createImageData(op.mask.width, op.mask.height);
            for (let i = 0; i < op.mask.data.length; i++) {
                img.data[i * 4] = 255; img.data[i * 4 + 1] = 255; img.data[i * 4 + 2] = 255;
                img.data[i * 4 + 3] = op.mask.data[i];
            }
            tctx.putImageData(img, 0, 0);
            ctx.drawImage(tmp, 0, 0);
        } else {
            drawSelectionShape(ctx, op.path, op.type as SelectionShapeType);
            ctx.fill();
        }
    }
    const img = ctx.getImageData(0, 0, width, height);
    const out = new Uint8ClampedArray(width * height);
    for (let i = 0; i < out.length; i++) out[i] = img.data[i * 4 + 3];
    return out;
}

export interface SelectionOperation {
    mode: 'add' | 'sub';
    path: Point[];
    type: string;
    mask?: {
        data: Uint8ClampedArray;
        width: number;
        height: number;
    };
}

const DEFAULT_SELECTION_THRESHOLD = 0.5;

function pointKey(x: number, y: number): string {
    return `${x},${y}`;
}

function isCollinear(a: Point, b: Point, c: Point): boolean {
    return ((b.x - a.x) * (c.y - b.y)) === ((b.y - a.y) * (c.x - b.x));
}

function simplifyLoop(points: Point[]): Point[] {
    if (points.length < 3) return points;
    const simplified: Point[] = [];

    for (let i = 0; i < points.length; i++) {
        const prev = points[(i - 1 + points.length) % points.length];
        const curr = points[i];
        const next = points[(i + 1) % points.length];
        if (!isCollinear(prev, curr, next)) {
            simplified.push(curr);
        }
    }

    return simplified.length >= 3 ? simplified : points;
}

export function quantizeSelectionMask(
    mask: Float32Array,
    width: number,
    height: number,
    threshold = DEFAULT_SELECTION_THRESHOLD,
): Uint8Array {
    const binary = new Uint8Array(width * height);
    for (let i = 0; i < width * height; i++) {
        binary[i] = mask[i] >= threshold ? 1 : 0;
    }
    return binary;
}

export function traceSelectionMaskLoops(
    mask: Float32Array,
    width: number,
    height: number,
    threshold = DEFAULT_SELECTION_THRESHOLD,
): Point[][] {
    const binary = quantizeSelectionMask(mask, width, height, threshold);
    const segments: { start: Point; end: Point }[] = [];
    const segmentStarts = new Map<string, number[]>();
    const isSelected = (x: number, y: number) => (
        x >= 0 &&
        y >= 0 &&
        x < width &&
        y < height &&
        binary[y * width + x] === 1
    );

    for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
            if (!isSelected(x, y)) continue;

            const boundaries = [
                !isSelected(x, y - 1) ? { start: { x, y }, end: { x: x + 1, y } } : null,
                !isSelected(x + 1, y) ? { start: { x: x + 1, y }, end: { x: x + 1, y: y + 1 } } : null,
                !isSelected(x, y + 1) ? { start: { x: x + 1, y: y + 1 }, end: { x, y: y + 1 } } : null,
                !isSelected(x - 1, y) ? { start: { x, y: y + 1 }, end: { x, y } } : null,
            ];

            for (const boundary of boundaries) {
                if (!boundary) continue;
                const index = segments.length;
                segments.push(boundary);
                const key = pointKey(boundary.start.x, boundary.start.y);
                const existing = segmentStarts.get(key);
                if (existing) existing.push(index);
                else segmentStarts.set(key, [index]);
            }
        }
    }

    if (segments.length === 0) return [];

    const visited = new Uint8Array(segments.length);
    const loops: Point[][] = [];

    for (let i = 0; i < segments.length; i++) {
        if (visited[i]) continue;
        const loop: Point[] = [];
        let currentIndex = i;

        while (!visited[currentIndex]) {
            visited[currentIndex] = 1;
            const segment = segments[currentIndex];
            loop.push(segment.start);

            const nextCandidates = segmentStarts.get(pointKey(segment.end.x, segment.end.y)) ?? [];
            const nextIndex = nextCandidates.find(candidate => !visited[candidate]);
            if (nextIndex === undefined) break;
            currentIndex = nextIndex;
        }

        if (loop.length >= 3) {
            loops.push(simplifyLoop(loop));
        }
    }

    return loops;
}

export function buildSelectionEdgePath(
    mask: Float32Array,
    width: number,
    height: number,
    threshold = DEFAULT_SELECTION_THRESHOLD,
): Path2D | null {
    const loops = traceSelectionMaskLoops(mask, width, height, threshold);
    if (loops.length === 0) return null;

    const path = new Path2D();
    for (const loop of loops) {
        path.moveTo(loop[0].x, loop[0].y);
        for (let i = 1; i < loop.length; i++) {
            path.lineTo(loop[i].x, loop[i].y);
        }
        path.closePath();
    }
    return path;
}

export const getSelectionBounds = (
    path: Point[],
    operations: SelectionOperation[],
    hasSelection: boolean,
    width: number,
    height: number
) => {
    let minX = width;
    let minY = height;
    let maxX = 0;
    let maxY = 0;

    const processPath = (pList: Point[]) => {
        pList.forEach(p => {
            minX = Math.min(minX, p.x);
            minY = Math.min(minY, p.y);
            maxX = Math.max(maxX, p.x);
            maxY = Math.max(maxY, p.y);
        });
    };

    const processMask = (mask: NonNullable<SelectionOperation['mask']>) => {
        for (let y = 0; y < mask.height; y++) {
            for (let x = 0; x < mask.width; x++) {
                if (!mask.data[y * mask.width + x]) continue;
                minX = Math.min(minX, x);
                minY = Math.min(minY, y);
                maxX = Math.max(maxX, x + 1);
                maxY = Math.max(maxY, y + 1);
            }
        }
    };

    if (operations && operations.length > 0) {
        operations.forEach(op => {
            if (op.mask) processMask(op.mask);
            else processPath(op.path);
        });
    } else if (hasSelection && path.length > 0) {
        processPath(path);
    } else {
        return null;
    }

    if (minX === width && minY === height && maxX === 0 && maxY === 0) {
        return null;
    }

    return { x: minX, y: minY, w: maxX - minX, h: maxY - minY };
};

export const transformPath = (
    path: Point[],
    cx: number,
    cy: number,
    transform: { x: number, y: number, rotation: number, scaleX: number, scaleY: number }
): Point[] => {
    const { x: tx, y: ty, rotation, scaleX, scaleY } = transform;
    const cos = Math.cos(rotation);
    const sin = Math.sin(rotation);

    return path.map(p => {
        let dx = p.x - cx;
        let dy = p.y - cy;

        // Scale
        dx *= scaleX;
        dy *= scaleY;

        // Rotate
        const rx = dx * cos - dy * sin;
        const ry = dx * sin + dy * cos;

        // Translate + Pivot Back
        return {
            x: rx + cx + tx,
            y: ry + cy + ty
        };
    });
};
