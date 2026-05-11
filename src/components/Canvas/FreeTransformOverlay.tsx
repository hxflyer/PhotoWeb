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

export interface FreeTransformState {
    layerId: string;
    /** Snapshot of the layer before transform started — used for cancel */
    snapshot: ImageData;
    /** Cropped transform source. Defaults to snapshot for old callers. */
    source?: ImageData;
    sourceX?: number;
    sourceY?: number;
    typeDataSnapshot?: TypeLayerData;
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

export function FreeTransformOverlay({ state, zoom, panX, panY, onCommit, onCancel }: Props) {
    const [tx, setTx] = useState(state.x);
    const [ty, setTy] = useState(state.y);
    const [tw, setTw] = useState(state.width);
    const [th, setTh] = useState(state.height);
    const [rot, setRot] = useState(state.rotation);
    const dragRef = useRef<{ handle: Handle; startX: number; startY: number; origTx: number; origTy: number; origTw: number; origTh: number; origRot: number } | null>(null);
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

    // Handles: corners + edge midpoints
    const handles: Record<Handle, { x: number; y: number }> = {
        nw: { x: sx, y: sy }, n: { x: cx, y: sy }, ne: { x: sx + sw, y: sy },
        e: { x: sx + sw, y: cy2 }, se: { x: sx + sw, y: sy + sh },
        s: { x: cx, y: sy + sh }, sw: { x: sx, y: sy + sh }, w: { x: sx, y: cy2 },
        move: { x: cx, y: cy2 }, rotate: { x: cx, y: sy - 20 },
    };

    const handleMouseDown = useCallback((e: React.MouseEvent, handle: Handle) => {
        e.stopPropagation();
        dragRef.current = { handle, startX: e.clientX, startY: e.clientY, origTx: tx, origTy: ty, origTw: tw, origTh: th, origRot: rot };
    }, [tx, ty, tw, th, rot]);

    useEffect(() => {
        const onMove = (e: MouseEvent) => {
            if (!dragRef.current) return;
            const { handle, startX, startY, origTx, origTy, origTw, origTh, origRot } = dragRef.current;
            const dx = (e.clientX - startX) / zoom;
            const dy = (e.clientY - startY) / zoom;

            if (handle === 'move') { setTx(origTx + dx); setTy(origTy + dy); }
            else if (handle === 'se') { setTw(Math.max(1, origTw + dx)); setTh(Math.max(1, origTh + dy)); }
            else if (handle === 'nw') { setTx(origTx + dx); setTy(origTy + dy); setTw(Math.max(1, origTw - dx)); setTh(Math.max(1, origTh - dy)); }
            else if (handle === 'ne') { setTy(origTy + dy); setTw(Math.max(1, origTw + dx)); setTh(Math.max(1, origTh - dy)); }
            else if (handle === 'sw') { setTx(origTx + dx); setTw(Math.max(1, origTw - dx)); setTh(Math.max(1, origTh + dy)); }
            else if (handle === 'n') { setTy(origTy + dy); setTh(Math.max(1, origTh - dy)); }
            else if (handle === 's') { setTh(Math.max(1, origTh + dy)); }
            else if (handle === 'e') { setTw(Math.max(1, origTw + dx)); }
            else if (handle === 'w') { setTx(origTx + dx); setTw(Math.max(1, origTw - dx)); }
            else if (handle === 'rotate') {
                const center = toScreen(origTx + origTw / 2, origTy + origTh / 2);
                const angle = Math.atan2(e.clientY - center.sy, e.clientX - center.sx) * (180 / Math.PI) + 90;
                setRot(origRot + (angle - (Math.atan2(startY - center.sy, startX - center.sx) * (180 / Math.PI) + 90)));
            }
        };
        const onUp = () => { dragRef.current = null; };
        window.addEventListener('mousemove', onMove);
        window.addEventListener('mouseup', onUp);
        return () => { window.removeEventListener('mousemove', onMove); window.removeEventListener('mouseup', onUp); };
    }, [zoom]); // eslint-disable-line react-hooks/exhaustive-deps

    // Apply live preview to layer
    useEffect(() => {
        const layer = layers.find(l => l.id === state.layerId);
        if (!layer) return;

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

        const result = applyFreeTransform(tempSrc, {
            x: tx, y: ty, scaleX: tw / tempSrc.width, scaleY: th / tempSrc.height,
            rotation: rot, skewX: 0, skewY: 0,
        }, layer.canvas.width, layer.canvas.height);
        layer.ctx.clearRect(0, 0, layer.canvas.width, layer.canvas.height);
        layer.ctx.drawImage(result, 0, 0);
        layer.markDirty(null);
    }, [tx, ty, tw, th, rot]); // eslint-disable-line react-hooks/exhaustive-deps

    useEffect(() => {
        const onKey = (e: KeyboardEvent) => {
            if (e.key === 'Enter') { e.preventDefault(); onCommit(); }
            if (e.key === 'Escape') { e.preventDefault(); onCancel(); }
        };
        window.addEventListener('keydown', onKey);
        return () => window.removeEventListener('keydown', onKey);
    }, [onCommit, onCancel]);

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
                <rect x={sx} y={sy} width={sw} height={sh}
                    fill="none" stroke="#0090ff" strokeWidth={1} strokeDasharray="4 2" />

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
