import { useEditorStore } from '../store/editorStore';
import type { ShapeData, ShapePolygonData, ShapeLineData } from '../store/types';
import { addUserCustomShape, exportCustomShapeSet, importCustomShapeSet } from './customShapes';
import { setShapeOptions } from './shapes';

type Point = { x: number; y: number };

function pathFromPoints(points: Point[], closed = true): string {
    if (points.length === 0) return '';
    const body = [`M${points[0].x.toFixed(2)},${points[0].y.toFixed(2)}`];
    for (let i = 1; i < points.length; i++) body.push(`L${points[i].x.toFixed(2)},${points[i].y.toFixed(2)}`);
    if (closed) body.push('Z');
    return body.join(' ');
}

function normalize(points: Point[]): { map: (point: Point) => Point; width: number; height: number } {
    const xs = points.map(point => point.x);
    const ys = points.map(point => point.y);
    const minX = Math.min(...xs);
    const maxX = Math.max(...xs);
    const minY = Math.min(...ys);
    const maxY = Math.max(...ys);
    const width = Math.max(1, maxX - minX);
    const height = Math.max(1, maxY - minY);
    const scale = 100 / Math.max(width, height);
    const offsetX = (100 - width * scale) / 2;
    const offsetY = (100 - height * scale) / 2;
    return {
        width,
        height,
        map: point => ({
            x: offsetX + (point.x - minX) * scale,
            y: offsetY + (point.y - minY) * scale,
        }),
    };
}

function polygonPoints(data: ShapePolygonData): Point[] {
    const total = data.star ? data.sides * 2 : data.sides;
    return Array.from({ length: total }, (_, i) => {
        const angle = data.rotation + (-Math.PI / 2) + (i * 2 * Math.PI) / total;
        const radius = data.star && i % 2 === 1 ? data.radius * data.starRatio : data.radius;
        return {
            x: data.center.x + radius * Math.cos(angle),
            y: data.center.y + radius * Math.sin(angle),
        };
    });
}

function lineAsPolygon(data: ShapeLineData): Point[] {
    const dx = data.p1.x - data.p0.x;
    const dy = data.p1.y - data.p0.y;
    const len = Math.max(1, Math.hypot(dx, dy));
    const nx = -dy / len;
    const ny = dx / len;
    const half = Math.max(1, data.weight / 2);
    return [
        { x: data.p0.x + nx * half, y: data.p0.y + ny * half },
        { x: data.p1.x + nx * half, y: data.p1.y + ny * half },
        { x: data.p1.x - nx * half, y: data.p1.y - ny * half },
        { x: data.p0.x - nx * half, y: data.p0.y - ny * half },
    ];
}

export function shapeDataToCustomPathD(data: ShapeData): string | null {
    if (data.kind === 'custom') return data.pathD;
    if (data.kind === 'rect' || data.kind === 'rounded-rect' || data.kind === 'ellipse') {
        const { w, h } = data.bounds;
        if (w <= 0 || h <= 0) return null;
        if (data.kind === 'ellipse') {
            const cx = 50;
            const cy = 50;
            const rx = 50;
            const ry = 50;
            const k = 0.5522847498307936;
            return [
                `M${cx + rx},${cy}`,
                `C${cx + rx},${cy + k * ry} ${cx + k * rx},${cy + ry} ${cx},${cy + ry}`,
                `C${cx - k * rx},${cy + ry} ${cx - rx},${cy + k * ry} ${cx - rx},${cy}`,
                `C${cx - rx},${cy - k * ry} ${cx - k * rx},${cy - ry} ${cx},${cy - ry}`,
                `C${cx + k * rx},${cy - ry} ${cx + rx},${cy - k * ry} ${cx + rx},${cy}`,
                'Z',
            ].join(' ');
        }
        const radius = data.kind === 'rounded-rect' ? Math.max(0, Math.min(50, (data.cornerRadius / Math.max(w, h)) * 100)) : 0;
        if (radius > 0) {
            const r = radius;
            return `M${r},0 L${100 - r},0 Q100,0 100,${r} L100,${100 - r} Q100,100 ${100 - r},100 L${r},100 Q0,100 0,${100 - r} L0,${r} Q0,0 ${r},0 Z`;
        }
        return 'M0,0 L100,0 L100,100 L0,100 Z';
    }
    const raw = data.kind === 'polygon' ? polygonPoints(data) : lineAsPolygon(data);
    const { map } = normalize(raw);
    return pathFromPoints(raw.map(map));
}

export function defineActiveLayerAsCustomShape(name?: string): string | null {
    const store = useEditorStore.getState();
    const layer = store.layers.find(item => item.id === store.activeLayerId);
    const data = layer?.shapeData as ShapeData | null | undefined;
    if (!layer || layer.kind !== 'shape' || !data) return null;
    const pathD = shapeDataToCustomPathD(data);
    if (!pathD) return null;
    const shape = addUserCustomShape(name || layer.name || 'Custom Shape', pathD);
    setShapeOptions({ customShapeId: shape.id });
    useEditorStore.setState({ activeTool: 'shape-custom' });
    window.dispatchEvent(new Event('photoweb:custom-shapes-changed'));
    return shape.id;
}

export function saveCustomShapeSetAsJson(groupId: string): string | null {
    return exportCustomShapeSet(groupId);
}

export function loadCustomShapeSetFromJson(serialized: string): boolean {
    const group = importCustomShapeSet(serialized);
    if (!group) return false;
    if (group.shapes[0]) setShapeOptions({ customShapeId: group.shapes[0].id });
    window.dispatchEvent(new Event('photoweb:custom-shapes-changed'));
    return true;
}
