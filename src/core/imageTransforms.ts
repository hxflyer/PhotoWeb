/**
 * Pure canvas pixel-transform utilities: rotate, flip, scale with resampling.
 * All functions take an HTMLCanvasElement as input and return a NEW canvas.
 */

export type ResampleMethod = 'nearest' | 'bilinear' | 'bicubic';
export type FlipAxis = 'horizontal' | 'vertical';
export type TrimBasis = 'transparent' | 'top-left' | 'bottom-right';

// ── Rotate ─────────────────────────────────────────────────────────���──────

export function rotateCanvas(src: HTMLCanvasElement, degrees: number): HTMLCanvasElement {
    const rad = (degrees * Math.PI) / 180;
    const cos = Math.abs(Math.cos(rad));
    const sin = Math.abs(Math.sin(rad));
    const newW = Math.round(src.width * cos + src.height * sin);
    const newH = Math.round(src.width * sin + src.height * cos);

    const out = document.createElement('canvas');
    out.width = newW;
    out.height = newH;
    const ctx = out.getContext('2d')!;
    ctx.translate(newW / 2, newH / 2);
    ctx.rotate(rad);
    ctx.drawImage(src, -src.width / 2, -src.height / 2);
    return out;
}

// ── Flip ──────────────────────────────────────────────────────────────────

export function flipCanvas(src: HTMLCanvasElement, axis: FlipAxis): HTMLCanvasElement {
    const out = document.createElement('canvas');
    out.width = src.width;
    out.height = src.height;
    const ctx = out.getContext('2d')!;
    if (axis === 'horizontal') {
        ctx.scale(-1, 1);
        ctx.drawImage(src, -src.width, 0);
    } else {
        ctx.scale(1, -1);
        ctx.drawImage(src, 0, -src.height);
    }
    return out;
}

// ── Resize / Resample ─────────────────────────────────────────────────────

export function resampleCanvas(src: HTMLCanvasElement, newW: number, newH: number, method: ResampleMethod): HTMLCanvasElement {
    const out = document.createElement('canvas');
    out.width = newW;
    out.height = newH;
    const ctx = out.getContext('2d')!;

    if (method === 'nearest') {
        ctx.imageSmoothingEnabled = false;
    } else {
        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = method === 'bicubic' ? 'high' : 'medium';
    }
    ctx.drawImage(src, 0, 0, newW, newH);
    return out;
}

// ── Canvas Size / Anchor ───────────────────────────────────────────────────
// anchorX/anchorY: 0 = left/top, 0.5 = center, 1 = right/bottom

export function resizeCanvasWithAnchor(
    src: HTMLCanvasElement,
    newW: number,
    newH: number,
    anchorX: number,
    anchorY: number,
    extensionColor: string,
): HTMLCanvasElement {
    const out = document.createElement('canvas');
    out.width = newW;
    out.height = newH;
    const ctx = out.getContext('2d')!;

    if (extensionColor !== 'transparent') {
        ctx.fillStyle = extensionColor;
        ctx.fillRect(0, 0, newW, newH);
    }

    const offsetX = Math.round(anchorX * (newW - src.width));
    const offsetY = Math.round(anchorY * (newH - src.height));
    ctx.drawImage(src, offsetX, offsetY);
    return out;
}

// ── Trim ──────────────────────────────────────────────────────────────────

export interface TrimRect { x: number; y: number; width: number; height: number }

export function computeTrimRect(
    src: HTMLCanvasElement,
    basis: TrimBasis,
    trimSides: { top: boolean; right: boolean; bottom: boolean; left: boolean },
): TrimRect {
    const w = src.width; const h = src.height;
    const ctx = src.getContext('2d')!;
    const data = ctx.getImageData(0, 0, w, h).data;

    let refR = 0, refG = 0, refB = 0, refA = 0;
    if (basis === 'transparent') { refA = 0; }
    else if (basis === 'top-left') { refR = data[0]; refG = data[1]; refB = data[2]; refA = data[3]; }
    else { const i = (w * h - 1) * 4; refR = data[i]; refG = data[i + 1]; refB = data[i + 2]; refA = data[i + 3]; }

    function isBg(i: number): boolean {
        if (basis === 'transparent') return data[i + 3] < 10;
        return data[i] === refR && data[i + 1] === refG && data[i + 2] === refB && data[i + 3] === refA;
    }
    function rowEmpty(y: number): boolean { for (let x = 0; x < w; x++) { if (!isBg((y * w + x) * 4)) return false; } return true; }
    function colEmpty(x: number): boolean { for (let y = 0; y < h; y++) { if (!isBg((y * w + x) * 4)) return false; } return true; }

    let top = 0, bottom = h - 1, left = 0, right = w - 1;
    if (trimSides.top)    { while (top < h && rowEmpty(top)) top++; }
    if (trimSides.bottom) { while (bottom > top && rowEmpty(bottom)) bottom--; }
    if (trimSides.left)   { while (left < w && colEmpty(left)) left++; }
    if (trimSides.right)  { while (right > left && colEmpty(right)) right--; }

    return { x: left, y: top, width: right - left + 1, height: bottom - top + 1 };
}

