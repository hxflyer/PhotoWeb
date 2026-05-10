/**
 * WarpOverlay — shows a 4×4 mesh grid over the active layer.
 * Draggable control points; live preview; Enter to confirm, Esc to cancel.
 */
import { useEffect, useRef, useState, useCallback } from 'react';
import { useEditorStore } from '../../store/editorStore';
import { applyMeshWarp, warpPresetControlPoints, type WarpControlPoint, type WarpPreset } from '../../core/imageTransforms';

const PRESETS: WarpPreset[] = [
    'none', 'arc', 'arch', 'bulge', 'shell-lower', 'shell-upper',
    'flag', 'wave', 'fish', 'fisheye', 'inflate', 'squeeze',
];

const PRESET_LABELS: Record<WarpPreset, string> = {
    none: 'Custom', arc: 'Arc', arch: 'Arch', bulge: 'Bulge',
    'shell-lower': 'Shell Lower', 'shell-upper': 'Shell Upper',
    flag: 'Flag', wave: 'Wave', fish: 'Fish', fisheye: 'Fisheye',
    inflate: 'Inflate', squeeze: 'Squeeze',
};

interface Props {
    layerId: string;
    snapshot: ImageData;
    zoom: number;
    panX: number;
    panY: number;
    onCommit: () => void;
    onCancel: () => void;
}

