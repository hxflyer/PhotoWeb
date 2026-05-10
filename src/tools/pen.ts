/**
 * Pen tool — Photoshop-style behavior:
 *
 * Modifiers (active while held):
 *   • Cmd/Ctrl   → temporary Direct Selection
 *   • Alt/Option → temporary Convert Anchor Point
 *   • Shift      → constrain new anchor to 45° from previous
 *
 * No-modifier (Auto Add/Delete) interactions:
 *   • Click empty area              → add corner anchor
 *   • Click-drag empty area         → add smooth anchor (mirrored handles)
 *   • Click first anchor (open ≥2)  → close path
 *   • Click existing anchor         → delete that anchor
 *   • Click on existing segment     → insert anchor (de Casteljau split)
 *
 * Cmd/Ctrl interactions (Direct Selection — two-stage):
 *   • Cmd+click on a path / segment / anchor — *path not yet selected*  → select the whole curve
 *   • Cmd+click on an anchor — *path already selected*                  → select that anchor
 *   • Cmd+drag the selected anchor → move the anchor
 *   • Cmd+drag the selected path   → translate the whole path
 *
 * Alt/Option interactions (Convert Anchor Point):
 *   • Alt+click on smooth anchor (no drag) → corner (clear handles)
 *   • Alt+drag from anchor (any kind)      → smooth with mirrored handles
 *   • Drag a direction handle (no alt)     → mirror opposite handle
 *   • Alt+drag a direction handle          → break symmetry (cusp)
 *
 * Keyboard:
 *   • Esc   → deactivate the current path (without closing)
 *   • Enter → close-and-deactivate (only if ≥2 anchors)
 *
 * Cursor hints (live):
 *   • Small ring near first anchor of a closable open path
 *   • "+" glyph at the projected segment-hit point
 *   • "−" glyph next to an existing anchor
 */
import type { OverlayRenderContext, Tool, ToolPointerEvent } from './Tool';
import { registerTool } from './registry';

export interface AnchorPoint {
    x: number;
    y: number;
    inHandle?: { x: number; y: number };
    outHandle?: { x: number; y: number };
    type: 'corner' | 'smooth';
}

export interface PathShape {
    id: string;
    closed: boolean;
    anchors: AnchorPoint[];
}

interface PathStore {
    paths: PathShape[];
    activeId: string | null;
}

const pathStore: PathStore = { paths: [], activeId: null };

// ── Public API ─────────────────────────────────────────────────────────────
export function getPaths(): PathShape[] { return pathStore.paths; }
export function getActivePath(): PathShape | null {
    return pathStore.paths.find(p => p.id === pathStore.activeId) ?? null;
}
export function getActivePathId(): string | null { return pathStore.activeId; }
export function setActivePath(id: string | null): void { pathStore.activeId = id; }
export function addPath(path: PathShape): void {
    pathStore.paths.push(path);
    pathStore.activeId = path.id;
}
export function removePath(id: string): void {
    const idx = pathStore.paths.findIndex(p => p.id === id);
    if (idx === -1) return;
    pathStore.paths.splice(idx, 1);
    if (pathStore.activeId === id) {
        pathStore.activeId = pathStore.paths.length > 0 ? pathStore.paths[Math.max(0, idx - 1)].id : null;
    }
    if (selection.pathId === id) selection = { pathId: null, anchorIndices: new Set() };
}
export function duplicatePath(id: string): string | null {
    const src = pathStore.paths.find(p => p.id === id);
    if (!src) return null;
    const clone: PathShape = {
        id: crypto.randomUUID(),
        closed: src.closed,
        anchors: src.anchors.map(a => ({
            x: a.x, y: a.y, type: a.type,
            inHandle: a.inHandle ? { ...a.inHandle } : undefined,
            outHandle: a.outHandle ? { ...a.outHandle } : undefined,
        })),
    };
    pathStore.paths.push(clone);
    pathStore.activeId = clone.id;
    return clone.id;
}
export function renamePath(id: string, name: string): void {
    const path = pathStore.paths.find(p => p.id === id) as PathShape & { name?: string } | undefined;
    if (path) path.name = name;
}
export function getPathName(id: string): string {
    const idx = pathStore.paths.findIndex(p => p.id === id);
    const path = pathStore.paths[idx] as (PathShape & { name?: string }) | undefined;
    return path?.name ?? `Path ${idx + 1}`;
}

