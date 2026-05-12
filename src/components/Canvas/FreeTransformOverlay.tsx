/**
 * FreeTransformOverlay — renders 8-handle bounding box over the active layer
 * and lets the user scale/rotate/move it. Confirm with Enter, cancel with Esc.
 *
 * Implemented as an absolutely-positioned SVG overlay over the Viewport canvas.
 * On confirm it calls applyFreeTransform() and writes result back to the layer.
 */
import { useEffect, useLayoutEffect, useRef, useState, useCallback } from 'react';
import { Check, X as XIcon } from 'lucide-react';
import { useEditorStore } from '../../store/editorStore';
import { applyFreeTransform } from '../../core/imageTransforms';
import { commitTypeLayer, type TypeLayerData } from '../../tools/type';
import { buildSnapCandidates, snapPoint, type SnapTarget } from '../../tools/snap';
import { moveShapeTarget } from '../../tools/shapeCommands';
import { rerenderShapeLayer } from '../../tools/shapeRender';
import { drawQuadWarp } from '../../utils/quadWarp';
import type { ShapeData } from '../../store/types';

const FREE_TRANSFORM_SNAP_HYSTERESIS = 6;

export interface FreeTransformState {
    layerId: string;
    /** Snapshot of the layer before transform started — used for cancel */
    snapshot: ImageData;
    /** Cropped transform source. Defaults to snapshot for old callers. */
    source?: ImageData;
    sourceX?: number;
    sourceY?: number;
    typeDataSnapshot?: TypeLayerData;
    shapeDataSnapshot?: ShapeData;
    x: number;
    y: number;
    width: number;
    height: number;
    rotation: number;
    skewX: number;
    skewY: number;
}

interface Props {
    state: FreeTransformState;
    zoom: number;
    panX: number;
    panY: number;
    onCommit: () => void;
    onCancel: () => void;
}

type Handle = 'nw' | 'n' | 'ne' | 'e' | 'se' | 's' | 'sw' | 'w' | 'move' | 'rotate';

// Per-corner offsets in canvas space, layered on top of the bbox for the
// Photoshop modifier modes (Cmd = distort, Cmd+Shift = skew, Cmd+Alt+Shift =
// perspective). When all four offsets are zero, the overlay falls back to the
// pure bbox affine path (applyFreeTransform). Otherwise it routes the live
// preview through drawQuadWarp.
type CornerDeltas = { nw: { dx: number; dy: number }; ne: { dx: number; dy: number }; se: { dx: number; dy: number }; sw: { dx: number; dy: number } };
const ZERO_CORNERS: CornerDeltas = { nw: { dx: 0, dy: 0 }, ne: { dx: 0, dy: 0 }, se: { dx: 0, dy: 0 }, sw: { dx: 0, dy: 0 } };
type DragMode = 'scale' | 'distort' | 'skew' | 'perspective' | 'rotate' | 'move';

