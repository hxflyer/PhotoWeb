import type { PaintSymmetrySettings } from '../store/types';

export type Point = { x: number; y: number };

function uniq(points: Point[]): Point[] {
    const seen = new Set<string>();
    return points.filter(point => {
        const key = `${Math.round(point.x * 100) / 100}:${Math.round(point.y * 100) / 100}`;
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
    });
}

function rotate(point: Point, cx: number, cy: number, angle: number): Point {
    const dx = point.x - cx;
    const dy = point.y - cy;
    const cos = Math.cos(angle);
    const sin = Math.sin(angle);
    return { x: cx + dx * cos - dy * sin, y: cy + dx * sin + dy * cos };
}

export function paintSymmetryPoints(point: Point, width: number, height: number, symmetry: PaintSymmetrySettings): Point[] {
    if (symmetry.mode === 'none' || symmetry.pending) return [point];
    const cx = width / 2;
    const cy = height / 2;
    const vertical = { x: width - point.x, y: point.y };
    const horizontal = { x: point.x, y: height - point.y };
    switch (symmetry.mode) {
        case 'vertical':
        case 'wavy':
            return uniq([point, vertical]);
        case 'horizontal':
            return uniq([point, horizontal]);
        case 'dual-axis':
            return uniq([point, vertical, horizontal, { x: width - point.x, y: height - point.y }]);
        case 'diagonal': {
            const dx = point.x - cx;
            const dy = point.y - cy;
            return uniq([point, { x: cx + dy, y: cy + dx }]);
        }
        case 'circle':
            return uniq([point, { x: width - point.x, y: height - point.y }]);
        case 'parallel-lines': {
            const third = width / 3;
            return uniq([point, { x: point.x - third, y: point.y }, { x: point.x + third, y: point.y }]);
        }
        case 'spiral':
        case 'radial': {
            const count = Math.max(2, Math.min(12, symmetry.segments));
            return uniq(Array.from({ length: count }, (_, i) => rotate(point, cx, cy, (Math.PI * 2 * i) / count)));
        }
        case 'mandala': {
            const count = Math.max(2, Math.min(10, symmetry.segments));
            const reflected = { x: width - point.x, y: point.y };
            return uniq(Array.from({ length: count }, (_, i) => [
                rotate(point, cx, cy, (Math.PI * 2 * i) / count),
                rotate(reflected, cx, cy, (Math.PI * 2 * i) / count),
            ]).flat());
        }
    }
}
