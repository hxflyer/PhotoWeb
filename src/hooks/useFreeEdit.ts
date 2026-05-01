import { useRef, useState, useEffect, useCallback } from 'react';
import { useEditorStore } from '../store/editorStore';
import { getTransformedHandles, type TransformState } from '../utils/geometryUtils';
import { getSelectionBounds, transformPath } from '../utils/selectionUtils';

export const useFreeEdit = (
    canvasRef: React.RefObject<HTMLCanvasElement | null>,
    selectionMask: HTMLCanvasElement | null,
    setUnifiedPathVersion: (cb: (v: number) => number) => void
) => {
    const {
        width, height, zoom, pan,
        layers, activeLayerId, selection,
        setFreeEditMode, setSelectionPath, setSelectionOperations
    } = useEditorStore();

    const floatingPixelsRef = useRef<{
        canvas: HTMLCanvasElement;
        x: number;
        y: number;
        lastCommitX: number;
        lastCommitY: number;
        originalX: number;
        originalY: number;
        rotation: number;
        scaleX: number;
        scaleY: number;
        width: number;
        height: number;
        originalWidth: number;
        originalHeight: number;
    } | null>(null);

    const activeTransformRef = useRef<{
        type: 'move' | 'scale' | 'rotate';
        startPos: { x: number, y: number };
        startVal: TransformState;
        handle?: string;
        center?: { x: number, y: number };
    } | null>(null);

    const [freeEditCursor, setFreeEditCursor] = useState<string>('default');

    // Helper: Get Canvas Coords
    const getCanvasCoords = (e: React.MouseEvent | MouseEvent) => {
        if (!canvasRef.current) return { x: 0, y: 0 };
        const rect = canvasRef.current.getBoundingClientRect();
        return {
            x: (e.clientX - rect.left - pan.x) / zoom,
            y: (e.clientY - rect.top - pan.y) / zoom
        };
    };

    const ensureFloatingPixels = useCallback(() => {
        if (!floatingPixelsRef.current && activeLayerId && selectionMask) {
            const activeLayer = layers.find(l => l.id === activeLayerId);
            if (activeLayer) {
                const fCanvas = document.createElement('canvas');
                fCanvas.width = width;
                fCanvas.height = height;
                const fCtx = fCanvas.getContext('2d');
                if (fCtx) {
                    fCtx.drawImage(activeLayer.canvas, 0, 0);
                    fCtx.globalCompositeOperation = 'destination-in';
                    fCtx.drawImage(selectionMask, 0, 0);

                    // Cut from Source Layer
                    const ctx = activeLayer.ctx;
                    ctx.save();
                    ctx.globalCompositeOperation = 'destination-out';
                    ctx.drawImage(selectionMask, 0, 0);
                    ctx.restore();

                    floatingPixelsRef.current = {
                        canvas: fCanvas,
                        x: 0,
                        y: 0,
                        lastCommitX: 0,
                        lastCommitY: 0,
                        originalX: 0,
                        originalY: 0,
                        rotation: 0,
                        scaleX: 1,
                        scaleY: 1,
                        width: width,
                        height: height,
                        originalWidth: width,
                        originalHeight: height
                    };
                }
            }
        }
    }, [activeLayerId, layers, selectionMask, width, height]);

    const commit = useCallback(() => {
        if (!floatingPixelsRef.current || !activeLayerId) return;
        const activeLayer = layers.find(l => l.id === activeLayerId);
        if (activeLayer) {
            const ctx = activeLayer.ctx;
            const fp = floatingPixelsRef.current;

            ctx.globalAlpha = 1;
            ctx.globalCompositeOperation = 'source-over';

            ctx.save();
            const bounds = getSelectionBounds(selection.path || [], selection.operations || [], selection.hasSelection, width, height);

            if (bounds) {
                const cx = bounds.x + bounds.w / 2;
                const cy = bounds.y + bounds.h / 2;

                ctx.translate(cx + fp.x, cy + fp.y);
                ctx.rotate(fp.rotation);
                ctx.scale(fp.scaleX, fp.scaleY);
                ctx.translate(-cx, -cy);
                ctx.drawImage(fp.canvas, 0, 0);

                // Transform Selection Paths
                const transform = {
                    x: fp.x, y: fp.y, rotation: fp.rotation, scaleX: fp.scaleX, scaleY: fp.scaleY
                };

                let newPath = selection.path;
                let newOps = selection.operations;
                let hasUpdates = false;

                if (newPath && newPath.length > 0) {
                    newPath = transformPath(newPath, cx, cy, transform);
                    hasUpdates = true;
                }
                if (newOps && newOps.length > 0) {
                    newOps = newOps.map(op => ({
                        ...op,
                        path: transformPath(op.path, cx, cy, transform)
                    }));
                    hasUpdates = true;
                }

                if (hasUpdates) {
                    setSelectionPath(newPath);
                    if (newOps) setSelectionOperations(newOps);
                }
            } else {
                ctx.drawImage(fp.canvas, fp.x, fp.y);
            }
            ctx.restore();
        }

        floatingPixelsRef.current = null;
        setFreeEditMode(false);
        setUnifiedPathVersion(v => v + 1);
    }, [activeLayerId, layers, width, height, selection, setFreeEditMode, setSelectionPath, setSelectionOperations, setUnifiedPathVersion]);

    const cancel = useCallback(() => {
        if (floatingPixelsRef.current && activeLayerId) {
            const activeLayer = layers.find(l => l.id === activeLayerId);
            if (activeLayer) {
                const ctx = activeLayer.ctx;
                const fp = floatingPixelsRef.current;
                ctx.globalAlpha = 1;
                ctx.globalCompositeOperation = 'source-over';
                ctx.drawImage(fp.canvas, 0, 0);
            }
        }
        floatingPixelsRef.current = null;
        setFreeEditMode(false);
        setUnifiedPathVersion(v => v + 1);
    }, [activeLayerId, layers, setFreeEditMode, setUnifiedPathVersion]);

    const handleMouseDown = useCallback((e: React.MouseEvent) => {
        if (!selection.isFreeEditMode) return false;

        ensureFloatingPixels(); // Ensure pixels called on click if somehow missed (e.g. init race)

        const bounds = getSelectionBounds(selection.path || [], selection.operations || [], selection.hasSelection, width, height);
        if (!bounds) return false;

        const tHandles = getTransformedHandles(bounds, floatingPixelsRef.current || { x: 0, y: 0, rotation: 0, scaleX: 1, scaleY: 1 });
        if (!tHandles || !floatingPixelsRef.current) return false;

        const coords = getCanvasCoords(e);
        const mx = coords.x;
        const my = coords.y;
        const handleSize = 10 / zoom;
        const { nw, n, ne, e: eH, se, s, sw, w } = tHandles;

        const handles = [
            { p: nw, type: 'scale', handle: 'nw' },
            { p: n, type: 'scale', handle: 'n' },
            { p: ne, type: 'scale', handle: 'ne' },
            { p: eH, type: 'scale', handle: 'e' },
            { p: se, type: 'scale', handle: 'se' },
            { p: s, type: 'scale', handle: 's' },
            { p: sw, type: 'scale', handle: 'sw' },
            { p: w, type: 'scale', handle: 'w' }
        ];

        let hit = false;
        // 1. Check Handles (Scale)
        for (const h of handles) {
            if (Math.abs(mx - h.p.x) < handleSize && Math.abs(my - h.p.y) < handleSize) {
                activeTransformRef.current = {
                    type: 'scale' as const,
                    handle: h.handle,
                    startPos: coords,
                    startVal: { ...floatingPixelsRef.current },
                    center: tHandles.center
                };
                hit = true;
                break;
            }
        }

        if (!hit) {
            // 2. Check Rotate (Near corners)
            const cornerDist = 30 / zoom;
            const corners = [
                { p: nw, handle: 'nw' }, { p: ne, handle: 'ne' },
                { p: se, handle: 'se' }, { p: sw, handle: 'sw' }
            ];
            for (const c of corners) {
                if (Math.abs(mx - c.p.x) < cornerDist && Math.abs(my - c.p.y) < cornerDist) {
                    activeTransformRef.current = {
                        type: 'rotate' as const,
                        handle: c.handle,
                        startPos: coords,
                        startVal: { ...floatingPixelsRef.current },
                        center: tHandles.center
                    };
                    hit = true;
                    break;
                }
            }
        }

        if (!hit) {
            // 3. Check Inside (Move)
            const cx = tHandles.center.x;
            const cy = tHandles.center.y;
            const dx = mx - cx;
            const dy = my - cy;
            const angle = -floatingPixelsRef.current.rotation;

            const rx = dx * Math.cos(angle) - dy * Math.sin(angle);
            const ry = dx * Math.sin(angle) + dy * Math.cos(angle);

            const localW = bounds!.w * floatingPixelsRef.current.scaleX;
            const localH = bounds!.h * floatingPixelsRef.current.scaleY;

            if (Math.abs(rx) <= localW / 2 && Math.abs(ry) <= localH / 2) {
                activeTransformRef.current = {
                    type: 'move' as const,
                    startPos: coords,
                    startVal: { ...floatingPixelsRef.current },
                    center: tHandles.center
                };
                hit = true;
            }
        }

        return hit;
    }, [selection.isFreeEditMode, selection.path, selection.operations, selection.hasSelection, width, height, zoom, ensureFloatingPixels]);


    const handleMouseMove = useCallback((e: React.MouseEvent) => {
        const coords = getCanvasCoords(e);

        // --- DRAG ---
        if (activeTransformRef.current && floatingPixelsRef.current) {
            const tr = activeTransformRef.current;
            const startPos = tr.startPos;
            const currPos = coords;
            const sv = tr.startVal;

            if (tr.type === 'move') {
                const dx = currPos.x - startPos.x;
                const dy = currPos.y - startPos.y;
                floatingPixelsRef.current.x = sv.x + dx;
                floatingPixelsRef.current.y = sv.y + dy;
            }
            else if (tr.type === 'rotate') {
                if (tr.center) {
                    const cx = tr.center.x;
                    const cy = tr.center.y;
                    const sAng = Math.atan2(startPos.y - cy, startPos.x - cx);
                    const cAng = Math.atan2(currPos.y - cy, currPos.x - cx);
                    floatingPixelsRef.current.rotation = sv.rotation + (cAng - sAng);
                }
            }
            else if (tr.type === 'scale') {
                if (tr.center) {
                    const cx = tr.center.x;
                    const cy = tr.center.y;
                    const angle = -sv.rotation;
                    const vecS = { x: startPos.x - cx, y: startPos.y - cy };
                    const vecC = { x: currPos.x - cx, y: currPos.y - cy };

                    const rot = (v: { x: number, y: number }) => ({
                        x: v.x * Math.cos(angle) - v.y * Math.sin(angle),
                        y: v.x * Math.sin(angle) + v.y * Math.cos(angle)
                    });

                    const ls = rot(vecS);
                    const lc = rot(vecC);
                    const h = tr.handle || '';
                    let sx = sv.scaleX;
                    let sy = sv.scaleY;

                    if (h.includes('e') || h.includes('w')) {
                        if (Math.abs(ls.x) > 0.1) sx = sv.scaleX * (lc.x / ls.x);
                    }
                    if (h.includes('n') || h.includes('s')) {
                        if (Math.abs(ls.y) > 0.1) sy = sv.scaleY * (lc.y / ls.y);
                    }
                    floatingPixelsRef.current.scaleX = sx;
                    floatingPixelsRef.current.scaleY = sy;
                }
            }
            setUnifiedPathVersion(v => v + 1);
            return;
        }

        // --- HOVER CURSOR ---
        if (selection.isFreeEditMode && (selection.hasSelection || (selection.operations && selection.operations.length > 0))) {
            const bounds = getSelectionBounds(selection.path || [], selection.operations || [], selection.hasSelection, width, height);
            if (bounds) {
                const tHandles = getTransformedHandles(bounds, floatingPixelsRef.current || { x: 0, y: 0, rotation: 0, scaleX: 1, scaleY: 1 });
                if (tHandles) {
                    const mx = coords.x;
                    const my = coords.y;
                    const handleSize = 10 / zoom;

                    const { nw, n, ne, e: eH, se, s, sw, w } = tHandles;
                    const handlePoints = [
                        { p: nw, cursor: 'nwse-resize' }, { p: n, cursor: 'ns-resize' },
                        { p: ne, cursor: 'nesw-resize' }, { p: eH, cursor: 'ew-resize' },
                        { p: se, cursor: 'nwse-resize' }, { p: s, cursor: 'ns-resize' },
                        { p: sw, cursor: 'nesw-resize' }, { p: w, cursor: 'ew-resize' }
                    ];

                    let cursor = 'default';
                    // 1. Handles
                    for (const h of handlePoints) {
                        if (Math.abs(mx - h.p.x) < handleSize && Math.abs(my - h.p.y) < handleSize) {
                            cursor = h.cursor;
                            break;
                        }
                    }

                    if (cursor === 'default') {
                        // 2. Rotate
                        const cornerDist = 30 / zoom;
                        const corners = [nw, ne, se, sw];
                        for (const c of corners) {
                            if (Math.abs(mx - c.x) < cornerDist && Math.abs(my - c.y) < cornerDist) {
                                cursor = 'alias'; // Rotate icon approximation
                                break;
                            }
                        }
                    }

                    if (cursor === 'default') {
                        // 3. Move (Inside)
                        // ... logic ... simplify: check inputBounds center vs mouse? No must be robust.
                        // Use same logic as Down
                        const cx = tHandles.center.x;
                        const cy = tHandles.center.y;
                        const fRot = floatingPixelsRef.current?.rotation || 0;
                        const angle = -fRot;
                        const dx = mx - cx;
                        const dy = my - cy;
                        const rx = dx * Math.cos(angle) - dy * Math.sin(angle);
                        const ry = dx * Math.sin(angle) + dy * Math.cos(angle);
                        const fSX = floatingPixelsRef.current?.scaleX || 1;
                        const fSY = floatingPixelsRef.current?.scaleY || 1;
                        const localW = bounds.w * fSX;
                        const localH = bounds.h * fSY;

                        if (Math.abs(rx) <= localW / 2 && Math.abs(ry) <= localH / 2) {
                            cursor = 'move';
                        }
                    }

                    if (cursor !== freeEditCursor) {
                        setFreeEditCursor(cursor);
                    }
                }
            }
        }
    }, [activeTransformRef.current, floatingPixelsRef.current, zoom, pan, selection.isFreeEditMode, width, height, freeEditCursor]);

    const handleMouseUp = useCallback(() => {
        if (activeTransformRef.current) {
            activeTransformRef.current = null;
            setUnifiedPathVersion(v => v + 1);
        }
    }, []);

    // Init Logic
    useEffect(() => {
        if (selection.isFreeEditMode) {
            ensureFloatingPixels();
        }
    }, [selection.isFreeEditMode, ensureFloatingPixels]);

    // Keyboard
    useEffect(() => {
        const handleGlobalKeys = (e: KeyboardEvent) => {
            if (useEditorStore.getState().selection.isFreeEditMode) {
                if (e.key === 'Escape') {
                    e.preventDefault(); e.stopPropagation(); cancel();
                } else if (e.key === 'Enter') {
                    e.preventDefault(); e.stopPropagation(); commit();
                }
            }
        };
        window.addEventListener('keydown', handleGlobalKeys, true);
        return () => window.removeEventListener('keydown', handleGlobalKeys, true);
    }, [cancel, commit]);


    return {
        floatingPixelsRef,
        freeEditCursor,
        handleMouseDown,
        handleMouseMove,
        handleMouseUp,
        commit,
        cancel,
        activeTransformRef,
        setFreeEditCursor,
        ensureFloatingPixels
    };
};