export function cropCanvas(src: HTMLCanvasElement, rect: TrimRect): HTMLCanvasElement {
    const out = document.createElement('canvas');
    out.width = rect.width;
    out.height = rect.height;
    const ctx = out.getContext('2d')!;
    ctx.drawImage(src, -rect.x, -rect.y);
    return out;
}

// ── Mesh Warp ─────────────────────────────────────────────────────────────

export interface WarpControlPoint { x: number; y: number }

/**
 * Applies a 4×4 mesh warp via backward mapping (bilinear interpolation).
 * controlPoints: 16 {x,y} points in canvas space (row-major, row 0 = top).
 * For each output pixel, the inverse mapping is approximated by finding which
 * mesh cell it falls in (in the uniform grid), then bilinearly interpolating
 * the source position from the control points.
 */
export function applyMeshWarp(
    src: HTMLCanvasElement,
    controlPoints: WarpControlPoint[],
    outW: number,
    outH: number,
): HTMLCanvasElement {
    const out = document.createElement('canvas');
    out.width = outW;
    out.height = outH;
    const outCtx = out.getContext('2d')!;

    const srcCtx = src.getContext('2d')!;
    const srcData = srcCtx.getImageData(0, 0, src.width, src.height);
    const outData = outCtx.createImageData(outW, outH);

    const GRID = 3; // 4×4 control points = 3×3 cells

    for (let oy = 0; oy < outH; oy++) {
        for (let ox = 0; ox < outW; ox++) {
            // Normalized position in output [0,1]
            const u = ox / (outW - 1 || 1);
            const v = oy / (outH - 1 || 1);

            // Which cell does this fall in?
            const cellU = Math.min(Math.floor(u * GRID), GRID - 1);
            const cellV = Math.min(Math.floor(v * GRID), GRID - 1);

            // Local [0,1] within cell
            const lu = (u * GRID) - cellU;
            const lv = (v * GRID) - cellV;

            // Four corners of this cell in control point grid
            const i00 = cellV * 4 + cellU;
            const i10 = cellV * 4 + cellU + 1;
            const i01 = (cellV + 1) * 4 + cellU;
            const i11 = (cellV + 1) * 4 + cellU + 1;

            const p00 = controlPoints[i00];
            const p10 = controlPoints[i10];
            const p01 = controlPoints[i01];
            const p11 = controlPoints[i11];

            if (!p00 || !p10 || !p01 || !p11) continue;

            // Bilinear interpolation for source position
            const sx = p00.x * (1 - lu) * (1 - lv)
                + p10.x * lu * (1 - lv)
                + p01.x * (1 - lu) * lv
                + p11.x * lu * lv;
            const sy = p00.y * (1 - lu) * (1 - lv)
                + p10.y * lu * (1 - lv)
                + p01.y * (1 - lu) * lv
                + p11.y * lu * lv;

            const srcX = Math.round(sx);
            const srcY = Math.round(sy);
            if (srcX < 0 || srcX >= src.width || srcY < 0 || srcY >= src.height) continue;

            const si = (srcY * src.width + srcX) * 4;
            const di = (oy * outW + ox) * 4;
            outData.data[di] = srcData.data[si];
            outData.data[di + 1] = srcData.data[si + 1];
            outData.data[di + 2] = srcData.data[si + 2];
            outData.data[di + 3] = srcData.data[si + 3];
        }
    }
    outCtx.putImageData(outData, 0, 0);
    return out;
}

export type WarpPreset =
    | 'none' | 'arc' | 'arch' | 'bulge' | 'shell-lower' | 'shell-upper'
    | 'flag' | 'wave' | 'fish' | 'fisheye' | 'inflate' | 'squeeze';