export function FreeTransformOverlay({ state, zoom, panX, panY, onCommit, onCancel }: Props) {
    const [tx, setTx] = useState(state.x);
    const [ty, setTy] = useState(state.y);
    const [tw, setTw] = useState(state.width);
    const [th, setTh] = useState(state.height);
    const [rot, setRot] = useState(state.rotation);
    const [cornerDeltas, setCornerDeltas] = useState<CornerDeltas>(ZERO_CORNERS);
    const [contextMenu, setContextMenu] = useState<{ x: number; y: number } | null>(null);
    const dragRef = useRef<{ handle: Handle; mode: DragMode; startX: number; startY: number; origTx: number; origTy: number; origTw: number; origTh: number; origRot: number; origCorners: CornerDeltas; snapCandidates: SnapTarget[] } | null>(null);
    const overlayRef = useRef<SVGSVGElement>(null);
    const { layers } = useEditorStore();
    const [documentRect, setDocumentRect] = useState<DOMRect | null>(null);

    useLayoutEffect(() => {
        const updateDocumentRect = () => {
            const doc = document.querySelector('[data-photoweb-document]');
            setDocumentRect(doc?.getBoundingClientRect() ?? null);
        };
        updateDocumentRect();
        window.addEventListener('resize', updateDocumentRect);
        return () => window.removeEventListener('resize', updateDocumentRect);
    }, [zoom, panX, panY, tx, ty, tw, th]);

    // Map canvas coords to screen coords
    const toScreen = (canvasX: number, canvasY: number) => ({
        sx: (documentRect?.left ?? 0) + canvasX * zoom,
        sy: (documentRect?.top ?? 0) + canvasY * zoom,
    });

    const screenOrigin = toScreen(tx, ty);
    const sx = screenOrigin.sx;
    const sy = screenOrigin.sy;
    const sw = tw * zoom;
    const sh = th * zoom;
    const cx = sx + sw / 2;
    const cy2 = sy + sh / 2;

    // Handles: corners + edge midpoints. Each corner is the bbox corner plus
    // the per-corner distort delta (in canvas px) scaled to screen px. Side
    // handles ride the midpoint of the corresponding pair so skew/perspective
    // moves them along with the corners.
    const cornerNW = { x: sx + cornerDeltas.nw.dx * zoom, y: sy + cornerDeltas.nw.dy * zoom };
    const cornerNE = { x: sx + sw + cornerDeltas.ne.dx * zoom, y: sy + cornerDeltas.ne.dy * zoom };
    const cornerSE = { x: sx + sw + cornerDeltas.se.dx * zoom, y: sy + sh + cornerDeltas.se.dy * zoom };
    const cornerSW = { x: sx + cornerDeltas.sw.dx * zoom, y: sy + sh + cornerDeltas.sw.dy * zoom };
    const midN = { x: (cornerNW.x + cornerNE.x) / 2, y: (cornerNW.y + cornerNE.y) / 2 };
    const midE = { x: (cornerNE.x + cornerSE.x) / 2, y: (cornerNE.y + cornerSE.y) / 2 };
    const midS = { x: (cornerSW.x + cornerSE.x) / 2, y: (cornerSW.y + cornerSE.y) / 2 };
    const midW = { x: (cornerNW.x + cornerSW.x) / 2, y: (cornerNW.y + cornerSW.y) / 2 };
    const handles: Record<Handle, { x: number; y: number }> = {
        nw: cornerNW, n: midN, ne: cornerNE,
        e: midE, se: cornerSE,
        s: midS, sw: cornerSW, w: midW,
        move: { x: cx, y: cy2 }, rotate: { x: cx, y: Math.min(cornerNW.y, cornerNE.y) - 20 },
    };

    const handleMouseDown = useCallback((e: React.MouseEvent, handle: Handle) => {
        e.stopPropagation();
        const store = useEditorStore.getState();
        const snapCandidates = store.snapEnabled ? buildSnapCandidates(store) : [];
        // Photoshop modifier modes — captured at down-time so the mode is
        // stable for the duration of the drag even if the user lifts a key.
        const isCorner = handle === 'nw' || handle === 'ne' || handle === 'se' || handle === 'sw';
        const isSide = handle === 'n' || handle === 's' || handle === 'e' || handle === 'w';
        let mode: DragMode = 'scale';
        if (handle === 'move') mode = 'move';
        else if (handle === 'rotate') mode = 'rotate';
        else if (e.metaKey || e.ctrlKey) {
            if (isCorner && e.altKey && e.shiftKey) mode = 'perspective';
            else if (isSide && e.shiftKey) mode = 'skew';
            else if (isCorner) mode = 'distort';
            else mode = 'scale';
        }
        dragRef.current = {
            handle, mode,
            startX: e.clientX, startY: e.clientY,
            origTx: tx, origTy: ty, origTw: tw, origTh: th, origRot: rot,
            origCorners: cornerDeltas,
            snapCandidates,
        };
    }, [tx, ty, tw, th, rot, cornerDeltas]);

    useEffect(() => {
        const publishTargets = (xSnap: SnapTarget | undefined, ySnap: SnapTarget | undefined) => {
            const next: SnapTarget[] = [];
            if (xSnap) next.push(xSnap);
            if (ySnap) next.push(ySnap);
            useEditorStore.getState().setActiveSnapTargets(next.length > 0 ? next : null);
        };
        const onMove = (e: MouseEvent) => {
            if (!dragRef.current) return;
            const { handle, mode, startX, startY, origTx, origTy, origTw, origTh, origRot, origCorners, snapCandidates } = dragRef.current;
            let dx = (e.clientX - startX) / zoom;
            let dy = (e.clientY - startY) / zoom;
            const shift = e.shiftKey;
            const alt = e.altKey;

            // ── Cmd-modified modes ──────────────────────────────────────────
            // Distort: only the dragged corner moves.
            if (mode === 'distort') {
                if (handle === 'nw') setCornerDeltas({ ...origCorners, nw: { dx: origCorners.nw.dx + dx, dy: origCorners.nw.dy + dy } });
                else if (handle === 'ne') setCornerDeltas({ ...origCorners, ne: { dx: origCorners.ne.dx + dx, dy: origCorners.ne.dy + dy } });
                else if (handle === 'se') setCornerDeltas({ ...origCorners, se: { dx: origCorners.se.dx + dx, dy: origCorners.se.dy + dy } });
                else if (handle === 'sw') setCornerDeltas({ ...origCorners, sw: { dx: origCorners.sw.dx + dx, dy: origCorners.sw.dy + dy } });
                return;
            }
            // Skew: both endpoints of the dragged side translate along the
            // side's parallel axis (the perpendicular axis is fixed).
            if (mode === 'skew') {
                if (handle === 'n') {
                    setCornerDeltas({ ...origCorners,
                        nw: { dx: origCorners.nw.dx + dx, dy: origCorners.nw.dy },
                        ne: { dx: origCorners.ne.dx + dx, dy: origCorners.ne.dy } });
                } else if (handle === 's') {
                    setCornerDeltas({ ...origCorners,
                        sw: { dx: origCorners.sw.dx + dx, dy: origCorners.sw.dy },
                        se: { dx: origCorners.se.dx + dx, dy: origCorners.se.dy } });
                } else if (handle === 'w') {
                    setCornerDeltas({ ...origCorners,
                        nw: { dx: origCorners.nw.dx, dy: origCorners.nw.dy + dy },
                        sw: { dx: origCorners.sw.dx, dy: origCorners.sw.dy + dy } });
                } else if (handle === 'e') {
                    setCornerDeltas({ ...origCorners,
                        ne: { dx: origCorners.ne.dx, dy: origCorners.ne.dy + dy },
                        se: { dx: origCorners.se.dx, dy: origCorners.se.dy + dy } });
                }
                return;
            }
            // Perspective: dragged corner moves; the corner along the SAME
            // edge (its horizontal neighbor for top/bottom, vertical neighbor
            // for left/right) mirrors. This produces the trapezoidal shape.
            if (mode === 'perspective') {
                if (handle === 'nw') {
                    setCornerDeltas({ ...origCorners,
                        nw: { dx: origCorners.nw.dx + dx, dy: origCorners.nw.dy + dy },
                        ne: { dx: origCorners.ne.dx - dx, dy: origCorners.ne.dy + dy } });
                } else if (handle === 'ne') {
                    setCornerDeltas({ ...origCorners,
                        ne: { dx: origCorners.ne.dx + dx, dy: origCorners.ne.dy + dy },
                        nw: { dx: origCorners.nw.dx - dx, dy: origCorners.nw.dy + dy } });
                } else if (handle === 'se') {
                    setCornerDeltas({ ...origCorners,
                        se: { dx: origCorners.se.dx + dx, dy: origCorners.se.dy + dy },
                        sw: { dx: origCorners.sw.dx - dx, dy: origCorners.sw.dy + dy } });
                } else if (handle === 'sw') {
                    setCornerDeltas({ ...origCorners,
                        sw: { dx: origCorners.sw.dx + dx, dy: origCorners.sw.dy + dy },
                        se: { dx: origCorners.se.dx - dx, dy: origCorners.se.dy + dy } });
                }
                return;
            }

            // Snap the dragged edge / corner / center to nearby candidates.
            if (snapCandidates.length > 0 && handle !== 'rotate') {
                let probeX: number | null = null;
                let probeY: number | null = null;
                if (handle === 'move') {
                    probeX = origTx + dx;
                    probeY = origTy + dy;
                } else if (handle === 'nw') { probeX = origTx + dx; probeY = origTy + dy; }
                else if (handle === 'ne') { probeX = origTx + origTw + dx; probeY = origTy + dy; }
                else if (handle === 'sw') { probeX = origTx + dx; probeY = origTy + origTh + dy; }
                else if (handle === 'se') { probeX = origTx + origTw + dx; probeY = origTy + origTh + dy; }
                else if (handle === 'n') { probeY = origTy + dy; }
                else if (handle === 's') { probeY = origTy + origTh + dy; }
                else if (handle === 'w') { probeX = origTx + dx; }
                else if (handle === 'e') { probeX = origTx + origTw + dx; }
                const result = snapPoint({ x: probeX ?? 0, y: probeY ?? 0 }, snapCandidates, FREE_TRANSFORM_SNAP_HYSTERESIS);
                if (probeX !== null && result.xSnap) dx += result.x - probeX;
                if (probeY !== null && result.ySnap) dy += result.y - probeY;
                publishTargets(probeX !== null ? result.xSnap : undefined, probeY !== null ? result.ySnap : undefined);
            } else if (handle !== 'rotate') {
                publishTargets(undefined, undefined);
            }

            // Shift on a corner constrains the aspect ratio to the original
            // bounding-box ratio (uniform scale). Photoshop 2020+ also flips
            // the default — proportional by default, Shift = non-proportional;
            // we keep the legacy semantics (Shift = constrain) since that is
            // the muscle memory taught for decades.
            const ratio = origTw / Math.max(1, origTh);
            const isCorner = handle === 'nw' || handle === 'ne' || handle === 'se' || handle === 'sw';
            if (shift && isCorner) {
                // Constrain dy = dx / ratio (preserving original aspect).
                // Use the larger absolute change as the driver.
                const cdx = Math.abs(dx);
                const cdy = Math.abs(dy);
                if (cdx * (1 / ratio) > cdy) {
                    dy = (handle === 'nw' || handle === 'ne') ? -dx / ratio : dx / ratio;
                    if (handle === 'nw' || handle === 'sw') dy = -dy;
                } else {
                    dx = (handle === 'nw' || handle === 'sw') ? -dy * ratio : dy * ratio;
                    if (handle === 'nw' || handle === 'ne') dx = -dx;
                }
            }

            if (handle === 'move') { setTx(origTx + dx); setTy(origTy + dy); }
            else if (handle === 'se') {
                let w = Math.max(1, origTw + dx);
                let h = Math.max(1, origTh + dy);
                if (alt) {
                    // Grow symmetrically about the center: mirror the SE pull
                    // onto NW so the rect expands from its center.
                    const grow = (origTw + dx) - origTw;
                    const growY = (origTh + dy) - origTh;
                    w = Math.max(1, origTw + 2 * grow);
                    h = Math.max(1, origTh + 2 * growY);
                    setTx(origTx - grow);
                    setTy(origTy - growY);
                }
                setTw(w); setTh(h);
            }
            else if (handle === 'nw') {
                if (alt) {
                    const grow = -dx;
                    const growY = -dy;
                    setTx(origTx - grow);
                    setTy(origTy - growY);
                    setTw(Math.max(1, origTw + 2 * grow));
                    setTh(Math.max(1, origTh + 2 * growY));
                } else {
                    setTx(origTx + dx); setTy(origTy + dy);
                    setTw(Math.max(1, origTw - dx)); setTh(Math.max(1, origTh - dy));
                }
            }
            else if (handle === 'ne') {
                if (alt) {
                    const grow = dx;
                    const growY = -dy;
                    setTx(origTx - grow);
                    setTy(origTy - growY);
                    setTw(Math.max(1, origTw + 2 * grow));
                    setTh(Math.max(1, origTh + 2 * growY));
                } else {
                    setTy(origTy + dy);
                    setTw(Math.max(1, origTw + dx)); setTh(Math.max(1, origTh - dy));
                }
            }
            else if (handle === 'sw') {
                if (alt) {
                    const grow = -dx;
                    const growY = dy;
                    setTx(origTx - grow);
                    setTy(origTy - growY);
                    setTw(Math.max(1, origTw + 2 * grow));
                    setTh(Math.max(1, origTh + 2 * growY));
                } else {
                    setTx(origTx + dx);
                    setTw(Math.max(1, origTw - dx)); setTh(Math.max(1, origTh + dy));
                }
            }
            else if (handle === 'n') {
                if (alt) {
                    setTy(origTy + dy);
                    setTh(Math.max(1, origTh - 2 * dy));
                } else {
                    setTy(origTy + dy); setTh(Math.max(1, origTh - dy));
                }
            }
            else if (handle === 's') {
                if (alt) {
                    setTy(origTy - dy);
                    setTh(Math.max(1, origTh + 2 * dy));
                } else {
                    setTh(Math.max(1, origTh + dy));
                }
            }
            else if (handle === 'e') {
                if (alt) {
                    setTx(origTx - dx);
                    setTw(Math.max(1, origTw + 2 * dx));
                } else {
                    setTw(Math.max(1, origTw + dx));
                }
            }
            else if (handle === 'w') {
                if (alt) {
                    setTx(origTx + dx);
                    setTw(Math.max(1, origTw - 2 * dx));
                } else {
                    setTx(origTx + dx); setTw(Math.max(1, origTw - dx));
                }
            }
            else if (handle === 'rotate') {
                const center = toScreen(origTx + origTw / 2, origTy + origTh / 2);
                const angle = Math.atan2(e.clientY - center.sy, e.clientX - center.sx) * (180 / Math.PI) + 90;
                let nextRot = origRot + (angle - (Math.atan2(startY - center.sy, startX - center.sx) * (180 / Math.PI) + 90));
                // Shift snaps rotation to multiples of 15°.
                if (shift) nextRot = Math.round(nextRot / 15) * 15;
                setRot(nextRot);
            }
        };
        const onUp = () => {
            dragRef.current = null;
            useEditorStore.getState().setActiveSnapTargets(null);
        };
        window.addEventListener('mousemove', onMove);
        window.addEventListener('mouseup', onUp);
        return () => { window.removeEventListener('mousemove', onMove); window.removeEventListener('mouseup', onUp); };
    }, [zoom]); // eslint-disable-line react-hooks/exhaustive-deps

    // Apply live preview to layer
    useEffect(() => {
        const layer = layers.find(l => l.id === state.layerId);
        if (!layer) return;

        if (layer.kind === 'shape' && state.shapeDataSnapshot) {
            // Decompose the new bounding box (tx, ty, tw, th, rot) relative to
            // the pre-transform box (state.x/y/width/height) into translate +
            // scale + rotate, then call moveShapeTarget so geometry stays
            // editable (no rasterizing).
            const ox = state.x;
            const oy = state.y;
            const ow = state.width || 1;
            const oh = state.height || 1;
            const scaleX = tw / ow;
            const scaleY = th / oh;
            // Translation moves the original bounding-box origin (ox, oy) to the
            // new origin (tx, ty), accounting for the scale applied around 0,0.
            const dx = tx - ox * scaleX;
            const dy = ty - oy * scaleY;
            const rotationDelta = (rot * Math.PI) / 180;
            const next = moveShapeTarget(state.shapeDataSnapshot, dx, dy, scaleX, scaleY, rotationDelta);
            layer.shapeData = next;
            rerenderShapeLayer(layer);
            useEditorStore.setState(s => ({ layers: [...s.layers] }));
            return;
        }

        if (layer.kind === 'type' && state.typeDataSnapshot) {
            const original = state.typeDataSnapshot;
            const scaleX = state.width === 0 ? 1 : tw / state.width;
            const scaleY = state.height === 0 ? 1 : th / state.height;
            const next: TypeLayerData = {
                ...structuredClone(original),
                transform: {
                    ...original.transform,
                    x: tx,
                    y: ty,
                    width: original.transform.width,
                    height: original.transform.height,
                    rotation: ((original.transform.rotation * 180 / Math.PI) + rot) * Math.PI / 180,
                },
                style: {
                    ...original.style,
                    scaleX: original.style.scaleX * scaleX,
                    scaleY: original.style.scaleY * scaleY,
                },
            };
            layer.typeData = next;
            commitTypeLayer(layer.canvas, next);
            layer.markDirty(null);
            useEditorStore.setState(s => ({ layers: [...s.layers] }));
            return;
        }

        const tempSrc = document.createElement('canvas');
        const source = state.source ?? state.snapshot;
        tempSrc.width = source.width;
        tempSrc.height = source.height;
        const tempCtx = tempSrc.getContext('2d')!;
        tempCtx.putImageData(source, 0, 0);

        const distorted = cornerDeltas.nw.dx !== 0 || cornerDeltas.nw.dy !== 0
            || cornerDeltas.ne.dx !== 0 || cornerDeltas.ne.dy !== 0
            || cornerDeltas.se.dx !== 0 || cornerDeltas.se.dy !== 0
            || cornerDeltas.sw.dx !== 0 || cornerDeltas.sw.dy !== 0;

        if (distorted) {
            // Compute the four target corners in canvas space from the bbox
            // plus the per-corner offsets. (Rotation isn't combined with
            // distort/skew/perspective in this MVP — Photoshop also treats
            // them as separate modes you commit between.)
            const corners = {
                nw: { x: tx + cornerDeltas.nw.dx, y: ty + cornerDeltas.nw.dy },
                ne: { x: tx + tw + cornerDeltas.ne.dx, y: ty + cornerDeltas.ne.dy },
                se: { x: tx + tw + cornerDeltas.se.dx, y: ty + th + cornerDeltas.se.dy },
                sw: { x: tx + cornerDeltas.sw.dx, y: ty + th + cornerDeltas.sw.dy },
            };
            layer.ctx.clearRect(0, 0, layer.canvas.width, layer.canvas.height);
            drawQuadWarp(layer.ctx, tempSrc, corners);
            layer.markDirty(null);
            return;
        }

        const result = applyFreeTransform(tempSrc, {
            x: tx, y: ty, scaleX: tw / tempSrc.width, scaleY: th / tempSrc.height,
            rotation: rot, skewX: 0, skewY: 0,
        }, layer.canvas.width, layer.canvas.height);
        layer.ctx.clearRect(0, 0, layer.canvas.width, layer.canvas.height);
        layer.ctx.drawImage(result, 0, 0);
        layer.markDirty(null);
    }, [tx, ty, tw, th, rot, cornerDeltas]); // eslint-disable-line react-hooks/exhaustive-deps

    useEffect(() => {
        const onKey = (e: KeyboardEvent) => {
            if (e.key === 'Enter') { e.preventDefault(); onCommit(); }
            if (e.key === 'Escape') { e.preventDefault(); onCancel(); }
        };
        window.addEventListener('keydown', onKey);
        return () => window.removeEventListener('keydown', onKey);
    }, [onCommit, onCancel]);

    // Dismiss the context menu on any outside click.
    useEffect(() => {
        if (!contextMenu) return;
        const onDown = (e: MouseEvent) => {
            const t = e.target as Element | null;
            if (!t?.closest('[data-testid="ft-context-menu"]')) setContextMenu(null);
        };
        // Defer attach so the right-click that opened the menu doesn't
        // immediately close it.
        const id = window.setTimeout(() => window.addEventListener('mousedown', onDown, true), 0);
        return () => {
            window.clearTimeout(id);
            window.removeEventListener('mousedown', onDown, true);
        };
    }, [contextMenu]);

    const HANDLE_IDS: Handle[] = ['nw', 'n', 'ne', 'e', 'se', 's', 'sw', 'w'];
    const CURSORS: Record<Handle, string> = {
        nw: 'nw-resize', n: 'n-resize', ne: 'ne-resize', e: 'e-resize',
        se: 'se-resize', s: 's-resize', sw: 'sw-resize', w: 'w-resize',
        move: 'move', rotate: 'crosshair',
    };

    return (
        <svg
            ref={overlayRef}
            data-testid="free-transform-overlay"
            style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', pointerEvents: 'none', overflow: 'visible' }}
        >
            {/* Bounding box */}
            <g transform={`rotate(${rot}, ${cx}, ${cy2})`}>
                {/* Rotate-outside-bbox hit zone (Photoshop): a transparent
                    ring around the bounding box. Click-drag outside the box
                    rotates around the center reference point. Rendered first
                    so the inner scale handles take pointer priority. */}
                <rect
                    data-testid="ft-rotate-ring"
                    x={sx - 24} y={sy - 24}
                    width={sw + 48} height={sh + 48}
                    fill="transparent"
                    style={{ pointerEvents: 'all', cursor: 'crosshair' }}
                    onMouseDown={e => handleMouseDown(e, 'rotate')}
                />
                {/* Bbox interior: catch right-clicks to open the transform
                    context menu (Rotate 180 / 90 CW/CCW / Flip H/V). Left
                    clicks pass through so the move/scale handles still work. */}
                <rect
                    data-testid="ft-bbox-interior"
                    x={sx} y={sy}
                    width={sw} height={sh}
                    fill="transparent"
                    style={{ pointerEvents: 'all', cursor: 'move' }}
                    onMouseDown={e => {
                        if (e.button === 2) return; // let contextmenu handle it
                        handleMouseDown(e, 'move');
                    }}
                    onContextMenu={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        setContextMenu({ x: e.clientX, y: e.clientY });
                    }}
                />
                <polygon
                    points={`${cornerNW.x},${cornerNW.y} ${cornerNE.x},${cornerNE.y} ${cornerSE.x},${cornerSE.y} ${cornerSW.x},${cornerSW.y}`}
                    fill="none" stroke="#0090ff" strokeWidth={1} strokeDasharray="4 2"
                />

                {/* Handles */}
                {HANDLE_IDS.map(id => (
                    <rect key={id}
                        x={handles[id].x - 5} y={handles[id].y - 5} width={10} height={10}
                        fill="white" stroke="#0090ff" strokeWidth={1}
                        style={{ pointerEvents: 'all', cursor: CURSORS[id] }}
                        onMouseDown={e => handleMouseDown(e, id)}
                    />
                ))}

                {/* Center cross */}
                <line x1={cx - 8} y1={cy2} x2={cx + 8} y2={cy2} stroke="#0090ff" strokeWidth={1} />
                <line x1={cx} y1={cy2 - 8} x2={cx} y2={cy2 + 8} stroke="#0090ff" strokeWidth={1} />

                {/* Move handle (center) */}
                <rect x={cx - 12} y={cy2 - 12} width={24} height={24} fill="transparent"
                    style={{ pointerEvents: 'all', cursor: 'move' }}
                    onMouseDown={e => handleMouseDown(e, 'move')} />

                {/* Rotate handle line + circle */}
                <line x1={cx} y1={sy} x2={cx} y2={sy - 20} stroke="#0090ff" strokeWidth={1} />
                <circle cx={handles.rotate.x} cy={handles.rotate.y} r={5}
                    fill="white" stroke="#0090ff" strokeWidth={1}
                    style={{ pointerEvents: 'all', cursor: 'crosshair' }}
                    onMouseDown={e => handleMouseDown(e, 'rotate')} />
            </g>

            {/* Right-click context menu — Photoshop's Free Transform menu.
                Reference-point pivot is the bbox center, so flips operate
                around (tx + tw/2, ty + th/2) and rotations are applied to
                the current `rot` state. */}
            {contextMenu && (
                <foreignObject
                    x={contextMenu.x - (documentRect?.left ?? 0)}
                    y={contextMenu.y - (documentRect?.top ?? 0)}
                    width={180}
                    height={180}
                    style={{ pointerEvents: 'all', overflow: 'visible' }}
                >
                    <div
                        data-testid="ft-context-menu"
                        onClick={e => e.stopPropagation()}
                        style={{
                            background: '#2a2a2a',
                            border: '1px solid #555',
                            borderRadius: 4,
                            padding: 4,
                            fontSize: 12,
                            color: 'white',
                            boxShadow: '0 4px 12px rgba(0,0,0,0.45)',
                            minWidth: 160,
                            display: 'flex',
                            flexDirection: 'column',
                        }}
                    >
                        {([
                            ['Rotate 180°', () => setRot(r => r + 180)],
                            ['Rotate 90° CW', () => setRot(r => r + 90)],
                            ['Rotate 90° CCW', () => setRot(r => r - 90)],
                            ['Flip Horizontal', () => setTw(w => -w)],
                            ['Flip Vertical', () => setTh(h => -h)],
                        ] as [string, () => void][]).map(([label, action]) => (
                            <button
                                key={label}
                                data-testid={`ft-context-${label.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '')}`}
                                onClick={() => {
                                    action();
                                    setContextMenu(null);
                                }}
                                style={{
                                    background: 'transparent',
                                    border: 'none',
                                    color: 'white',
                                    padding: '4px 8px',
                                    textAlign: 'left',
                                    fontSize: 11,
                                    cursor: 'pointer',
                                }}
                                onMouseEnter={e => (e.currentTarget.style.background = 'rgba(255,255,255,0.08)')}
                                onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                            >{label}</button>
                        ))}
                    </div>
                </foreignObject>
            )}

            {/* Options bar: W/H/X/Y/Rotation */}
            <foreignObject x={0} y={0} width={400} height={36} style={{ pointerEvents: 'all' }}>
                <div style={{ display: 'flex', gap: '8px', padding: '4px 8px', background: 'rgba(0,0,0,0.7)', borderRadius: '4px', fontSize: '11px', color: 'white' }}>
                    {([['X', tx, setTx], ['Y', ty, setTy], ['W', tw, setTw], ['H', th, setTh], ['°', rot, setRot]] as [string, number, React.Dispatch<React.SetStateAction<number>>][]).map(([label, val, setter]) => (
                        <label key={label} style={{ display: 'flex', alignItems: 'center', gap: '3px' }}>
                            {label}:
                            <input type="number" value={Math.round(val)} onChange={e => setter(Number(e.target.value))}
                                style={{ width: '48px', padding: '2px 4px', background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.3)', borderRadius: '3px', color: 'white', fontSize: '11px' }} />
                        </label>
                    ))}
                    <button onClick={onCommit} title="Commit transform" style={{ padding: '2px 8px', background: '#0090ff', border: 'none', borderRadius: '3px', color: 'white', cursor: 'pointer', fontSize: '11px', display: 'flex', alignItems: 'center' }}><Check size={13} /></button>
                    <button onClick={onCancel} title="Cancel transform" style={{ padding: '2px 8px', background: 'rgba(255,80,80,0.8)', border: 'none', borderRadius: '3px', color: 'white', cursor: 'pointer', fontSize: '11px', display: 'flex', alignItems: 'center' }}><XIcon size={13} /></button>
                </div>
            </foreignObject>
        </svg>
    );
}
