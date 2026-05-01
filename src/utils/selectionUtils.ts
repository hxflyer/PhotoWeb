
export interface Point {
    x: number;
    y: number;
}

export interface SelectionOperation {
    mode: 'add' | 'sub';
    path: Point[];
    type: any; // SelectionMode string
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

    if (operations && operations.length > 0) {
        operations.forEach(op => processPath(op.path));
    } else if (hasSelection && path.length > 0) {
        processPath(path);
    } else {
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
