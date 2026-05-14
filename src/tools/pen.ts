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
import type { OverlayRenderContext, Tool, ToolContext, ToolPointerEvent } from './Tool';
import { registerTool } from './registry';
import { captureLayerRegion, createPixelHistoryAction } from '../core/history';
import type { EditorStore, SelectionMaskData, ShapeCustomData } from '../store/types';
import { Layer } from '../core/Layer';
import { useEditorStore } from '../store/editorStore';
import { rerenderShapeLayer } from './shapeRender';
import { CUSTOM_SHAPE_VIEWBOX } from './customShapes';
import { bindTypePathBridge } from './type';

export type PenMode = 'path' | 'shape' | 'pixels';

export interface PenToolOptions {
    mode: PenMode;
    /**
     * Auto Add/Delete: when on (Photoshop default), hovering the Pen over a
     * path segment shows the +/- cursor and clicking inserts or removes an
     * anchor. When off, the same click starts a new path instead.
     */
    autoAddDelete: boolean;
    /**
     * Rubber Band: when on, draws a live preview line from the last anchor
     * to the cursor while the path is open. When off, the preview is hidden.
     */
    rubberBand: boolean;
}

const penOptions: PenToolOptions = { mode: 'path', autoAddDelete: true, rubberBand: true };

export function setPenOptions(next: Partial<PenToolOptions>): void {
    Object.assign(penOptions, next);
}

export function getPenOptions(): PenToolOptions {
    return { ...penOptions };
}

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
export function clonePathShape(path: PathShape): PathShape {
    return {
        id: path.id,
        closed: path.closed,
        anchors: path.anchors.map(a => ({
            x: a.x,
            y: a.y,
            type: a.type,
            inHandle: a.inHandle ? { ...a.inHandle } : undefined,
            outHandle: a.outHandle ? { ...a.outHandle } : undefined,
        })),
    };
}
export function addPath(path: PathShape): void {
    pathStore.paths.push(path);
    pathStore.activeId = path.id;
}
export function clearPaths(): void {
    pathStore.paths.length = 0;
    pathStore.activeId = null;
    selection = { pathId: null, anchorIndices: new Set() };
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
    | { kind: 'cmd-drag-path'; pathId: string; lastX: number; lastY: number }
    | { kind: 'curvature-anchor'; pathId: string; anchorIndex: number };

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

export function hitAnyPathSegment(x: number, y: number): { path: PathShape; segmentIndex: number; t: number; point: P } | null {
    for (const path of pathStore.paths) {
        const hit = hitSegment(x, y, path);
        if (hit) return { path, segmentIndex: hit.segmentIndex, t: hit.t, point: hit.point };
    }
    return null;
}

function flattenedPathPoints(path: PathShape, samplesPerSegment = 24): P[] {
    if (path.anchors.length < 2) return [];
    const out: P[] = [{ x: path.anchors[0].x, y: path.anchors[0].y }];
    const segments = path.closed ? path.anchors.length : path.anchors.length - 1;
    for (let i = 0; i < segments; i++) {
        const a = path.anchors[i];
        const b = path.anchors[(i + 1) % path.anchors.length];
        const { c1, c2 } = segmentControlPoints(a, b);
        for (let s = 1; s <= samplesPerSegment; s++) out.push(bezier(a, c1, c2, b, s / samplesPerSegment));
    }
    return out;
}

function pointInPolygon(point: P, polygon: P[]): boolean {
    let inside = false;
    for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
        const a = polygon[i];
        const b = polygon[j];
        const crosses = (a.y > point.y) !== (b.y > point.y)
            && point.x < ((b.x - a.x) * (point.y - a.y)) / ((b.y - a.y) || 0.0001) + a.x;
        if (crosses) inside = !inside;
    }
    return inside;
}