// Selection — exposed for tests; reset by removePath.
export interface PenSelection { pathId: string | null; anchorIndices: Set<number> }
let selection: PenSelection = { pathId: null, anchorIndices: new Set() };
export function getPenSelection(): PenSelection { return selection; }
export function clearPenSelection(): void { selection = { pathId: null, anchorIndices: new Set() }; }

// ── Internal interaction state ────────────────────────────────────────────
type DragState =
    | { kind: 'new-anchor'; pathId: string; anchorIndex: number }
    | { kind: 'alt-anchor'; pathId: string; anchorIndex: number; downX: number; downY: number; moved: boolean }
    | { kind: 'drag-handle'; pathId: string; anchorIndex: number; which: 'in' | 'out' }
    | { kind: 'cmd-drag-anchor'; pathId: string; anchorIndex: number; lastX: number; lastY: number }
    | { kind: 'cmd-drag-path'; pathId: string; lastX: number; lastY: number };

let drag: DragState | null = null;
let cursorPos: { x: number; y: number } | null = null;
let cursorMods: { meta: boolean; alt: boolean; shift: boolean } = { meta: false, alt: false, shift: false };

const HIT_RADIUS = 8;
const SEGMENT_HIT_RADIUS = 6;
const SEGMENT_SAMPLES = 32;

// ── Hit testing ────────────────────────────────────────────────────────────
type P = { x: number; y: number };

function hitAnchor(x: number, y: number, path: PathShape | null = getActivePath()): { anchorIndex: number; isFirst: boolean } | null {
    if (!path) return null;
    for (let i = 0; i < path.anchors.length; i++) {
        const a = path.anchors[i];
        if (Math.hypot(x - a.x, y - a.y) <= HIT_RADIUS) return { anchorIndex: i, isFirst: i === 0 };
    }
    return null;
}

function hitHandle(x: number, y: number, path: PathShape | null = getActivePath()): { anchorIndex: number; which: 'in' | 'out' } | null {
    if (!path) return null;
    for (let i = 0; i < path.anchors.length; i++) {
        const a = path.anchors[i];
        if (a.outHandle && Math.hypot(x - a.outHandle.x, y - a.outHandle.y) <= HIT_RADIUS) return { anchorIndex: i, which: 'out' };
        if (a.inHandle && Math.hypot(x - a.inHandle.x, y - a.inHandle.y) <= HIT_RADIUS) return { anchorIndex: i, which: 'in' };
    }
    return null;
}

function bezier(p0: P, p1: P, p2: P, p3: P, t: number): P {
    const u = 1 - t;
    return {
        x: u * u * u * p0.x + 3 * u * u * t * p1.x + 3 * u * t * t * p2.x + t * t * t * p3.x,
        y: u * u * u * p0.y + 3 * u * u * t * p1.y + 3 * u * t * t * p2.y + t * t * t * p3.y,
    };
}

function segmentControlPoints(a: AnchorPoint, b: AnchorPoint): { c1: P; c2: P } {
    return {
        c1: a.outHandle ?? { x: a.x, y: a.y },
        c2: b.inHandle ?? { x: b.x, y: b.y },
    };
}

function hitSegment(x: number, y: number, path: PathShape | null = getActivePath()): { segmentIndex: number; t: number; point: P } | null {
    if (!path || path.anchors.length < 2) return null;
    const nSeg = path.closed ? path.anchors.length : path.anchors.length - 1;
    let best: { segmentIndex: number; t: number; point: P } | null = null;
    let bestDist = SEGMENT_HIT_RADIUS;
    for (let i = 0; i < nSeg; i++) {
        const a = path.anchors[i];
        const b = path.anchors[(i + 1) % path.anchors.length];
        if (Math.hypot(x - a.x, y - a.y) <= HIT_RADIUS) continue;
        if (Math.hypot(x - b.x, y - b.y) <= HIT_RADIUS) continue;
        const { c1, c2 } = segmentControlPoints(a, b);
        for (let s = 1; s < SEGMENT_SAMPLES; s++) {
            const t = s / SEGMENT_SAMPLES;
            const p = bezier(a, c1, c2, b, t);
            const d = Math.hypot(x - p.x, y - p.y);
            if (d < bestDist) {
                bestDist = d;
                best = { segmentIndex: i, t, point: p };
            }
        }
    }
    return best;
}

