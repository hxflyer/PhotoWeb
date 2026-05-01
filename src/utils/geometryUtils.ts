
export interface TransformState {
    x: number;
    y: number;
    rotation: number;
    scaleX: number;
    scaleY: number;
}

export const rotatePoint = (px: number, py: number, cx: number, cy: number, angle: number, sx: number = 1, sy: number = 1) => {
    // Relative to center, scaling applied first
    const dx = (px - cx) * sx;
    const dy = (py - cy) * sy;

    // Rotation
    const cos = Math.cos(angle);
    const sin = Math.sin(angle);
    const rx = dx * cos - dy * sin;
    const ry = dx * sin + dy * cos;

    return {
        x: rx + cx, // Original Center + Rotated/Scaled Offset
        y: ry + cy
    };
};

export const getTransformedHandles = (
    bounds: { x: number, y: number, w: number, h: number },
    transform: TransformState
) => {
    const { x: tx, y: ty, rotation: angle, scaleX: sx, scaleY: sy } = transform;

    // Origin (Pivot) for rotation/scaling is center of bounds
    const cx = bounds.x + bounds.w / 2;
    const cy = bounds.y + bounds.h / 2;

    const transformPoint = (px: number, py: number) => {
        const p = rotatePoint(px, py, cx, cy, angle, sx, sy);
        return {
            x: p.x + tx,
            y: p.y + ty
        };
    };

    const nw = transformPoint(bounds.x, bounds.y);
    const ne = transformPoint(bounds.x + bounds.w, bounds.y);
    const se = transformPoint(bounds.x + bounds.w, bounds.y + bounds.h);
    const sw = transformPoint(bounds.x, bounds.y + bounds.h);

    const n = transformPoint(bounds.x + bounds.w / 2, bounds.y);
    const e = transformPoint(bounds.x + bounds.w, bounds.y + bounds.h / 2);
    const s = transformPoint(bounds.x + bounds.w / 2, bounds.y + bounds.h);
    const w = transformPoint(bounds.x, bounds.y + bounds.h / 2);

    return {
        nw, ne, se, sw,
        n, e, s, w,
        inputBounds: bounds,
        center: { x: cx + tx, y: cy + ty }
    };
};