/**
 * Returns a 4×4 grid of control points for the given warp preset.
 * The default grid is a uniform mesh over [0,w]×[0,h].
 */
export function warpPresetControlPoints(
    preset: WarpPreset,
    w: number,
    h: number,
): WarpControlPoint[] {
    const pts: WarpControlPoint[] = [];
    for (let row = 0; row < 4; row++) {
        for (let col = 0; col < 4; col++) {
            pts.push({ x: (col / 3) * w, y: (row / 3) * h });
        }
    }
    if (preset === 'none') return pts;

    const bend = 0.25 * h;
    for (let row = 0; row < 4; row++) {
        for (let col = 0; col < 4; col++) {
            const u = col / 3;
            const v = row / 3;
            const idx = row * 4 + col;
            const p = pts[idx];
            switch (preset) {
                case 'arc':
                    p.y += Math.sin(u * Math.PI) * bend * (1 - v);
                    break;
                case 'arch':
                    p.y -= Math.sin(u * Math.PI) * bend;
                    break;
                case 'bulge':
                    p.x += Math.sin(v * Math.PI) * bend * 0.5 * (u - 0.5);
                    p.y += Math.sin(u * Math.PI) * bend * 0.5 * (v - 0.5);
                    break;
                case 'shell-lower':
                    p.y += Math.sin(u * Math.PI) * bend * v;
                    break;
                case 'shell-upper':
                    p.y -= Math.sin(u * Math.PI) * bend * (1 - v);
                    break;
                case 'flag':
                    p.y += Math.sin(u * Math.PI * 2) * bend * 0.3;
                    break;
                case 'wave':
                    p.y += Math.sin(u * Math.PI * 2 + v * Math.PI) * bend * 0.2;
                    break;
                case 'fish':
                    { const cx = 0.5, cy = 0.5;
                      const dx = u - cx, dy = v - cy;
                      const r = Math.sqrt(dx * dx + dy * dy);
                      const scale = r < 0.01 ? 1 : (1 + 0.4 * r);
                      p.x = (cx + dx * scale) * w;
                      p.y = (cy + dy * scale) * h; }
                    break;
                case 'fisheye':
                    { const cx = 0.5, cy = 0.5;
                      const dx = u - cx, dy = v - cy;
                      const r = Math.sqrt(dx * dx + dy * dy);
                      const scale = r < 0.01 ? 1 : (1 - 0.5 * r);
                      p.x = (cx + dx * scale) * w;
                      p.y = (cy + dy * scale) * h; }
                    break;
                case 'inflate':
                    { const cx = 0.5, cy = 0.5;
                      const dx = u - cx, dy = v - cy;
                      const r = Math.sqrt(dx * dx + dy * dy);
                      const t = Math.max(0, 1 - r * 2);
                      p.x += dx * t * w * 0.15;
                      p.y += dy * t * h * 0.15; }
                    break;
                case 'squeeze':
                    // handled below
                    break;
            }
        }
    }
    // fix unused squeeze:
    if (preset === 'squeeze') {
        for (let row = 0; row < 4; row++) {
            for (let col = 0; col < 4; col++) {
                const u = col / 3;
                const v = row / 3;
                const idx = row * 4 + col;
                pts[idx].x = u * w + (w * 0.1) * Math.sin(v * Math.PI) * (u < 0.5 ? 1 : -1);
                pts[idx].y = v * h;
            }
        }
    }
    return pts;
}

// ── Free Transform helpers ────────────────────────────────────────────────

export function applyFreeTransform(
    src: HTMLCanvasElement,
    params: { x: number; y: number; scaleX: number; scaleY: number; rotation: number; skewX: number; skewY: number },
    canvasWidth: number,
    canvasHeight: number,
): HTMLCanvasElement {
    const out = document.createElement('canvas');
    out.width = canvasWidth;
    out.height = canvasHeight;
    const ctx = out.getContext('2d')!;

    const cx = params.x + (src.width * params.scaleX) / 2;
    const cy = params.y + (src.height * params.scaleY) / 2;

    ctx.save();
    ctx.translate(cx, cy);
    ctx.rotate((params.rotation * Math.PI) / 180);
    ctx.transform(1, Math.tan((params.skewY * Math.PI) / 180), Math.tan((params.skewX * Math.PI) / 180), 1, 0, 0);
    ctx.scale(params.scaleX, params.scaleY);
    ctx.drawImage(src, -src.width / 2, -src.height / 2);
    ctx.restore();
    return out;
}