// Looser hit-test against ANY path's outline (not just active) — used by Cmd+click
// to select a path even when none is currently active.
function hitAnyPath(x: number, y: number): { path: PathShape; anchorIndex?: number; segmentIndex?: number; t?: number } | null {
    for (const path of pathStore.paths) {
        const a = hitAnchor(x, y, path);
        if (a) return { path, anchorIndex: a.anchorIndex };
    }
    for (const path of pathStore.paths) {
        const s = hitSegment(x, y, path);
        if (s) return { path, segmentIndex: s.segmentIndex, t: s.t };
    }
    return null;
}

function splitSegment(path: PathShape, segIndex: number, t: number): void {
    const a = path.anchors[segIndex];
    const b = path.anchors[(segIndex + 1) % path.anchors.length];
    const { c1, c2 } = segmentControlPoints(a, b);
    const lerp = (p: P, q: P): P => ({ x: p.x + (q.x - p.x) * t, y: p.y + (q.y - p.y) * t });
    const q0 = lerp(a, c1);
    const q1 = lerp(c1, c2);
    const q2 = lerp(c2, b);
    const r0 = lerp(q0, q1);
    const r1 = lerp(q1, q2);
    const s0 = lerp(r0, r1);
    a.outHandle = q0;
    b.inHandle = q2;
    path.anchors.splice(segIndex + 1, 0, {
        x: s0.x, y: s0.y, inHandle: r0, outHandle: r1, type: 'smooth',
    });
}

