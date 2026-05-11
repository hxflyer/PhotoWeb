/**
 * TransformSelectionOverlay — scale/rotate the active selection outline
 * without touching the underlying layer pixels. Renders 8 corner/edge handles
 * plus a rotate handle above the selection. Esc cancels, Enter commits.
 *
 * On commit, we rasterize the existing selection to a 0..255 alpha mask,
 * transform that mask via an affine matrix (drawImage into a working canvas),
 * read it back, and install the result as a single mask-bearing operation
 * via setSelectionOperations (history-wrapped through executeDocumentCommand).
 */
import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { Check, X as XIcon } from 'lucide-react';
import { useEditorStore } from '../../store/editorStore';
import { rasterizeSelectionOperations, getSelectionBounds } from '../../utils/selectionUtils';

interface Props {
    zoom: number;
    panX: number;
    panY: number;
    onClose: () => void;
}

type Handle = 'nw' | 'n' | 'ne' | 'e' | 'se' | 's' | 'sw' | 'w' | 'move' | 'rotate';

export function TransformSelectionOverlay({ zoom, onClose }: Props) {
    const selection = useEditorStore(s => s.selection);
    const width = useEditorStore(s => s.width);
    const height = useEditorStore(s => s.height);

    // Initial bounds in canvas coords — fall back to whole canvas when missing.
    const initialBounds = (() => {
        const b = getSelectionBounds(selection.path, selection.operations, selection.hasSelection, width, height);
        if (b && b.w > 0 && b.h > 0) return b;
        return { x: 0, y: 0, w: width, h: height };
    })();

    const [tx, setTx] = useState(initialBounds.x);
    const [ty, setTy] = useState(initialBounds.y);
    const [tw, setTw] = useState(initialBounds.w);
    const [th, setTh] = useState(initialBounds.h);
    const [rot, setRot] = useState(0);
    const baseBounds = useRef(initialBounds);
    const baseMask = useRef<Uint8ClampedArray | null>(null);

    const dragRef = useRef<{ handle: Handle; startX: number; startY: number; origTx: number; origTy: number; origTw: number; origTh: number; origRot: number } | null>(null);
    const [documentRect, setDocumentRect] = useState<DOMRect | null>(null);

    // Snapshot the current selection as a mask once on mount; that becomes the
    // source we transform from on every drag.
    useEffect(() => {
        baseMask.current = rasterizeSelectionOperations(selection.operations, width, height);
        baseBounds.current = initialBounds;
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    useLayoutEffect(() => {
        const update = () => {
            const doc = document.querySelector('[data-photoweb-document]');
            setDocumentRect(doc?.getBoundingClientRect() ?? null);
        };
        update();
        window.addEventListener('resize', update);
        return () => window.removeEventListener('resize', update);
    }, []);

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
    const cy = sy + sh / 2;

    const handles: Record<Handle, { x: number; y: number }> = {
        nw: { x: sx, y: sy }, n: { x: cx, y: sy }, ne: { x: sx + sw, y: sy },
        e: { x: sx + sw, y: cy }, se: { x: sx + sw, y: sy + sh },
        s: { x: cx, y: sy + sh }, sw: { x: sx, y: sy + sh }, w: { x: sx, y: cy },
        move: { x: cx, y: cy }, rotate: { x: cx, y: sy - 20 },
    };

    const handleMouseDown = useCallback((e: React.MouseEvent, handle: Handle) => {
        e.stopPropagation();
        e.preventDefault();
        dragRef.current = { handle, startX: e.clientX, startY: e.clientY, origTx: tx, origTy: ty, origTw: tw, origTh: th, origRot: rot };
    }, [tx, ty, tw, th, rot]);

    useEffect(() => {
        const onMove = (e: MouseEvent) => {
            if (!dragRef.current) return;
            const d = dragRef.current;
            const dx = (e.clientX - d.startX) / zoom;
            const dy = (e.clientY - d.startY) / zoom;
            switch (d.handle) {
                case 'move':
                    setTx(d.origTx + dx);
                    setTy(d.origTy + dy);
                    break;
                case 'nw':
                    setTx(d.origTx + dx);
                    setTy(d.origTy + dy);
                    setTw(Math.max(1, d.origTw - dx));
                    setTh(Math.max(1, d.origTh - dy));
                    break;
                case 'n':
                    setTy(d.origTy + dy);
                    setTh(Math.max(1, d.origTh - dy));
                    break;
                case 'ne':
                    setTy(d.origTy + dy);
                    setTw(Math.max(1, d.origTw + dx));
                    setTh(Math.max(1, d.origTh - dy));
                    break;
                case 'e':
                    setTw(Math.max(1, d.origTw + dx));
                    break;
                case 'se':
                    setTw(Math.max(1, d.origTw + dx));
                    setTh(Math.max(1, d.origTh + dy));
                    break;
                case 's':
                    setTh(Math.max(1, d.origTh + dy));
                    break;
                case 'sw':
                    setTx(d.origTx + dx);
                    setTw(Math.max(1, d.origTw - dx));
                    setTh(Math.max(1, d.origTh + dy));
                    break;
                case 'w':
                    setTx(d.origTx + dx);
                    setTw(Math.max(1, d.origTw - dx));
                    break;
                case 'rotate': {
                    const centerX = (documentRect?.left ?? 0) + (d.origTx + d.origTw / 2) * zoom;
                    const centerY = (documentRect?.top ?? 0) + (d.origTy + d.origTh / 2) * zoom;
                    const angle = Math.atan2(e.clientY - centerY, e.clientX - centerX) + Math.PI / 2;
                    setRot(angle);
                    break;
                }
            }
        };
        const onUp = () => { dragRef.current = null; };
        window.addEventListener('mousemove', onMove);
        window.addEventListener('mouseup', onUp);
        return () => {
            window.removeEventListener('mousemove', onMove);
            window.removeEventListener('mouseup', onUp);
        };
    }, [zoom, documentRect]);

    const commit = useCallback(() => {
        const store = useEditorStore.getState();
        const base = baseMask.current;
        if (!base) {
            onClose();
            return;
        }
        const baseRect = baseBounds.current;
        // Build the source mask canvas (full document) from the snapshot.
        const src = document.createElement('canvas');
        src.width = width; src.height = height;
        const sctx = src.getContext('2d');
        if (!sctx) { onClose(); return; }
        const srcImage = sctx.createImageData(width, height);
        for (let i = 0; i < base.length; i++) {
            srcImage.data[i * 4] = 255;
            srcImage.data[i * 4 + 1] = 255;
            srcImage.data[i * 4 + 2] = 255;
            srcImage.data[i * 4 + 3] = base[i];
        }
        sctx.putImageData(srcImage, 0, 0);

        // Render the transformed mask into a fresh document-sized canvas.
        const dst = document.createElement('canvas');
        dst.width = width; dst.height = height;
        const dctx = dst.getContext('2d');
        if (!dctx) { onClose(); return; }
        dctx.save();
        // Translate to the new center, rotate, scale so baseBounds box maps
        // onto the dragged box, and finally draw the snapshot positioned so
        // that the base bounds align with the origin.
        const newCenterX = tx + tw / 2;
        const newCenterY = ty + th / 2;
        const scaleX = tw / Math.max(1, baseRect.w);
        const scaleY = th / Math.max(1, baseRect.h);
        dctx.translate(newCenterX, newCenterY);
        dctx.rotate(rot);
        dctx.scale(scaleX, scaleY);
        dctx.translate(-(baseRect.x + baseRect.w / 2), -(baseRect.y + baseRect.h / 2));
        dctx.drawImage(src, 0, 0);
        dctx.restore();
        const result = dctx.getImageData(0, 0, width, height);
        const out = new Uint8ClampedArray(width * height);
        let any = false;
        for (let i = 0; i < out.length; i++) {
            const a = result.data[i * 4 + 3];
            out[i] = a;
            if (a > 0) any = true;
        }
        if (!any) {
            store.setSelectionOperations([]);
            store.setHasSelection(false);
        } else {
            store.setSelectionOperations([{
                mode: 'add',
                type: 'lasso',
                path: [],
                mask: { data: out, width, height },
            }]);
            store.setHasSelection(true);
        }
        onClose();
    }, [tx, ty, tw, th, rot, width, height, onClose]);

    const cancel = useCallback(() => { onClose(); }, [onClose]);

    useEffect(() => {
        const onKey = (e: KeyboardEvent) => {
            if (e.key === 'Escape') { e.preventDefault(); cancel(); }
            else if (e.key === 'Enter') { e.preventDefault(); commit(); }
        };
        window.addEventListener('keydown', onKey);
        return () => window.removeEventListener('keydown', onKey);
    }, [commit, cancel]);

    if (!documentRect) return null;

    const handleSize = 8;
    const handleColor = '#0090ff';

    const handleEntries: Handle[] = ['nw', 'n', 'ne', 'e', 'se', 's', 'sw', 'w'];

    const rotateDeg = rot * 180 / Math.PI;
    const groupTransform = `rotate(${rotateDeg}, ${cx}, ${cy})`;

    return (
        <>
            <svg
                data-testid="transform-selection-overlay"
                style={{ position: 'fixed', inset: 0, pointerEvents: 'none', zIndex: 9000 }}
            >
                <g transform={groupTransform} style={{ pointerEvents: 'visiblePainted' }}>
                    <rect
                        x={sx} y={sy} width={sw} height={sh}
                        fill="rgba(0, 144, 255, 0.08)"
                        stroke={handleColor}
                        strokeDasharray="4 4"
                        strokeWidth={1}
                        onMouseDown={(e) => handleMouseDown(e, 'move')}
                        style={{ cursor: 'move' }}
                    />
                    {handleEntries.map(h => (
                        <rect
                            key={h}
                            data-testid={`transform-selection-handle-${h}`}
                            x={handles[h].x - handleSize / 2}
                            y={handles[h].y - handleSize / 2}
                            width={handleSize}
                            height={handleSize}
                            fill="#fff"
                            stroke={handleColor}
                            strokeWidth={1}
                            onMouseDown={(e) => handleMouseDown(e, h)}
                            style={{ cursor: 'pointer' }}
                        />
                    ))}
                    <line x1={cx} y1={sy} x2={handles.rotate.x} y2={handles.rotate.y} stroke={handleColor} strokeWidth={1} />
                    <circle
                        data-testid="transform-selection-handle-rotate"
                        cx={handles.rotate.x}
                        cy={handles.rotate.y}
                        r={handleSize / 2 + 1}
                        fill="#fff"
                        stroke={handleColor}
                        onMouseDown={(e) => handleMouseDown(e, 'rotate')}
                        style={{ cursor: 'grab' }}
                    />
                </g>
            </svg>
            <div
                style={{
                    position: 'fixed',
                    top: 12,
                    right: 12,
                    background: '#2a2a2a',
                    border: '1px solid #444',
                    borderRadius: 4,
                    padding: '6px 10px',
                    color: 'white',
                    fontSize: 11,
                    display: 'flex',
                    gap: 8,
                    alignItems: 'center',
                    zIndex: 9001,
                }}
            >
                <span>Transform Selection</span>
                <button
                    onClick={commit}
                    data-testid="transform-selection-commit"
                    style={{ display: 'flex', alignItems: 'center', gap: 4, background: '#0090ff', border: 'none', color: 'white', borderRadius: 3, padding: '3px 8px', cursor: 'pointer', fontSize: 11 }}
                >
                    <Check size={12} /> Commit
                </button>
                <button
                    onClick={cancel}
                    data-testid="transform-selection-cancel"
                    style={{ display: 'flex', alignItems: 'center', gap: 4, background: 'transparent', border: '1px solid #555', color: 'white', borderRadius: 3, padding: '3px 8px', cursor: 'pointer', fontSize: 11 }}
                >
                    <XIcon size={12} /> Cancel
                </button>
            </div>
        </>
    );
}
