/**
 * Photoshop-style Warp Text deformations.
 *
 * Takes a pre-rasterized text canvas (the glyphs drawn in their natural
 * position) and warps it into the destination layer canvas via a row-by-row
 * (or column-by-column) displacement. Each warp style implements a tiny
 * deformation function (u, v ∈ [0, 1]) → (du, dv) ∈ [-1, 1] where the
 * caller scales the offsets by bend / distortH / distortV magnitudes.
 *
 * This is a pragmatic MVP: we resample the source via 1-px scanlines, not
 * a per-pixel inverse warp. Edges get a touch of aliasing on extreme bends
 * but it's faithful enough for live preview and final commit.
 */
import type { TypeWarp, TypeWarpStyle } from '../tools/type';

interface WarpedBounds { x: number; y: number; w: number; h: number }

/**
 * Per-style displacement function. Both `du` and `dv` are in [-1, 1]-ish
 * units. The applier scales `du` by `bend * width` / 100 (horizontal warps)
 * or `dv` by `bend * height` / 100 (vertical warps).
 */
function displacementForStyle(style: TypeWarpStyle, u: number, v: number): { du: number; dv: number } {
    // u, v ∈ [0, 1] across the text bounds.
    const uu = u * 2 - 1; // -1..1
    const vv = v * 2 - 1;
    switch (style) {
        case 'arc': {
            // Top edge arcs up, bottom edge arcs up symmetrically. Bend
            // displaces every row vertically by a parabola of u.
            return { du: 0, dv: -(1 - uu * uu) };
        }
        case 'arc-lower': {
            return { du: 0, dv: -(1 - uu * uu) * (v) };
        }
        case 'arc-upper': {
            return { du: 0, dv: -(1 - uu * uu) * (1 - v) };
        }
        case 'arch': {
            return { du: 0, dv: -(1 - uu * uu) * 0.5 };
        }
        case 'bulge': {
            return { du: uu * (1 - vv * vv) * 0.3, dv: vv * (1 - uu * uu) * 0.3 };
        }
        case 'shell-lower': {
            return { du: 0, dv: -(uu * uu - 1) * v };
        }
        case 'shell-upper': {
            return { du: 0, dv: -(uu * uu - 1) * (1 - v) };
        }
        case 'flag': {
            return { du: 0, dv: Math.sin(uu * Math.PI) };
        }
        case 'wave': {
            return { du: 0, dv: Math.sin(uu * Math.PI * 2) };
        }
        case 'fish': {
            return { du: uu * (1 - uu * uu), dv: 0 };
        }
        case 'rise': {
            return { du: 0, dv: uu };
        }
        case 'fisheye': {
            const r = Math.hypot(uu, vv);
            const f = Math.max(0, 1 - r * r);
            return { du: -uu * f, dv: -vv * f };
        }
        case 'inflate': {
            return { du: uu * (1 - vv * vv) * 0.5, dv: vv * (1 - uu * uu) * 0.5 };
        }
        case 'squeeze': {
            return { du: 0, dv: vv * (uu * uu) };
        }
        case 'twist': {
            const r = Math.hypot(uu, vv);
            const a = r * Math.PI;
            const cs = Math.cos(a) - 1;
            const sn = Math.sin(a);
            return { du: uu * cs - vv * sn, dv: uu * sn + vv * cs };
        }
        case 'none':
        default:
            return { du: 0, dv: 0 };
    }
}

/**
 * Apply `warp` to `src` into `dest`. `srcBounds` is the rectangle inside
 * `src` that contains the actual glyphs (used to normalize u, v). Result
 * is drawn at the same bounds in `dest`. Caller is responsible for
 * clearing `dest` first.
 */
export function applyTextWarp(
    dest: CanvasRenderingContext2D,
    src: HTMLCanvasElement,
    warp: TypeWarp,
    srcBounds: WarpedBounds,
): void {
    if (warp.style === 'none') {
        dest.drawImage(src, srcBounds.x, srcBounds.y);
        return;
    }
    const { bend, distortH, distortV } = warp;
    const bendScaleX = (bend / 100) * srcBounds.w * 0.5;
    const bendScaleY = (bend / 100) * srcBounds.h * 0.5;
    const dhScale = (distortH / 100) * srcBounds.w * 0.3;
    const dvScale = (distortV / 100) * srcBounds.h * 0.3;
    // Row-by-row scanline: for each output row in srcBounds, sample the
    // source row offset by the warp displacement.
    const rows = Math.max(1, Math.floor(srcBounds.h));
    const cols = Math.max(1, Math.floor(srcBounds.w));
    for (let y = 0; y < rows; y++) {
        const v = y / rows;
        for (let x = 0; x < cols; x++) {
            const u = x / cols;
            const { du, dv } = displacementForStyle(warp.style, warp.horizontal ? u : v, warp.horizontal ? v : u);
            // Sample source at (x - dx, y - dy) — inverse warp.
            const sxOff = (warp.horizontal ? du : dv) * bendScaleX + (u - 0.5) * dhScale;
            const syOff = (warp.horizontal ? dv : du) * bendScaleY + (v - 0.5) * dvScale;
            const sx = x - sxOff;
            const sy = y - syOff;
            if (sx < 0 || sy < 0 || sx >= srcBounds.w || sy >= srcBounds.h) continue;
            // 1×1 pixel copy via drawImage with source rect.
            dest.drawImage(
                src,
                srcBounds.x + sx, srcBounds.y + sy, 1, 1,
                srcBounds.x + x, srcBounds.y + y, 1, 1,
            );
        }
    }
}