// ── Pointer handlers ──────────────────────────────────────────────────────
function onPenDown(e: ToolPointerEvent): void {
    if (e.button !== 0) return;
    const x = e.canvasX;
    const y = e.canvasY;
    cursorMods = { meta: e.meta || e.ctrl, alt: e.alt, shift: e.shift };

    // ─────────────────────── Cmd/Ctrl: Direct Selection ─────────────────
    if (cursorMods.meta) {
        // Find what was clicked across all paths (anchor / segment).
        const hit = hitAnyPath(x, y);
        if (!hit) {
            // Empty area → clear selection.
            selection = { pathId: null, anchorIndices: new Set() };
            return;
        }

        const pathAlreadySelected = selection.pathId === hit.path.id;

        if (pathAlreadySelected && hit.anchorIndex !== undefined) {
            // Stage 2: path already selected, clicked an anchor → select just this anchor
            // and start anchor-drag.
            selection = { pathId: hit.path.id, anchorIndices: new Set([hit.anchorIndex]) };
            pathStore.activeId = hit.path.id;
            drag = { kind: 'cmd-drag-anchor', pathId: hit.path.id, anchorIndex: hit.anchorIndex, lastX: x, lastY: y };
            return;
        }

        // Stage 1 (or path-level click on already-selected path):
        // select the whole path & start path-drag for translation.
        selection = { pathId: hit.path.id, anchorIndices: new Set() };
        pathStore.activeId = hit.path.id;
        drag = { kind: 'cmd-drag-path', pathId: hit.path.id, lastX: x, lastY: y };
        return;
    }

    let path = getActivePath();

    // ─────────────────────── Alt/Option: Convert Anchor ─────────────────
    if (e.alt && path) {
        // Alt-drag a handle → break symmetry (cusp).
        const handleHit = hitHandle(x, y);
        if (handleHit) {
            drag = { kind: 'drag-handle', pathId: path.id, anchorIndex: handleHit.anchorIndex, which: handleHit.which };
            return;
        }
        // Alt-click/drag on an anchor: convert to corner (no drag) or pull symmetric handles (drag).
        const anchorHit = hitAnchor(x, y);
        if (anchorHit) {
            drag = { kind: 'alt-anchor', pathId: path.id, anchorIndex: anchorHit.anchorIndex, downX: x, downY: y, moved: false };
            return;
        }
        // Alt elsewhere → fall through to normal Pen behavior (e.g. start a new anchor).
    }

    // ─────────────────────── No-modifier (Auto Add/Delete) ──────────────
    // 1. Existing anchor under cursor (active path)
    const anchorHit = path ? hitAnchor(x, y) : null;
    if (anchorHit && path) {
        // 1a. First-anchor click on open path with ≥2 anchors → close
        if (anchorHit.isFirst && !path.closed && path.anchors.length >= 2) {
            path.closed = true;
            return;
        }
        // 1b. Plain click on existing anchor → delete it
        path.anchors.splice(anchorHit.anchorIndex, 1);
        return;
    }

    // 2. Existing handle under cursor → drag handle (mirroring opposite)
    const handleHit = path ? hitHandle(x, y) : null;
    if (handleHit && path) {
        drag = { kind: 'drag-handle', pathId: path.id, anchorIndex: handleHit.anchorIndex, which: handleHit.which };
        return;
    }

    // 3. Click on existing segment → split-insert anchor
    const segHit = path ? hitSegment(x, y) : null;
    if (segHit && path) {
        splitSegment(path, segHit.segmentIndex, segHit.t);
        return;
    }

    // 4. Empty area → add new anchor (start a new path if needed)
    if (!path || path.closed) {
        path = { id: crypto.randomUUID(), closed: false, anchors: [] };
        addPath(path);
        selection = { pathId: path.id, anchorIndices: new Set() };
    }

    // Shift-constrain to 45° from previous anchor.
    let ax = x, ay = y;
    if (e.shift && path.anchors.length > 0) {
        const prev = path.anchors[path.anchors.length - 1];
        const dx = x - prev.x;
        const dy = y - prev.y;
        const len = Math.hypot(dx, dy);
        const angle = Math.atan2(dy, dx);
        const snapped = Math.round(angle / (Math.PI / 4)) * (Math.PI / 4);
        ax = prev.x + Math.cos(snapped) * len;
        ay = prev.y + Math.sin(snapped) * len;
    }

    path.anchors.push({ x: ax, y: ay, type: 'corner' });
    drag = { kind: 'new-anchor', pathId: path.id, anchorIndex: path.anchors.length - 1 };
}

function onPenMove(e: ToolPointerEvent): void {
    cursorPos = { x: e.canvasX, y: e.canvasY };
    cursorMods = { meta: e.meta || e.ctrl, alt: e.alt, shift: e.shift };
    if (!drag) return;
    const path = pathStore.paths.find(p => p.id === drag!.pathId);
    if (!path) return;

    if (drag.kind === 'new-anchor') {
        const anchor = path.anchors[drag.anchorIndex];
        if (!anchor) return;
        anchor.outHandle = { x: e.canvasX, y: e.canvasY };
        anchor.inHandle = { x: 2 * anchor.x - e.canvasX, y: 2 * anchor.y - e.canvasY };
        anchor.type = 'smooth';
        return;
    }

    if (drag.kind === 'alt-anchor') {
        const dx = e.canvasX - drag.downX;
        const dy = e.canvasY - drag.downY;
        if (!drag.moved && Math.hypot(dx, dy) > 3) drag.moved = true;
        if (drag.moved) {
            // Per Adobe docs: alt-drag from anchor → SMOOTH (mirrored handles).
            const anchor = path.anchors[drag.anchorIndex];
            if (anchor) {
                anchor.outHandle = { x: e.canvasX, y: e.canvasY };
                anchor.inHandle = { x: 2 * anchor.x - e.canvasX, y: 2 * anchor.y - e.canvasY };
                anchor.type = 'smooth';
            }
        }
        return;
    }

    if (drag.kind === 'drag-handle') {
        const anchor = path.anchors[drag.anchorIndex];
        if (!anchor) return;
        const target = { x: e.canvasX, y: e.canvasY };
        const mirror = !e.alt; // alt held mid-drag → break symmetry
        if (drag.which === 'out') {
            anchor.outHandle = target;
            if (mirror && anchor.inHandle) {
                anchor.inHandle = { x: 2 * anchor.x - target.x, y: 2 * anchor.y - target.y };
            }
        } else {
            anchor.inHandle = target;
            if (mirror && anchor.outHandle) {
                anchor.outHandle = { x: 2 * anchor.x - target.x, y: 2 * anchor.y - target.y };
            }
        }
        return;
    }

    if (drag.kind === 'cmd-drag-anchor') {
        const dx = e.canvasX - drag.lastX;
        const dy = e.canvasY - drag.lastY;
        const a = path.anchors[drag.anchorIndex];
        if (a) {
            a.x += dx; a.y += dy;
            if (a.inHandle)  { a.inHandle.x  += dx; a.inHandle.y  += dy; }
            if (a.outHandle) { a.outHandle.x += dx; a.outHandle.y += dy; }
        }
        drag.lastX = e.canvasX;
        drag.lastY = e.canvasY;
        return;
    }

    if (drag.kind === 'cmd-drag-path') {
        const dx = e.canvasX - drag.lastX;
        const dy = e.canvasY - drag.lastY;
        path.anchors.forEach(a => {
            a.x += dx; a.y += dy;
            if (a.inHandle)  { a.inHandle.x  += dx; a.inHandle.y  += dy; }
            if (a.outHandle) { a.outHandle.x += dx; a.outHandle.y += dy; }
        });
        drag.lastX = e.canvasX;
        drag.lastY = e.canvasY;
        return;
    }
}