export function WarpOverlay({ layerId, snapshot, zoom, panX, panY, onCommit, onCancel }: Props) {
    const { layers, width, height } = useEditorStore();
    const layer = layers.find(l => l.id === layerId);

    const [preset, setPreset] = useState<WarpPreset>('none');
    const [controlPoints, setControlPoints] = useState<WarpControlPoint[]>(() =>
        warpPresetControlPoints('none', snapshot.width, snapshot.height)
    );
    const draggingIdx = useRef<number | null>(null);
    const dragStart = useRef({ mx: 0, my: 0, px: 0, py: 0 });

    const toScreen = (cx: number, cy: number) => ({
        sx: cx * zoom + panX,
        sy: cy * zoom + panY,
    });

    // Apply live preview whenever control points change
    useEffect(() => {
        if (!layer) return;
        const tempSrc = document.createElement('canvas');
        tempSrc.width = snapshot.width;
        tempSrc.height = snapshot.height;
        const tempCtx = tempSrc.getContext('2d')!;
        tempCtx.putImageData(snapshot, 0, 0);

        const result = applyMeshWarp(tempSrc, controlPoints, width, height);
        layer.ctx.clearRect(0, 0, layer.canvas.width, layer.canvas.height);
        layer.ctx.drawImage(result, 0, 0);
        layer.markDirty(null);
    }, [controlPoints]); // eslint-disable-line react-hooks/exhaustive-deps

    const onPresetChange = useCallback((p: WarpPreset) => {
        setPreset(p);
        setControlPoints(warpPresetControlPoints(p, snapshot.width, snapshot.height));
    }, [snapshot.width, snapshot.height]);

    const handlePointMouseDown = useCallback((e: React.MouseEvent, idx: number) => {
        e.stopPropagation();
        draggingIdx.current = idx;
        dragStart.current = {
            mx: e.clientX, my: e.clientY,
            px: controlPoints[idx].x, py: controlPoints[idx].y,
        };
    }, [controlPoints]);

    useEffect(() => {
        const onMove = (e: MouseEvent) => {
            if (draggingIdx.current === null) return;
            const dx = (e.clientX - dragStart.current.mx) / zoom;
            const dy = (e.clientY - dragStart.current.my) / zoom;
            setControlPoints(prev => {
                const next = [...prev];
                next[draggingIdx.current!] = {
                    x: dragStart.current.px + dx,
                    y: dragStart.current.py + dy,
                };
                return next;
            });
        };
        const onUp = () => { draggingIdx.current = null; };
        window.addEventListener('mousemove', onMove);
        window.addEventListener('mouseup', onUp);
        return () => {
            window.removeEventListener('mousemove', onMove);
            window.removeEventListener('mouseup', onUp);
        };
    }, [zoom]);

    useEffect(() => {
        const onKey = (e: KeyboardEvent) => {
            if (e.key === 'Enter') { e.preventDefault(); onCommit(); }
            if (e.key === 'Escape') { e.preventDefault(); onCancel(); }
        };
        window.addEventListener('keydown', onKey);
        return () => window.removeEventListener('keydown', onKey);
    }, [onCommit, onCancel]);

    // Build SVG grid lines
    const gridLines: { x1: number; y1: number; x2: number; y2: number }[] = [];
    // Horizontal lines
    for (let row = 0; row < 4; row++) {
        for (let col = 0; col < 3; col++) {
            const p0 = toScreen(controlPoints[row * 4 + col].x, controlPoints[row * 4 + col].y);
            const p1 = toScreen(controlPoints[row * 4 + col + 1].x, controlPoints[row * 4 + col + 1].y);
            gridLines.push({ x1: p0.sx, y1: p0.sy, x2: p1.sx, y2: p1.sy });
        }
    }
    // Vertical lines
    for (let col = 0; col < 4; col++) {
        for (let row = 0; row < 3; row++) {
            const p0 = toScreen(controlPoints[row * 4 + col].x, controlPoints[row * 4 + col].y);
            const p1 = toScreen(controlPoints[(row + 1) * 4 + col].x, controlPoints[(row + 1) * 4 + col].y);
            gridLines.push({ x1: p0.sx, y1: p0.sy, x2: p1.sx, y2: p1.sy });
        }
    }

    return (
        <svg
            data-testid="warp-overlay"
            style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', pointerEvents: 'none', overflow: 'visible' }}
        >
            {/* Options bar */}
            <foreignObject x={0} y={0} width={500} height={36} style={{ pointerEvents: 'all' }}>
                <div style={{ display: 'flex', gap: '8px', padding: '4px 8px', background: 'rgba(0,0,0,0.7)', borderRadius: '4px', fontSize: '11px', color: 'white', alignItems: 'center' }}>
                    <label style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                        Warp:
                        <select
                            value={preset}
                            onChange={e => onPresetChange(e.target.value as WarpPreset)}
                            style={{ background: 'rgba(255,255,255,0.15)', border: '1px solid rgba(255,255,255,0.3)', borderRadius: '3px', color: 'white', fontSize: '11px', padding: '2px 4px' }}
                        >
                            {PRESETS.map(p => (
                                <option key={p} value={p} style={{ background: '#333' }}>{PRESET_LABELS[p]}</option>
                            ))}
                        </select>
                    </label>
                    <button onClick={onCommit} style={{ padding: '2px 8px', background: '#0090ff', border: 'none', borderRadius: '3px', color: 'white', cursor: 'pointer', fontSize: '11px' }}>Commit</button>
                    <button onClick={onCancel} style={{ padding: '2px 8px', background: 'rgba(255,80,80,0.8)', border: 'none', borderRadius: '3px', color: 'white', cursor: 'pointer', fontSize: '11px' }}>Cancel</button>
                </div>
            </foreignObject>

            {/* Grid lines */}
            {gridLines.map((l, i) => (
                <line key={i} x1={l.x1} y1={l.y1} x2={l.x2} y2={l.y2}
                    stroke="#0090ff" strokeWidth={1} strokeDasharray="4 2" />
            ))}

            {/* Control points */}
            {controlPoints.map((p, idx) => {
                const { sx, sy } = toScreen(p.x, p.y);
                return (
                    <circle key={idx}
                        cx={sx} cy={sy} r={5}
                        fill="white" stroke="#0090ff" strokeWidth={1}
                        style={{ pointerEvents: 'all', cursor: 'move' }}
                        onMouseDown={e => handlePointMouseDown(e, idx)}
                    />
                );
            })}
        </svg>
    );
}
