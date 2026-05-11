import type { Layer } from '../core/Layer';
import { addPath, type PathShape, type AnchorPoint } from './pen';

const THRESHOLD = 128;

function buildAlphaMask(layer: Layer): { mask: Uint8Array; w: number; h: number } {
    const w = layer.canvas.width;
    const h = layer.canvas.height;
    const img = layer.ctx.getImageData(0, 0, w, h);
    const mask = new Uint8Array(w * h);
    for (let i = 0, j = 3; i < mask.length; i++, j += 4) {
        mask[i] = img.data[j] >= THRESHOLD ? 1 : 0;
    }
    return { mask, w, h };
}

function sample(mask: Uint8Array, w: number, h: number, x: number, y: number): number {
    if (x < 0 || x >= w || y < 0 || y >= h) return 0;
    return mask[y * w + x];
}

function traceContours(mask: Uint8Array, w: number, h: number): Array<Array<{ x: number; y: number }>> {
    const visited = new Uint8Array((w + 1) * (h + 1));
    const contours: Array<Array<{ x: number; y: number }>> = [];

    for (let y = 0; y < h; y++) {
        for (let x = 0; x < w; x++) {
            if (mask[y * w + x] !== 1) continue;
            if (y > 0 && mask[(y - 1) * w + x] === 1) continue;
            if (visited[y * (w + 1) + x]) continue;
            const contour = walkContour(mask, w, h, x, y, visited);
            if (contour.length >= 3) contours.push(contour);
        }
    }
    return contours;
}

const DIRS: Array<[number, number]> = [
    [1, 0],   // 0: right
    [0, 1],   // 1: down
    [-1, 0],  // 2: left
    [0, -1],  // 3: up
];

function walkContour(mask: Uint8Array, w: number, h: number, startX: number, startY: number, visited: Uint8Array): Array<{ x: number; y: number }> {
    const pts: Array<{ x: number; y: number }> = [];
    let x = startX;
    let y = startY;
    let dir = 0;
    const maxSteps = (w + h) * 4;
    let steps = 0;

    do {
        pts.push({ x, y });
        visited[y * (w + 1) + x] = 1;

        let found = false;
        for (let turn = -1; turn <= 2; turn++) {
            const nd = (dir + turn + 4) % 4;
            const [dx, dy] = DIRS[nd];
            const nx = x + dx;
            const ny = y + dy;
            if (nx < 0 || nx > w || ny < 0 || ny > h) continue;
            if (isBoundary(mask, w, h, nx, ny)) {
                x = nx;
                y = ny;
                dir = nd;
                found = true;
                break;
            }
        }
        if (!found) break;
        steps++;
    } while ((x !== startX || y !== startY) && steps < maxSteps);

    return pts;
}

function isBoundary(mask: Uint8Array, w: number, h: number, x: number, y: number): boolean {
    const a = sample(mask, w, h, x - 1, y - 1);
    const b = sample(mask, w, h, x,     y - 1);
    const c = sample(mask, w, h, x - 1, y);
    const d = sample(mask, w, h, x,     y);
    const sum = a + b + c + d;
    return sum > 0 && sum < 4;
}

function simplifyRDP(points: Array<{ x: number; y: number }>, epsilon: number): Array<{ x: number; y: number }> {
    if (points.length < 3) return points.slice();
    const keep = new Uint8Array(points.length);
    keep[0] = 1;
    keep[points.length - 1] = 1;
    const stack: Array<[number, number]> = [[0, points.length - 1]];

    while (stack.length) {
        const [i0, i1] = stack.pop()!;
        let maxD = 0;
        let maxI = -1;
        const p0 = points[i0];
        const p1 = points[i1];
        const dx = p1.x - p0.x;
        const dy = p1.y - p0.y;
        const len = Math.hypot(dx, dy) || 1;
        for (let k = i0 + 1; k < i1; k++) {
            const p = points[k];
            const d = Math.abs((dy * p.x - dx * p.y) + (p1.x * p0.y - p1.y * p0.x)) / len;
            if (d > maxD) { maxD = d; maxI = k; }
        }
        if (maxD > epsilon && maxI !== -1) {
            keep[maxI] = 1;
            stack.push([i0, maxI]);
            stack.push([maxI, i1]);
        }
    }

    const out: Array<{ x: number; y: number }> = [];
    for (let i = 0; i < points.length; i++) if (keep[i]) out.push(points[i]);
    return out;
}

function contourToPath(contour: Array<{ x: number; y: number }>): PathShape {
    const simplified = simplifyRDP(contour, 0.75);
    const anchors: AnchorPoint[] = simplified.map(p => ({ x: p.x, y: p.y, type: 'corner' }));
    return { id: crypto.randomUUID(), closed: true, anchors };
}

export function createWorkPathFromLayer(layer: Layer): number {
    const { mask, w, h } = buildAlphaMask(layer);
    const contours = traceContours(mask, w, h);
    let added = 0;
    for (const contour of contours) {
        const path = contourToPath(contour);
        if (path.anchors.length >= 3) {
            addPath(path);
            added++;
        }
    }
    return added;
}