function onPenUp(_e: ToolPointerEvent): void {
    if (drag && drag.kind === 'alt-anchor' && !drag.moved) {
        // Alt-click on anchor without drag → convert smooth ↔ corner (toggle handles).
        const path = pathStore.paths.find(p => p.id === drag!.pathId);
        if (path) {
            const anchor = path.anchors[drag.anchorIndex];
            if (anchor && (anchor.inHandle || anchor.outHandle)) {
                anchor.inHandle = undefined;
                anchor.outHandle = undefined;
                anchor.type = 'corner';
            }
        }
    }
    drag = null;
}

// ── Hover state for live cursor hints ─────────────────────────────────────
type HoverKind = 'normal' | 'close-path' | 'remove-anchor' | 'add-anchor';
function getHoverState(): { kind: HoverKind; point?: P } {
    if (drag || !cursorPos || cursorMods.meta) return { kind: 'normal' };
    const path = getActivePath();
    if (!path) return { kind: 'normal' };
    const anchorHit = hitAnchor(cursorPos.x, cursorPos.y);
    if (anchorHit) {
        if (anchorHit.isFirst && !path.closed && path.anchors.length >= 2) {
            return { kind: 'close-path', point: path.anchors[0] };
        }
        return { kind: 'remove-anchor', point: path.anchors[anchorHit.anchorIndex] };
    }
    if (hitHandle(cursorPos.x, cursorPos.y)) return { kind: 'normal' };
    const segHit = hitSegment(cursorPos.x, cursorPos.y);
    if (segHit) return { kind: 'add-anchor', point: segHit.point };
    return { kind: 'normal' };
}

// ── Overlay rendering ─────────────────────────────────────────────────────
const ANCHOR_FILL = '#ffffff';
const ANCHOR_BORDER = '#0066ff';
const ANCHOR_SELECTED_FILL = '#0066ff';
const HANDLE_COLOR = '#0066ff';
const PATH_STROKE = '#0066ff';
const PATH_STROKE_SELECTED = '#0066ff';