export function hitAnyClosedPathInterior(x: number, y: number): { path: PathShape } | null {
    const point = { x, y };
    for (const path of pathStore.paths) {
        if (!path.closed || path.anchors.length < 3) continue;
        if (hitSegment(x, y, path)) continue;
        if (pointInPolygon(point, flattenedPathPoints(path))) return { path };
    }
    return null;
}

bindTypePathBridge({
    hitSegment: (x, y) => hitAnyPathSegment(x, y),
    hitInterior: (x, y) => hitAnyClosedPathInterior(x, y),
    clonePath: clonePathShape,
});

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
function onPenDown(e: ToolPointerEvent, ctx?: ToolContext): void {
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
            if (ctx && penOptions.mode !== 'path') {
                commitPathToActiveLayer(path, penOptions.mode, ctx);
                removePath(path.id);
                pathStore.activeId = null;
                selection = { pathId: null, anchorIndices: new Set() };
            }
            return;
        }
        // 1b. Plain click on existing anchor → delete it (Auto Add/Delete).
        // When off, the click falls through to "add new anchor" so the user
        // can start a new path from anywhere.
        if (penOptions.autoAddDelete) {
            path.anchors.splice(anchorHit.anchorIndex, 1);
            return;
        }
    }

    // 2. Existing handle under cursor → drag handle (mirroring opposite)
    const handleHit = path ? hitHandle(x, y) : null;
    if (handleHit && path) {
        drag = { kind: 'drag-handle', pathId: path.id, anchorIndex: handleHit.anchorIndex, which: handleHit.which };
        return;
    }

    // 3. Click on existing segment → split-insert anchor (Auto Add/Delete).
    if (penOptions.autoAddDelete) {
        const segHit = path ? hitSegment(x, y) : null;
        if (segHit && path) {
            splitSegment(path, segHit.segmentIndex, segHit.t);
            return;
        }
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

function onPenUp(): void {
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

    // Rubber-band preview from last anchor to cursor (active open path, no
    // active drag, no Cmd). Gated by penOptions.rubberBand so users can
    // suppress the preview as in Photoshop.
    const active = getActivePath();
    if (active && !active.closed && active.anchors.length > 0 && cursorPos && !drag && !cursorMods.meta && penOptions.rubberBand) {
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

export function pathToSvgD(path: PathShape): string {
    if (path.anchors.length === 0) return '';
    const fmt = (n: number) => Number(n.toFixed(3)).toString();
    const first = path.anchors[0];
    const parts: string[] = [`M${fmt(first.x)},${fmt(first.y)}`];
    for (let i = 1; i < path.anchors.length; i++) {
        const prev = path.anchors[i - 1];
        const curr = path.anchors[i];
        const cp1 = prev.outHandle ?? { x: prev.x, y: prev.y };
        const cp2 = curr.inHandle ?? { x: curr.x, y: curr.y };
        parts.push(`C${fmt(cp1.x)},${fmt(cp1.y)} ${fmt(cp2.x)},${fmt(cp2.y)} ${fmt(curr.x)},${fmt(curr.y)}`);
    }
    if (path.closed && path.anchors.length >= 2) {
        const prev = path.anchors[path.anchors.length - 1];
        const curr = path.anchors[0];
        const cp1 = prev.outHandle ?? { x: prev.x, y: prev.y };
        const cp2 = curr.inHandle ?? { x: curr.x, y: curr.y };
        parts.push(`C${fmt(cp1.x)},${fmt(cp1.y)} ${fmt(cp2.x)},${fmt(cp2.y)} ${fmt(curr.x)},${fmt(curr.y)}`);
        parts.push('Z');
    }
    return parts.join(' ');
}

function anchorBounds(path: PathShape): { x: number; y: number; w: number; h: number } | null {
    if (path.anchors.length === 0) return null;
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    for (const a of path.anchors) {
        if (a.x < minX) minX = a.x; if (a.y < minY) minY = a.y;
        if (a.x > maxX) maxX = a.x; if (a.y > maxY) maxY = a.y;
        if (a.inHandle) {
            if (a.inHandle.x < minX) minX = a.inHandle.x; if (a.inHandle.y < minY) minY = a.inHandle.y;
            if (a.inHandle.x > maxX) maxX = a.inHandle.x; if (a.inHandle.y > maxY) maxY = a.inHandle.y;
        }
        if (a.outHandle) {
            if (a.outHandle.x < minX) minX = a.outHandle.x; if (a.outHandle.y < minY) minY = a.outHandle.y;
            if (a.outHandle.x > maxX) maxX = a.outHandle.x; if (a.outHandle.y > maxY) maxY = a.outHandle.y;
        }
    }
    return { x: minX, y: minY, w: Math.max(1, maxX - minX), h: Math.max(1, maxY - minY) };
}

/**
 * Build a ShapeCustomData payload from a closed Pen path. The pathD is
 * normalized into the CUSTOM_SHAPE_VIEWBOX (100x100) coordinate space along
 * its dominant axis and the bounds are recorded with the matching aspect ratio
 * so the renderer's letterboxing reproduces the original geometry.
 */
export function pathToCustomShapeData(path: PathShape, fillColor: string): ShapeCustomData | null {
    const bbox = anchorBounds(path);
    if (!bbox) return null;
    const scale = bbox.w >= bbox.h
        ? CUSTOM_SHAPE_VIEWBOX / Math.max(1, bbox.w)
        : CUSTOM_SHAPE_VIEWBOX / Math.max(1, bbox.h);
    const normalize = (p: { x: number; y: number }) => ({
        x: (p.x - bbox.x) * scale,
        y: (p.y - bbox.y) * scale,
    });
    const fmt = (n: number) => Number(n.toFixed(3)).toString();
    const parts: string[] = [];
    if (path.anchors.length === 0) return null;
    const first = normalize(path.anchors[0]);
    parts.push(`M${fmt(first.x)},${fmt(first.y)}`);
    for (let i = 1; i < path.anchors.length; i++) {
        const prev = path.anchors[i - 1];
        const curr = path.anchors[i];
        const cp1 = normalize(prev.outHandle ?? prev);
        const cp2 = normalize(curr.inHandle ?? curr);
        const end = normalize(curr);
        parts.push(`C${fmt(cp1.x)},${fmt(cp1.y)} ${fmt(cp2.x)},${fmt(cp2.y)} ${fmt(end.x)},${fmt(end.y)}`);
    }
    if (path.closed && path.anchors.length >= 2) {
        const prev = path.anchors[path.anchors.length - 1];
        const curr = path.anchors[0];
        const cp1 = normalize(prev.outHandle ?? prev);
        const cp2 = normalize(curr.inHandle ?? curr);
        const end = normalize(curr);
        parts.push(`C${fmt(cp1.x)},${fmt(cp1.y)} ${fmt(cp2.x)},${fmt(cp2.y)} ${fmt(end.x)},${fmt(end.y)}`);
        parts.push('Z');
    }
    return {
        kind: 'custom',
        presetId: 'pen-path',
        pathD: parts.join(' '),
        bounds: bbox,
        fill: { type: 'solid', color: fillColor },
        stroke: null,
    };
}

export function createShapeLayerFromPath(path: PathShape, fillColor: string, label = 'Shape'): string | null {
    const data = pathToCustomShapeData(path, fillColor);
    if (!data) return null;
    const store = useEditorStore.getState();
    let createdId: string | null = null;
    store.executeDocumentCommand({
        kind: 'layer-add',
        label: `Add ${label}`,
        run: () => {
            const state = useEditorStore.getState();
            const newLayer = new Layer(state.width, state.height, label, 'shape');
            newLayer.shapeData = data;
            rerenderShapeLayer(newLayer);
            createdId = newLayer.id;
            useEditorStore.setState({
                layers: [...state.layers, newLayer],
                activeLayerId: newLayer.id,
                selectedLayerIds: [newLayer.id],
                layerSelectionAnchorId: newLayer.id,
                activeLayerEditTarget: 'layer',
            });
        },
    });
    return createdId;
}

function tracePathIntoContext(path: PathShape, lctx: CanvasRenderingContext2D, forceClose = false): void {
    if (path.anchors.length === 0) return;
    const first = path.anchors[0];
    lctx.beginPath();
    lctx.moveTo(first.x, first.y);
    for (let i = 1; i < path.anchors.length; i++) {
        const prev = path.anchors[i - 1];
        const curr = path.anchors[i];
        const cp1 = prev.outHandle ?? { x: prev.x, y: prev.y };
        const cp2 = curr.inHandle ?? { x: curr.x, y: curr.y };
        lctx.bezierCurveTo(cp1.x, cp1.y, cp2.x, cp2.y, curr.x, curr.y);
    }
    if (path.closed && path.anchors.length >= 2) {
        const prev = path.anchors[path.anchors.length - 1];
        const curr = path.anchors[0];
        const cp1 = prev.outHandle ?? { x: prev.x, y: prev.y };
        const cp2 = curr.inHandle ?? { x: curr.x, y: curr.y };
        lctx.bezierCurveTo(cp1.x, cp1.y, cp2.x, cp2.y, curr.x, curr.y);
        lctx.closePath();
    } else if (forceClose && path.anchors.length >= 2) {
        lctx.closePath();
    }
}

export function pathToSelectionMask(path: PathShape, width: number, height: number): SelectionMaskData | null {
    if (path.anchors.length < 2) return null;
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d');
    if (!ctx) return null;
    ctx.fillStyle = '#fff';
    tracePathIntoContext(path, ctx, true);
    ctx.fill();
    const img = ctx.getImageData(0, 0, width, height);
    const data = new Uint8ClampedArray(width * height);
    for (let i = 0; i < data.length; i++) data[i] = img.data[i * 4 + 3];
    return { data, width, height };
}

export function loadPathAsSelection(path: PathShape, store: EditorStore): boolean {
    const mask = pathToSelectionMask(path, store.width, store.height);
    if (!mask) return false;
    const hasPixels = mask.data.some(v => v > 0);
    store.setSelectionMode('lasso');
    store.setSelectionOperations(hasPixels
        ? [{ mode: 'add', type: 'lasso', path: [], mask }]
        : []);
    store.setHasSelection(hasPixels);
    return hasPixels;
}

export function loadActivePathAsSelection(store: EditorStore): boolean {
    const path = getActivePath();
    return path ? loadPathAsSelection(path, store) : false;
}

function commitPathToActiveLayer(path: PathShape, mode: PenMode, ctx: ToolContext): void {
    if (mode === 'path') return;
    const store = ctx.getStore();
    if (mode === 'shape') {
        createShapeLayerFromPath(path, store.primaryColor, 'Shape');
        return;
    }
    const layer = store.layers.find(l => l.id === store.activeLayerId);
    if (!layer) return;
    const before = captureLayerRegion(layer, { x: 0, y: 0, width: layer.canvas.width, height: layer.canvas.height });
    const lctx = layer.ctx;
    lctx.save();
    tracePathIntoContext(path, lctx);
    // Pixels: stroke at brush size with the primary color.
    lctx.strokeStyle = store.primaryColor;
    lctx.lineWidth = Math.max(1, store.brushSettings.size);
    lctx.lineCap = 'round';
    lctx.lineJoin = 'round';
    lctx.stroke();
    lctx.restore();
    layer.markDirty(null);
    store.commitHistory(createPixelHistoryAction(
        layer,
        { x: 0, y: 0, width: layer.canvas.width, height: layer.canvas.height },
        before,
        'Pen Pixels',
    ));
}

export const penTool: Tool = {
    id: 'pen',
    label: 'Pen',
    cursor: 'crosshair',
    onPointerDown: (e, ctx) => onPenDown(e, ctx),
    onPointerMove: onPenMove,
    onPointerUp: onPenUp,
    onKeyDown: (e, ctx) => {
        if (e.key === 'Escape') {
            pathStore.activeId = null;
            selection = { pathId: null, anchorIndices: new Set() };
        } else if (e.key === 'Enter') {
            const path = getActivePath();
            if (path && (e.meta || e.ctrl)) {
                e.rawEvent.preventDefault();
                loadPathAsSelection(path, ctx.getStore());
                pathStore.activeId = null;
                selection = { pathId: null, anchorIndices: new Set() };
                return;
            }
            if (path && !path.closed && path.anchors.length >= 2) path.closed = true;
            if (path) commitPathToActiveLayer(path, penOptions.mode, ctx);
            if (path && penOptions.mode !== 'path') {
                // Shape/pixels modes rasterize and discard the path entry, so the
                // user does not end up with both a stray path and committed pixels.
                removePath(path.id);
            }
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

let curvatureSelected: { pathId: string; anchorIndex: number } | null = null;

function recomputeCurvatureHandles(path: PathShape): void {
    const points = path.anchors;
    const n = points.length;
    if (n < 3) {
        points.forEach(anchor => {
            anchor.inHandle = undefined;
            anchor.outHandle = undefined;
        });
        return;
    }
    points.forEach((anchor, i) => {
        if (anchor.type === 'corner') {
            anchor.inHandle = undefined;
            anchor.outHandle = undefined;
            return;
        }
        const prev = i > 0 ? points[i - 1] : path.closed ? points[n - 1] : null;
        const next = i < n - 1 ? points[i + 1] : path.closed ? points[0] : null;
        if (prev && next) {
            const dx = (next.x - prev.x) / 6;
            const dy = (next.y - prev.y) / 6;
            anchor.inHandle = { x: anchor.x - dx, y: anchor.y - dy };
            anchor.outHandle = { x: anchor.x + dx, y: anchor.y + dy };
        } else if (next) {
            anchor.inHandle = undefined;
            anchor.outHandle = { x: anchor.x + (next.x - anchor.x) / 3, y: anchor.y + (next.y - anchor.y) / 3 };
        } else if (prev) {
            anchor.inHandle = { x: anchor.x + (prev.x - anchor.x) / 3, y: anchor.y + (prev.y - anchor.y) / 3 };
            anchor.outHandle = undefined;
        }
    });
}

function finishPathForCurrentPenMode(path: PathShape, ctx: ToolContext): void {
    if (!path.closed && path.anchors.length >= 2) path.closed = true;
    recomputeCurvatureHandles(path);
    commitPathToActiveLayer(path, penOptions.mode, ctx);
    if (penOptions.mode !== 'path') removePath(path.id);
    pathStore.activeId = null;
    selection = { pathId: null, anchorIndices: new Set() };
    curvatureSelected = null;
}

function onCurvatureDown(e: ToolPointerEvent, ctx?: ToolContext): void {
    if (e.button !== 0) return;
    cursorPos = { x: e.canvasX, y: e.canvasY };
    const isDoubleClick = ((e.rawEvent as MouseEvent | undefined)?.detail ?? 0) >= 2;
    let path = getActivePath();

    if (path && !path.closed) {
        const anchorHit = hitAnchor(e.canvasX, e.canvasY, path);
        if (anchorHit) {
            if (anchorHit.isFirst && path.anchors.length >= 2 && !isDoubleClick) {
                path.closed = true;
                recomputeCurvatureHandles(path);
                if (ctx && penOptions.mode !== 'path') finishPathForCurrentPenMode(path, ctx);
                return;
            }
            const anchor = path.anchors[anchorHit.anchorIndex];
            if (isDoubleClick) {
                anchor.type = anchor.type === 'corner' ? 'smooth' : 'corner';
                recomputeCurvatureHandles(path);
            }
            curvatureSelected = { pathId: path.id, anchorIndex: anchorHit.anchorIndex };
            selection = { pathId: path.id, anchorIndices: new Set([anchorHit.anchorIndex]) };
            drag = { kind: 'curvature-anchor', pathId: path.id, anchorIndex: anchorHit.anchorIndex };
            return;
        }

        const segHit = hitSegment(e.canvasX, e.canvasY, path);
        if (segHit) {
            path.anchors.splice(segHit.segmentIndex + 1, 0, {
                x: segHit.point.x,
                y: segHit.point.y,
                type: isDoubleClick ? 'corner' : 'smooth',
            });
            recomputeCurvatureHandles(path);
            curvatureSelected = { pathId: path.id, anchorIndex: segHit.segmentIndex + 1 };
            selection = { pathId: path.id, anchorIndices: new Set([segHit.segmentIndex + 1]) };
            drag = { kind: 'curvature-anchor', pathId: path.id, anchorIndex: segHit.segmentIndex + 1 };
            return;
        }
    }

    if (!path || path.closed) {
        path = { id: crypto.randomUUID(), closed: false, anchors: [] };
        addPath(path);
    }
    path.anchors.push({ x: e.canvasX, y: e.canvasY, type: isDoubleClick ? 'corner' : 'smooth' });
    recomputeCurvatureHandles(path);
    const anchorIndex = path.anchors.length - 1;
    curvatureSelected = { pathId: path.id, anchorIndex };
    selection = { pathId: path.id, anchorIndices: new Set([anchorIndex]) };
    drag = { kind: 'curvature-anchor', pathId: path.id, anchorIndex };
}

function onCurvatureMove(e: ToolPointerEvent): void {
    cursorPos = { x: e.canvasX, y: e.canvasY };
    if (!drag || drag.kind !== 'curvature-anchor') return;
    const path = pathStore.paths.find(p => p.id === drag!.pathId);
    if (!path) return;
    const anchor = path.anchors[drag.anchorIndex];
    if (!anchor) return;
    anchor.x = e.canvasX;
    anchor.y = e.canvasY;
    recomputeCurvatureHandles(path);
}

function onCurvatureUp(): void {
    if (drag?.kind === 'curvature-anchor') drag = null;
}

export const curvaturePenTool: Tool = {
    id: 'curvature-pen',
    label: 'Curvature Pen',
    cursor: 'crosshair',
    onPointerDown: (e, ctx) => onCurvatureDown(e, ctx),
    onPointerMove: onCurvatureMove,
    onPointerUp: onCurvatureUp,
    onKeyDown: (e, ctx) => {
        const path = getActivePath();
        if (e.key === 'Escape') {
            pathStore.activeId = null;
            selection = { pathId: null, anchorIndices: new Set() };
            curvatureSelected = null;
            return;
        }
        if (e.key === 'Enter') {
            if (path && (e.meta || e.ctrl)) {
                e.rawEvent.preventDefault();
                loadPathAsSelection(path, ctx.getStore());
                pathStore.activeId = null;
                selection = { pathId: null, anchorIndices: new Set() };
                curvatureSelected = null;
                return;
            }
            if (path) finishPathForCurrentPenMode(path, ctx);
            return;
        }
        if (e.key === 'Backspace' || e.key === 'Delete') {
            e.rawEvent.preventDefault();
            if (!path) return;
            if (curvatureSelected?.pathId === path.id) {
                path.anchors.splice(curvatureSelected.anchorIndex, 1);
                if (path.anchors.length === 0) {
                    removePath(path.id);
                    curvatureSelected = null;
                    return;
                }
                curvatureSelected.anchorIndex = Math.min(curvatureSelected.anchorIndex, path.anchors.length - 1);
                selection = { pathId: path.id, anchorIndices: new Set([curvatureSelected.anchorIndex]) };
                recomputeCurvatureHandles(path);
            } else {
                removePath(path.id);
            }
        }
    },
    renderOverlay: (overlay) => renderPathOverlay(overlay),
};

registerTool(penTool);
registerTool(freeformPenTool);
registerTool(curvaturePenTool);
