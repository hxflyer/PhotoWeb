/**
 * 2-triangle texture warp: maps a rectangular source canvas onto an arbitrary
 * convex quad defined by four target corners. Used by FreeTransformOverlay
 * for Cmd-drag distort and Cmd+Alt+Shift-drag perspective, which produce
 * non-affine bboxes that the existing `applyFreeTransform` (bbox + skew +
 * rotation) cannot represent.
 *
 * Approach: split the source rectangle and the target quad along the same
 * diagonal (top-left → bottom-right), compute the affine transform from each
 * source triangle to its target triangle, and draw the source through that
 * transform with a triangular clip path. This is the standard quad-texture
 * mapping trick and works for any convex quad (slight bowing along the
 * diagonal is acceptable for live-preview fidelity).
 */
export interface QuadCorners {
    nw: { x: number; y: number };
    ne: { x: number; y: number };
    se: { x: number; y: number };
    sw: { x: number; y: number };
}

/**
 * Solve the 6 affine parameters [a, b, c, d, tx, ty] that map source triangle
 * (s0, s1, s2) to target triangle (t0, t1, t2). The 2x3 matrix satisfies
 * `target = M * source` for each of the three vertex pairs.
 */
function solveAffine(
    s0: { x: number; y: number }, s1: { x: number; y: number }, s2: { x: number; y: number },
    t0: { x: number; y: number }, t1: { x: number; y: number }, t2: { x: number; y: number },
): { a: number; b: number; c: number; d: number; e: number; f: number } {
    // Source matrix:
    //   | s0.x s1.x s2.x |
    //   | s0.y s1.y s2.y |
    //   |  1    1    1  |
    // Target: [t0.x t1.x t2.x] (and similar for y).
    // Affine matrix solves: T = A * S, where A is 2x3 in canvas terms
    // (a, c, e; b, d, f). ctx.transform(a, b, c, d, e, f) applies
    //   x' = a*x + c*y + e
    //   y' = b*x + d*y + f
    const denom = (s1.x - s0.x) * (s2.y - s0.y) - (s2.x - s0.x) * (s1.y - s0.y);
    if (Math.abs(denom) < 1e-9) {
        // Degenerate (collinear) source triangle — return identity so the
        // caller's drawImage still produces something rather than throwing.
        return { a: 1, b: 0, c: 0, d: 1, e: 0, f: 0 };
    }
    const a = ((t1.x - t0.x) * (s2.y - s0.y) - (t2.x - t0.x) * (s1.y - s0.y)) / denom;
    const c = ((t2.x - t0.x) * (s1.x - s0.x) - (t1.x - t0.x) * (s2.x - s0.x)) / denom;
    const b = ((t1.y - t0.y) * (s2.y - s0.y) - (t2.y - t0.y) * (s1.y - s0.y)) / denom;
    const d = ((t2.y - t0.y) * (s1.x - s0.x) - (t1.y - t0.y) * (s2.x - s0.x)) / denom;
    const e = t0.x - a * s0.x - c * s0.y;
    const f = t0.y - b * s0.x - d * s0.y;
    return { a, b, c, d, e, f };
}

/**
 * Draw `src` onto `dest`, mapping the source rectangle's four corners to the
 * supplied target corners. `dest` is cleared by the caller; this function
 * only paints the warped image. Both source corners and target corners are
 * in `dest` canvas-space coordinates.
 */
export function drawQuadWarp(
    dest: CanvasRenderingContext2D,
    src: HTMLCanvasElement,
    corners: QuadCorners,
): void {
    const sw = src.width;
    const sh = src.height;
    const sNW = { x: 0, y: 0 };
    const sNE = { x: sw, y: 0 };
    const sSE = { x: sw, y: sh };
    const sSW = { x: 0, y: sh };

    // Triangle 1: NW, NE, SE
    drawTriangle(dest, src, sNW, sNE, sSE, corners.nw, corners.ne, corners.se);
    // Triangle 2: NW, SE, SW
    drawTriangle(dest, src, sNW, sSE, sSW, corners.nw, corners.se, corners.sw);
}

function drawTriangle(
    dest: CanvasRenderingContext2D,
    src: HTMLCanvasElement,
    s0: { x: number; y: number }, s1: { x: number; y: number }, s2: { x: number; y: number },
    t0: { x: number; y: number }, t1: { x: number; y: number }, t2: { x: number; y: number },
): void {
    const m = solveAffine(s0, s1, s2, t0, t1, t2);
    dest.save();
    // Clip to the target triangle so the affine drawImage only fills that
    // wedge of the source canvas — preventing the second triangle from
    // overwriting it.
    dest.beginPath();
    dest.moveTo(t0.x, t0.y);
    dest.lineTo(t1.x, t1.y);
    dest.lineTo(t2.x, t2.y);
    dest.closePath();
    dest.clip();
    dest.transform(m.a, m.b, m.c, m.d, m.e, m.f);
    dest.drawImage(src, 0, 0);
    dest.restore();
}