export function renderPathOverlay(overlay: OverlayRenderContext): void {
    const { ctx, zoom } = overlay;
    const paths = pathStore.paths;
    if (paths.length === 0 && !cursorPos) return;
    ctx.save();
    const lineW = 1 / Math.max(0.0001, zoom);
    const anchorR = 4 / Math.max(0.0001, zoom);
    const handleR = 3 / Math.max(0.0001, zoom);

    paths.forEach(path => {
        if (path.anchors.length === 0) return;
        const isSelectedPath = selection.pathId === path.id;

        // Path stroke
        ctx.beginPath();
        ctx.lineWidth = isSelectedPath ? lineW * 1.5 : lineW;
        ctx.strokeStyle = isSelectedPath ? PATH_STROKE_SELECTED : PATH_STROKE;
        ctx.moveTo(path.anchors[0].x, path.anchors[0].y);
        for (let i = 1; i < path.anchors.length; i++) {
            const prev = path.anchors[i - 1];
            const a = path.anchors[i];
            const c1 = prev.outHandle ?? prev;
            const c2 = a.inHandle ?? a;
            ctx.bezierCurveTo(c1.x, c1.y, c2.x, c2.y, a.x, a.y);
        }
        if (path.closed && path.anchors.length > 1) {
            const last = path.anchors[path.anchors.length - 1];
            const first = path.anchors[0];
            const c1 = last.outHandle ?? last;
            const c2 = first.inHandle ?? first;
            ctx.bezierCurveTo(c1.x, c1.y, c2.x, c2.y, first.x, first.y);
        }
        ctx.stroke();

        // Handles + anchors. Per Adobe docs: hollow square = unselected anchor,
        // filled square = selected anchor, filled circle = direction handle.
        path.anchors.forEach((a, i) => {
            const isAnchorSelected = isSelectedPath && (selection.anchorIndices.size === 0 || selection.anchorIndices.has(i));
            // Direction handles are only drawn when the path is selected (matches PS).
            if (isSelectedPath || pathStore.activeId === path.id) {
                if (a.inHandle) {
                    ctx.beginPath();
                    ctx.strokeStyle = HANDLE_COLOR;
                    ctx.lineWidth = lineW;
                    ctx.moveTo(a.x, a.y); ctx.lineTo(a.inHandle.x, a.inHandle.y); ctx.stroke();
                    drawCircle(ctx, a.inHandle.x, a.inHandle.y, handleR, HANDLE_COLOR, HANDLE_COLOR);
                }
                if (a.outHandle) {
                    ctx.beginPath();
                    ctx.strokeStyle = HANDLE_COLOR;
                    ctx.lineWidth = lineW;
                    ctx.moveTo(a.x, a.y); ctx.lineTo(a.outHandle.x, a.outHandle.y); ctx.stroke();
                    drawCircle(ctx, a.outHandle.x, a.outHandle.y, handleR, HANDLE_COLOR, HANDLE_COLOR);
                }
            }
            // Anchor square
            drawSquare(
                ctx, a.x, a.y, anchorR,
                isAnchorSelected && selection.anchorIndices.size > 0 ? ANCHOR_SELECTED_FILL : ANCHOR_FILL,
                ANCHOR_BORDER, lineW,
            );
        });
    });

    // Rubber-band preview from last anchor to cursor (active open path, no active drag, no Cmd)
    const active = getActivePath();
    if (active && !active.closed && active.anchors.length > 0 && cursorPos && !drag && !cursorMods.meta) {
        const last = active.anchors[active.anchors.length - 1];
        ctx.save();
        ctx.lineWidth = lineW;
        ctx.setLineDash([4 / Math.max(0.0001, zoom), 4 / Math.max(0.0001, zoom)]);
        ctx.strokeStyle = PATH_STROKE;
        ctx.beginPath();
        ctx.moveTo(last.x, last.y);
        if (last.outHandle) {
            ctx.bezierCurveTo(last.outHandle.x, last.outHandle.y, cursorPos.x, cursorPos.y, cursorPos.x, cursorPos.y);
        } else {
            ctx.lineTo(cursorPos.x, cursorPos.y);
        }
        ctx.stroke();
        ctx.restore();
    }

    // Hover hint near cursor
    if (cursorPos && !drag && !cursorMods.meta) {
        const hover = getHoverState();
        const hintR = 5 / zoom;
        const hintLine = 1.5 / zoom;
        if (hover.kind === 'close-path' && hover.point) {
            ctx.save();
            ctx.strokeStyle = PATH_STROKE;
            ctx.lineWidth = hintLine;
            ctx.beginPath();
            ctx.arc(hover.point.x + 7 / zoom, hover.point.y - 7 / zoom, hintR, 0, Math.PI * 2);
            ctx.stroke();
            ctx.restore();
        } else if (hover.kind === 'add-anchor' && hover.point) {
            ctx.save();
            ctx.strokeStyle = PATH_STROKE;
            ctx.lineWidth = hintLine;
            ctx.beginPath();
            ctx.moveTo(hover.point.x - hintR, hover.point.y); ctx.lineTo(hover.point.x + hintR, hover.point.y);
            ctx.moveTo(hover.point.x, hover.point.y - hintR); ctx.lineTo(hover.point.x, hover.point.y + hintR);
            ctx.stroke();
            ctx.restore();
        } else if (hover.kind === 'remove-anchor' && hover.point) {
            ctx.save();
            ctx.strokeStyle = PATH_STROKE;
            ctx.lineWidth = hintLine;
            ctx.beginPath();
            ctx.moveTo(hover.point.x + 7 / zoom - hintR, hover.point.y - 7 / zoom);
            ctx.lineTo(hover.point.x + 7 / zoom + hintR, hover.point.y - 7 / zoom);
            ctx.stroke();
            ctx.restore();
        }
    }

    ctx.restore();
}

function drawCircle(ctx: CanvasRenderingContext2D, x: number, y: number, r: number, fill: string, stroke: string): void {
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fillStyle = fill;
    ctx.fill();
    ctx.strokeStyle = stroke;
    ctx.stroke();
}

function drawSquare(ctx: CanvasRenderingContext2D, x: number, y: number, r: number, fill: string, stroke: string, lineWidth: number): void {
    ctx.beginPath();
    ctx.rect(x - r, y - r, r * 2, r * 2);
    ctx.fillStyle = fill;
    ctx.fill();
    ctx.lineWidth = lineWidth;
    ctx.strokeStyle = stroke;
    ctx.stroke();
}

// ── Tools ──────────────────────────────────────────────────────────────────
export const penTool: Tool = {
    id: 'pen',
    label: 'Pen',
    cursor: 'crosshair',
    onPointerDown: onPenDown,
    onPointerMove: onPenMove,
    onPointerUp: onPenUp,
    onKeyDown: (e) => {
        if (e.key === 'Escape') {
            pathStore.activeId = null;
            selection = { pathId: null, anchorIndices: new Set() };
        } else if (e.key === 'Enter') {
            const path = getActivePath();
            if (path && !path.closed && path.anchors.length >= 2) path.closed = true;
            pathStore.activeId = null;
            selection = { pathId: null, anchorIndices: new Set() };
        }
    },
    renderOverlay: (overlay) => renderPathOverlay(overlay),
};

export const freeformPenTool: Tool = {
    id: 'freeform-pen',
    label: 'Freeform Pen',
    cursor: 'crosshair',
    onPointerDown: (e) => {
        if (e.button !== 0) return;
        const path: PathShape = { id: crypto.randomUUID(), closed: false, anchors: [{ x: e.canvasX, y: e.canvasY, type: 'corner' }] };
        addPath(path);
        drag = { kind: 'new-anchor', pathId: path.id, anchorIndex: 0 };
    },
    onPointerMove: (e) => {
        cursorPos = { x: e.canvasX, y: e.canvasY };
        if (!drag || drag.kind !== 'new-anchor') return;
        const path = pathStore.paths.find(p => p.id === drag!.pathId);
        if (!path) return;
        const last = path.anchors[path.anchors.length - 1];
        if (!last) return;
        if (Math.hypot(e.canvasX - last.x, e.canvasY - last.y) < 4) return;
        path.anchors.push({ x: e.canvasX, y: e.canvasY, type: 'corner' });
        drag = { kind: 'new-anchor', pathId: path.id, anchorIndex: path.anchors.length - 1 };
    },
    onPointerUp: () => { drag = null; },
    renderOverlay: (overlay) => renderPathOverlay(overlay),
};

registerTool(penTool);
registerTool(freeformPenTool);
